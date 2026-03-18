// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "../../interfaces/IModule.sol";
import "../../interfaces/IModularCompliance.sol";
import "../../interfaces/IKYCVerifier.sol";
import "../../libraries/Constants.sol";

/**
 * @title CountryRestrictModule
 * @notice Compliance module that restricts token transfers based on investor country
 * @dev Uses off-chain KYC proofs with country codes for verification
 */
contract CountryRestrictModule is 
    Initializable, 
    OwnableUpgradeable, 
    UUPSUpgradeable,
    PausableUpgradeable,
    IModule 
{
    // ============ Structs ============
    
    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }
    
    struct CachedKYC {
        uint16 countryCode;
        uint8 level;
        uint256 expiry;
        uint256 cachedAt;
    }
    
    // ============ State Variables ============
    
    /// @notice KYC verifier contract
    IKYCVerifier public kycVerifier;
    
    /// @notice Mapping of compliance => country code => restricted status
    mapping(address => mapping(uint16 => bool)) private _restrictedCountries;
    
    /// @notice Mapping of compliance => bound status
    mapping(address => bool) private _complianceBound;
    
    /// @notice Mapping of compliance => module enabled
    mapping(address => bool) private _moduleEnabled;
    
    /// @notice Mapping of compliance => blacklist mode (true) or whitelist mode (false)
    mapping(address => bool) private _blacklistMode;
    
    /// @notice Mapping of compliance => require KYC registration
    mapping(address => bool) private _requireKYC;
    
    /// @notice Cached KYC data for addresses (compliance => wallet => CachedKYC)
    mapping(address => mapping(address => CachedKYC)) private _cachedKYC;
    
    /// @notice Minimum KYC level required per compliance
    mapping(address => uint8) private _minKYCLevel;
    
    /// @notice Cache validity duration in seconds (default 1 hour)
    uint256 public cacheValidityDuration;
    
    // ============ Events ============
    
    event CountryRestricted(address indexed compliance, uint16 indexed countryCode);
    event CountryUnrestricted(address indexed compliance, uint16 indexed countryCode);
    event ModuleEnabled(address indexed compliance, bool enabled);
    event ModeChanged(address indexed compliance, bool blacklistMode);
    event KYCRequirementChanged(address indexed compliance, bool required);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event KYCCached(address indexed compliance, address indexed wallet, uint16 countryCode, uint8 level);
    event MinKYCLevelUpdated(address indexed compliance, uint8 level);
    event CacheValidityUpdated(uint256 oldDuration, uint256 newDuration);
    
    // ============ Errors ============
    
    error ZeroAddress();
    error NotCompliance();
    error NotBound();
    error AlreadyBound();
    error InvalidCountryCode();
    error BatchSizeExceeded();
    error ModuleNotEnabled();
    error InvalidKYCProof();
    error KYCExpired();
    error KYCLevelTooLow();
    error CountryIsRestricted();
    error KYCNotCached();
    error InvalidCacheDuration();
    
    // ============ Modifiers ============
    
    modifier onlyCompliance(address _compliance) {
        if (!_complianceBound[_compliance]) revert NotBound();
        if (msg.sender != _compliance && msg.sender != owner()) revert NotCompliance();
        _;
    }
    
    modifier onlyBound(address _compliance) {
        if (!_complianceBound[_compliance]) revert NotBound();
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

    function isPlugAndPlay() external pure override returns (bool) {
        return true;
    }

    function canComplianceBind(address _compliance) external view override returns (bool) {
        return _compliance != address(0);
    }
    
    // ============ Compliance Binding ============
    
    /**
     * @notice Bind this module to a compliance contract
     * @param _compliance Address of the compliance contract
     */
    function bindCompliance(address _compliance) external override onlyOwner {
        if (_compliance == address(0)) revert ZeroAddress();
        if (_complianceBound[_compliance]) revert AlreadyBound();
        
        _complianceBound[_compliance] = true;
        _moduleEnabled[_compliance] = true;
        _blacklistMode[_compliance] = true; // Default to blacklist mode
        _requireKYC[_compliance] = true; // Default to require KYC
        _minKYCLevel[_compliance] = 1; // Default to basic level
    }
    
    /**
     * @notice Unbind this module from a compliance contract
     * @param _compliance Address of the compliance contract
     */
    function unbindCompliance(address _compliance) external override onlyCompliance(_compliance) {
        _complianceBound[_compliance] = false;
        _moduleEnabled[_compliance] = false;
    }
    
    // ============ KYC Proof Caching ============
    
    /**
     * @notice Cache KYC proof for a wallet
     * @dev Called before transfers to cache the KYC data
     * @param _compliance Compliance contract address
     * @param _wallet Wallet address
     * @param _proof KYC proof from backend
     */
    function cacheKYCProof(
        address _compliance,
        address _wallet,
        KYCProof calldata _proof
    ) external onlyBound(_compliance) whenNotPaused {
        _verifyCacheKYCProof(_compliance, _wallet, _proof);
        
        _cachedKYC[_compliance][_wallet] = CachedKYC({
            countryCode: _proof.countryCode,
            level: _proof.level,
            expiry: _proof.expiry,
            cachedAt: block.timestamp
        });
        
        emit KYCCached(_compliance, _wallet, _proof.countryCode, _proof.level);
    }
    
    /**
     * @notice Batch cache KYC proofs for multiple wallets
     * @param _compliance Compliance contract address
     * @param _wallets Array of wallet addresses
     * @param _proofs Array of KYC proofs
     */
    function batchCacheKYCProofs(
        address _compliance,
        address[] calldata _wallets,
        KYCProof[] calldata _proofs
    ) external onlyBound(_compliance) whenNotPaused {
        if (_wallets.length != _proofs.length) revert BatchSizeExceeded();
        if (_wallets.length > Constants.MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < _wallets.length; i++) {
            _verifyCacheKYCProof(_compliance, _wallets[i], _proofs[i]);
            
            _cachedKYC[_compliance][_wallets[i]] = CachedKYC({
                countryCode: _proofs[i].countryCode,
                level: _proofs[i].level,
                expiry: _proofs[i].expiry,
                cachedAt: block.timestamp
            });
            
            emit KYCCached(_compliance, _wallets[i], _proofs[i].countryCode, _proofs[i].level);
        }
    }
    
    /**
     * @notice Internal function to verify KYC proof before caching
     */
    function _verifyCacheKYCProof(
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
        if (_proof.level < _minKYCLevel[_compliance]) revert KYCLevelTooLow();
    }
    
    // ============ Country Restriction Management ============
    
    /**
     * @notice Add a country restriction
     * @param _compliance Compliance contract address
     * @param _countryCode ISO 3166-1 numeric country code
     */
    function addCountryRestriction(
        address _compliance,
        uint16 _countryCode
    ) external onlyCompliance(_compliance) {
        if (_countryCode == 0 || _countryCode > 999) revert InvalidCountryCode();
        
        _restrictedCountries[_compliance][_countryCode] = true;
        emit CountryRestricted(_compliance, _countryCode);
    }
    
    /**
     * @notice Remove a country restriction
     * @param _compliance Compliance contract address
     * @param _countryCode ISO 3166-1 numeric country code
     */
    function removeCountryRestriction(
        address _compliance,
        uint16 _countryCode
    ) external onlyCompliance(_compliance) {
        if (_countryCode == 0 || _countryCode > 999) revert InvalidCountryCode();
        
        _restrictedCountries[_compliance][_countryCode] = false;
        emit CountryUnrestricted(_compliance, _countryCode);
    }
    
    /**
     * @notice Batch add country restrictions
     * @param _compliance Compliance contract address
     * @param _countryCodes Array of ISO 3166-1 numeric country codes
     */
    function batchAddCountryRestrictions(
        address _compliance,
        uint16[] calldata _countryCodes
    ) external onlyCompliance(_compliance) {
        if (_countryCodes.length > Constants.MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < _countryCodes.length; i++) {
            if (_countryCodes[i] == 0 || _countryCodes[i] > 999) revert InvalidCountryCode();
            _restrictedCountries[_compliance][_countryCodes[i]] = true;
            emit CountryRestricted(_compliance, _countryCodes[i]);
        }
    }
    
    /**
     * @notice Batch remove country restrictions
     * @param _compliance Compliance contract address
     * @param _countryCodes Array of ISO 3166-1 numeric country codes
     */
    function batchRemoveCountryRestrictions(
        address _compliance,
        uint16[] calldata _countryCodes
    ) external onlyCompliance(_compliance) {
        if (_countryCodes.length > Constants.MAX_BATCH_SIZE) revert BatchSizeExceeded();
        
        for (uint256 i = 0; i < _countryCodes.length; i++) {
            if (_countryCodes[i] == 0 || _countryCodes[i] > 999) revert InvalidCountryCode();
            _restrictedCountries[_compliance][_countryCodes[i]] = false;
            emit CountryUnrestricted(_compliance, _countryCodes[i]);
        }
    }
    
    // ============ Module Configuration ============
    
    /**
     * @notice Set module enabled status
     * @param _compliance Compliance contract address
     * @param _enabled Whether the module is enabled
     */
    function setModuleEnabled(
        address _compliance,
        bool _enabled
    ) external onlyCompliance(_compliance) {
        _moduleEnabled[_compliance] = _enabled;
        emit ModuleEnabled(_compliance, _enabled);
    }
    
    /**
     * @notice Set blacklist mode
     * @param _compliance Compliance contract address
     * @param _blacklist True for blacklist mode, false for whitelist mode
     */
    function setBlacklistMode(
        address _compliance,
        bool _blacklist
    ) external onlyCompliance(_compliance) {
        _blacklistMode[_compliance] = _blacklist;
        emit ModeChanged(_compliance, _blacklist);
    }
    
    /**
     * @notice Set KYC requirement
     * @param _compliance Compliance contract address
     * @param _required Whether KYC is required
     */
    function setKYCRequired(
        address _compliance,
        bool _required
    ) external onlyCompliance(_compliance) {
        _requireKYC[_compliance] = _required;
        emit KYCRequirementChanged(_compliance, _required);
    }
    
    /**
     * @notice Set minimum KYC level for a compliance
     * @param _compliance Compliance contract address
     * @param _level Minimum KYC level (0-4)
     */
    function setMinKYCLevel(
        address _compliance,
        uint8 _level
    ) external onlyCompliance(_compliance) {
        if (_level > 4) revert KYCLevelTooLow();
        _minKYCLevel[_compliance] = _level;
        emit MinKYCLevelUpdated(_compliance, _level);
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
    
    // ============ Module Check Functions ============
    
    /**
     * @notice Check if a transfer is compliant
     * @dev Called by compliance contract during transfers
     * @param _from Sender address
     * @param _to Recipient address
     * @param _amount Transfer amount (unused in this module)
     * @return bool True if transfer is compliant
     */
    function moduleCheck(
        address _from,
        address _to,
        uint256 _amount,
        address _compliance
    ) external view override returns (bool) {
        if (!_moduleEnabled[_compliance]) {
            return true;
        }
        
        // Check sender (skip for minting)
        if (_from != address(0)) {
            if (!_checkCountryCompliance(_compliance, _from)) {
                return false;
            }
        }
        
        // Check recipient (skip for burning)
        if (_to != address(0)) {
            if (!_checkCountryCompliance(_compliance, _to)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @notice Internal country compliance check using cached KYC data
     * @param _compliance Compliance contract address
     * @param _wallet Wallet to check
     * @return bool True if compliant
     */
    function _checkCountryCompliance(
        address _compliance,
        address _wallet
    ) internal view returns (bool) {
        CachedKYC storage cached = _cachedKYC[_compliance][_wallet];
        
        // Check if KYC is required
        if (_requireKYC[_compliance]) {
            // Check if cache exists and is valid
            if (cached.cachedAt == 0) {
                return false; // No cached KYC
            }
            
            // Check if cache is still valid
            if (block.timestamp > cached.cachedAt + cacheValidityDuration) {
                return false; // Cache expired
            }
            
            // Check if KYC proof hasn't expired
            if (block.timestamp > cached.expiry) {
                return false; // KYC expired
            }
            
            // Check minimum KYC level
            if (cached.level < _minKYCLevel[_compliance]) {
                return false; // Level too low
            }
        }
        
        // Check country restrictions
        uint16 countryCode = cached.countryCode;
        
        // If no country code cached and KYC not required, allow
        if (countryCode == 0 && !_requireKYC[_compliance]) {
            return true;
        }
        
        bool isRestricted = _restrictedCountries[_compliance][countryCode];
        
        if (_blacklistMode[_compliance]) {
            // Blacklist mode: restricted countries are blocked
            return !isRestricted;
        } else {
            // Whitelist mode: only non-restricted (whitelisted) countries allowed
            return isRestricted;
        }
    }
    
    /**
     * @notice Check compliance with KYC proof (real-time verification)
     * @param _compliance Compliance contract address
     * @param _wallet Wallet to check
     * @param _proof KYC proof
     * @return bool True if compliant
     */
    function checkWithProof(
        address _compliance,
        address _wallet,
        KYCProof calldata _proof
    ) external view onlyBound(_compliance) returns (bool) {
        if (!_moduleEnabled[_compliance]) {
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
        if (_proof.level < _minKYCLevel[_compliance]) return false;
        
        // Check country restrictions
        bool isRestricted = _restrictedCountries[_compliance][_proof.countryCode];
        
        if (_blacklistMode[_compliance]) {
            return !isRestricted;
        } else {
            return isRestricted;
        }
    }
    
    // ============ Module Action Hooks (Placeholders) ============
    
    function moduleMintAction(address _to, uint256 _amount, address _compliance) external override {
        // Called after mint - can be used for logging or additional checks
    }
    
    function moduleBurnAction(address _from, uint256 _amount, address _compliance) external override {
        // Called after burn - can be used for logging or additional checks
    }
    
    function moduleTransferAction(
        address _from,
        address _to,
        uint256 _amount,
        address _compliance
    ) external override {
        // Called after transfer - can be used for logging or additional checks
    }
    
    // ============ View Functions ============
    
    /**
     * @notice Check if module is bound to a compliance
     * @param _compliance Compliance contract address
     * @return bool True if bound
     */
    function isComplianceBound(address _compliance) external view override returns (bool) {
        return _complianceBound[_compliance];
    }
    
    /**
     * @notice Check if module is enabled for a compliance
     * @param _compliance Compliance contract address
     * @return bool True if enabled
     */
    function isModuleEnabled(address _compliance) external view returns (bool) {
        return _moduleEnabled[_compliance];
    }
    
    /**
     * @notice Check if a country is restricted
     * @param _compliance Compliance contract address
     * @param _countryCode Country code to check
     * @return bool True if restricted
     */
    function isCountryRestricted(
        address _compliance,
        uint16 _countryCode
    ) external view returns (bool) {
        return _restrictedCountries[_compliance][_countryCode];
    }
    
    /**
     * @notice Check if blacklist mode is enabled
     * @param _compliance Compliance contract address
     * @return bool True if blacklist mode
     */
    function isBlacklistMode(address _compliance) external view returns (bool) {
        return _blacklistMode[_compliance];
    }
    
    /**
     * @notice Check if KYC is required
     * @param _compliance Compliance contract address
     * @return bool True if KYC required
     */
    function isKYCRequired(address _compliance) external view returns (bool) {
        return _requireKYC[_compliance];
    }
    
    /**
     * @notice Get minimum KYC level for a compliance
     * @param _compliance Compliance contract address
     * @return uint8 Minimum KYC level
     */
    function getMinKYCLevel(address _compliance) external view returns (uint8) {
        return _minKYCLevel[_compliance];
    }
    
    /**
     * @notice Get cached KYC data for a wallet
     * @param _compliance Compliance contract address
     * @param _wallet Wallet address
     * @return countryCode Country code
     * @return level KYC level
     * @return expiry KYC expiry timestamp
     * @return cachedAt Cache timestamp
     * @return isValid Whether cache is still valid
     */
    function getCachedKYC(
        address _compliance,
        address _wallet
    ) external view returns (
        uint16 countryCode,
        uint8 level,
        uint256 expiry,
        uint256 cachedAt,
        bool isValid
    ) {
        CachedKYC storage cached = _cachedKYC[_compliance][_wallet];
        
        bool valid = cached.cachedAt > 0 &&
                     block.timestamp <= cached.cachedAt + cacheValidityDuration &&
                     block.timestamp <= cached.expiry;
        
        return (
            cached.countryCode,
            cached.level,
            cached.expiry,
            cached.cachedAt,
            valid
        );
    }
    
    /**
     * @notice Get KYC verifier address
     * @return address KYC verifier contract address
     */
    function getKYCVerifier() external view returns (address) {
        return address(kycVerifier);
    }
    
    /**
     * @notice Get module name
     * @return string Module name
     */
    function name() external pure override returns (string memory) {
        return "CountryRestrictModule";
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