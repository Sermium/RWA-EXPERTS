// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../../interfaces/IModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "../../interfaces/IKYCVerifier.sol";
import "../../libraries/Constants.sol";

/**
 * @title AccreditedInvestorModule
 * @notice Compliance module that restricts transfers to accredited investors only
 * @dev Uses off-chain KYC proofs with level verification (level 3+ = accredited)
 */
contract AccreditedInvestorModule is 
    Initializable, 
    UUPSUpgradeable, 
    OwnableUpgradeable,
    PausableUpgradeable,
    IModule 
{
    // ============ Constants ============
    
    /// @notice KYC level required for accredited investor status
    uint8 public constant ACCREDITED_LEVEL = 3;
    
    /// @notice KYC level for institutional investors (also considered accredited)
    uint8 public constant INSTITUTIONAL_LEVEL = 4;
    
    // ============ Structs ============
    
    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }
    
    struct CachedAccreditation {
        uint8 kycLevel;
        uint16 countryCode;
        uint256 expiry;
        uint256 cachedAt;
        bool isAccredited;
    }
    
    // ============ State Variables ============
    
    /// @notice KYC verifier contract
    IKYCVerifier public kycVerifier;
    
    /// @notice Mapping of compliance => bound status
    mapping(address => bool) private _complianceBound;
    
    /// @notice Mapping of compliance => module enabled
    mapping(address => bool) private _moduleEnabled;
    
    /// @notice Mapping of compliance => account => exempt status
    mapping(address => mapping(address => bool)) private _exemptAddresses;
    
    /// @notice Cached accreditation status (compliance => wallet => CachedAccreditation)
    mapping(address => mapping(address => CachedAccreditation)) private _cachedAccreditation;
    
    /// @notice Minimum KYC level for accreditation per compliance (default: ACCREDITED_LEVEL)
    mapping(address => uint8) private _minAccreditedLevel;
    
    /// @notice Whether to allow institutional level as accredited
    mapping(address => bool) private _allowInstitutional;
    
    /// @notice Country restrictions per compliance (some countries may not recognize accreditation)
    mapping(address => mapping(uint16 => bool)) private _countryRestrictions;
    
    /// @notice Cache validity duration in seconds
    uint256 public cacheValidityDuration;
    
    // ============ Events ============
    
    event ModuleEnabled(address indexed compliance, bool enabled);
    event AddressExempted(address indexed compliance, address indexed account, bool exempt);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event AccreditationCached(
        address indexed compliance, 
        address indexed wallet, 
        uint8 level, 
        bool isAccredited
    );
    event MinAccreditedLevelUpdated(address indexed compliance, uint8 level);
    event InstitutionalAllowanceUpdated(address indexed compliance, bool allowed);
    event CountryRestrictionUpdated(address indexed compliance, uint16 countryCode, bool restricted);
    event CacheValidityUpdated(uint256 oldDuration, uint256 newDuration);
    
    // ============ Errors ============
    
    error ComplianceNotBound();
    error ComplianceAlreadyBound();
    error NotAccredited();
    error ZeroAddress();
    error Unauthorized();
    error InvalidKYCProof();
    error KYCExpired();
    error KYCLevelTooLow();
    error CountryNotEligible();
    error BatchSizeExceeded();
    error InvalidCacheDuration();
    error CacheExpired();
    
    // ============ Modifiers ============
    
    modifier onlyBoundCompliance(address _compliance) {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        _;
    }
    
    // ============ Constructor & Initializer ============
    
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }
    
    /**
     * @notice Initialize the module
     * @param _kycVerifier Address of the KYC verifier contract
     */
    function initialize(address _kycVerifier) external initializer {
        if (_kycVerifier == address(0)) revert ZeroAddress();
        
        __Ownable_init();
        _transferOwnership(msg.sender);
        __UUPSUpgradeable_init();
        __Pausable_init();
        
        kycVerifier = IKYCVerifier(_kycVerifier);
        cacheValidityDuration = 1 hours;
    }
    
    // ============ IModule Interface ============
    
    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }
    
    function canComplianceBind(address _compliance) external pure override returns (bool) {
        return _compliance != address(0);
    }
    
    function name() external pure override returns (string memory) {
        return "AccreditedInvestorModule";
    }
    
    // ============ Compliance Binding ============
    
    /**
     * @notice Bind this module to a compliance contract
     * @param _compliance Address of the compliance contract
     */
    function bindCompliance(address _compliance) external override {
        if (_compliance == address(0)) revert ZeroAddress();
        if (_complianceBound[_compliance]) revert ComplianceAlreadyBound();
        
        address boundToken = IModularCompliance(_compliance).getTokenBound();
        if (msg.sender != owner() && msg.sender != boundToken && msg.sender != _compliance) {
            revert Unauthorized();
        }
        
        _complianceBound[_compliance] = true;
        _moduleEnabled[_compliance] = true;
        _minAccreditedLevel[_compliance] = ACCREDITED_LEVEL;
        _allowInstitutional[_compliance] = true;
        
        emit ComplianceBound(_compliance);
    }
    
    /**
     * @notice Unbind this module from a compliance contract
     * @param _compliance Address of the compliance contract
     */
    function unbindCompliance(address _compliance) external override {
        if (!_complianceBound[_compliance]) revert ComplianceNotBound();
        if (msg.sender != owner() && msg.sender != _compliance) revert Unauthorized();
        
        _complianceBound[_compliance] = false;
        emit ComplianceUnbound(_compliance);
    }
    
    // ============ Accreditation Caching ============
    
    /**
     * @notice Cache accreditation status from KYC proof
     * @param _compliance Compliance contract address
     * @param _wallet Wallet address
     * @param _proof KYC proof from backend
     */
    function cacheAccreditation(
        address _compliance,
        address _wallet,
        KYCProof calldata _proof
    ) external onlyBoundCompliance(_compliance) whenNotPaused {
        _verifyCacheAccreditation(_compliance, _wallet, _proof);
        
        bool accreditedStatus = _checkAccreditationLevel(_compliance, _proof.level);
        
        _cachedAccreditation[_compliance][_wallet] = CachedAccreditation({
            kycLevel: _proof.level,
            countryCode: _proof.countryCode,
            expiry: _proof.expiry,
            cachedAt: block.timestamp,
            isAccredited: accreditedStatus
        });
        
        emit AccreditationCached(_compliance, _wallet, _proof.level, accreditedStatus);
    }
    
    /**
     * @notice Batch cache accreditation for multiple wallets
     * @param _compliance Compliance contract address
     * @param _wallets Array of wallet addresses
     * @param _proofs Array of KYC proofs
     */
    function batchCacheAccreditation(
        address _compliance,
        address[] calldata _wallets,
        KYCProof[] calldata _proofs
    ) external onlyBoundCompliance(_compliance) whenNotPaused {
        if (_wallets.length != _proofs.length) revert BatchSizeExceeded();
        if (_wallets.length > Constants.MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < _wallets.length; i++) {
            _verifyCacheAccreditation(_compliance, _wallets[i], _proofs[i]);
            
            bool accreditedStatus = _checkAccreditationLevel(_compliance, _proofs[i].level);
            
            _cachedAccreditation[_compliance][_wallets[i]] = CachedAccreditation({
                kycLevel: _proofs[i].level,
                countryCode: _proofs[i].countryCode,
                expiry: _proofs[i].expiry,
                cachedAt: block.timestamp,
                isAccredited: accreditedStatus
            });
            
            emit AccreditationCached(_compliance, _wallets[i], _proofs[i].level, accreditedStatus);
        }
    }
    
    /**
     * @notice Internal verification before caching
     */
    function _verifyCacheAccreditation(
        address _compliance,
        address _wallet,
        KYCProof calldata _proof
    ) internal view {
        // Verify signature with KYC verifier
        bool isValid = kycVerifier.verify(
            _wallet,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );
        
        if (!isValid) revert InvalidKYCProof();
        if (_proof.expiry < block.timestamp) revert KYCExpired();
        
        // Check country eligibility for accreditation
        if (_countryRestrictions[_compliance][_proof.countryCode]) {
            revert CountryNotEligible();
        }
    }
    
    /**
     * @notice Check if KYC level qualifies as accredited
     */
    function _checkAccreditationLevel(
        address _compliance,
        uint8 _level
    ) internal view returns (bool) {
        uint8 minLevel = _minAccreditedLevel[_compliance];
        
        // Check if level meets minimum accredited level
        if (_level >= minLevel) {
            return true;
        }
        
        // Check if institutional level is allowed and matches
        if (_allowInstitutional[_compliance] && _level == INSTITUTIONAL_LEVEL) {
            return true;
        }
        
        return false;
    }
    
    // ============ Module Check Functions ============
    
    /**
     * @notice Check if a transfer is compliant (uses cached accreditation)
     * @param _from Sender address
     * @param _to Recipient address
     * @param _amount Transfer amount (unused)
     * @param _compliance Compliance contract address
     * @return bool True if transfer is compliant
     */
    function moduleCheck(
        address _from,
        address _to,
        uint256 _amount,
        address _compliance
    ) external view override returns (bool) {
        if (!_complianceBound[_compliance]) return true;
        if (!_moduleEnabled[_compliance]) return true;
        
        // Check sender (skip for minting)
        if (_from != address(0) && !_isAccredited(_from, _compliance)) {
            return false;
        }
        
        // Check recipient (skip for burning)
        if (_to != address(0) && !_isAccredited(_to, _compliance)) {
            return false;
        }
        
        return true;
    }
    
    /**
     * @notice Internal accreditation check using cached data
     */
    function _isAccredited(
        address _account,
        address _compliance
    ) internal view returns (bool) {
        // Check if exempt
        if (_exemptAddresses[_compliance][_account]) {
            return true;
        }
        
        CachedAccreditation storage cached = _cachedAccreditation[_compliance][_account];
        
        // Check if cache exists
        if (cached.cachedAt == 0) {
            return false;
        }
        
        // Check if cache is still valid
        if (block.timestamp > cached.cachedAt + cacheValidityDuration) {
            return false;
        }
        
        // Check if KYC hasn't expired
        if (block.timestamp > cached.expiry) {
            return false;
        }
        
        // Check country restrictions
        if (_countryRestrictions[_compliance][cached.countryCode]) {
            return false;
        }
        
        return cached.isAccredited;
    }
    
    /**
     * @notice Check accreditation with real-time KYC proof
     * @param _compliance Compliance contract address
     * @param _wallet Wallet to check
     * @param _proof KYC proof
     * @return bool True if accredited
     */
    function checkWithProof(
        address _compliance,
        address _wallet,
        KYCProof calldata _proof
    ) external view onlyBoundCompliance(_compliance) returns (bool) {
        if (!_moduleEnabled[_compliance]) return true;
        
        // Check if exempt
        if (_exemptAddresses[_compliance][_wallet]) {
            return true;
        }
        
        // Verify the KYC proof
        bool isValid = kycVerifier.verify(
            _wallet,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );
        
        if (!isValid) return false;
        if (_proof.expiry < block.timestamp) return false;
        
        // Check country eligibility
        if (_countryRestrictions[_compliance][_proof.countryCode]) {
            return false;
        }
        
        // Check accreditation level
        return _checkAccreditationLevel(_compliance, _proof.level);
    }
    
    // ============ Module Action Hooks ============
    
    /**
     * @notice Called after minting - verifies accreditation
     */
    function moduleMintAction(
        address _to,
        uint256 _amount,
        address _compliance
    ) external view override {
        if (!_complianceBound[_compliance]) return;
        if (!_moduleEnabled[_compliance]) return;
        if (!_isAccredited(_to, _compliance)) revert NotAccredited();
    }
    
    /**
     * @notice Called after burning - no action needed
     */
    function moduleBurnAction(
        address _from,
        uint256 _amount,
        address _compliance
    ) external override {
        // No action required for burns
    }
    
    /**
     * @notice Called after transfer - no action needed (checked in moduleCheck)
     */
    function moduleTransferAction(
        address _from,
        address _to,
        uint256 _amount,
        address _compliance
    ) external override {
        // No action required - compliance checked in moduleCheck
    }
    
    // ============ Configuration Functions ============
    
    /**
     * @notice Set module enabled status
     * @param _compliance Compliance contract address
     * @param _enabled Whether module is enabled
     */
    function setModuleEnabled(
        address _compliance,
        bool _enabled
    ) external onlyOwner onlyBoundCompliance(_compliance) {
        _moduleEnabled[_compliance] = _enabled;
        emit ModuleEnabled(_compliance, _enabled);
    }
    
    /**
     * @notice Set address exemption
     * @param _compliance Compliance contract address
     * @param _account Account to exempt
     * @param _exempt Whether to exempt
     */
    function setAddressExempt(
        address _compliance,
        address _account,
        bool _exempt
    ) external onlyOwner onlyBoundCompliance(_compliance) {
        if (_account == address(0)) revert ZeroAddress();
        _exemptAddresses[_compliance][_account] = _exempt;
        emit AddressExempted(_compliance, _account, _exempt);
    }
    
    /**
     * @notice Batch set address exemptions
     * @param _compliance Compliance contract address
     * @param _accounts Accounts to exempt
     * @param _exempt Whether to exempt
     */
    function batchSetAddressExempt(
        address _compliance,
        address[] calldata _accounts,
        bool _exempt
    ) external onlyOwner onlyBoundCompliance(_compliance) {
        if (_accounts.length > Constants.MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < _accounts.length; i++) {
            if (_accounts[i] == address(0)) revert ZeroAddress();
            _exemptAddresses[_compliance][_accounts[i]] = _exempt;
            emit AddressExempted(_compliance, _accounts[i], _exempt);
        }
    }
    
    /**
     * @notice Set minimum KYC level for accreditation
     * @param _compliance Compliance contract address
     * @param _level Minimum level (typically 3 for accredited)
     */
    function setMinAccreditedLevel(
        address _compliance,
        uint8 _level
    ) external onlyOwner onlyBoundCompliance(_compliance) {
        if (_level > INSTITUTIONAL_LEVEL) revert KYCLevelTooLow();
        _minAccreditedLevel[_compliance] = _level;
        emit MinAccreditedLevelUpdated(_compliance, _level);
    }
    
    /**
     * @notice Set whether institutional level qualifies as accredited
     * @param _compliance Compliance contract address
     * @param _allowed Whether to allow
     */
    function setInstitutionalAllowed(
        address _compliance,
        bool _allowed
    ) external onlyOwner onlyBoundCompliance(_compliance) {
        _allowInstitutional[_compliance] = _allowed;
        emit InstitutionalAllowanceUpdated(_compliance, _allowed);
    }
    
    /**
     * @notice Set country restriction for accreditation
     * @param _compliance Compliance contract address
     * @param _countryCode ISO 3166-1 numeric country code
     * @param _restricted Whether country is restricted
     */
    function setCountryRestriction(
        address _compliance,
        uint16 _countryCode,
        bool _restricted
    ) external onlyOwner onlyBoundCompliance(_compliance) {
        _countryRestrictions[_compliance][_countryCode] = _restricted;
        emit CountryRestrictionUpdated(_compliance, _countryCode, _restricted);
    }
    
    /**
     * @notice Batch set country restrictions
     * @param _compliance Compliance contract address
     * @param _countryCodes Array of country codes
     * @param _restricted Whether countries are restricted
     */
    function batchSetCountryRestrictions(
        address _compliance,
        uint16[] calldata _countryCodes,
        bool _restricted
    ) external onlyOwner onlyBoundCompliance(_compliance) {
        if (_countryCodes.length > Constants.MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < _countryCodes.length; i++) {
            _countryRestrictions[_compliance][_countryCodes[i]] = _restricted;
            emit CountryRestrictionUpdated(_compliance, _countryCodes[i], _restricted);
        }
    }
    
    /**
     * @notice Set cache validity duration
     * @param _duration Duration in seconds
     */
    function setCacheValidityDuration(uint256 _duration) external onlyOwner {
        if (_duration == 0 || _duration > 7 days) revert InvalidCacheDuration();
        
        uint256 oldDuration = cacheValidityDuration;
        cacheValidityDuration = _duration;
        emit CacheValidityUpdated(oldDuration, _duration);
    }
    
    /**
     * @notice Update the KYC verifier contract
     * @param _kycVerifier New KYC verifier address
     */
    function setKYCVerifier(address _kycVerifier) external onlyOwner {
        if (_kycVerifier == address(0)) revert ZeroAddress();
        
        address oldVerifier = address(kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
        emit KYCVerifierUpdated(oldVerifier, _kycVerifier);
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if compliance is bound
     */
    function isComplianceBound(address _compliance) external view override returns (bool) {
        return _complianceBound[_compliance];
    }
    
    /**
     * @notice Check if module is enabled
     */
    function isModuleEnabled(address _compliance) external view returns (bool) {
        return _moduleEnabled[_compliance];
    }
    
    /**
     * @notice Check if address is exempt
     */
    function isExempt(
        address _compliance,
        address _account
    ) external view returns (bool) {
        return _exemptAddresses[_compliance][_account];
    }
    
    /**
     * @notice Check if address is accredited (using cache)
     */
    function isAccredited(
        address _account,
        address _compliance
    ) external view returns (bool) {
        return _isAccredited(_account, _compliance);
    }
    
    /**
     * @notice Get cached accreditation data
     */
    function getCachedAccreditation(
        address _compliance,
        address _wallet
    ) external view returns (
        uint8 kycLevel,
        uint16 countryCode,
        uint256 expiry,
        uint256 cachedAt,
        bool isAccreditedStatus,
        bool isCacheValid
    ) {
        CachedAccreditation storage cached = _cachedAccreditation[_compliance][_wallet];
        
        bool valid = cached.cachedAt > 0 &&
                     block.timestamp <= cached.cachedAt + cacheValidityDuration &&
                     block.timestamp <= cached.expiry;
        
        return (
            cached.kycLevel,
            cached.countryCode,
            cached.expiry,
            cached.cachedAt,
            cached.isAccredited,
            valid
        );
    }
    
    /**
     * @notice Get minimum accredited level for compliance
     */
    function getMinAccreditedLevel(address _compliance) external view returns (uint8) {
        return _minAccreditedLevel[_compliance];
    }
    
    /**
     * @notice Check if institutional level is allowed
     */
    function isInstitutionalAllowed(address _compliance) external view returns (bool) {
        return _allowInstitutional[_compliance];
    }
    
    /**
     * @notice Check if country is restricted
     */
    function isCountryRestricted(
        address _compliance,
        uint16 _countryCode
    ) external view returns (bool) {
        return _countryRestrictions[_compliance][_countryCode];
    }
    
    /**
     * @notice Get KYC verifier address
     */
    function getKYCVerifier() external view returns (address) {
        return address(kycVerifier);
    }
    
    // ============ Pause Functions ============
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // ============ Upgrade Authorization ============
    
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}