// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "../interfaces/IRWASecurityToken.sol";
import "../interfaces/IRWAProjectNFT.sol";
import "../interfaces/IModularCompliance.sol";
import "../interfaces/IRWAEscrowVault.sol";
import "../interfaces/IKYCVerifier.sol";
import "../libraries/Constants.sol";

/**
 * @title RWALaunchpadFactory
 * @notice Factory for creating RWA investment projects with off-chain KYC verification
 * @dev Uses KYCVerifier for signature-based KYC instead of on-chain IdentityRegistry
 */
contract RWALaunchpadFactory is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    // ============ Structs ============

    struct ImplementationAddresses {
        address securityToken;
        address escrowVault;
        address compliance;
        address kycVerifier; // Replaces identityRegistry
        address dividendDistributor;
        address maxBalanceModule;
        address lockupModule;
    }

    struct DeploymentRecord {
        uint256 projectId;
        address securityToken;
        address escrowVault;
        address compliance;
        address dividendDistributor;
        address maxBalanceModule;
        address lockupModule;
        address deployer;
        uint256 deployedAt;
        bool active;
        uint8 minKYCLevel; // Minimum KYC level required to invest
    }

    /// @notice KYC proof data for signature verification
    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }

    // ============ State Variables ============

    ImplementationAddresses public implementations;
    address public defaultPriceFeed;
    address public platformFeeRecipient;
    IRWAProjectNFT public projectNFT;

    uint256 public creationFee;
    uint256 public platformFeeBps;
    uint256 public projectCounter;

    mapping(uint256 => DeploymentRecord) public deployments;
    mapping(address => uint256[]) public deployerProjects;
    mapping(address => bool) public approvedDeployers;

    /// @notice Restricted countries per project (projectId => countryCode => restricted)
    mapping(uint256 => mapping(uint16 => bool)) public projectRestrictedCountries;
    
    /// @notice Default restricted countries for all projects
    uint16[] public defaultRestrictedCountries;

    bool public requireApproval;
    
    /// @notice Whether KYC is required to deploy projects
    bool public requireKYCForDeployment;
    
    /// @notice Minimum KYC level to deploy projects
    uint8 public minKYCLevelForDeployment;

    // ============ Events ============

    event ProjectDeployed(
        uint256 indexed projectId, 
        address indexed deployer, 
        address securityToken, 
        address escrowVault, 
        address compliance,
        uint8 minKYCLevel
    );
    event ImplementationUpdated(string contractType, address indexed oldImpl, address indexed newImpl);
    event CreationFeeUpdated(uint256 oldFee, uint256 newFee);
    event PlatformFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event DeployerApprovalUpdated(address indexed deployer, bool approved);
    event ProjectDeactivated(uint256 indexed projectId);
    event DefaultPriceFeedUpdated(address indexed oldFeed, address indexed newFeed);
    event ProjectNFTUpdated(address indexed oldNFT, address indexed newNFT);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ProjectKYCLevelUpdated(uint256 indexed projectId, uint8 oldLevel, uint8 newLevel);
    event ProjectCountryRestrictionUpdated(uint256 indexed projectId, uint16 countryCode, bool restricted);
    event DefaultRestrictedCountryUpdated(uint16 countryCode, bool restricted);
    event KYCRequirementUpdated(bool required, uint8 minLevel);

    // ============ Errors ============

    error InvalidAddress();
    error InvalidFee();
    error InsufficientFee();
    error InvalidDeadline();
    error TransferFailed();
    error DeployerNotApproved();
    error ProjectNotFound();
    error ArrayLengthMismatch();
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

    /**
     * @notice Verify KYC proof for an address
     * @param _user The user address to verify
     * @param _proof The KYC proof containing level, country, expiry and signature
     * @param _minLevel Minimum required KYC level
     * @param _projectId Project ID for country restrictions (0 for default)
     */
    modifier verifyKYC(
        address _user,
        KYCProof calldata _proof,
        uint8 _minLevel,
        uint256 _projectId
    ) {
        _verifyKYCProof(_user, _proof, _minLevel, _projectId);
        _;
    }

    // ============ Initialization ============

    function initialize(
        address _admin,
        address _securityTokenImpl,
        address _escrowVaultImpl,
        address _complianceImpl,
        address _kycVerifier,
        address _projectNFT,
        address _feeRecipient
    ) external initializer {
        if (_admin == address(0) || _securityTokenImpl == address(0) || _escrowVaultImpl == address(0) ||
            _complianceImpl == address(0) || _kycVerifier == address(0) || _projectNFT == address(0) ||
            _feeRecipient == address(0)) revert InvalidAddress();

        __Ownable_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        implementations = ImplementationAddresses({
            securityToken: _securityTokenImpl,
            escrowVault: _escrowVaultImpl,
            compliance: _complianceImpl,
            kycVerifier: _kycVerifier,
            dividendDistributor: address(0),
            maxBalanceModule: address(0),
            lockupModule: address(0)
        });

        projectNFT = IRWAProjectNFT(_projectNFT);
        platformFeeRecipient = _feeRecipient;
        creationFee = 0;
        platformFeeBps = Constants.PLATFORM_FEE_BPS;
        requireApproval = false;
        requireKYCForDeployment = false;
        minKYCLevelForDeployment = 0;

        // Set default restricted countries (OFAC list)
        // 408 = North Korea, 364 = Iran, 760 = Syria, 192 = Cuba
        defaultRestrictedCountries.push(408);
        defaultRestrictedCountries.push(364);
        defaultRestrictedCountries.push(760);
        defaultRestrictedCountries.push(192);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    // ============ Internal KYC Verification ============

    /**
     * @notice Internal function to verify KYC proof
     */
    function _verifyKYCProof(
        address _user,
        KYCProof calldata _proof,
        uint8 _minLevel,
        uint256 _projectId
    ) internal view {
        // Skip if no KYC verifier set (for testing/migration)
        if (implementations.kycVerifier == address(0)) {
            return;
        }

        IKYCVerifier verifier = IKYCVerifier(implementations.kycVerifier);

        // Verify signature
        bool valid = verifier.verify(
            _user,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );

        if (!valid) revert InvalidKYCProof();

        // Check level
        if (_proof.level < _minLevel) {
            revert KYCLevelTooLow(_minLevel, _proof.level);
        }

        // Check expiry
        if (block.timestamp > _proof.expiry) {
            revert KYCExpired();
        }

        // Check country restrictions
        if (_isCountryRestricted(_proof.countryCode, _projectId)) {
            revert CountryRestricted(_proof.countryCode);
        }
    }

    /**
     * @notice Check if a country is restricted for a project
     */
    function _isCountryRestricted(uint16 _countryCode, uint256 _projectId) internal view returns (bool) {
        // Check project-specific restriction first
        if (_projectId > 0 && projectRestrictedCountries[_projectId][_countryCode]) {
            return true;
        }

        // Check default restricted countries
        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                return true;
            }
        }

        return false;
    }

    // ============ Project Deployment ============

    /**
     * @notice Deploy a new RWA project without KYC (for backward compatibility)
     * @dev Only works if requireKYCForDeployment is false
     */
    function deployProject(
        string calldata _name,
        string calldata _symbol,
        address, // unused, kept for interface compatibility
        string calldata _category,
        uint256 _maxSupply,
        uint256 _fundingGoal,
        uint256 _deadlineDays,
        string calldata _metadataUri
    ) external payable nonReentrant whenNotPaused onlyApprovedDeployer returns (
        uint256 projectId,
        address securityToken,
        address escrowVault,
        address compliance
    ) {
        // If KYC is required, this function should not be used
        if (requireKYCForDeployment) {
            revert KYCLevelTooLow(minKYCLevelForDeployment, 0);
        }

        return _deployProject(
            _name,
            _symbol,
            _category,
            _maxSupply,
            _fundingGoal,
            _deadlineDays,
            _metadataUri,
            1 // Default min KYC level for investors
        );
    }

    /**
     * @notice Deploy a new RWA project with KYC verification
     * @param _name Token name
     * @param _symbol Token symbol
     * @param _category Project category
     * @param _maxSupply Maximum token supply
     * @param _fundingGoal Funding goal in USD
     * @param _deadlineDays Number of days until funding deadline
     * @param _metadataUri IPFS URI for project metadata
     * @param _minKYCLevel Minimum KYC level required for investors
     * @param _kycProof KYC proof for the deployer
     */
    function deployProjectWithKYC(
        string calldata _name,
        string calldata _symbol,
        string calldata _category,
        uint256 _maxSupply,
        uint256 _fundingGoal,
        uint256 _deadlineDays,
        string calldata _metadataUri,
        uint8 _minKYCLevel,
        KYCProof calldata _kycProof
    ) external payable nonReentrant whenNotPaused onlyApprovedDeployer returns (
        uint256 projectId,
        address securityToken,
        address escrowVault,
        address compliance
    ) {
        // Verify deployer's KYC if required
        if (requireKYCForDeployment) {
            _verifyKYCProof(msg.sender, _kycProof, minKYCLevelForDeployment, 0);
        }

        // Validate min KYC level
        if (_minKYCLevel > 4) revert InvalidKYCLevel();

        return _deployProject(
            _name,
            _symbol,
            _category,
            _maxSupply,
            _fundingGoal,
            _deadlineDays,
            _metadataUri,
            _minKYCLevel
        );
    }

    /**
     * @notice Internal project deployment logic
     */
    function _deployProject(
        string calldata _name,
        string calldata _symbol,
        string calldata _category,
        uint256 _maxSupply,
        uint256 _fundingGoal,
        uint256 _deadlineDays,
        string calldata _metadataUri,
        uint8 _minKYCLevel
    ) internal returns (
        uint256 projectId,
        address securityToken,
        address escrowVault,
        address compliance
    ) {
        if (msg.value < creationFee) revert InsufficientFee();
        if (_deadlineDays < Constants.MIN_DEADLINE_DAYS) revert InvalidDeadline();
        if (_fundingGoal < Constants.MIN_FUNDING_GOAL) revert InvalidFee();

        projectId = projectCounter++;

        // Deploy Compliance
        compliance = address(new ERC1967Proxy(
            implementations.compliance,
            abi.encodeWithSignature("initialize(address)", address(this))
        ));

        // Deploy Security Token with KYCVerifier instead of IdentityRegistry
        securityToken = address(new ERC1967Proxy(
            implementations.securityToken,
            abi.encodeWithSignature(
                "initialize(string,string,address,address,address,uint256)",
                _name,
                _symbol,
                address(this),
                compliance,
                implementations.kycVerifier,
                _maxSupply
            )
        ));

        // Deploy Escrow Vault
        escrowVault = address(new ERC1967Proxy(
            implementations.escrowVault,
            abi.encodeWithSignature(
                "initialize(address,address,address)",
                address(this),
                platformFeeRecipient,
                address(projectNFT)
            )
        ));

        // Deploy per-project modules
        address dividendDistributor;
        address maxBalanceModule;
        address lockupModule;

        // Deploy DividendDistributor if implementation is set
        if (implementations.dividendDistributor != address(0)) {
            dividendDistributor = address(new ERC1967Proxy(
                implementations.dividendDistributor,
                abi.encodeWithSignature(
                    "initialize(address,address,address)",
                    securityToken,
                    msg.sender,
                    platformFeeRecipient
                )
            ));
        }

        // Deploy MaxBalanceModule if implementation is set
        if (implementations.maxBalanceModule != address(0)) {
            maxBalanceModule = address(new ERC1967Proxy(
                implementations.maxBalanceModule,
                abi.encodeWithSignature("initialize(address)", securityToken)
            ));
            IModularCompliance(compliance).addModule(maxBalanceModule);
        }

        // Deploy LockupModule if implementation is set
        if (implementations.lockupModule != address(0)) {
            lockupModule = address(new ERC1967Proxy(
                implementations.lockupModule,
                abi.encodeWithSignature("initialize(address)", securityToken)
            ));
            IModularCompliance(compliance).addModule(lockupModule);
        }

        // Create Project NFT
        uint256 nftId = projectNFT.createProject(msg.sender, _name, _category, _fundingGoal, _metadataUri);

        // Link contracts
        projectNFT.linkSecurityToken(nftId, securityToken);
        projectNFT.linkEscrowVault(nftId, escrowVault);

        // Bind token to compliance
        IModularCompliance(compliance).bindToken(securityToken);

        // Setup roles
        _setupProjectRoles(securityToken, escrowVault, msg.sender);

        // Record deployment with min KYC level
        deployments[projectId] = DeploymentRecord({
            projectId: projectId,
            securityToken: securityToken,
            escrowVault: escrowVault,
            compliance: compliance,
            dividendDistributor: dividendDistributor,
            maxBalanceModule: maxBalanceModule,
            lockupModule: lockupModule,
            deployer: msg.sender,
            deployedAt: block.timestamp,
            active: true,
            minKYCLevel: _minKYCLevel
        });

        deployerProjects[msg.sender].push(projectId);

        // Transfer creation fee
        if (creationFee > 0 && msg.value > 0) {
            (bool success, ) = platformFeeRecipient.call{value: msg.value}("");
            if (!success) revert TransferFailed();
        }

        emit ProjectDeployed(projectId, msg.sender, securityToken, escrowVault, compliance, _minKYCLevel);
    }

    function _setupProjectRoles(address _securityToken, address _escrowVault, address _projectOwner) internal {
        IRWASecurityToken token = IRWASecurityToken(_securityToken);
        
        // Grant MINTER_ROLE to escrow vault
        token.grantRole(token.MINTER_ROLE(), _escrowVault);
        
        // Transfer admin to project owner
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), _projectOwner);
        token.renounceRole(token.DEFAULT_ADMIN_ROLE(), address(this));
    }

    // ============ KYC Verification for Investments ============

    /**
     * @notice Verify KYC for investment (called by escrow vault or other contracts)
     * @param _investor Investor address
     * @param _projectId Project ID
     * @param _proof KYC proof
     * @return valid True if KYC is valid for this project
     */
    function verifyInvestorKYC(
        address _investor,
        uint256 _projectId,
        KYCProof calldata _proof
    ) external view returns (bool valid) {
        DeploymentRecord storage deployment = deployments[_projectId];
        if (deployment.deployer == address(0)) revert ProjectNotFound();

        // This will revert if invalid
        _verifyKYCProof(_investor, _proof, deployment.minKYCLevel, _projectId);
        
        return true;
    }

    /**
     * @notice Get minimum KYC level for a project
     */
    function getProjectMinKYCLevel(uint256 _projectId) external view returns (uint8) {
        return deployments[_projectId].minKYCLevel;
    }

    // ============ Implementation Management ============

    function setSecurityTokenImplementation(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        address oldImpl = implementations.securityToken;
        implementations.securityToken = _impl;
        emit ImplementationUpdated("SecurityToken", oldImpl, _impl);
    }

    function setEscrowVaultImplementation(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        address oldImpl = implementations.escrowVault;
        implementations.escrowVault = _impl;
        emit ImplementationUpdated("EscrowVault", oldImpl, _impl);
    }

    function setComplianceImplementation(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        address oldImpl = implementations.compliance;
        implementations.compliance = _impl;
        emit ImplementationUpdated("Compliance", oldImpl, _impl);
    }

    /**
     * @notice Set KYC Verifier address (replaces setIdentityRegistry)
     */
    function setKYCVerifier(address _verifier) external onlyOwner {
        if (_verifier == address(0)) revert InvalidAddress();
        address oldVerifier = implementations.kycVerifier;
        implementations.kycVerifier = _verifier;
        emit KYCVerifierUpdated(oldVerifier, _verifier);
    }

    function setDividendDistributorImplementation(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        address oldImpl = implementations.dividendDistributor;
        implementations.dividendDistributor = _impl;
        emit ImplementationUpdated("DividendDistributor", oldImpl, _impl);
    }

    function setMaxBalanceModuleImplementation(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        address oldImpl = implementations.maxBalanceModule;
        implementations.maxBalanceModule = _impl;
        emit ImplementationUpdated("MaxBalanceModule", oldImpl, _impl);
    }

    function setLockupModuleImplementation(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        address oldImpl = implementations.lockupModule;
        implementations.lockupModule = _impl;
        emit ImplementationUpdated("LockupModule", oldImpl, _impl);
    }

    // ============ KYC Configuration ============

    /**
     * @notice Set KYC requirement for project deployment
     */
    function setKYCRequirement(bool _required, uint8 _minLevel) external onlyOwner {
        if (_minLevel > 4) revert InvalidKYCLevel();
        requireKYCForDeployment = _required;
        minKYCLevelForDeployment = _minLevel;
        emit KYCRequirementUpdated(_required, _minLevel);
    }

    /**
     * @notice Update minimum KYC level for an existing project
     */
    function setProjectMinKYCLevel(uint256 _projectId, uint8 _minLevel) external {
        DeploymentRecord storage deployment = deployments[_projectId];
        if (deployment.deployer == address(0)) revert ProjectNotFound();
        
        // Only project owner or factory owner can change
        if (msg.sender != deployment.deployer && msg.sender != owner()) {
            revert DeployerNotApproved();
        }
        
        if (_minLevel > 4) revert InvalidKYCLevel();
        
        uint8 oldLevel = deployment.minKYCLevel;
        deployment.minKYCLevel = _minLevel;
        emit ProjectKYCLevelUpdated(_projectId, oldLevel, _minLevel);
    }

    /**
     * @notice Set country restriction for a specific project
     */
    function setProjectCountryRestriction(
        uint256 _projectId, 
        uint16 _countryCode, 
        bool _restricted
    ) external {
        DeploymentRecord storage deployment = deployments[_projectId];
        if (deployment.deployer == address(0)) revert ProjectNotFound();
        
        // Only project owner or factory owner can change
        if (msg.sender != deployment.deployer && msg.sender != owner()) {
            revert DeployerNotApproved();
        }
        
        projectRestrictedCountries[_projectId][_countryCode] = _restricted;
        emit ProjectCountryRestrictionUpdated(_projectId, _countryCode, _restricted);
    }

    /**
     * @notice Batch set country restrictions for a project
     */
    function batchSetProjectCountryRestrictions(
        uint256 _projectId,
        uint16[] calldata _countryCodes,
        bool _restricted
    ) external {
        DeploymentRecord storage deployment = deployments[_projectId];
        if (deployment.deployer == address(0)) revert ProjectNotFound();
        
        if (msg.sender != deployment.deployer && msg.sender != owner()) {
            revert DeployerNotApproved();
        }
        
        uint256 length = _countryCodes.length;
        for (uint256 i = 0; i < length; ++i) {
            projectRestrictedCountries[_projectId][_countryCodes[i]] = _restricted;
            emit ProjectCountryRestrictionUpdated(_projectId, _countryCodes[i], _restricted);
        }
    }

    /**
     * @notice Add a default restricted country
     */
    function addDefaultRestrictedCountry(uint16 _countryCode) external onlyOwner {
        // Check if already exists
        uint256 length = defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (defaultRestrictedCountries[i] == _countryCode) {
                return; // Already exists
            }
        }
        defaultRestrictedCountries.push(_countryCode);
        emit DefaultRestrictedCountryUpdated(_countryCode, true);
    }

    /**
     * @notice Remove a default restricted country
     */
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

    /**
     * @notice Get all default restricted countries
     */
    function getDefaultRestrictedCountries() external view returns (uint16[] memory) {
        return defaultRestrictedCountries;
    }

    /**
     * @notice Check if a country is restricted for a project
     */
    function isCountryRestricted(uint16 _countryCode, uint256 _projectId) external view returns (bool) {
        return _isCountryRestricted(_countryCode, _projectId);
    }

    // ============ Fee Management ============

    function setCreationFee(uint256 _fee) external onlyOwner {
        if (_fee > Constants.MAX_CREATION_FEE) revert InvalidFee();
        uint256 oldFee = creationFee;
        creationFee = _fee;
        emit CreationFeeUpdated(oldFee, _fee);
    }

    function setPlatformFeeBps(uint256 _feeBps) external onlyOwner {
        if (_feeBps > Constants.MAX_FEE_BPS) revert InvalidFee();
        uint256 oldFee = platformFeeBps;
        platformFeeBps = _feeBps;
        emit PlatformFeeUpdated(oldFee, _feeBps);
    }

    function setPlatformFeeRecipient(address _recipient) external onlyOwner {
        if (_recipient == address(0)) revert InvalidAddress();
        address oldRecipient = platformFeeRecipient;
        platformFeeRecipient = _recipient;
        emit FeeRecipientUpdated(oldRecipient, _recipient);
    }

    // ============ Configuration ============

    function setDefaultPriceFeed(address _priceFeed) external onlyOwner {
        if (_priceFeed == address(0)) revert InvalidAddress();
        address oldFeed = defaultPriceFeed;
        defaultPriceFeed = _priceFeed;
        emit DefaultPriceFeedUpdated(oldFeed, _priceFeed);
    }

    function setProjectNFT(address _projectNFT) external onlyOwner {
        if (_projectNFT == address(0)) revert InvalidAddress();
        address oldNFT = address(projectNFT);
        projectNFT = IRWAProjectNFT(_projectNFT);
        emit ProjectNFTUpdated(oldNFT, _projectNFT);
    }

    function setRequireApproval(bool _require) external onlyOwner {
        requireApproval = _require;
    }

    function setDeployerApproval(address _deployer, bool _approved) external onlyOwner {
        if (_deployer == address(0)) revert InvalidAddress();
        approvedDeployers[_deployer] = _approved;
        emit DeployerApprovalUpdated(_deployer, _approved);
    }

    function batchSetDeployerApproval(address[] calldata _deployers, bool _approved) external onlyOwner {
        uint256 length = _deployers.length;
        for (uint256 i = 0; i < length; ++i) {
            if (_deployers[i] != address(0)) {
                approvedDeployers[_deployers[i]] = _approved;
                emit DeployerApprovalUpdated(_deployers[i], _approved);
            }
        }
    }

    function deactivateProject(uint256 _projectId) external onlyOwner {
        if (deployments[_projectId].deployer == address(0)) revert ProjectNotFound();
        deployments[_projectId].active = false;
        emit ProjectDeactivated(_projectId);
    }

    // ============ View Functions ============

    function getDeployment(uint256 _projectId) external view returns (DeploymentRecord memory) {
        return deployments[_projectId];
    }

    function getDeployerProjects(address _deployer) external view returns (uint256[] memory) {
        return deployerProjects[_deployer];
    }

    function getDeployerProjectCount(address _deployer) external view returns (uint256) {
        return deployerProjects[_deployer].length;
    }

    function getActiveProjects(uint256 _offset, uint256 _limit) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < projectCounter; ++i) {
            if (deployments[i].active) count++;
        }

        if (_offset >= count) return new uint256[](0);

        uint256 resultSize = _limit;
        if (_offset + _limit > count) resultSize = count - _offset;

        uint256[] memory result = new uint256[](resultSize);
        uint256 found = 0;
        uint256 added = 0;

        for (uint256 i = 0; i < projectCounter && added < resultSize; ++i) {
            if (deployments[i].active) {
                if (found >= _offset) {
                    result[added] = i;
                    added++;
                }
                found++;
            }
        }

        return result;
    }

    function getImplementations() external view returns (ImplementationAddresses memory) {
        return implementations;
    }

    function isDeployerApproved(address _deployer) external view returns (bool) {
        if (!requireApproval) return true;
        return approvedDeployers[_deployer];
    }

    /**
     * @notice Get KYC verifier address
     */
    function getKYCVerifier() external view returns (address) {
        return implementations.kycVerifier;
    }

    // ============ Pause Functions ============

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ Receive ============

    receive() external payable {}
}