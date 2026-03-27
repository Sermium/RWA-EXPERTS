// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./KYCLib.sol";

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
 * @notice Factory for RWA tokenization with off-chain KYC
 */
contract RWATokenizationFactory is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using KYCLib for *;

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

    enum DeploymentType { TOKEN_ONLY, NFT_ONLY, NFT_AND_TOKEN, NFT_TOKEN_ESCROW }

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

    event TokenDeployed(uint256 indexed deploymentId, address indexed owner, address securityToken, uint256 supply, DeploymentType deploymentType, uint8 minKYCLevel);
    event ProjectNFTDeployed(uint256 indexed deploymentId, address indexed owner, address projectNFT, DeploymentType deploymentType);
    event EscrowDeployed(uint256 indexed deploymentId, address indexed owner, address tradeEscrow);
    event DividendModuleDeployed(uint256 indexed deploymentId, address indexed owner, address dividendDistributor);
    event ImplementationUpdated(string contractType, address indexed oldImpl, address indexed newImpl);
    event DeployerApprovalUpdated(address indexed deployer, bool approved);
    event DeploymentDeactivated(uint256 indexed deploymentId);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);

    error InvalidAddress();
    error DeployerNotApproved();
    error DeploymentNotFound();
    error NotDeploymentOwner();
    error InvalidSupply();
    error AlreadyHasModule();
    error InvalidKYCLevel();

    modifier onlyApprovedDeployer() {
        if (requireApproval && !approvedDeployers[msg.sender] && msg.sender != owner()) {
            revert DeployerNotApproved();
        }
        _;
    }

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

        defaultRestrictedCountries.push(408);
        defaultRestrictedCountries.push(364);
        defaultRestrictedCountries.push(760);
        defaultRestrictedCountries.push(192);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ============ Deploy Functions (4-param, no KYC) ============

    function deployToken(string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (uint256 deploymentId, address securityToken) {
        if (requireKYCForDeployment) revert KYCLib.KYCLevelTooLow(minKYCLevelForDeployment, 0);
        return _deployToken(_name, _symbol, _supply, _metadataURI, 1);
    }

    function deployProjectNFT(string calldata _name, string calldata _symbol, string calldata _metadataURI
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (uint256 deploymentId, address projectNFT) {
        if (requireKYCForDeployment) revert KYCLib.KYCLevelTooLow(minKYCLevelForDeployment, 0);
        return _deployProjectNFTOnly(_name, _symbol, _metadataURI);
    }

    function deployNFTAndToken(string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (uint256 deploymentId, address securityToken, address projectNFT) {
        if (requireKYCForDeployment) revert KYCLib.KYCLevelTooLow(minKYCLevelForDeployment, 0);
        return _deployNFTAndToken(_name, _symbol, _supply, _metadataURI, 1);
    }

    function deployWithEscrow(string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (uint256 deploymentId, address securityToken, address projectNFT, address tradeEscrow) {
        if (requireKYCForDeployment) revert KYCLib.KYCLevelTooLow(minKYCLevelForDeployment, 0);
        return _deployWithEscrow(_name, _symbol, _supply, _metadataURI, 1);
    }

    // ============ Deploy Functions (6-param, with KYC) ============

    function deployNFTAndTokenWithKYC(
        string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI,
        uint8 _minKYCLevel, KYCLib.KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (uint256 deploymentId, address securityToken, address projectNFT) {
        if (requireKYCForDeployment) {
            KYCLib.verifyKYCProof(kycVerifier, msg.sender, _kycProof, minKYCLevelForDeployment, defaultRestrictedCountries, deploymentRestrictedCountries, 0);
        }
        if (_minKYCLevel > 4) revert InvalidKYCLevel();
        return _deployNFTAndToken(_name, _symbol, _supply, _metadataURI, _minKYCLevel);
    }

    function deployWithEscrowAndKYC(
        string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI,
        uint8 _minKYCLevel, KYCLib.KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused onlyApprovedDeployer returns (uint256 deploymentId, address securityToken, address projectNFT, address tradeEscrow) {
        if (requireKYCForDeployment) {
            KYCLib.verifyKYCProof(kycVerifier, msg.sender, _kycProof, minKYCLevelForDeployment, defaultRestrictedCountries, deploymentRestrictedCountries, 0);
        }
        if (_minKYCLevel > 4) revert InvalidKYCLevel();
        return _deployWithEscrow(_name, _symbol, _supply, _metadataURI, _minKYCLevel);
    }

    // ============ Internal Deployment ============

    function _deployToken(string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI, uint8 _minKYCLevel
    ) internal returns (uint256 deploymentId, address securityToken) {
        if (_supply == 0) revert InvalidSupply();
        deploymentId = deploymentCounter++;
        address compliance = _deployCompliance();
        securityToken = _deploySecurityToken(_name, _symbol, _supply, compliance);
        IRWAERC3643(securityToken).mint(msg.sender, _supply);
        _transferTokenOwnership(securityToken, msg.sender);

        deployments[deploymentId] = TokenDeployment(deploymentId, msg.sender, securityToken, address(0), address(0), address(0), DeploymentType.TOKEN_ONLY, block.timestamp, true, _metadataURI, _minKYCLevel);
        ownerDeployments[msg.sender].push(deploymentId);
        emit TokenDeployed(deploymentId, msg.sender, securityToken, _supply, DeploymentType.TOKEN_ONLY, _minKYCLevel);
    }

    function _deployProjectNFTOnly(string calldata _name, string calldata _symbol, string calldata _metadataURI
    ) internal returns (uint256 deploymentId, address projectNFT) {
        deploymentId = deploymentCounter++;
        projectNFT = _deployProjectNFT(_name, _symbol);
        deployments[deploymentId] = TokenDeployment(deploymentId, msg.sender, address(0), projectNFT, address(0), address(0), DeploymentType.NFT_ONLY, block.timestamp, true, _metadataURI, 0);
        ownerDeployments[msg.sender].push(deploymentId);
        emit ProjectNFTDeployed(deploymentId, msg.sender, projectNFT, DeploymentType.NFT_ONLY);
    }

    function _deployNFTAndToken(string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI, uint8 _minKYCLevel
    ) internal returns (uint256 deploymentId, address securityToken, address projectNFT) {
        if (_supply == 0) revert InvalidSupply();
        deploymentId = deploymentCounter++;
        address compliance = _deployCompliance();
        securityToken = _deploySecurityToken(_name, _symbol, _supply, compliance);
        projectNFT = _deployProjectNFT(string(abi.encodePacked(_name, " Project")), string(abi.encodePacked(_symbol, "PRJ")));
        IRWAERC3643(securityToken).mint(msg.sender, _supply);
        _transferTokenOwnership(securityToken, msg.sender);

        deployments[deploymentId] = TokenDeployment(deploymentId, msg.sender, securityToken, projectNFT, address(0), address(0), DeploymentType.NFT_AND_TOKEN, block.timestamp, true, _metadataURI, _minKYCLevel);
        ownerDeployments[msg.sender].push(deploymentId);
        emit TokenDeployed(deploymentId, msg.sender, securityToken, _supply, DeploymentType.NFT_AND_TOKEN, _minKYCLevel);
        emit ProjectNFTDeployed(deploymentId, msg.sender, projectNFT, DeploymentType.NFT_AND_TOKEN);
    }

    function _deployWithEscrow(string calldata _name, string calldata _symbol, uint256 _supply, string calldata _metadataURI, uint8 _minKYCLevel
    ) internal returns (uint256 deploymentId, address securityToken, address projectNFT, address tradeEscrow) {
        if (_supply == 0) revert InvalidSupply();
        if (implementations.tradeEscrow == address(0)) revert InvalidAddress();
        deploymentId = deploymentCounter++;
        address compliance = _deployCompliance();
        securityToken = _deploySecurityToken(_name, _symbol, _supply, compliance);
        projectNFT = _deployProjectNFT(string(abi.encodePacked(_name, " Project")), string(abi.encodePacked(_symbol, "PRJ")));
        tradeEscrow = _deployTradeEscrow(securityToken);
        IRWAERC3643(securityToken).mint(msg.sender, _supply);
        _transferTokenOwnership(securityToken, msg.sender);

        deployments[deploymentId] = TokenDeployment(deploymentId, msg.sender, securityToken, projectNFT, tradeEscrow, address(0), DeploymentType.NFT_TOKEN_ESCROW, block.timestamp, true, _metadataURI, _minKYCLevel);
        ownerDeployments[msg.sender].push(deploymentId);
        emit TokenDeployed(deploymentId, msg.sender, securityToken, _supply, DeploymentType.NFT_TOKEN_ESCROW, _minKYCLevel);
        emit ProjectNFTDeployed(deploymentId, msg.sender, projectNFT, DeploymentType.NFT_TOKEN_ESCROW);
        emit EscrowDeployed(deploymentId, msg.sender, tradeEscrow);
    }

    // ============ Internal Helpers ============

    function _deployCompliance() internal returns (address) {
        return address(new ERC1967Proxy(implementations.compliance, abi.encodeWithSignature("initialize(address)", address(this))));
    }

    function _deploySecurityToken(string calldata _name, string calldata _symbol, uint256 _maxSupply, address _compliance) internal returns (address) {
        address token = address(new ERC1967Proxy(implementations.securityToken, abi.encodeWithSignature("initialize(string,string,address,address,address,uint256)", _name, _symbol, address(this), _compliance, kycVerifier, _maxSupply)));
        IModularCompliance(_compliance).bindToken(token);
        return token;
    }

    function _deployProjectNFT(string memory _name, string memory _symbol) internal returns (address) {
        return address(new ERC1967Proxy(implementations.projectNFT, abi.encodeWithSignature("initialize(string,string,address)", _name, _symbol, msg.sender)));
    }

    function _deployTradeEscrow(address _securityToken) internal returns (address) {
        return address(new ERC1967Proxy(implementations.tradeEscrow, abi.encodeWithSignature("initialize(address,address,address,address,uint256)", msg.sender, _securityToken, kycVerifier, platformFeeRecipient, escrowTransactionFeeBps)));
    }

    function _transferTokenOwnership(address _token, address _newOwner) internal {
        IRWAERC3643 token = IRWAERC3643(_token);
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), _newOwner);
        token.grantRole(token.MINTER_ROLE(), _newOwner);
        token.renounceRole(token.DEFAULT_ADMIN_ROLE(), address(this));
    }

    // ============ Add Modules ============

    function addEscrow(uint256 _deploymentId) external nonReentrant whenNotPaused returns (address tradeEscrow) {
        TokenDeployment storage d = deployments[_deploymentId];
        if (d.owner == address(0)) revert DeploymentNotFound();
        if (d.owner != msg.sender) revert NotDeploymentOwner();
        if (d.securityToken == address(0) || d.tradeEscrow != address(0)) revert AlreadyHasModule();
        if (implementations.tradeEscrow == address(0)) revert InvalidAddress();
        tradeEscrow = _deployTradeEscrow(d.securityToken);
        d.tradeEscrow = tradeEscrow;
        emit EscrowDeployed(_deploymentId, msg.sender, tradeEscrow);
    }

    function addDividendModule(uint256 _deploymentId) external nonReentrant whenNotPaused returns (address dividendDistributor) {
        TokenDeployment storage d = deployments[_deploymentId];
        if (d.owner == address(0)) revert DeploymentNotFound();
        if (d.owner != msg.sender) revert NotDeploymentOwner();
        if (d.securityToken == address(0) || d.dividendDistributor != address(0)) revert AlreadyHasModule();
        if (implementations.dividendDistributor == address(0)) revert InvalidAddress();
        dividendDistributor = address(new ERC1967Proxy(implementations.dividendDistributor, abi.encodeWithSignature("initialize(address,address,address)", d.securityToken, msg.sender, platformFeeRecipient)));
        d.dividendDistributor = dividendDistributor;
        emit DividendModuleDeployed(_deploymentId, msg.sender, dividendDistributor);
    }

    // ============ Admin Functions ============

    function setSecurityTokenImplementation(address _impl) external onlyOwner { if (_impl == address(0)) revert InvalidAddress(); emit ImplementationUpdated("SecurityToken", implementations.securityToken, _impl); implementations.securityToken = _impl; }
    function setProjectNFTImplementation(address _impl) external onlyOwner { if (_impl == address(0)) revert InvalidAddress(); emit ImplementationUpdated("ProjectNFT", implementations.projectNFT, _impl); implementations.projectNFT = _impl; }
    function setComplianceImplementation(address _impl) external onlyOwner { if (_impl == address(0)) revert InvalidAddress(); emit ImplementationUpdated("Compliance", implementations.compliance, _impl); implementations.compliance = _impl; }
    function setTradeEscrowImplementation(address _impl) external onlyOwner { if (_impl == address(0)) revert InvalidAddress(); emit ImplementationUpdated("TradeEscrow", implementations.tradeEscrow, _impl); implementations.tradeEscrow = _impl; }
    function setDividendDistributorImplementation(address _impl) external onlyOwner { if (_impl == address(0)) revert InvalidAddress(); emit ImplementationUpdated("DividendDistributor", implementations.dividendDistributor, _impl); implementations.dividendDistributor = _impl; }
    function setKYCVerifier(address _v) external onlyOwner { if (_v == address(0)) revert InvalidAddress(); emit KYCVerifierUpdated(kycVerifier, _v); kycVerifier = _v; }
    function setEscrowTransactionFee(uint256 _feeBps) external onlyOwner { require(_feeBps <= 1000, "Max 10%"); escrowTransactionFeeBps = _feeBps; }
    function setPlatformFeeRecipient(address _r) external onlyOwner { if (_r == address(0)) revert InvalidAddress(); platformFeeRecipient = _r; }
    function setRequireApproval(bool _r) external onlyOwner { requireApproval = _r; }
    function setDeployerApproval(address _d, bool _a) external onlyOwner { if (_d == address(0)) revert InvalidAddress(); approvedDeployers[_d] = _a; emit DeployerApprovalUpdated(_d, _a); }
    function deactivateDeployment(uint256 _id) external onlyOwner { if (deployments[_id].owner == address(0)) revert DeploymentNotFound(); deployments[_id].active = false; emit DeploymentDeactivated(_id); }
    function setKYCRequirement(bool _r, uint8 _l) external onlyOwner { if (_l > 4) revert InvalidKYCLevel(); requireKYCForDeployment = _r; minKYCLevelForDeployment = _l; }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    // ============ View Functions ============

    function getDeployment(uint256 _id) external view returns (TokenDeployment memory) { return deployments[_id]; }
    function getOwnerDeployments(address _o) external view returns (uint256[] memory) { return ownerDeployments[_o]; }
    function getOwnerDeploymentCount(address _o) external view returns (uint256) { return ownerDeployments[_o].length; }
    function getImplementations() external view returns (Implementations memory) { return implementations; }
    function isDeployerApproved(address _d) external view returns (bool) { return !requireApproval || approvedDeployers[_d] || _d == owner(); }
    function getKYCVerifier() external view returns (address) { return kycVerifier; }
    function getDefaultRestrictedCountries() external view returns (uint16[] memory) { return defaultRestrictedCountries; }

    receive() external payable {}
}