// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../interfaces/IKYCVerifier.sol";

interface IModularCompliance {
    function bindToken(address _token) external;
}

interface IRWAERC3643 {
    function mint(address _to, uint256 _amount) external;
    function grantRole(bytes32 role, address account) external;
    function renounceRole(bytes32 role, address account) external;
    function MINTER_ROLE() external view returns (bytes32);
    function DEFAULT_ADMIN_ROLE() external view returns (bytes32);
}

/**
 * @title RWATokenizationFactory
 * @notice Factory for direct asset tokenization with off-chain KYC verification
 * @dev Deploys ERC3643 tokens + ERC721 project contracts (1 per project)
 * @dev Uses KYCVerifier for signature-based KYC instead of on-chain IdentityRegistry
 * @dev Fees are collected off-chain via the platform's payment system
 */
contract RWATokenizationFactory is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    // ============ Structs ============

    struct Implementations {
        address securityToken;
        address projectNFT;
        address compliance;
        address tradeEscrow;
        address dividendDistributor;
    }

    struct TokenDeployment {
        uint256 deploymentId;
        address owner;
        address securityToken;
        address projectNFT;
        address tradeEscrow;
        address dividendDistributor;
        DeploymentType deploymentType;
        uint256 deployedAt;
        bool active;
        string metadataURI;
        uint8 minKYCLevel;
    }

    enum DeploymentType {
        TOKEN_ONLY,
        NFT_ONLY,
        NFT_AND_TOKEN,
        NFT_TOKEN_ESCROW
    }

    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }

    // ============ State Variables ============

    Implementations public implementations;
    address public kycVerifier;
    address public platformFeeRecipient;
    uint256 public escrowTransactionFeeBps;
    uint256 public deploymentCounter;
    
    mapping(uint256 => TokenDeployment) public deployments;
    mapping(address => uint256[]) public ownerDeployments;
    mapping(address => bool) public approvedDeployers;
    mapping(uint256 => mapping(uint16 => bool)) public deploymentRestrictedCountries;
    
    uint16[] public defaultRestrictedCountries;
    
    bool public requireApproval;
    bool public requireKYCForDeployment;
    uint8 public minKYCLevelForDeployment;

    // ============ Events ============

    event TokenDeployed(
        uint256 indexed deploymentId, 
        address indexed owner, 
        address securityToken, 
        uint256 supply, 
        DeploymentType deploymentType,
        uint8 minKYCLevel
    );
    event ProjectNFTDeployed(uint256 indexed deploymentId, address indexed owner, address projectNFT, DeploymentType deploymentType);
    event EscrowDeployed(uint256 indexed deploymentId, address indexed owner, address tradeEscrow);
    event DividendModuleDeployed(uint256 indexed deploymentId, address indexed owner, address dividendDistributor);
    event ImplementationUpdated(uint8 indexed implType, address indexed oldImpl, address indexed newImpl);
    event DeployerApprovalUpdated(address indexed deployer, bool approved);
    event DeploymentDeactivated(uint256 indexed deploymentId);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event DeploymentKYCLevelUpdated(uint256 indexed deploymentId, uint8 oldLevel, uint8 newLevel);
    event DeploymentCountryRestrictionUpdated(uint256 indexed deploymentId, uint16 countryCode, bool restricted);
    event DefaultRestrictedCountryUpdated(uint16 countryCode, bool restricted);
    event KYCRequirementUpdated(bool required, uint8 minLevel);

    // ============ Errors ============

    error InvalidAddress();
    error DeployerNotApproved();
    error DeploymentNotFound();
    error NotDeploymentOwner();
    error InvalidSupply();
    error AlreadyHasModule();
    error InvalidKYCProof();
    error KYCLevelTooLow(uint8 required, uint8 provided);
    error KYCExpired();
    error CountryRestricted(uint16 countryCode);
    error InvalidKYCLevel();

    // ============ Modifiers ============

    modifier onlyApprovedDeployer() {
        if (requireApproval && !approvedDeployers[msg.sender] && msg.sender != owner()) {
            revert DeployerNotApproved();
        }
        _;
    }

    // ============ Initialization ============

    function initialize(
        address _admin,
        address _securityTokenImpl,
        address _projectNFTImpl,
        address _complianceImpl,
        address _kycVerifier,
        address _feeRecipient
    ) external initializer {
        if (_admin == address(0) || _securityTokenImpl == address(0) || 
            _complianceImpl == address(0) || _kycVerifier == address(0) ||
            _feeRecipient == address(0)) revert InvalidAddress();

        __Ownable_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _transferOwnership(_admin);

        implementations = Implementations({
            securityToken: _securityTokenImpl,
            projectNFT: _projectNFTImpl,
            compliance: _complianceImpl,
            tradeEscrow: address(0),
            dividendDistributor: address(0)
        });

        kycVerifier = _kycVerifier;
        platformFeeRecipient = _feeRecipient;
        escrowTransactionFeeBps = 100;
        requireApproval = true;
        requireKYCForDeployment = false;
        minKYCLevelForDeployment = 0;

        defaultRestrictedCountries.push(408); // North Korea
        defaultRestrictedCountries.push(364); // Iran
        defaultRestrictedCountries.push(760); // Syria
        defaultRestrictedCountries.push(192); // Cuba
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Internal KYC Verification ============

    function _verifyKYCProof(
        address _user,
        KYCProof calldata _proof,
        uint8 _minLevel,
        uint256 _deploymentId
    ) internal view {
        if (kycVerifier == address(0)) return;

        IKYCVerifier verifier = IKYCVerifier(kycVerifier);

        bool valid = verifier.verify(
            _user,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );

        if (!valid) revert InvalidKYCProof();
        if (_proof.level < _minLevel) revert KYCLevelTooLow(_minLevel, _proof.level);
        if (block.timestamp > _proof.expiry) revert KYCExpired();
        if (_isCountryRestricted(_proof.countryCode, _deploymentId)) revert CountryRestricted(_proof.countryCode);
    }

    function _isCountryRestricted(uint16 _countryCode, uint256 _deploymentId) internal view returns (bool) {
        if (_deploymentId > 0 && deploymentRestrictedCountries[_deploymentId][_countryCode]) {
            return true;
        }

        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                return true;
            }
        }

        return false;
    }

    // ============ Deployment Functions ============

    /**
     * @notice Deploy token with KYC verification
     * @dev Owner can bypass KYC by passing empty proof (expiry = 0)
     */
    function deployToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply,
        string calldata _metadataURI,
        uint8 _minKYCLevel,
        KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (
        uint256 deploymentId,
        address securityToken
    ) {
        _validateKYCForDeployment(_kycProof);
        if (_minKYCLevel > 4) revert InvalidKYCLevel();
        
        return _deployToken(_name, _symbol, _supply, _metadataURI, _minKYCLevel);
    }

    /**
     * @notice Deploy project NFT with KYC verification
     * @dev Owner can bypass KYC by passing empty proof (expiry = 0)
     */
    function deployProjectNFT(
        string calldata _name,
        string calldata _symbol,
        string calldata _metadataURI,
        KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (
        uint256 deploymentId,
        address projectNFT
    ) {
        _validateKYCForDeployment(_kycProof);
        
        return _deployProjectNFTOnly(_name, _symbol, _metadataURI);
    }

    /**
     * @notice Deploy NFT and token with KYC verification
     * @dev Owner can bypass KYC by passing empty proof (expiry = 0)
     */
    function deployNFTAndToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply,
        string calldata _metadataURI,
        uint8 _minKYCLevel,
        KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (
        uint256 deploymentId,
        address securityToken,
        address projectNFT
    ) {
        _validateKYCForDeployment(_kycProof);
        if (_minKYCLevel > 4) revert InvalidKYCLevel();
        
        return _deployNFTAndToken(_name, _symbol, _supply, _metadataURI, _minKYCLevel);
    }

    /**
     * @notice Deploy with escrow and KYC verification
     * @dev Owner can bypass KYC by passing empty proof (expiry = 0)
     */
    function deployWithEscrow(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply,
        string calldata _metadataURI,
        uint8 _minKYCLevel,
        KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (
        uint256 deploymentId,
        address securityToken,
        address projectNFT,
        address tradeEscrow
    ) {
        _validateKYCForDeployment(_kycProof);
        if (_minKYCLevel > 4) revert InvalidKYCLevel();
        
        return _deployWithEscrow(_name, _symbol, _supply, _metadataURI, _minKYCLevel);
    }

    /**
     * @notice Validate KYC for deployment - owner can bypass with empty proof
     */
    function _validateKYCForDeployment(KYCProof calldata _kycProof) internal view {
        // Owner can bypass KYC by passing empty proof
        if (_kycProof.expiry == 0 && msg.sender == owner()) {
            return;
        }
        
        if (requireKYCForDeployment) {
            _verifyKYCProof(msg.sender, _kycProof, minKYCLevelForDeployment, 0);
        }
    }

    // ============ Internal Deployment Logic ============

    function _deployToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply,
        string calldata _metadataURI,
        uint8 _minKYCLevel
    ) internal returns (uint256 deploymentId, address securityToken) {
        if (_supply == 0) revert InvalidSupply();

        deploymentId = deploymentCounter++;

        address compliance = _deployCompliance();
        securityToken = _deploySecurityToken(_name, _symbol, _supply, compliance);

        IRWAERC3643(securityToken).mint(msg.sender, _supply);
        _transferTokenOwnership(securityToken, msg.sender);

        deployments[deploymentId] = TokenDeployment({
            deploymentId: deploymentId,
            owner: msg.sender,
            securityToken: securityToken,
            projectNFT: address(0),
            tradeEscrow: address(0),
            dividendDistributor: address(0),
            deploymentType: DeploymentType.TOKEN_ONLY,
            deployedAt: block.timestamp,
            active: true,
            metadataURI: _metadataURI,
            minKYCLevel: _minKYCLevel
        });

        ownerDeployments[msg.sender].push(deploymentId);
        emit TokenDeployed(deploymentId, msg.sender, securityToken, _supply, DeploymentType.TOKEN_ONLY, _minKYCLevel);
    }

    function _deployProjectNFTOnly(
        string calldata _name,
        string calldata _symbol,
        string calldata _metadataURI
    ) internal returns (uint256 deploymentId, address projectNFT) {
        deploymentId = deploymentCounter++;
        projectNFT = _deployProjectNFT(_name, _symbol);

        deployments[deploymentId] = TokenDeployment({
            deploymentId: deploymentId,
            owner: msg.sender,
            securityToken: address(0),
            projectNFT: projectNFT,
            tradeEscrow: address(0),
            dividendDistributor: address(0),
            deploymentType: DeploymentType.NFT_ONLY,
            deployedAt: block.timestamp,
            active: true,
            metadataURI: _metadataURI,
            minKYCLevel: 0
        });

        ownerDeployments[msg.sender].push(deploymentId);
        emit ProjectNFTDeployed(deploymentId, msg.sender, projectNFT, DeploymentType.NFT_ONLY);
    }

    function _deployNFTAndToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply,
        string calldata _metadataURI,
        uint8 _minKYCLevel
    ) internal returns (uint256 deploymentId, address securityToken, address projectNFT) {
        if (_supply == 0) revert InvalidSupply();

        deploymentId = deploymentCounter++;

        address compliance = _deployCompliance();
        securityToken = _deploySecurityToken(_name, _symbol, _supply, compliance);

        projectNFT = _deployProjectNFT(
            string(abi.encodePacked(_name, " Project")), 
            string(abi.encodePacked(_symbol, "PRJ"))
        );

        IRWAERC3643(securityToken).mint(msg.sender, _supply);
        _transferTokenOwnership(securityToken, msg.sender);

        deployments[deploymentId] = TokenDeployment({
            deploymentId: deploymentId,
            owner: msg.sender,
            securityToken: securityToken,
            projectNFT: projectNFT,
            tradeEscrow: address(0),
            dividendDistributor: address(0),
            deploymentType: DeploymentType.NFT_AND_TOKEN,
            deployedAt: block.timestamp,
            active: true,
            metadataURI: _metadataURI,
            minKYCLevel: _minKYCLevel
        });

        ownerDeployments[msg.sender].push(deploymentId);
        emit TokenDeployed(deploymentId, msg.sender, securityToken, _supply, DeploymentType.NFT_AND_TOKEN, _minKYCLevel);
        emit ProjectNFTDeployed(deploymentId, msg.sender, projectNFT, DeploymentType.NFT_AND_TOKEN);
    }

    function _deployWithEscrow(
        string calldata _name,
        string calldata _symbol,
        uint256 _supply,
        string calldata _metadataURI,
        uint8 _minKYCLevel
    ) internal returns (uint256 deploymentId, address securityToken, address projectNFT, address tradeEscrow) {
        if (_supply == 0) revert InvalidSupply();
        if (implementations.tradeEscrow == address(0)) revert InvalidAddress();

        deploymentId = deploymentCounter++;

        address compliance = _deployCompliance();
        securityToken = _deploySecurityToken(_name, _symbol, _supply, compliance);
        projectNFT = _deployProjectNFT(
            string(abi.encodePacked(_name, " Project")), 
            string(abi.encodePacked(_symbol, "PRJ"))
        );
        tradeEscrow = _deployTradeEscrow(securityToken);

        IRWAERC3643(securityToken).mint(msg.sender, _supply);
        _transferTokenOwnership(securityToken, msg.sender);

        deployments[deploymentId] = TokenDeployment({
            deploymentId: deploymentId,
            owner: msg.sender,
            securityToken: securityToken,
            projectNFT: projectNFT,
            tradeEscrow: tradeEscrow,
            dividendDistributor: address(0),
            deploymentType: DeploymentType.NFT_TOKEN_ESCROW,
            deployedAt: block.timestamp,
            active: true,
            metadataURI: _metadataURI,
            minKYCLevel: _minKYCLevel
        });

        ownerDeployments[msg.sender].push(deploymentId);
        emit TokenDeployed(deploymentId, msg.sender, securityToken, _supply, DeploymentType.NFT_TOKEN_ESCROW, _minKYCLevel);
        emit ProjectNFTDeployed(deploymentId, msg.sender, projectNFT, DeploymentType.NFT_TOKEN_ESCROW);
        emit EscrowDeployed(deploymentId, msg.sender, tradeEscrow);
    }

    // ============ Add Modules ============

    function addEscrow(uint256 _deploymentId) external nonReentrant whenNotPaused returns (address tradeEscrow) {
        TokenDeployment storage deployment = deployments[_deploymentId];
        
        if (deployment.owner == address(0)) revert DeploymentNotFound();
        if (deployment.owner != msg.sender) revert NotDeploymentOwner();
        if (deployment.securityToken == address(0)) revert InvalidAddress();
        if (deployment.tradeEscrow != address(0)) revert AlreadyHasModule();
        if (implementations.tradeEscrow == address(0)) revert InvalidAddress();

        tradeEscrow = _deployTradeEscrow(deployment.securityToken);
        deployment.tradeEscrow = tradeEscrow;

        emit EscrowDeployed(_deploymentId, msg.sender, tradeEscrow);
    }

    function addDividendModule(uint256 _deploymentId) external nonReentrant whenNotPaused returns (address dividendDistributor) {
        TokenDeployment storage deployment = deployments[_deploymentId];
        
        if (deployment.owner == address(0)) revert DeploymentNotFound();
        if (deployment.owner != msg.sender) revert NotDeploymentOwner();
        if (deployment.securityToken == address(0)) revert InvalidAddress();
        if (deployment.dividendDistributor != address(0)) revert AlreadyHasModule();
        if (implementations.dividendDistributor == address(0)) revert InvalidAddress();

        dividendDistributor = address(new ERC1967Proxy(
            implementations.dividendDistributor,
            abi.encodeWithSignature(
                "initialize(address,address,address)",
                deployment.securityToken,
                msg.sender,
                platformFeeRecipient
            )
        ));

        deployment.dividendDistributor = dividendDistributor;
        emit DividendModuleDeployed(_deploymentId, msg.sender, dividendDistributor);
    }

    // ============ KYC Verification for Token Holders ============

    function verifyHolderKYC(
        address _holder,
        uint256 _deploymentId,
        KYCProof calldata _proof
    ) external view returns (bool valid) {
        TokenDeployment storage deployment = deployments[_deploymentId];
        if (deployment.owner == address(0)) revert DeploymentNotFound();

        _verifyKYCProof(_holder, _proof, deployment.minKYCLevel, _deploymentId);
        
        return true;
    }

    function getDeploymentMinKYCLevel(uint256 _deploymentId) external view returns (uint8) {
        return deployments[_deploymentId].minKYCLevel;
    }

    // ============ Internal Helpers ============

    function _deployCompliance() internal returns (address compliance) {
        compliance = address(new ERC1967Proxy(
            implementations.compliance,
            abi.encodeWithSignature("initialize(address)", address(this))
        ));
    }

    function _deploySecurityToken(
        string calldata _name,
        string calldata _symbol,
        uint256 _maxSupply,
        address _compliance
    ) internal returns (address securityToken) {
        securityToken = address(new ERC1967Proxy(
            implementations.securityToken,
            abi.encodeWithSignature(
                "initialize(string,string,address,address,address,uint256)",
                _name,
                _symbol,
                address(this),
                _compliance,
                kycVerifier,
                _maxSupply
            )
        ));
        IModularCompliance(_compliance).bindToken(securityToken);
    }

    function _deployProjectNFT(
        string memory _name,
        string memory _symbol
    ) internal returns (address projectNFT) {
        projectNFT = address(new ERC1967Proxy(
            implementations.projectNFT,
            abi.encodeWithSignature(
                "initialize(string,string,address)",
                _name,
                _symbol,
                msg.sender
            )
        ));
    }

    function _deployTradeEscrow(address _securityToken) internal returns (address tradeEscrow) {
        tradeEscrow = address(new ERC1967Proxy(
            implementations.tradeEscrow,
            abi.encodeWithSignature(
                "initialize(address,address,address,address,uint256)",
                msg.sender,
                _securityToken,
                kycVerifier,
                platformFeeRecipient,
                escrowTransactionFeeBps
            )
        ));
    }

    function _transferTokenOwnership(address _token, address _newOwner) internal {
        IRWAERC3643 token = IRWAERC3643(_token);
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), _newOwner);
        token.grantRole(token.MINTER_ROLE(), _newOwner);
        token.renounceRole(token.DEFAULT_ADMIN_ROLE(), address(this));
    }

    // ============ Admin Functions ============

    /**
     * @notice Set implementation address
     * @param _implType 0=securityToken, 1=projectNFT, 2=compliance, 3=tradeEscrow, 4=dividendDistributor
     */
    function setImplementation(uint8 _implType, address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        
        address oldImpl;
        if (_implType == 0) {
            oldImpl = implementations.securityToken;
            implementations.securityToken = _impl;
        } else if (_implType == 1) {
            oldImpl = implementations.projectNFT;
            implementations.projectNFT = _impl;
        } else if (_implType == 2) {
            oldImpl = implementations.compliance;
            implementations.compliance = _impl;
        } else if (_implType == 3) {
            oldImpl = implementations.tradeEscrow;
            implementations.tradeEscrow = _impl;
        } else if (_implType == 4) {
            oldImpl = implementations.dividendDistributor;
            implementations.dividendDistributor = _impl;
        }
        
        emit ImplementationUpdated(_implType, oldImpl, _impl);
    }

    function setKYCVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidAddress();
        emit KYCVerifierUpdated(kycVerifier, _verifier);
        kycVerifier = _verifier;
    }

    function setEscrowTransactionFee(uint256 _feeBps) external onlyOwner {
        require(_feeBps <= 1000, "Max 10%");
        escrowTransactionFeeBps = _feeBps;
    }

    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();
        platformFeeRecipient = _recipient;
    }

    function setRequireApproval(bool _require) external onlyOwner {
        requireApproval = _require;
    }

    function setDeployerApproval(address _deployer, bool _approved) external onlyOwner {
        if (_deployer == address(0)) revert InvalidAddress();
        approvedDeployers[_deployer] = _approved;
        emit DeployerApprovalUpdated(_deployer, _approved);
    }

    function deactivateDeployment(uint256 _deploymentId) external onlyOwner {
        if (deployments[_deploymentId].owner == address(0)) revert DeploymentNotFound();
        deployments[_deploymentId].active = false;
        emit DeploymentDeactivated(_deploymentId);
    }

    // ============ KYC Configuration ============

    function setKYCRequirement(bool _required, uint8 _minLevel) external onlyOwner {
        if (_minLevel > 4) revert InvalidKYCLevel();
        requireKYCForDeployment = _required;
        minKYCLevelForDeployment = _minLevel;
        emit KYCRequirementUpdated(_required, _minLevel);
    }

    function setDeploymentMinKYCLevel(uint256 _deploymentId, uint8 _minLevel) external {
        TokenDeployment storage deployment = deployments[_deploymentId];
        if (deployment.owner == address(0)) revert DeploymentNotFound();
        
        if (msg.sender != deployment.owner && msg.sender != owner()) {
            revert NotDeploymentOwner();
        }
        
        if (_minLevel > 4) revert InvalidKYCLevel();
        
        uint8 oldLevel = deployment.minKYCLevel;
        deployment.minKYCLevel = _minLevel;
        emit DeploymentKYCLevelUpdated(_deploymentId, oldLevel, _minLevel);
    }

    function setDeploymentCountryRestriction(
        uint256 _deploymentId, 
        uint16 _countryCode, 
        bool _restricted
    ) external {
        TokenDeployment storage deployment = deployments[_deploymentId];
        if (deployment.owner == address(0)) revert DeploymentNotFound();
        
        if (msg.sender != deployment.owner && msg.sender != owner()) {
            revert NotDeploymentOwner();
        }
        
        deploymentRestrictedCountries[_deploymentId][_countryCode] = _restricted;
        emit DeploymentCountryRestrictionUpdated(_deploymentId, _countryCode, _restricted);
    }

    function batchSetDeploymentCountryRestrictions(
        uint256 _deploymentId,
        uint16[] calldata _countryCodes,
        bool _restricted
    ) external {
        TokenDeployment storage deployment = deployments[_deploymentId];
        if (deployment.owner == address(0)) revert DeploymentNotFound();
        
        if (msg.sender != deployment.owner && msg.sender != owner()) {
            revert NotDeploymentOwner();
        }
        
        uint256 length = _countryCodes.length;
        for (uint256 i = 0; i < length; ++i) {
            deploymentRestrictedCountries[_deploymentId][_countryCodes[i]] = _restricted;
            emit DeploymentCountryRestrictionUpdated(_deploymentId, _countryCodes[i], _restricted);
        }
    }

    function addDefaultRestrictedCountry(uint16 _countryCode) external onlyOwner {
        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                return;
            }
        }
        defaultRestrictedCountries.push(_countryCode);
        emit DefaultRestrictedCountryUpdated(_countryCode, true);
    }

    function removeDefaultRestrictedCountry(uint16 _countryCode) external onlyOwner {
        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                defaultRestrictedCountries[i] = defaultRestrictedCountries[length - 1];
                defaultRestrictedCountries.pop();
                emit DefaultRestrictedCountryUpdated(_countryCode, false);
                return;
            }
        }
    }

    function getDefaultRestrictedCountries() external view returns (uint16[] memory) {
        return defaultRestrictedCountries;
    }

    function isCountryRestricted(uint16 _countryCode, uint256 _deploymentId) external view returns (bool) {
        return _isCountryRestricted(_countryCode, _deploymentId);
    }

    // ============ Pause Functions ============

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ View Functions ============

    function getDeployment(uint256 _deploymentId) external view returns (TokenDeployment memory) {
        return deployments[_deploymentId];
    }

    function getOwnerDeployments(address _owner) external view returns (uint256[] memory) {
        return ownerDeployments[_owner];
    }

    function getOwnerDeploymentCount(address _owner) external view returns (uint256) {
        return ownerDeployments[_owner].length;
    }

    function getImplementations() external view returns (Implementations memory) {
        return implementations;
    }

    function isDeployerApproved(address _deployer) external view returns (bool) {
        if (!requireApproval) return true;
        return approvedDeployers[_deployer] || _deployer == owner();
    }

    function getKYCVerifier() external view returns (address) {
        return kycVerifier;
    }

    receive() external payable {}
}