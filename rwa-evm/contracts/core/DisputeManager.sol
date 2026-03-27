// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IEscrowVault {
    function blockProject(uint256 projectId) external;
    function unblockProject(uint256 projectId) external;
    function refundForDispute(uint256 projectId) external;
    
    struct Project {
        uint256 projectId;
        address projectOwner;
        address securityToken;
        address paymentToken;
        uint256 fundingGoal;
        uint256 totalRaised;
        uint256 deadline;
        uint8 state;  // ProjectState enum
        uint256 createdAt;
        uint256 fundedAt;
        uint256 completedAt;
        uint256 totalSupply;
        bool platformFeesTransferred;
    }
    
    function getProject(uint256 projectId) external view returns (Project memory);
}

contract DisputeManager is 
    Initializable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable 
{
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    // ProjectState enum values from EscrowVault
    uint8 public constant PROJECT_STATE_INACTIVE = 0;
    uint8 public constant PROJECT_STATE_ACTIVE = 1;
    uint8 public constant PROJECT_STATE_FUNDED = 2;
    uint8 public constant PROJECT_STATE_COMPLETED = 3;
    uint8 public constant PROJECT_STATE_CANCELLED = 4;
    uint8 public constant PROJECT_STATE_DISPUTED = 5;

    enum DisputeStatus { 
        NONE,
        OPEN,
        EVIDENCE,
        BLOCKED,
        RESOLVED_REFUND,
        DISMISSED
    }

    struct Dispute {
        uint256 id;
        uint256 projectId;
        address opener;
        string reason;
        string[] evidenceURIs;
        DisputeStatus status;
        uint256 openedAt;
        uint256 resolvedAt;
        address resolvedBy;
        string resolutionNotes;
    }

    // External contracts
    IEscrowVault public escrowVault;

    // State
    uint256 public disputeCounter;
    uint256 public maxUnjustifiedDisputes;

    // Mappings
    mapping(uint256 => Dispute) public disputes;
    mapping(uint256 => uint256[]) public projectDisputes;
    mapping(address => uint256) public userUnjustifiedCount;
    mapping(address => bool) public userBlocked;
    mapping(uint256 => bool) public projectBlocked;

    // Events
    event DisputeOpened(
        uint256 indexed disputeId, 
        uint256 indexed projectId, 
        address indexed opener, 
        string reason
    );
    event EvidenceAdded(
        uint256 indexed disputeId, 
        address indexed addedBy, 
        uint256 evidenceCount
    );
    event DisputeStatusChanged(
        uint256 indexed disputeId, 
        DisputeStatus oldStatus, 
        DisputeStatus newStatus
    );
    event ProjectBlockedByDispute(
        uint256 indexed projectId, 
        uint256 indexed disputeId
    );
    event ProjectUnblockedByDispute(
        uint256 indexed projectId, 
        uint256 indexed disputeId
    );
    event DisputeResolved(
        uint256 indexed disputeId, 
        DisputeStatus resolution, 
        string notes
    );
    event UserBlockedFromDisputing(
        address indexed user, 
        uint256 unjustifiedCount
    );
    event RefundTriggered(
        uint256 indexed projectId, 
        uint256 indexed disputeId
    );
    event MaxUnjustifiedDisputesUpdated(
        uint256 oldValue, 
        uint256 newValue
    );
    event EscrowVaultUpdated(
        address indexed oldVault, 
        address indexed newVault
    );

    // Errors
    error NotTokenHolder();
    error UserBlockedFromDisputes();
    error DisputeNotFound();
    error InvalidDisputeStatus();
    error ProjectNotCompleted();
    error ProjectAlreadyBlocked();
    error ProjectNotBlocked();
    error InvalidAddress();
    error EmptyReason();
    error NotAuthorized();

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _escrowVault
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        if (_admin == address(0)) revert InvalidAddress();
        if (_escrowVault == address(0)) revert InvalidAddress();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(DISPUTE_RESOLVER_ROLE, _admin);

        escrowVault = IEscrowVault(_escrowVault);
        maxUnjustifiedDisputes = 3;
    }

    // ============================================
    // DISPUTE LIFECYCLE
    // ============================================

    /**
     * @notice Open a dispute for a completed project
     * @dev Caller must hold project tokens. Project must be COMPLETED.
     * @param _projectId The project ID
     * @param _reason The reason for the dispute
     * @param _evidenceURIs Initial evidence (IPFS URIs)
     * @return disputeId The created dispute ID
     */
    function openDispute(
        uint256 _projectId,
        string calldata _reason,
        string[] calldata _evidenceURIs
    ) external nonReentrant returns (uint256 disputeId) {
        // Check user not blocked
        if (userBlocked[msg.sender]) revert UserBlockedFromDisputes();
        if (bytes(_reason).length == 0) revert EmptyReason();

        // Get project info
        IEscrowVault.Project memory project = escrowVault.getProject(_projectId);

        // Must be COMPLETED with platform fees transferred (tokens distributed)
        if (project.state != PROJECT_STATE_COMPLETED || !project.platformFeesTransferred) {
            revert ProjectNotCompleted();
        }

        // Must hold tokens
        if (IERC20(project.securityToken).balanceOf(msg.sender) == 0) {
            revert NotTokenHolder();
        }

        // Create dispute
        disputeCounter++;
        disputeId = disputeCounter;

        Dispute storage dispute = disputes[disputeId];
        dispute.id = disputeId;
        dispute.projectId = _projectId;
        dispute.opener = msg.sender;
        dispute.reason = _reason;
        dispute.status = DisputeStatus.OPEN;
        dispute.openedAt = block.timestamp;

        // Copy evidence URIs
        for (uint256 i = 0; i < _evidenceURIs.length; i++) {
            dispute.evidenceURIs.push(_evidenceURIs[i]);
        }

        projectDisputes[_projectId].push(disputeId);

        emit DisputeOpened(disputeId, _projectId, msg.sender, _reason);
    }

    /**
     * @notice Add evidence to an existing dispute
     * @dev Only dispute opener or admin can add evidence
     * @param _disputeId The dispute ID
     * @param _evidenceURIs Additional evidence URIs
     */
    function addEvidence(
        uint256 _disputeId,
        string[] calldata _evidenceURIs
    ) external {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.id == 0) revert DisputeNotFound();

        // Only opener or resolver can add evidence
        if (msg.sender != dispute.opener && !hasRole(DISPUTE_RESOLVER_ROLE, msg.sender)) {
            revert NotAuthorized();
        }

        // Can only add evidence in active dispute states
        if (dispute.status != DisputeStatus.OPEN &&
            dispute.status != DisputeStatus.EVIDENCE &&
            dispute.status != DisputeStatus.BLOCKED) {
            revert InvalidDisputeStatus();
        }

        for (uint256 i = 0; i < _evidenceURIs.length; i++) {
            dispute.evidenceURIs.push(_evidenceURIs[i]);
        }

        emit EvidenceAdded(_disputeId, msg.sender, _evidenceURIs.length);
    }

    /**
     * @notice Move dispute to evidence gathering phase
     * @param _disputeId The dispute ID
     */
    function moveToEvidence(uint256 _disputeId) external onlyRole(DISPUTE_RESOLVER_ROLE) {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.id == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.OPEN) revert InvalidDisputeStatus();

        DisputeStatus oldStatus = dispute.status;
        dispute.status = DisputeStatus.EVIDENCE;

        emit DisputeStatusChanged(_disputeId, oldStatus, DisputeStatus.EVIDENCE);
    }

    /**
     * @notice Block project - freezes milestone releases and takes snapshot
     * @param _disputeId The dispute ID triggering the block
     */
    function blockProject(uint256 _disputeId) 
        external 
        onlyRole(DISPUTE_RESOLVER_ROLE) 
        nonReentrant 
    {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.id == 0) revert DisputeNotFound();

        if (dispute.status != DisputeStatus.OPEN && dispute.status != DisputeStatus.EVIDENCE) {
            revert InvalidDisputeStatus();
        }

        uint256 projectId = dispute.projectId;
        if (projectBlocked[projectId]) revert ProjectAlreadyBlocked();

        // Block on escrow (triggers snapshot)
        escrowVault.blockProject(projectId);
        projectBlocked[projectId] = true;

        DisputeStatus oldStatus = dispute.status;
        dispute.status = DisputeStatus.BLOCKED;

        emit ProjectBlockedByDispute(projectId, _disputeId);
        emit DisputeStatusChanged(_disputeId, oldStatus, DisputeStatus.BLOCKED);
    }

    /**
     * @notice Resolve dispute with USDT refund to all token holders
     * @dev Tokens become worthless - only USDT is refunded proportionally
     * @param _disputeId The dispute ID
     * @param _notes Resolution notes
     */
    function resolveWithRefund(
        uint256 _disputeId,
        string calldata _notes
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.id == 0) revert DisputeNotFound();
        if (dispute.status != DisputeStatus.BLOCKED) revert InvalidDisputeStatus();

        uint256 projectId = dispute.projectId;

        // Trigger refund on escrow
        escrowVault.refundForDispute(projectId);

        // Update dispute
        dispute.status = DisputeStatus.RESOLVED_REFUND;
        dispute.resolvedAt = block.timestamp;
        dispute.resolvedBy = msg.sender;
        dispute.resolutionNotes = _notes;

        emit RefundTriggered(projectId, _disputeId);
        emit DisputeResolved(_disputeId, DisputeStatus.RESOLVED_REFUND, _notes);
    }

    /**
     * @notice Dismiss dispute as unjustified
     * @dev Increments opener's unjustified count, may block them from future disputes
     * @param _disputeId The dispute ID
     * @param _notes Resolution notes
     */
    function dismissDispute(
        uint256 _disputeId,
        string calldata _notes
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) nonReentrant {
        Dispute storage dispute = disputes[_disputeId];
        if (dispute.id == 0) revert DisputeNotFound();

        if (dispute.status != DisputeStatus.OPEN &&
            dispute.status != DisputeStatus.EVIDENCE &&
            dispute.status != DisputeStatus.BLOCKED) {
            revert InvalidDisputeStatus();
        }

        uint256 projectId = dispute.projectId;

        // Unblock if was blocked
        if (projectBlocked[projectId] && dispute.status == DisputeStatus.BLOCKED) {
            escrowVault.unblockProject(projectId);
            projectBlocked[projectId] = false;
            emit ProjectUnblockedByDispute(projectId, _disputeId);
        }

        // Increment unjustified count
        userUnjustifiedCount[dispute.opener]++;

        // Block user if limit reached
        if (userUnjustifiedCount[dispute.opener] >= maxUnjustifiedDisputes) {
            userBlocked[dispute.opener] = true;
            emit UserBlockedFromDisputing(dispute.opener, userUnjustifiedCount[dispute.opener]);
        }

        // Update dispute
        dispute.status = DisputeStatus.DISMISSED;
        dispute.resolvedAt = block.timestamp;
        dispute.resolvedBy = msg.sender;
        dispute.resolutionNotes = _notes;

        emit DisputeResolved(_disputeId, DisputeStatus.DISMISSED, _notes);
    }

    // ============================================
    // ADMIN FUNCTIONS
    // ============================================

    /**
     * @notice Set maximum unjustified disputes before user is blocked
     * @param _max New maximum value
     */
    function setMaxUnjustifiedDisputes(uint256 _max) external onlyRole(ADMIN_ROLE) {
        uint256 oldValue = maxUnjustifiedDisputes;
        maxUnjustifiedDisputes = _max;
        emit MaxUnjustifiedDisputesUpdated(oldValue, _max);
    }

    /**
     * @notice Unblock a user from disputing
     * @param _user User address to unblock
     */
    function unblockUser(address _user) external onlyRole(ADMIN_ROLE) {
        userBlocked[_user] = false;
        userUnjustifiedCount[_user] = 0;
    }

    /**
     * @notice Update escrow vault address
     * @param _escrowVault New escrow vault address
     */
    function setEscrowVault(address _escrowVault) external onlyRole(ADMIN_ROLE) {
        if (_escrowVault == address(0)) revert InvalidAddress();
        address oldVault = address(escrowVault);
        escrowVault = IEscrowVault(_escrowVault);
        emit EscrowVaultUpdated(oldVault, _escrowVault);
    }

    /**
     * @notice Grant dispute resolver role
     * @param _resolver Address to grant role to
     */
    function grantResolverRole(address _resolver) external onlyRole(ADMIN_ROLE) {
        if (_resolver == address(0)) revert InvalidAddress();
        _grantRole(DISPUTE_RESOLVER_ROLE, _resolver);
    }

    /**
     * @notice Revoke dispute resolver role
     * @param _resolver Address to revoke role from
     */
    function revokeResolverRole(address _resolver) external onlyRole(ADMIN_ROLE) {
        _revokeRole(DISPUTE_RESOLVER_ROLE, _resolver);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    /**
     * @notice Get dispute details
     * @param _disputeId The dispute ID
     * @return Dispute struct
     */
    function getDispute(uint256 _disputeId) external view returns (Dispute memory) {
        return disputes[_disputeId];
    }

    /**
     * @notice Get all dispute IDs for a project
     * @param _projectId The project ID
     * @return Array of dispute IDs
     */
    function getProjectDisputes(uint256 _projectId) external view returns (uint256[] memory) {
        return projectDisputes[_projectId];
    }

    /**
     * @notice Get dispute evidence URIs
     * @param _disputeId The dispute ID
     * @return Array of evidence URIs
     */
    function getDisputeEvidence(uint256 _disputeId) external view returns (string[] memory) {
        return disputes[_disputeId].evidenceURIs;
    }

    /**
     * @notice Check if user can open disputes
     * @param _user User address
     * @return True if user can dispute
     */
    function canUserDispute(address _user) external view returns (bool) {
        return !userBlocked[_user];
    }

    /**
     * @notice Get user dispute statistics
     * @param _user User address
     * @return unjustifiedCount Number of unjustified disputes
     * @return isBlocked Whether user is blocked
     */
    function getUserDisputeStats(address _user) external view returns (
        uint256 unjustifiedCount, 
        bool isBlocked
    ) {
        return (userUnjustifiedCount[_user], userBlocked[_user]);
    }

    /**
     * @notice Check if a project is currently blocked by dispute
     * @param _projectId The project ID
     * @return True if project is blocked
     */
    function isProjectBlocked(uint256 _projectId) external view returns (bool) {
        return projectBlocked[_projectId];
    }

    /**
     * @notice Get total number of disputes
     * @return Total dispute count
     */
    function getTotalDisputes() external view returns (uint256) {
        return disputeCounter;
    }

    /**
     * @notice Get disputes opened by a user
     * @param _user User address
     * @return disputeIds Array of dispute IDs opened by user
     */
    function getUserDisputes(address _user) external view returns (uint256[] memory) {
        uint256 count = 0;
        
        // First pass: count disputes
        for (uint256 i = 1; i <= disputeCounter; i++) {
            if (disputes[i].opener == _user) {
                count++;
            }
        }
        
        // Second pass: collect dispute IDs
        uint256[] memory userDisputeIds = new uint256[](count);
        uint256 index = 0;
        
        for (uint256 i = 1; i <= disputeCounter; i++) {
            if (disputes[i].opener == _user) {
                userDisputeIds[index] = i;
                index++;
            }
        }
        
        return userDisputeIds;
    }

    // ============================================
    // UPGRADE
    // ============================================

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}
}