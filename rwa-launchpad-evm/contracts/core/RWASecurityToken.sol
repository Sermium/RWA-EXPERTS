// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IModularCompliance.sol";
import "../interfaces/IKYCVerifier.sol";
import "../libraries/Constants.sol";

/**
 * @title RWASecurityToken
 * @notice ERC-3643 compliant security token with off-chain KYC verification
 */
contract RWASecurityToken is 
    Initializable, 
    ERC20Upgradeable, 
    ERC20PausableUpgradeable, 
    ERC20SnapshotUpgradeable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");
    bytes32 public constant AGENT_ROLE = keccak256("AGENT_ROLE");
    bytes32 public constant RECOVERY_ROLE = keccak256("RECOVERY_ROLE");

    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }
    
    struct CachedKYC {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        uint256 cachedAt;
    }

    IModularCompliance public compliance;
    IKYCVerifier public kycVerifier;
    uint256 public maxSupply;
    address public onchainID;
    string public version;
    mapping(uint256 => uint256) private _snapshotBlocks;
    uint256 private _currentSnapshotId;
    mapping(string => bool) private _processedPaymentReferences;
    mapping(address => bool) private _frozen;
    mapping(address => uint256) private _frozenTokens;
    mapping(address => CachedKYC) private _cachedKYC;
    uint8 public minKYCLevel;
    mapping(uint16 => bool) private _restrictedCountries;
    uint256 public kycCacheValidityDuration;
    bool public kycEnforced;

    event UpdatedTokenInformation(string indexed _newName, string indexed _newSymbol, uint8 _newDecimals, string _newVersion, address indexed _newOnchainID);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ComplianceAdded(address indexed _compliance);
    event RecoverySuccess(address indexed _lostWallet, address indexed _newWallet, address indexed _investorOnchainID);
    event AddressFrozen(address indexed _userAddress, bool indexed _isFrozen, address indexed _owner);
    event TokensFrozen(address indexed _userAddress, uint256 _amount);
    event TokensUnfrozen(address indexed _userAddress, uint256 _amount);
    event MaxSupplyUpdated(uint256 oldMaxSupply, uint256 newMaxSupply);
    event TokensMinted(address indexed to, uint256 amount);
    event TokensBurned(address indexed from, uint256 amount);
    event SnapshotCreated(uint256 indexed snapshotId, uint256 blockNumber);
    event OffChainPaymentMinted(address indexed to, uint256 amount, string paymentReference);
    event KYCCached(address indexed wallet, uint8 level, uint16 countryCode, uint256 expiry);
    event MinKYCLevelUpdated(uint8 oldLevel, uint8 newLevel);
    event CountryRestrictionUpdated(uint16 indexed countryCode, bool restricted);
    event KYCEnforcementUpdated(bool enforced);

    error InvalidAddress();
    error MaxSupplyExceeded();
    error TransferNotCompliant();
    error KYCNotVerified();
    error KYCExpired();
    error KYCLevelTooLow();
    error CountryRestricted();
    error InvalidKYCProof();
    error BatchTooLarge();
    error ArrayLengthMismatch();
    error AddressIsFrozen();
    error InsufficientUnfrozenBalance();
    error AmountExceedsFrozenTokens();
    error RecoveryFailed();
    error PaymentAlreadyProcessed();
    error InvalidKYCLevel();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        address _admin,
        address _compliance,
        address _kycVerifier,
        uint256 _maxSupply
    ) external initializer {
        if (_admin == address(0) || _compliance == address(0) || _kycVerifier == address(0)) revert InvalidAddress();
        
        __ERC20_init(_name, _symbol);
        __ERC20Pausable_init();
        __ERC20Snapshot_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(MINTER_ROLE, _admin);
        _grantRole(BURNER_ROLE, _admin);
        _grantRole(COMPLIANCE_ROLE, _admin);
        _grantRole(SNAPSHOT_ROLE, _admin);
        _grantRole(AGENT_ROLE, _admin);
        _grantRole(RECOVERY_ROLE, _admin);

        compliance = IModularCompliance(_compliance);
        kycVerifier = IKYCVerifier(_kycVerifier);
        maxSupply = _maxSupply;
        version = "2.1.0";
        minKYCLevel = 1;
        kycCacheValidityDuration = 1 hours;
        kycEnforced = false;
        
        _restrictedCountries[408] = true;
        _restrictedCountries[364] = true;
        _restrictedCountries[760] = true;
        _restrictedCountries[192] = true;

        emit KYCVerifierUpdated(address(0), _kycVerifier);
        emit ComplianceAdded(_compliance);
    }

    function _authorizeUpgrade(address) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ============ KYC Functions ============
    
    function cacheKYC(address _wallet, KYCProof calldata _proof) external whenNotPaused {
        _verifyAndCacheKYC(_wallet, _proof);
    }
    
    function batchCacheKYC(address[] calldata _wallets, KYCProof[] calldata _proofs) external whenNotPaused {
        if (_wallets.length != _proofs.length) revert ArrayLengthMismatch();
        if (_wallets.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < _wallets.length; i++) {
            _verifyAndCacheKYC(_wallets[i], _proofs[i]);
        }
    }
    
    function _verifyAndCacheKYC(address _wallet, KYCProof calldata _proof) internal {
        if (!kycVerifier.verify(_wallet, _proof.level, _proof.countryCode, _proof.expiry, _proof.signature)) revert InvalidKYCProof();
        if (_proof.expiry < block.timestamp) revert KYCExpired();
        _cachedKYC[_wallet] = CachedKYC(_proof.level, _proof.countryCode, _proof.expiry, block.timestamp);
        emit KYCCached(_wallet, _proof.level, _proof.countryCode, _proof.expiry);
    }

    function batchForcedTransfer(address[] calldata _fromList, address[] calldata _toList, uint256[] calldata _amounts) external onlyRole(AGENT_ROLE) whenNotPaused {
        if (_fromList.length != _toList.length || _toList.length != _amounts.length) revert ArrayLengthMismatch();
        if (_fromList.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < _fromList.length; ++i) {
            if (_fromList[i] != address(0) && _toList[i] != address(0) && _hasValidKYC(_toList[i])) {
                if (compliance.canTransfer(_fromList[i], _toList[i], _amounts[i])) {
                    _transfer(_fromList[i], _toList[i], _amounts[i]);
                    compliance.transferred(_fromList[i], _toList[i], _amounts[i]);
                }
            }
        }
    }
    
    function _hasValidKYC(address _wallet) internal view returns (bool) {
        if (!kycEnforced) return true;
        CachedKYC storage c = _cachedKYC[_wallet];
        if (c.cachedAt == 0) return false;
        if (block.timestamp > c.cachedAt + kycCacheValidityDuration) return false;
        if (block.timestamp > c.expiry) return false;
        if (c.level < minKYCLevel) return false;
        if (_restrictedCountries[c.countryCode]) return false;
        return true;
    }
    
    function _verifyKYCWithProof(address _wallet, KYCProof calldata _proof) internal view {
        if (!kycEnforced) return;
        if (!kycVerifier.verify(_wallet, _proof.level, _proof.countryCode, _proof.expiry, _proof.signature)) revert InvalidKYCProof();
        if (_proof.expiry < block.timestamp) revert KYCExpired();
        if (_proof.level < minKYCLevel) revert KYCLevelTooLow();
        if (_restrictedCountries[_proof.countryCode]) revert CountryRestricted();
    }

    // ============ ERC-3643 Token Info ============

    function setName(string calldata _name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit UpdatedTokenInformation(_name, symbol(), decimals(), version, onchainID);
    }

    function setSymbol(string calldata _symbol) external onlyRole(DEFAULT_ADMIN_ROLE) {
        emit UpdatedTokenInformation(name(), _symbol, decimals(), version, onchainID);
    }

    function setOnchainID(address _onchainID) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_onchainID == address(0)) revert InvalidAddress();
        onchainID = _onchainID;
        emit UpdatedTokenInformation(name(), symbol(), decimals(), version, _onchainID);
    }

    // ============ Freeze Functions ============

    function setAddressFrozen(address _userAddress, bool _freeze) external onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0)) revert InvalidAddress();
        _frozen[_userAddress] = _freeze;
        emit AddressFrozen(_userAddress, _freeze, msg.sender);
    }

    function freezePartialTokens(address _userAddress, uint256 _amount) external onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0)) revert InvalidAddress();
        if (balanceOf(_userAddress) < _frozenTokens[_userAddress] + _amount) revert InsufficientUnfrozenBalance();
        _frozenTokens[_userAddress] += _amount;
        emit TokensFrozen(_userAddress, _amount);
    }

    function unfreezePartialTokens(address _userAddress, uint256 _amount) external onlyRole(AGENT_ROLE) {
        if (_userAddress == address(0)) revert InvalidAddress();
        if (_frozenTokens[_userAddress] < _amount) revert AmountExceedsFrozenTokens();
        _frozenTokens[_userAddress] -= _amount;
        emit TokensUnfrozen(_userAddress, _amount);
    }

    function batchSetAddressFrozen(address[] calldata _addrs, bool[] calldata _freeze) external onlyRole(AGENT_ROLE) {
        if (_addrs.length != _freeze.length) revert ArrayLengthMismatch();
        if (_addrs.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < _addrs.length; ++i) {
            if (_addrs[i] != address(0)) {
                _frozen[_addrs[i]] = _freeze[i];
                emit AddressFrozen(_addrs[i], _freeze[i], msg.sender);
            }
        }
    }

    function batchFreezePartialTokens(address[] calldata _addrs, uint256[] calldata _amounts) external onlyRole(AGENT_ROLE) {
        if (_addrs.length != _amounts.length) revert ArrayLengthMismatch();
        if (_addrs.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < _addrs.length; ++i) {
            if (_addrs[i] != address(0) && balanceOf(_addrs[i]) >= _frozenTokens[_addrs[i]] + _amounts[i]) {
                _frozenTokens[_addrs[i]] += _amounts[i];
                emit TokensFrozen(_addrs[i], _amounts[i]);
            }
        }
    }

    function batchUnfreezePartialTokens(address[] calldata _addrs, uint256[] calldata _amounts) external onlyRole(AGENT_ROLE) {
        if (_addrs.length != _amounts.length) revert ArrayLengthMismatch();
        if (_addrs.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < _addrs.length; ++i) {
            if (_addrs[i] != address(0) && _frozenTokens[_addrs[i]] >= _amounts[i]) {
                _frozenTokens[_addrs[i]] -= _amounts[i];
                emit TokensUnfrozen(_addrs[i], _amounts[i]);
            }
        }
    }

    // ============ Mint Functions ============
    
    function mint(address _to, uint256 _amount) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (_to == address(0)) revert InvalidAddress();
        if (totalSupply() + _amount > maxSupply) revert MaxSupplyExceeded();
        if (!_hasValidKYC(_to)) revert KYCNotVerified();
        _mint(_to, _amount);
        compliance.created(_to, _amount);
        emit TokensMinted(_to, _amount);
    }

    function mintWithKYC(address _to, uint256 _amount, KYCProof calldata _proof) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (_to == address(0)) revert InvalidAddress();
        if (totalSupply() + _amount > maxSupply) revert MaxSupplyExceeded();
        _verifyKYCWithProof(_to, _proof);
        _cachedKYC[_to] = CachedKYC(_proof.level, _proof.countryCode, _proof.expiry, block.timestamp);
        _mint(_to, _amount);
        compliance.created(_to, _amount);
        emit TokensMinted(_to, _amount);
        emit KYCCached(_to, _proof.level, _proof.countryCode, _proof.expiry);
    }

    function batchMint(address[] calldata _toList, uint256[] calldata _amounts) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (_toList.length != _amounts.length) revert ArrayLengthMismatch();
        if (_toList.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();
        uint256 totalMint;
        for (uint256 i = 0; i < _toList.length; ++i) totalMint += _amounts[i];
        if (totalSupply() + totalMint > maxSupply) revert MaxSupplyExceeded();
        for (uint256 i = 0; i < _toList.length; ++i) {
            if (_toList[i] != address(0) && _hasValidKYC(_toList[i])) {
                _mint(_toList[i], _amounts[i]);
                compliance.created(_toList[i], _amounts[i]);
                emit TokensMinted(_toList[i], _amounts[i]);
            }
        }
    }

    // ============ Off-Chain Payment Minting ============
    
    function mintForOffChainPayment(address _to, uint256 _amount, string calldata _ref) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (_to == address(0)) revert InvalidAddress();
        if (totalSupply() + _amount > maxSupply) revert MaxSupplyExceeded();
        if (!_hasValidKYC(_to)) revert KYCNotVerified();
        if (_processedPaymentReferences[_ref]) revert PaymentAlreadyProcessed();
        _processedPaymentReferences[_ref] = true;
        _mint(_to, _amount);
        compliance.created(_to, _amount);
        emit OffChainPaymentMinted(_to, _amount, _ref);
    }

    function isPaymentProcessed(string calldata _ref) external view returns (bool) {
        return _processedPaymentReferences[_ref];
    }

    // ============ Burn Functions ============

    function burn(address _userAddress, uint256 _amount) external onlyRole(BURNER_ROLE) whenNotPaused {
        if (_userAddress == address(0)) revert InvalidAddress();
        _burn(_userAddress, _amount);
        compliance.destroyed(_userAddress, _amount);
        emit TokensBurned(_userAddress, _amount);
    }

    function batchBurn(address[] calldata _addrs, uint256[] calldata _amounts) external onlyRole(BURNER_ROLE) whenNotPaused {
        if (_addrs.length != _amounts.length) revert ArrayLengthMismatch();
        if (_addrs.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();
        for (uint256 i = 0; i < _addrs.length; ++i) {
            if (_addrs[i] != address(0)) {
                _burn(_addrs[i], _amounts[i]);
                compliance.destroyed(_addrs[i], _amounts[i]);
                emit TokensBurned(_addrs[i], _amounts[i]);
            }
        }
    }

    // ============ Forced Transfer & Recovery ============

    function forcedTransfer(address _from, address _to, uint256 _amount) external onlyRole(AGENT_ROLE) whenNotPaused returns (bool) {
        if (_from == address(0) || _to == address(0)) revert InvalidAddress();
        if (!_hasValidKYC(_to)) revert KYCNotVerified();
        if (!compliance.canTransfer(_from, _to, _amount)) revert TransferNotCompliant();
        _transfer(_from, _to, _amount);
        compliance.transferred(_from, _to, _amount);
        return true;
    }

    function recoveryAddress(address _lostWallet, address _newWallet, address _investorOnchainID) external onlyRole(RECOVERY_ROLE) whenNotPaused returns (bool) {
        if (_lostWallet == address(0) || _newWallet == address(0) || _investorOnchainID == address(0)) revert InvalidAddress();
        if (!_hasValidKYC(_newWallet)) revert KYCNotVerified();
        uint256 balance = balanceOf(_lostWallet);
        if (balance == 0) revert RecoveryFailed();
        _frozenTokens[_newWallet] = _frozenTokens[_lostWallet];
        _frozenTokens[_lostWallet] = 0;
        _frozen[_newWallet] = _frozen[_lostWallet];
        _frozen[_lostWallet] = false;
        _transfer(_lostWallet, _newWallet, balance);
        emit RecoverySuccess(_lostWallet, _newWallet, _investorOnchainID);
        return true;
    }

    // ============ Snapshot ============

    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        uint256 id = _snapshot();
        _currentSnapshotId = id;
        _snapshotBlocks[id] = block.number;
        emit SnapshotCreated(id, block.number);
        return id;
    }

    // ============ Transfer Hooks ============

    function _beforeTokenTransfer(address from, address to, uint256 amount) internal override(ERC20Upgradeable, ERC20PausableUpgradeable, ERC20SnapshotUpgradeable) {
        if (from != address(0) && to != address(0)) {
            if (_frozen[from]) revert AddressIsFrozen();
            if (_frozen[to]) revert AddressIsFrozen();
            if (amount > balanceOf(from) - _frozenTokens[from]) revert InsufficientUnfrozenBalance();
            if (!_hasValidKYC(from)) revert KYCNotVerified();
            if (!_hasValidKYC(to)) revert KYCNotVerified();
            if (!compliance.canTransfer(from, to, amount)) revert TransferNotCompliant();
        }
        super._beforeTokenTransfer(from, to, amount);
    }

    function _afterTokenTransfer(address from, address to, uint256 amount) internal override {
        super._afterTokenTransfer(from, to, amount);
        if (from != address(0) && to != address(0)) compliance.transferred(from, to, amount);
    }

    // ============ Admin Functions ============

    function setCompliance(address _compliance) external onlyRole(COMPLIANCE_ROLE) {
        if (_compliance == address(0)) revert InvalidAddress();
        compliance = IModularCompliance(_compliance);
        emit ComplianceAdded(_compliance);
    }

    function setKYCVerifier(address _kycVerifier) external onlyRole(COMPLIANCE_ROLE) {
        if (_kycVerifier == address(0)) revert InvalidAddress();
        emit KYCVerifierUpdated(address(kycVerifier), _kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
    }

    function setMaxSupply(uint256 _maxSupply) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_maxSupply >= totalSupply(), "Below current supply");
        emit MaxSupplyUpdated(maxSupply, _maxSupply);
        maxSupply = _maxSupply;
    }
    
    function setMinKYCLevel(uint8 _level) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_level > 4) revert InvalidKYCLevel();
        emit MinKYCLevelUpdated(minKYCLevel, _level);
        minKYCLevel = _level;
    }
    
    function setCountryRestriction(uint16 _countryCode, bool _restricted) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _restrictedCountries[_countryCode] = _restricted;
        emit CountryRestrictionUpdated(_countryCode, _restricted);
    }
    
    function setKYCEnforced(bool _enforced) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kycEnforced = _enforced;
        emit KYCEnforcementUpdated(_enforced);
    }
       function setKYCCacheValidityDuration(uint256 _duration) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_duration == 0 || _duration > 7 days) revert InvalidKYCLevel();
        kycCacheValidityDuration = _duration;
    }

    // ============ View Functions ============

    function isFrozen(address _addr) external view returns (bool) { return _frozen[_addr]; }
    function getFrozenTokens(address _addr) external view returns (uint256) { return _frozenTokens[_addr]; }
    
    function getUnfrozenBalance(address _addr) external view returns (uint256) {
        uint256 b = balanceOf(_addr);
        uint256 f = _frozenTokens[_addr];
        return b > f ? b - f : 0;
    }
    
    function getCurrentSnapshotId() external view returns (uint256) { return _currentSnapshotId; }
    function getSnapshotBlock(uint256 _id) external view returns (uint256) { return _snapshotBlocks[_id]; }
    function isKYCValid(address _wallet) external view returns (bool) { return _hasValidKYC(_wallet); }
    
    function getCachedKYC(address _wallet) external view returns (uint8, uint16, uint256, uint256, bool) {
        CachedKYC storage c = _cachedKYC[_wallet];
        return (c.level, c.countryCode, c.expiry, c.cachedAt, _hasValidKYC(_wallet));
    }
    
    function isCountryRestricted(uint16 _code) external view returns (bool) { return _restrictedCountries[_code]; }
    function getKYCVerifier() external view returns (address) { return address(kycVerifier); }

    // ============ Pause ============

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }
}