// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "../interfaces/IIdentityRegistry.sol";
import "../libraries/Constants.sol";

contract KYCManager is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant REVIEWER_ROLE = keccak256("REVIEWER_ROLE");

    enum KYCLevel { NONE, BASIC, STANDARD, ACCREDITED, INSTITUTIONAL }
    enum KYCStatus { PENDING, APPROVED, REJECTED, EXPIRED }

    struct KYCSubmission {
        address investor;
        KYCLevel level;
        KYCStatus status;
        uint256 submittedAt;
        uint256 reviewedAt;
        uint256 expiresAt;
        address reviewer;
        string documentHash;
        uint16 countryCode;
    }

    struct UpgradeRequest {
        KYCLevel requestedLevel;
        string documentHash;
        uint256 submittedAt;
        bool pending;
    }

    // ============================================
    // STORAGE LAYOUT - DO NOT CHANGE ORDER OF EXISTING VARIABLES
    // ============================================
    
    IIdentityRegistry public identityRegistry;
    mapping(address => KYCSubmission) public submissions;
    mapping(address => uint256) public totalInvested;
    mapping(address => mapping(uint256 => uint256)) public projectInvestments;
    mapping(KYCLevel => uint256) public levelInvestmentLimits;
    mapping(uint16 => bool) public blockedCountries;
    mapping(address => bool) public authorizedEscrows;
    address[] private _pendingSubmissions;
    mapping(address => uint256) private _pendingIndex;
    uint256 public kycValidityPeriod;
    uint256 public autoVerifyThreshold;
    uint256 public kycFee;
    address public feeRecipient;
    uint256 public totalFeesCollected;

    mapping(address => UpgradeRequest) public upgradeRequests;
    address[] private _pendingUpgrades;
    mapping(address => uint256) private _pendingUpgradeIndex;

    // ============================================
    // NEW V3 STORAGE - Auto-registration settings
    // ============================================
    bool public autoRegisterInIdentityRegistry;
    KYCLevel public minLevelForIdentityRegistry; // ACCREDITED = can deploy tokens

    // ============================================
    // EVENTS
    // ============================================
    event KYCSubmitted(address indexed investor, KYCLevel level, string documentHash);
    event KYCApproved(address indexed investor, KYCLevel level, address indexed reviewer);
    event KYCRejected(address indexed investor, address indexed reviewer, string reason);
    event KYCExpired(address indexed investor);
    event InvestmentRecorded(address indexed investor, uint256 indexed projectId, uint256 amount);
    event InvestmentReversed(address indexed investor, uint256 indexed projectId, uint256 amount);
    event LevelLimitUpdated(KYCLevel level, uint256 newLimit);
    event CountryBlocked(uint16 indexed countryCode);
    event CountryUnblocked(uint16 indexed countryCode);
    event AutoVerified(address indexed investor, KYCLevel level);
    event EscrowAuthorized(address indexed escrow, bool authorized);
    event IdentityRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);
    event KYCFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeesWithdrawn(address indexed recipient, uint256 amount);
    event FeeCollected(address indexed investor, uint256 amount);
    event UpgradeRequested(address indexed investor, KYCLevel fromLevel, KYCLevel toLevel, string documentHash);
    event UpgradeApproved(address indexed investor, KYCLevel newLevel, address indexed reviewer);
    event UpgradeRejected(address indexed investor, KYCLevel currentLevel, address indexed reviewer, string reason);
    event IdentityRegistered(address indexed investor, uint16 countryCode);
    event AutoRegisterSettingUpdated(bool enabled, KYCLevel minLevel);

    // ============================================
    // ERRORS
    // ============================================
    error InvalidLevel();
    error AlreadySubmitted();
    error NotPending();
    error KYCExpiredError();
    error KYCNotApproved();
    error InvestmentLimitExceeded();
    error CountryBlockedError();
    error ZeroAddress();
    error BatchTooLarge();
    error InsufficientInvestment();
    error UnauthorizedEscrow();
    error NoUpgradePending();
    error UpgradeAlreadyPending();
    error CannotDowngrade();
    error MustHaveApprovedKYC();
    error InsufficientFee();
    error FeeTransferFailed();
    error InvalidFeeRecipient();
    error NoFeesToWithdraw();
    error IdentityRegistrationFailed();

    // ============================================
    // INITIALIZER
    // ============================================
    function initialize(address _identityRegistry, address _admin, address _feeRecipient) external initializer {
        if (_identityRegistry == address(0) || _admin == address(0)) revert ZeroAddress();
        if (_feeRecipient == address(0)) revert InvalidFeeRecipient();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(VERIFIER_ROLE, _admin);
        _grantRole(REVIEWER_ROLE, _admin);

        identityRegistry = IIdentityRegistry(_identityRegistry);
        kycValidityPeriod = Constants.DEFAULT_KYC_VALIDITY;
        autoVerifyThreshold = Constants.MIN_INVESTMENT;

        levelInvestmentLimits[KYCLevel.BASIC] = Constants.MAX_INVESTMENT_BASIC;
        levelInvestmentLimits[KYCLevel.STANDARD] = Constants.MAX_INVESTMENT_STANDARD;
        levelInvestmentLimits[KYCLevel.ACCREDITED] = Constants.MAX_INVESTMENT_ACCREDITED;
        levelInvestmentLimits[KYCLevel.INSTITUTIONAL] = type(uint256).max;
        
        kycFee = 0.05 ether;
        feeRecipient = _feeRecipient;
        
        // V3: Enable auto-registration for ACCREDITED and above
        autoRegisterInIdentityRegistry = true;
        minLevelForIdentityRegistry = KYCLevel.ACCREDITED;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ============================================
    // INTERNAL: Register in IdentityRegistry
    // ============================================
    function _registerInIdentityRegistry(address _investor, uint16 _countryCode) internal {
        if (!autoRegisterInIdentityRegistry) return;
        if (address(identityRegistry) == address(0)) return;
        
        // Check if already registered
        try identityRegistry.isVerified(_investor) returns (bool isVerified) {
            if (isVerified) return; // Already registered
        } catch {
            // If call fails, try to register anyway
        }
        
        // Register the identity
        // Using investor address as identity address (simplified - could use actual ONCHAINID)
        try identityRegistry.registerIdentity(_investor, _investor, _countryCode) {
            emit IdentityRegistered(_investor, _countryCode);
        } catch {
            // Don't revert if registration fails - KYC approval should still succeed
            // Admin can manually register later if needed
        }
    }

    // ============================================
    // INITIAL KYC SUBMISSION
    // ============================================
    function submitKYC(KYCLevel _level, string calldata _documentHash, uint16 _countryCode) external payable nonReentrant whenNotPaused {
        if (msg.value < kycFee) revert InsufficientFee();
        if (_level == KYCLevel.NONE) revert InvalidLevel();
        if (blockedCountries[_countryCode]) revert CountryBlockedError();

        KYCSubmission storage submission = submissions[msg.sender];
        
        if (submission.investor != address(0) && 
            submission.status != KYCStatus.REJECTED && 
            submission.status != KYCStatus.EXPIRED) {
            if (submission.status == KYCStatus.APPROVED) revert AlreadySubmitted();
            if (submission.status == KYCStatus.PENDING) revert AlreadySubmitted();
        }

        submission.investor = msg.sender;
        submission.level = _level;
        submission.status = KYCStatus.PENDING;
        submission.submittedAt = block.timestamp;
        submission.reviewedAt = 0;
        submission.expiresAt = 0;
        submission.reviewer = address(0);
        submission.documentHash = _documentHash;
        submission.countryCode = _countryCode;

        _addToPending(msg.sender);
        _handleFeeTransfer(msg.value);

        emit KYCSubmitted(msg.sender, _level, _documentHash);

        if (_level == KYCLevel.BASIC && autoVerifyThreshold > 0) {
            _autoVerify(msg.sender, submission);
        }
    }

    // ============================================
    // UPGRADE REQUEST
    // ============================================
    function requestUpgrade(KYCLevel _newLevel, string calldata _documentHash) external payable nonReentrant whenNotPaused {
        if (msg.value < kycFee) revert InsufficientFee();
        
        KYCSubmission storage submission = submissions[msg.sender];
        
        if (submission.status != KYCStatus.APPROVED) revert MustHaveApprovedKYC();
        if (_newLevel <= submission.level) revert CannotDowngrade();
        if (upgradeRequests[msg.sender].pending) revert UpgradeAlreadyPending();
        
        upgradeRequests[msg.sender] = UpgradeRequest({
            requestedLevel: _newLevel,
            documentHash: _documentHash,
            submittedAt: block.timestamp,
            pending: true
        });
        
        _addToPendingUpgrades(msg.sender);
        _handleFeeTransfer(msg.value);

        emit UpgradeRequested(msg.sender, submission.level, _newLevel, _documentHash);
    }

    // ============================================
    // APPROVAL FUNCTIONS
    // ============================================
    function approveKYC(address _investor, KYCLevel _approvedLevel) external onlyRole(REVIEWER_ROLE) whenNotPaused {
        KYCSubmission storage submission = submissions[_investor];
        if (submission.status != KYCStatus.PENDING) revert NotPending();

        submission.level = _approvedLevel;
        submission.status = KYCStatus.APPROVED;
        submission.reviewedAt = block.timestamp;
        submission.expiresAt = block.timestamp + kycValidityPeriod;
        submission.reviewer = msg.sender;

        _removeFromPending(_investor);
        
        // V3: Auto-register in IdentityRegistry if level qualifies
        if (_approvedLevel >= minLevelForIdentityRegistry) {
            _registerInIdentityRegistry(_investor, submission.countryCode);
        }
        
        emit KYCApproved(_investor, _approvedLevel, msg.sender);
    }

    function approveUpgrade(address _investor) external onlyRole(REVIEWER_ROLE) whenNotPaused {
        UpgradeRequest storage request = upgradeRequests[_investor];
        if (!request.pending) revert NoUpgradePending();
        
        KYCSubmission storage submission = submissions[_investor];
        KYCLevel previousLevel = submission.level;
        KYCLevel newLevel = request.requestedLevel;
        
        submission.level = newLevel;
        submission.reviewedAt = block.timestamp;
        submission.expiresAt = block.timestamp + kycValidityPeriod;
        submission.reviewer = msg.sender;
        submission.documentHash = request.documentHash;
        
        request.pending = false;
        _removeFromPendingUpgrades(_investor);
        
        // V3: Auto-register in IdentityRegistry if upgrading to qualifying level
        if (newLevel >= minLevelForIdentityRegistry && previousLevel < minLevelForIdentityRegistry) {
            _registerInIdentityRegistry(_investor, submission.countryCode);
        }
        
        emit UpgradeApproved(_investor, newLevel, msg.sender);
    }

    // ============================================
    // REJECTION FUNCTIONS
    // ============================================
    function rejectKYC(address _investor, string calldata _reason) external onlyRole(REVIEWER_ROLE) whenNotPaused {
        KYCSubmission storage submission = submissions[_investor];
        if (submission.status != KYCStatus.PENDING) revert NotPending();

        submission.status = KYCStatus.REJECTED;
        submission.reviewedAt = block.timestamp;
        submission.reviewer = msg.sender;

        _removeFromPending(_investor);
        emit KYCRejected(_investor, msg.sender, _reason);
    }

    function rejectUpgrade(address _investor, string calldata _reason) external onlyRole(REVIEWER_ROLE) whenNotPaused {
        UpgradeRequest storage request = upgradeRequests[_investor];
        if (!request.pending) revert NoUpgradePending();
        
        KYCSubmission storage submission = submissions[_investor];
        KYCLevel currentLevel = submission.level;
        
        request.pending = false;
        _removeFromPendingUpgrades(_investor);
        
        emit UpgradeRejected(_investor, currentLevel, msg.sender, _reason);
    }

    // ============================================
    // ADMIN: Reset KYC
    // ============================================
    function resetKYC(address _investor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        KYCSubmission storage submission = submissions[_investor];
        
        submission.investor = address(0);
        submission.level = KYCLevel.NONE;
        submission.status = KYCStatus.PENDING;
        submission.submittedAt = 0;
        submission.reviewedAt = 0;
        submission.expiresAt = 0;
        submission.reviewer = address(0);
        submission.documentHash = "";
        submission.countryCode = 0;
        
        upgradeRequests[_investor].pending = false;
        
        _removeFromPending(_investor);
        _removeFromPendingUpgrades(_investor);
    }

    // ============================================
    // ADMIN: Manual Identity Registration
    // ============================================
    function registerIdentityManually(address _investor) external onlyRole(DEFAULT_ADMIN_ROLE) {
        KYCSubmission storage submission = submissions[_investor];
        if (submission.status != KYCStatus.APPROVED) revert KYCNotApproved();
        
        _registerInIdentityRegistry(_investor, submission.countryCode);
    }

    // ============================================
    // ADMIN: Auto-Register Settings
    // ============================================
    function setAutoRegisterSettings(bool _enabled, KYCLevel _minLevel) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoRegisterInIdentityRegistry = _enabled;
        minLevelForIdentityRegistry = _minLevel;
        emit AutoRegisterSettingUpdated(_enabled, _minLevel);
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================
    function _handleFeeTransfer(uint256 _amount) internal {
        if (_amount > 0) {
            totalFeesCollected += _amount;
            emit FeeCollected(msg.sender, _amount);
            
            if (feeRecipient != address(0) && feeRecipient != msg.sender) {
                (bool success, ) = feeRecipient.call{value: _amount}("");
                if (!success) revert FeeTransferFailed();
            }
        }
    }

    function _autoVerify(address _investor, KYCSubmission storage _submission) internal {
        _submission.status = KYCStatus.APPROVED;
        _submission.reviewedAt = block.timestamp;
        _submission.expiresAt = block.timestamp + kycValidityPeriod;
        _submission.reviewer = address(this);

        _removeFromPending(_investor);
        emit AutoVerified(_investor, _submission.level);
    }

    function _addToPending(address _investor) internal {
        if (_pendingIndex[_investor] == 0) {
            _pendingSubmissions.push(_investor);
            _pendingIndex[_investor] = _pendingSubmissions.length;
        }
    }

    function _removeFromPending(address _investor) internal {
        uint256 indexPlusOne = _pendingIndex[_investor];
        if (indexPlusOne == 0) return;

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _pendingSubmissions.length - 1;

        if (index != lastIndex) {
            address lastInvestor = _pendingSubmissions[lastIndex];
            _pendingSubmissions[index] = lastInvestor;
            _pendingIndex[lastInvestor] = indexPlusOne;
        }

        _pendingSubmissions.pop();
        delete _pendingIndex[_investor];
    }

    function _addToPendingUpgrades(address _investor) internal {
        if (_pendingUpgradeIndex[_investor] == 0) {
            _pendingUpgrades.push(_investor);
            _pendingUpgradeIndex[_investor] = _pendingUpgrades.length;
        }
    }

    function _removeFromPendingUpgrades(address _investor) internal {
        uint256 indexPlusOne = _pendingUpgradeIndex[_investor];
        if (indexPlusOne == 0) return;

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = _pendingUpgrades.length - 1;

        if (index != lastIndex) {
            address lastInvestor = _pendingUpgrades[lastIndex];
            _pendingUpgrades[index] = lastInvestor;
            _pendingUpgradeIndex[lastInvestor] = indexPlusOne;
        }

        _pendingUpgrades.pop();
        delete _pendingUpgradeIndex[_investor];
    }

    // ============================================
    // INVESTMENT TRACKING
    // ============================================
    function recordInvestment(address _investor, uint256 _projectId, uint256 _amount) external nonReentrant whenNotPaused {
        if (!authorizedEscrows[msg.sender]) revert UnauthorizedEscrow();

        KYCSubmission storage submission = submissions[_investor];
        if (submission.status != KYCStatus.APPROVED) revert KYCNotApproved();
        if (block.timestamp > submission.expiresAt) revert KYCExpiredError();

        uint256 limit = levelInvestmentLimits[submission.level];
        if (totalInvested[_investor] + _amount > limit) revert InvestmentLimitExceeded();

        totalInvested[_investor] += _amount;
        projectInvestments[_investor][_projectId] += _amount;

        emit InvestmentRecorded(_investor, _projectId, _amount);
    }

    function reverseInvestment(address _investor, uint256 _projectId, uint256 _amount) external nonReentrant whenNotPaused {
        if (!authorizedEscrows[msg.sender]) revert UnauthorizedEscrow();
        if (projectInvestments[_investor][_projectId] < _amount) revert InsufficientInvestment();

        totalInvested[_investor] -= _amount;
        projectInvestments[_investor][_projectId] -= _amount;

        emit InvestmentReversed(_investor, _projectId, _amount);
    }

    // ============================================
    // FEE MANAGEMENT
    // ============================================
    function setKYCFee(uint256 _newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 oldFee = kycFee;
        kycFee = _newFee;
        emit KYCFeeUpdated(oldFee, _newFee);
    }

    function setFeeRecipient(address _newRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_newRecipient == address(0)) revert InvalidFeeRecipient();
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }

    function withdrawFees() external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        uint256 balance = address(this).balance;
        if (balance == 0) revert NoFeesToWithdraw();
        
        address recipient = feeRecipient != address(0) ? feeRecipient : msg.sender;
        (bool success, ) = recipient.call{value: balance}("");
        if (!success) revert FeeTransferFailed();
        
        emit FeesWithdrawn(recipient, balance);
    }

    // ============================================
    // ADMIN SETTINGS
    // ============================================
    function setAutoVerifyThreshold(uint256 _threshold) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoVerifyThreshold = _threshold;
    }

    function setKYCValidityPeriod(uint256 _period) external onlyRole(DEFAULT_ADMIN_ROLE) {
        kycValidityPeriod = _period;
    }

    function setLevelLimit(KYCLevel _level, uint256 _limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        levelInvestmentLimits[_level] = _limit;
        emit LevelLimitUpdated(_level, _limit);
    }

    function blockCountry(uint16 _countryCode) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blockedCountries[_countryCode] = true;
        emit CountryBlocked(_countryCode);
    }

    function unblockCountry(uint16 _countryCode) external onlyRole(DEFAULT_ADMIN_ROLE) {
        blockedCountries[_countryCode] = false;
        emit CountryUnblocked(_countryCode);
    }

    function setAuthorizedEscrow(address _escrow, bool _authorized) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_escrow == address(0)) revert ZeroAddress();
        authorizedEscrows[_escrow] = _authorized;
        emit EscrowAuthorized(_escrow, _authorized);
    }

    function setIdentityRegistry(address _identityRegistry) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_identityRegistry == address(0)) revert ZeroAddress();
        address oldRegistry = address(identityRegistry);
        identityRegistry = IIdentityRegistry(_identityRegistry);
        emit IdentityRegistryUpdated(oldRegistry, _identityRegistry);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================
    function getKYCFee() external view returns (uint256) { return kycFee; }
    function getFeeRecipient() external view returns (address) { return feeRecipient; }
    function getTotalFeesCollected() external view returns (uint256) { return totalFeesCollected; }
    function getContractBalance() external view returns (uint256) { return address(this).balance; }

    function getSubmission(address _investor) external view returns (KYCSubmission memory) { return submissions[_investor]; }
    function getKYCStatus(address _investor) external view returns (KYCStatus) { return submissions[_investor].status; }
    function getKYCLevel(address _investor) external view returns (KYCLevel) { return submissions[_investor].level; }
    function getInvestmentLimit(address _investor) external view returns (uint256) { return levelInvestmentLimits[submissions[_investor].level]; }

    function getRemainingLimit(address _investor) external view returns (uint256) {
        uint256 limit = levelInvestmentLimits[submissions[_investor].level];
        uint256 invested = totalInvested[_investor];
        return limit > invested ? limit - invested : 0;
    }

    function canInvest(address _investor, uint256 _amount) external view returns (bool) {
        KYCSubmission storage sub = submissions[_investor];
        if (sub.status != KYCStatus.APPROVED) return false;
        if (block.timestamp > sub.expiresAt) return false;
        return totalInvested[_investor] + _amount <= levelInvestmentLimits[sub.level];
    }

    function getTotalInvested(address _investor) external view returns (uint256) { return totalInvested[_investor]; }
    function getProjectInvestment(address _investor, uint256 _projectId) external view returns (uint256) { return projectInvestments[_investor][_projectId]; }
    
    function getPendingSubmissions() external view returns (address[] memory) { return _pendingSubmissions; }
    function getPendingCount() external view returns (uint256) { return _pendingSubmissions.length; }
    
    function getPendingUpgrades() external view returns (address[] memory) { return _pendingUpgrades; }
    function getPendingUpgradeCount() external view returns (uint256) { return _pendingUpgrades.length; }
    function getUpgradeRequest(address _investor) external view returns (UpgradeRequest memory) { return upgradeRequests[_investor]; }
    function hasUpgradePending(address _investor) external view returns (bool) { return upgradeRequests[_investor].pending; }

    function isKYCValid(address _investor) external view returns (bool) {
        KYCSubmission storage sub = submissions[_investor];
        return sub.status == KYCStatus.APPROVED && block.timestamp <= sub.expiresAt;
    }
    
    // V3: Check if investor can deploy tokens
    function canDeployTokens(address _investor) external view returns (bool) {
        KYCSubmission storage sub = submissions[_investor];
        if (sub.status != KYCStatus.APPROVED) return false;
        if (block.timestamp > sub.expiresAt) return false;
        if (sub.level < minLevelForIdentityRegistry) return false;
        
        // Also check IdentityRegistry
        try identityRegistry.isVerified(_investor) returns (bool isVerified) {
            return isVerified;
        } catch {
            return false;
        }
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    receive() external payable {}
}