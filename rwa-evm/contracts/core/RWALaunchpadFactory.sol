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
import "../libraries/Constants.sol";

/**
 * @title RWALaunchpadFactory
 * @notice Factory for deploying RWA investment projects
 * @dev All deployed contracts are upgradeable by the platform owner (deployer)
 */
contract RWALaunchpadFactory is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    // ============ Constants ============
    bytes32 public constant DEFAULT_ADMIN_ROLE = 0x0000000000000000000000000000000000000000000000000000000000000000;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    // ============ Structs ============
    struct Implementations {
        address securityToken;
        address escrowVault;
        address compliance;
        address kycVerifier;
        address dividendDistributor;
        address maxBalanceModule;
        address lockupModule;
    }

    struct Deployment {
        address securityToken;
        address escrowVault;
        address compliance;
        address deployer;
        uint256 deployedAt;
        bool active;
    }

    // ============ State ============
    Implementations public impl;
    IRWAProjectNFT public projectNFT;
    
    address public defaultPriceFeed;
    address public platformFeeRecipient;
    address public defaultUSDC;
    address public defaultUSDT;

    uint256 public creationFee;
    uint256 public platformFeeBps;
    uint256 public projectCounter;

    mapping(uint256 => Deployment) public deployments;
    mapping(address => uint256[]) private _deployerProjects;
    mapping(address => bool) public approvedDeployers;
    
    uint16[] private _defaultRestrictedCountries;
    bool public requireApproval;

    // ============ Events ============
    event ProjectDeployed(uint256 indexed projectId, address indexed deployer, address securityToken, address escrowVault, address compliance);
    event ImplementationUpdated(string indexed contractType, address newImpl);
    event ProjectDeactivated(uint256 indexed projectId);
    event ConfigUpdated(string indexed key);

    // ============ Errors ============
    error InvalidAddress();
    error InvalidFee();
    error InsufficientFee();
    error InvalidDeadline();
    error TransferFailed();
    error NotApproved();
    error ProjectNotFound();

    // ============ Modifiers ============
    modifier onlyApproved() {
        if (requireApproval && !approvedDeployers[msg.sender] && msg.sender != owner()) revert NotApproved();
        _;
    }

    // ============ Initialize ============
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
        _transferOwnership(_admin);

        impl = Implementations({
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
        platformFeeBps = Constants.PLATFORM_FEE_BPS;

        // Default restricted: North Korea (408), Iran (364), Syria (760), Cuba (192)
        _defaultRestrictedCountries.push(408);
        _defaultRestrictedCountries.push(364);
        _defaultRestrictedCountries.push(760);
        _defaultRestrictedCountries.push(192);
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ============ Project Deployment ============
    function deployProject(
        string calldata _name,
        string calldata _symbol,
        string calldata _category,
        uint256 _maxSupply,
        uint256 _fundingGoal,
        uint256 _deadlineDays,
        string calldata _metadataUri
    ) external payable nonReentrant whenNotPaused onlyApproved returns (uint256 projectId) {
        if (msg.value < creationFee) revert InsufficientFee();
        if (_deadlineDays < Constants.MIN_DEADLINE_DAYS) revert InvalidDeadline();
        if (_fundingGoal < Constants.MIN_FUNDING_GOAL) revert InvalidFee();

        projectId = projectCounter++;
        address platformOwner = owner();

        // Deploy compliance (Factory is temporary owner)
        address compliance = address(new ERC1967Proxy(
            impl.compliance,
            abi.encodeWithSignature("initialize(address)", address(this))
        ));

        // Deploy security token (Factory is temporary admin)
        address securityToken = address(new ERC1967Proxy(
            impl.securityToken,
            abi.encodeWithSignature(
                "initialize(string,string,address,address,address,uint256)",
                _name, _symbol, address(this), compliance, impl.kycVerifier, _maxSupply
            )
        ));

        // Deploy escrow vault (Factory is temporary admin)
        address escrowVault = address(new ERC1967Proxy(
            impl.escrowVault,
            abi.encodeWithSignature(
                "initialize(address,address,address)",
                address(this), platformFeeRecipient, address(projectNFT)
            )
        ));

        // Configure escrow
        _configureEscrow(escrowVault, projectId, securityToken, _fundingGoal, _deadlineDays);

        // Deploy and configure optional modules
        _deployModules(compliance, securityToken, platformOwner);

        // Create NFT and link contracts
        _createAndLinkNFT(projectId, securityToken, escrowVault, compliance, _name, _category, _fundingGoal, _metadataUri);

        // Transfer all ownership/roles to platform owner - CRITICAL
        _setupRoles(securityToken, escrowVault, compliance, platformOwner);

        // Record deployment
        deployments[projectId] = Deployment({
            securityToken: securityToken,
            escrowVault: escrowVault,
            compliance: compliance,
            deployer: msg.sender,
            deployedAt: block.timestamp,
            active: true
        });
        _deployerProjects[msg.sender].push(projectId);

        // Transfer creation fee
        if (creationFee > 0 && msg.value > 0) {
            (bool ok, ) = platformFeeRecipient.call{value: msg.value}("");
            if (!ok) revert TransferFailed();
        }

        emit ProjectDeployed(projectId, msg.sender, securityToken, escrowVault, compliance);
    }

    function _configureEscrow(
        address _escrow, 
        uint256 _projectId, 
        address _token, 
        uint256 _goal, 
        uint256 _days
    ) internal {
        uint256 deadline = block.timestamp + (_days * 1 days);
        IRWAEscrowVault(_escrow).createProject(
            _projectId, _token, address(0), defaultPriceFeed, 
            _goal, deadline, platformFeeBps, Constants.DEFAULT_MAX_PRICE_AGE
        );
        
        if (impl.kycVerifier != address(0)) {
            IRWAEscrowVault(_escrow).setKYCVerifier(impl.kycVerifier);
        }
        if (defaultUSDC != address(0)) {
            IRWAEscrowVault(_escrow).setPaymentTokens(defaultUSDC, defaultUSDT);
        }
    }

    function _deployModules(
        address _compliance, 
        address _securityToken, 
        address _platformOwner
    ) internal {
        if (impl.maxBalanceModule != address(0)) {
            address mod = address(new ERC1967Proxy(
                impl.maxBalanceModule, 
                abi.encodeWithSignature("initialize(address)", _securityToken)
            ));
            IModularCompliance(_compliance).addModule(mod);
            // Transfer module ownership to platform owner
            OwnableUpgradeable(mod).transferOwnership(_platformOwner);
        }
        
        if (impl.lockupModule != address(0)) {
            address mod = address(new ERC1967Proxy(
                impl.lockupModule, 
                abi.encodeWithSignature("initialize(address)", _securityToken)
            ));
            IModularCompliance(_compliance).addModule(mod);
            // Transfer module ownership to platform owner
            OwnableUpgradeable(mod).transferOwnership(_platformOwner);
        }
    }

    function _createAndLinkNFT(
        uint256 _projectId,
        address _securityToken,
        address _escrowVault,
        address _compliance,
        string calldata _name,
        string calldata _category,
        uint256 _fundingGoal,
        string calldata _metadataUri
    ) internal {
        uint256 nftId = projectNFT.createProject(msg.sender, _name, _category, _fundingGoal, _metadataUri);
        projectNFT.linkSecurityToken(nftId, _securityToken);
        projectNFT.linkEscrowVault(nftId, _escrowVault);
        IModularCompliance(_compliance).bindToken(_securityToken);
    }

    function _setupRoles(
        address _token, 
        address _escrow, 
        address _compliance,
        address _platformOwner
    ) internal {
        // Security Token: escrow can mint, project deployer + platform owner are admins
        IRWASecurityToken token = IRWASecurityToken(_token);
        token.grantRole(token.MINTER_ROLE(), _escrow);
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), msg.sender);  // Project deployer
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), _platformOwner);
        token.renounceRole(token.DEFAULT_ADMIN_ROLE(), address(this));

        // Escrow Vault: platform owner gets all admin roles for upgrades
        IRWAEscrowVault vault = IRWAEscrowVault(_escrow);
        vault.grantRole(DEFAULT_ADMIN_ROLE, _platformOwner);
        vault.grantRole(ADMIN_ROLE, _platformOwner);
        vault.grantRole(OPERATOR_ROLE, _platformOwner);
        vault.grantRole(DISPUTE_RESOLVER_ROLE, _platformOwner);
        
        // Compliance: transfer ownership to platform owner for upgrades
        IModularCompliance(_compliance).transferOwnership(_platformOwner);
    }

    // ============ Escrow Management (Owner Only) ============
    function grantEscrowRole(uint256 _projectId, bytes32 _role, address _account) external onlyOwner {
        Deployment storage d = deployments[_projectId];
        if (d.deployer == address(0)) revert ProjectNotFound();
        IRWAEscrowVault(d.escrowVault).grantRole(_role, _account);
    }

    function revokeEscrowRole(uint256 _projectId, bytes32 _role, address _account) external onlyOwner {
        Deployment storage d = deployments[_projectId];
        if (d.deployer == address(0)) revert ProjectNotFound();
        IRWAEscrowVault(d.escrowVault).revokeRole(_role, _account);
    }

    function upgradeEscrowVault(uint256 _projectId, address _newImpl) external onlyOwner {
        Deployment storage d = deployments[_projectId];
        if (d.deployer == address(0)) revert ProjectNotFound();
        IRWAEscrowVault(d.escrowVault).upgradeTo(_newImpl);
    }

    function updateEscrowPriceFeed(uint256 _projectId, address _priceFeed) external onlyOwner {
        Deployment storage d = deployments[_projectId];
        if (d.deployer == address(0)) revert ProjectNotFound();
        IRWAEscrowVault(d.escrowVault).updateProjectPriceFeed(_projectId, _priceFeed);
    }

    // ============ Project Activation ============
    function activateProject(uint256 _projectId) external {
        Deployment storage d = deployments[_projectId];
        if (d.deployer == address(0)) revert ProjectNotFound();
        if (msg.sender != d.deployer && msg.sender != owner()) revert NotApproved();
        IRWAEscrowVault(d.escrowVault).activateProject(_projectId);
    }

    function deactivateProject(uint256 _projectId) external onlyOwner {
        if (deployments[_projectId].deployer == address(0)) revert ProjectNotFound();
        deployments[_projectId].active = false;
        emit ProjectDeactivated(_projectId);
    }

    // ============ Implementation Setters ============
    function setSecurityTokenImpl(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        impl.securityToken = _impl;
        emit ImplementationUpdated("SecurityToken", _impl);
    }

    function setEscrowVaultImpl(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        impl.escrowVault = _impl;
        emit ImplementationUpdated("EscrowVault", _impl);
    }

    function setComplianceImpl(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        impl.compliance = _impl;
        emit ImplementationUpdated("Compliance", _impl);
    }

    function setKYCVerifier(address _impl) external onlyOwner {
        if (_impl == address(0)) revert InvalidAddress();
        impl.kycVerifier = _impl;
        emit ImplementationUpdated("KYCVerifier", _impl);
    }

    function setDividendDistributorImpl(address _impl) external onlyOwner {
        impl.dividendDistributor = _impl;
        emit ImplementationUpdated("DividendDistributor", _impl);
    }

    function setMaxBalanceModuleImpl(address _impl) external onlyOwner {
        impl.maxBalanceModule = _impl;
        emit ImplementationUpdated("MaxBalanceModule", _impl);
    }

    function setLockupModuleImpl(address _impl) external onlyOwner {
        impl.lockupModule = _impl;
        emit ImplementationUpdated("LockupModule", _impl);
    }

    // ============ Platform Config ============
    function setDefaultPriceFeed(address _feed) external onlyOwner { 
        defaultPriceFeed = _feed; 
        emit ConfigUpdated("defaultPriceFeed");
    }
    
    function setDefaultPaymentTokens(address _usdc, address _usdt) external onlyOwner { 
        defaultUSDC = _usdc; 
        defaultUSDT = _usdt; 
        emit ConfigUpdated("paymentTokens");
    }
    
    function setPlatformFeeRecipient(address _r) external onlyOwner { 
        if (_r == address(0)) revert InvalidAddress(); 
        platformFeeRecipient = _r; 
        emit ConfigUpdated("feeRecipient");
    }
    
    function setPlatformFeeBps(uint256 _bps) external onlyOwner { 
        if (_bps > Constants.MAX_FEE_BPS) revert InvalidFee(); 
        platformFeeBps = _bps; 
        emit ConfigUpdated("platformFeeBps");
    }
    
    function setCreationFee(uint256 _fee) external onlyOwner { 
        if (_fee > Constants.MAX_CREATION_FEE) revert InvalidFee(); 
        creationFee = _fee; 
        emit ConfigUpdated("creationFee");
    }
    
    function setProjectNFT(address _nft) external onlyOwner { 
        if (_nft == address(0)) revert InvalidAddress(); 
        projectNFT = IRWAProjectNFT(_nft); 
        emit ConfigUpdated("projectNFT");
    }
    
    function setRequireApproval(bool _r) external onlyOwner { 
        requireApproval = _r; 
        emit ConfigUpdated("requireApproval");
    }
    
    function setDeployerApproval(address _d, bool _a) external onlyOwner { 
        approvedDeployers[_d] = _a; 
    }

    // ============ Country Restrictions (Sanctions Compliance) ============
    function setDefaultRestrictedCountry(uint16 _country, bool _add) external onlyOwner {
        if (_add) {
            for (uint256 i = 0; i < _defaultRestrictedCountries.length; i++) {
                if (_defaultRestrictedCountries[i] == _country) return;
            }
            _defaultRestrictedCountries.push(_country);
        } else {
            for (uint256 i = 0; i < _defaultRestrictedCountries.length; i++) {
                if (_defaultRestrictedCountries[i] == _country) {
                    _defaultRestrictedCountries[i] = _defaultRestrictedCountries[_defaultRestrictedCountries.length - 1];
                    _defaultRestrictedCountries.pop();
                    return;
                }
            }
        }
    }

    function isCountryRestricted(uint16 _country) external view returns (bool) {
        for (uint256 i = 0; i < _defaultRestrictedCountries.length; i++) {
            if (_defaultRestrictedCountries[i] == _country) return true;
        }
        return false;
    }

    function getDefaultRestrictedCountries() external view returns (uint16[] memory) { 
        return _defaultRestrictedCountries; 
    }

    // ============ View Functions ============
    function getDeployment(uint256 _id) external view returns (Deployment memory) { 
        return deployments[_id]; 
    }
    
    function getDeployerProjects(address _d) external view returns (uint256[] memory) { 
        return _deployerProjects[_d]; 
    }
    
    function getImplementations() external view returns (Implementations memory) { 
        return impl; 
    }

    // ============ Pause ============
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    receive() external payable {}
}