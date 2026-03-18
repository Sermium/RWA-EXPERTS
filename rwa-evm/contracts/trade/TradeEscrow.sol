// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title TradeEscrow
 * @notice Milestone-based escrow contract for international trade payments
 * @dev Supports multiple ERC20 tokens and milestone-based fund releases
 */
contract TradeEscrow is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    // =============================================================================
    // ROLES
    // =============================================================================
    
    bytes32 public constant PLATFORM_ADMIN = keccak256("PLATFORM_ADMIN");
    bytes32 public constant ARBITER_ROLE = keccak256("ARBITER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    // =============================================================================
    // ENUMS & STRUCTS
    // =============================================================================

    enum DealStatus {
        Created,
        Funded,
        InProgress,
        Completed,
        Disputed,
        Cancelled,
        Refunded
    }

    enum MilestoneStatus {
        Pending,
        InProgress,
        AwaitingApproval,
        Approved,
        Released,
        Disputed,
        Failed
    }

    struct Milestone {
        string name;
        string description;
        uint256 releasePercentage; // Basis points (10000 = 100%)
        uint256 releaseAmount;
        MilestoneStatus status;
        bytes32 documentHash; // Required document hash for verification
        uint256 completedAt;
        uint256 releasedAt;
    }

    struct Deal {
        string dealId;
        address buyer;
        address seller;
        address paymentToken;
        uint256 totalAmount;
        uint256 depositedAmount;
        uint256 releasedAmount;
        uint256 refundedAmount;
        DealStatus status;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 completedAt;
        uint256 disputeDeadline;
        bool buyerKycVerified;
        bool sellerKycVerified;
    }

    struct Dispute {
        uint256 dealIndex;
        address initiator;
        string reason;
        uint256 claimedAmount;
        uint256 filedAt;
        uint256 resolvedAt;
        address resolver;
        bool resolved;
        string resolution;
    }

    // =============================================================================
    // STATE VARIABLES
    // =============================================================================

    Deal[] public deals;
    mapping(uint256 => Milestone[]) public dealMilestones;
    mapping(uint256 => Dispute) public disputes;
    
    mapping(string => uint256) public dealIdToIndex;
    mapping(address => uint256[]) public buyerDeals;
    mapping(address => uint256[]) public sellerDeals;
    
    address public platformFeeRecipient;
    uint256 public platformFeeBps = 50; // 0.5% default
    uint256 public disputeResolutionPeriod = 14 days;
    
    mapping(address => bool) public supportedTokens;

    // =============================================================================
    // EVENTS
    // =============================================================================

    event DealCreated(
        uint256 indexed dealIndex,
        string dealId,
        address indexed buyer,
        address indexed seller,
        address paymentToken,
        uint256 totalAmount
    );

    event DealFunded(
        uint256 indexed dealIndex,
        uint256 amount,
        uint256 platformFee
    );

    event MilestoneAdded(
        uint256 indexed dealIndex,
        uint256 milestoneIndex,
        string name,
        uint256 releasePercentage
    );

    event MilestoneCompleted(
        uint256 indexed dealIndex,
        uint256 milestoneIndex,
        bytes32 documentHash
    );

    event MilestoneApproved(
        uint256 indexed dealIndex,
        uint256 milestoneIndex,
        address approver
    );

    event FundsReleased(
        uint256 indexed dealIndex,
        uint256 milestoneIndex,
        uint256 amount,
        address recipient
    );

    event DisputeInitiated(
        uint256 indexed dealIndex,
        address indexed initiator,
        string reason
    );

    event DisputeResolved(
        uint256 indexed dealIndex,
        address resolver,
        string resolution
    );

    event DealCompleted(uint256 indexed dealIndex, uint256 completedAt);
    event DealCancelled(uint256 indexed dealIndex, string reason);
    event FundsRefunded(uint256 indexed dealIndex, uint256 amount, address recipient);
    event KycStatusUpdated(uint256 indexed dealIndex, address party, bool verified);

    // =============================================================================
    // MODIFIERS
    // =============================================================================

    modifier onlyDealParty(uint256 _dealIndex) {
        require(
            msg.sender == deals[_dealIndex].buyer || 
            msg.sender == deals[_dealIndex].seller,
            "Not a deal party"
        );
        _;
    }

    modifier onlyBuyer(uint256 _dealIndex) {
        require(msg.sender == deals[_dealIndex].buyer, "Not the buyer");
        _;
    }

    modifier onlySeller(uint256 _dealIndex) {
        require(msg.sender == deals[_dealIndex].seller, "Not the seller");
        _;
    }

    modifier dealExists(uint256 _dealIndex) {
        require(_dealIndex < deals.length, "Deal does not exist");
        _;
    }

    modifier inStatus(uint256 _dealIndex, DealStatus _status) {
        require(deals[_dealIndex].status == _status, "Invalid deal status");
        _;
    }

    modifier kycVerified(uint256 _dealIndex) {
        require(
            deals[_dealIndex].buyerKycVerified && 
            deals[_dealIndex].sellerKycVerified,
            "KYC not verified"
        );
        _;
    }

    // =============================================================================
    // CONSTRUCTOR
    // =============================================================================

    constructor(address _feeRecipient) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PLATFORM_ADMIN, msg.sender);
        platformFeeRecipient = _feeRecipient;
    }

    // =============================================================================
    // ADMIN FUNCTIONS
    // =============================================================================

    function setSupportedToken(address _token, bool _supported) 
        external 
        onlyRole(PLATFORM_ADMIN) 
    {
        supportedTokens[_token] = _supported;
    }

    function setPlatformFee(uint256 _feeBps) 
        external 
        onlyRole(PLATFORM_ADMIN) 
    {
        require(_feeBps <= 500, "Fee too high"); // Max 5%
        platformFeeBps = _feeBps;
    }

    function setFeeRecipient(address _recipient) 
        external 
        onlyRole(PLATFORM_ADMIN) 
    {
        require(_recipient != address(0), "Invalid address");
        platformFeeRecipient = _recipient;
    }

    function setDisputePeriod(uint256 _period) 
        external 
        onlyRole(PLATFORM_ADMIN) 
    {
        disputeResolutionPeriod = _period;
    }

    function updateKycStatus(
        uint256 _dealIndex,
        address _party,
        bool _verified
    ) 
        external 
        onlyRole(COMPLIANCE_ROLE)
        dealExists(_dealIndex) 
    {
        Deal storage deal = deals[_dealIndex];
        
        if (_party == deal.buyer) {
            deal.buyerKycVerified = _verified;
        } else if (_party == deal.seller) {
            deal.sellerKycVerified = _verified;
        } else {
            revert("Invalid party");
        }
        
        emit KycStatusUpdated(_dealIndex, _party, _verified);
    }

    function pause() external onlyRole(PLATFORM_ADMIN) {
        _pause();
    }

    function unpause() external onlyRole(PLATFORM_ADMIN) {
        _unpause();
    }

    // =============================================================================
    // DEAL MANAGEMENT
    // =============================================================================

    function createDeal(
        string calldata _dealId,
        address _seller,
        address _paymentToken,
        uint256 _totalAmount
    ) 
        external 
        whenNotPaused 
        returns (uint256) 
    {
        require(bytes(_dealId).length > 0, "Invalid deal ID");
        require(_seller != address(0) && _seller != msg.sender, "Invalid seller");
        require(supportedTokens[_paymentToken], "Token not supported");
        require(_totalAmount > 0, "Invalid amount");
        require(dealIdToIndex[_dealId] == 0 || deals.length == 0, "Deal ID exists");

        uint256 dealIndex = deals.length;
        
        deals.push(Deal({
            dealId: _dealId,
            buyer: msg.sender,
            seller: _seller,
            paymentToken: _paymentToken,
            totalAmount: _totalAmount,
            depositedAmount: 0,
            releasedAmount: 0,
            refundedAmount: 0,
            status: DealStatus.Created,
            createdAt: block.timestamp,
            fundedAt: 0,
            completedAt: 0,
            disputeDeadline: 0,
            buyerKycVerified: false,
            sellerKycVerified: false
        }));

        dealIdToIndex[_dealId] = dealIndex;
        buyerDeals[msg.sender].push(dealIndex);
        sellerDeals[_seller].push(dealIndex);

        emit DealCreated(
            dealIndex,
            _dealId,
            msg.sender,
            _seller,
            _paymentToken,
            _totalAmount
        );

        return dealIndex;
    }

    function addMilestone(
        uint256 _dealIndex,
        string calldata _name,
        string calldata _description,
        uint256 _releasePercentage
    ) 
        external 
        dealExists(_dealIndex)
        onlyDealParty(_dealIndex)
        inStatus(_dealIndex, DealStatus.Created)
    {
        require(_releasePercentage <= 10000, "Invalid percentage");
        
        uint256 totalPercentage = _releasePercentage;
        Milestone[] storage milestones = dealMilestones[_dealIndex];
        
        for (uint256 i = 0; i < milestones.length; i++) {
            totalPercentage += milestones[i].releasePercentage;
        }
        require(totalPercentage <= 10000, "Total exceeds 100%");

        Deal storage deal = deals[_dealIndex];
        uint256 releaseAmount = (deal.totalAmount * _releasePercentage) / 10000;

        milestones.push(Milestone({
            name: _name,
            description: _description,
            releasePercentage: _releasePercentage,
            releaseAmount: releaseAmount,
            status: MilestoneStatus.Pending,
            documentHash: bytes32(0),
            completedAt: 0,
            releasedAt: 0
        }));

        emit MilestoneAdded(
            _dealIndex,
            milestones.length - 1,
            _name,
            _releasePercentage
        );
    }

    function fundDeal(uint256 _dealIndex) 
        external 
        nonReentrant
        whenNotPaused
        dealExists(_dealIndex)
        onlyBuyer(_dealIndex)
        inStatus(_dealIndex, DealStatus.Created)
        kycVerified(_dealIndex)
    {
        Deal storage deal = deals[_dealIndex];
        Milestone[] storage milestones = dealMilestones[_dealIndex];
        
        require(milestones.length > 0, "No milestones defined");
        
        // Verify total milestone percentage equals 100%
        uint256 totalPercentage = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            totalPercentage += milestones[i].releasePercentage;
        }
        require(totalPercentage == 10000, "Milestones must total 100%");

        uint256 platformFee = (deal.totalAmount * platformFeeBps) / 10000;
        uint256 totalRequired = deal.totalAmount + platformFee;

        IERC20 token = IERC20(deal.paymentToken);
        token.safeTransferFrom(msg.sender, address(this), totalRequired);
        
        if (platformFee > 0) {
            token.safeTransfer(platformFeeRecipient, platformFee);
        }

        deal.depositedAmount = deal.totalAmount;
        deal.status = DealStatus.Funded;
        deal.fundedAt = block.timestamp;

        // Set first milestone to InProgress
        if (milestones.length > 0) {
            milestones[0].status = MilestoneStatus.InProgress;
        }

        emit DealFunded(_dealIndex, deal.totalAmount, platformFee);
    }

    // =============================================================================
    // MILESTONE MANAGEMENT
    // =============================================================================

    function completeMilestone(
        uint256 _dealIndex,
        uint256 _milestoneIndex,
        bytes32 _documentHash
    ) 
        external 
        dealExists(_dealIndex)
        onlySeller(_dealIndex)
    {
        Deal storage deal = deals[_dealIndex];
        require(
            deal.status == DealStatus.Funded || 
            deal.status == DealStatus.InProgress,
            "Invalid deal status"
        );

        Milestone[] storage milestones = dealMilestones[_dealIndex];
        require(_milestoneIndex < milestones.length, "Invalid milestone");
        
        Milestone storage milestone = milestones[_milestoneIndex];
        require(
            milestone.status == MilestoneStatus.InProgress,
            "Milestone not in progress"
        );

        milestone.documentHash = _documentHash;
        milestone.status = MilestoneStatus.AwaitingApproval;
        milestone.completedAt = block.timestamp;

        if (deal.status == DealStatus.Funded) {
            deal.status = DealStatus.InProgress;
        }

        emit MilestoneCompleted(_dealIndex, _milestoneIndex, _documentHash);
    }

    function approveMilestone(
        uint256 _dealIndex,
        uint256 _milestoneIndex
    ) 
        external 
        nonReentrant
        dealExists(_dealIndex)
        onlyBuyer(_dealIndex)
    {
        Deal storage deal = deals[_dealIndex];
        require(
            deal.status == DealStatus.InProgress,
            "Deal not in progress"
        );

        Milestone[] storage milestones = dealMilestones[_dealIndex];
        require(_milestoneIndex < milestones.length, "Invalid milestone");
        
        Milestone storage milestone = milestones[_milestoneIndex];
        require(
            milestone.status == MilestoneStatus.AwaitingApproval,
            "Milestone not awaiting approval"
        );

        milestone.status = MilestoneStatus.Approved;

        emit MilestoneApproved(_dealIndex, _milestoneIndex, msg.sender);

        // Release funds
        _releaseMilestoneFunds(_dealIndex, _milestoneIndex);
    }

    function _releaseMilestoneFunds(
        uint256 _dealIndex,
        uint256 _milestoneIndex
    ) internal {
        Deal storage deal = deals[_dealIndex];
        Milestone storage milestone = dealMilestones[_dealIndex][_milestoneIndex];
        
        require(milestone.status == MilestoneStatus.Approved, "Not approved");
        require(milestone.releaseAmount > 0, "No amount to release");
        require(
            deal.depositedAmount >= deal.releasedAmount + milestone.releaseAmount,
            "Insufficient funds"
        );

        milestone.status = MilestoneStatus.Released;
        milestone.releasedAt = block.timestamp;
        deal.releasedAmount += milestone.releaseAmount;

        IERC20(deal.paymentToken).safeTransfer(deal.seller, milestone.releaseAmount);

        emit FundsReleased(
            _dealIndex,
            _milestoneIndex,
            milestone.releaseAmount,
            deal.seller
        );

        // Check if all milestones are released
        _checkDealCompletion(_dealIndex);

        // Set next milestone to InProgress
        Milestone[] storage milestones = dealMilestones[_dealIndex];
        if (_milestoneIndex + 1 < milestones.length) {
            milestones[_milestoneIndex + 1].status = MilestoneStatus.InProgress;
        }
    }

    function _checkDealCompletion(uint256 _dealIndex) internal {
        Deal storage deal = deals[_dealIndex];
        Milestone[] storage milestones = dealMilestones[_dealIndex];
        
        bool allReleased = true;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].status != MilestoneStatus.Released) {
                allReleased = false;
                break;
            }
        }

        if (allReleased && deal.releasedAmount == deal.totalAmount) {
            deal.status = DealStatus.Completed;
            deal.completedAt = block.timestamp;
            emit DealCompleted(_dealIndex, block.timestamp);
        }
    }

    // =============================================================================
    // DISPUTE RESOLUTION
    // =============================================================================

    function initiateDispute(
        uint256 _dealIndex,
        string calldata _reason,
        uint256 _claimedAmount
    ) 
        external 
        dealExists(_dealIndex)
        onlyDealParty(_dealIndex)
    {
        Deal storage deal = deals[_dealIndex];
        require(
            deal.status == DealStatus.Funded || 
            deal.status == DealStatus.InProgress,
            "Cannot dispute"
        );
        require(disputes[_dealIndex].filedAt == 0, "Dispute exists");

        deal.status = DealStatus.Disputed;
        deal.disputeDeadline = block.timestamp + disputeResolutionPeriod;

        disputes[_dealIndex] = Dispute({
            dealIndex: _dealIndex,
            initiator: msg.sender,
            reason: _reason,
            claimedAmount: _claimedAmount,
            filedAt: block.timestamp,
            resolvedAt: 0,
            resolver: address(0),
            resolved: false,
            resolution: ""
        });

        emit DisputeInitiated(_dealIndex, msg.sender, _reason);
    }

    function resolveDispute(
        uint256 _dealIndex,
        uint256 _buyerAmount,
        uint256 _sellerAmount,
        string calldata _resolution
    ) 
        external 
        nonReentrant
        onlyRole(ARBITER_ROLE)
        dealExists(_dealIndex)
        inStatus(_dealIndex, DealStatus.Disputed)
    {
        Deal storage deal = deals[_dealIndex];
        Dispute storage dispute = disputes[_dealIndex];
        
        require(!dispute.resolved, "Already resolved");
        
        uint256 remainingFunds = deal.depositedAmount - deal.releasedAmount;
        require(_buyerAmount + _sellerAmount <= remainingFunds, "Exceeds funds");

        IERC20 token = IERC20(deal.paymentToken);

        if (_buyerAmount > 0) {
            token.safeTransfer(deal.buyer, _buyerAmount);
            deal.refundedAmount += _buyerAmount;
        }

        if (_sellerAmount > 0) {
            token.safeTransfer(deal.seller, _sellerAmount);
            deal.releasedAmount += _sellerAmount;
        }

        dispute.resolved = true;
        dispute.resolvedAt = block.timestamp;
        dispute.resolver = msg.sender;
        dispute.resolution = _resolution;

        // Update deal status
        if (deal.refundedAmount == deal.depositedAmount) {
            deal.status = DealStatus.Refunded;
        } else if (deal.releasedAmount == deal.totalAmount) {
            deal.status = DealStatus.Completed;
            deal.completedAt = block.timestamp;
        } else {
            deal.status = DealStatus.InProgress;
        }

        emit DisputeResolved(_dealIndex, msg.sender, _resolution);
    }

    // =============================================================================
    // CANCELLATION & REFUND
    // =============================================================================

    function cancelDeal(uint256 _dealIndex, string calldata _reason) 
        external 
        nonReentrant
        dealExists(_dealIndex)
    {
        Deal storage deal = deals[_dealIndex];
        
        // Only allow cancellation in certain states
        require(
            deal.status == DealStatus.Created ||
            (deal.status == DealStatus.Funded && msg.sender == deal.seller),
            "Cannot cancel"
        );
        
        require(
            msg.sender == deal.buyer || 
            msg.sender == deal.seller ||
            hasRole(PLATFORM_ADMIN, msg.sender),
            "Not authorized"
        );

        // Refund if funded
        if (deal.depositedAmount > deal.releasedAmount) {
            uint256 refundAmount = deal.depositedAmount - deal.releasedAmount;
            IERC20(deal.paymentToken).safeTransfer(deal.buyer, refundAmount);
            deal.refundedAmount = refundAmount;
            emit FundsRefunded(_dealIndex, refundAmount, deal.buyer);
        }

        deal.status = DealStatus.Cancelled;
        emit DealCancelled(_dealIndex, _reason);
    }

    // =============================================================================
    // VIEW FUNCTIONS
    // =============================================================================

    function getDeal(uint256 _dealIndex) 
        external 
        view 
        returns (Deal memory) 
    {
        return deals[_dealIndex];
    }

    function getDealMilestones(uint256 _dealIndex) 
        external 
        view 
        returns (Milestone[] memory) 
    {
        return dealMilestones[_dealIndex];
    }

    function getDispute(uint256 _dealIndex) 
        external 
        view 
        returns (Dispute memory) 
    {
        return disputes[_dealIndex];
    }

    function getDealCount() external view returns (uint256) {
        return deals.length;
    }

    function getBuyerDeals(address _buyer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return buyerDeals[_buyer];
    }

    function getSellerDeals(address _seller) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return sellerDeals[_seller];
    }

    function getDealByDealId(string calldata _dealId) 
        external 
        view 
        returns (Deal memory, uint256) 
    {
        uint256 index = dealIdToIndex[_dealId];
        require(index < deals.length || deals.length == 0, "Deal not found");
        return (deals[index], index);
    }
}