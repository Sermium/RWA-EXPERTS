// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IRWASecurityToken.sol";
import "../interfaces/IRWAProjectNFT.sol";
import "../libraries/Constants.sol";
import "../interfaces/IKYCVerifier.sol";

interface IPlatformFeeManager {
    function receiveFees(
        uint256 projectId,
        address usdtToken,
        uint256 usdtAmount,
        address securityToken,
        uint256 tokenAmount
    ) external;
    function refundUSDTForDispute(uint256 projectId, address escrowAddress) external;
    function liquidityWallet() external view returns (address);
    function treasuryWallet() external view returns (address);
    function feeReceiver() external view returns (address);
}

contract RWAEscrowVault is 
    Initializable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable, 
    PausableUpgradeable, 
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant DISPUTE_MANAGER_ROLE = keccak256("DISPUTE_MANAGER_ROLE");

    enum ProjectState { INACTIVE, ACTIVE, FUNDED, COMPLETED, CANCELLED, DISPUTED }

    struct Project {
        uint256 projectId;
        address projectOwner;
        address securityToken;
        address paymentToken;
        uint256 fundingGoal;
        uint256 totalRaised;
        uint256 deadline;
        ProjectState state;
        uint256 createdAt;
        uint256 fundedAt;
        uint256 completedAt;
        uint256 totalSupply;
        bool platformFeesTransferred;
    }

    struct Investment {
        address investor;
        uint256 amount;
        uint256 tokenAmount;
        uint256 timestamp;
        bool refunded;
        string paymentReference;
        address paymentToken;
    }

    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }

    // Platform fee configuration (in BPS)
    uint256 public constant PLATFORM_USDT_FEE_BPS = 150;    // 1.5% of raised amount
    uint256 public constant PLATFORM_TOKEN_FEE_BPS = 100;   // 1% of token supply
    uint256 public constant INVESTOR_TOKEN_BPS = 9900;      // 99% of token supply

    // Storage
    mapping(uint256 => Project) public projects;
    mapping(uint256 => Investment[]) public investments;
    mapping(uint256 => address[]) public projectInvestors;
    mapping(uint256 => mapping(address => uint256)) public investorTokenAllocation;
    mapping(uint256 => mapping(address => uint256)) public investorContribution;
    mapping(uint256 => mapping(address => bool)) public isProjectInvestor;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => mapping(address => address)) public investmentTokens;
    mapping(uint256 => uint256) public projectInvestorCount;
    mapping(uint256 => uint256) public projectReleasedFunds;
    mapping(uint256 => bool) public projectBlockedByDispute;
    mapping(uint256 => uint256) public projectSnapshotId;
    mapping(string => bool) private _usedPaymentReferences;
    

    // Claim fee
    uint256 public claimFeeBps;
    address public claimFeeRecipient;

    // External contracts
    IPlatformFeeManager public platformFeeManager;
    IKYCVerifier public kycVerifier;
    IRWAProjectNFT public projectNFT;
    IERC20 public usdc;
    IERC20 public usdt;

    mapping(uint256 => uint256) public projectOffChainAmount;

    // Events
    event ProjectCreated(uint256 indexed projectId, address indexed owner, uint256 fundingGoal, uint256 deadline, uint256 totalSupply);
    event ProjectActivated(uint256 indexed projectId);
    event InvestmentReceived(uint256 indexed projectId, address indexed investor, uint256 amount, uint256 tokenAllocation, address paymentToken);
    event OffChainInvestmentRecorded(uint256 indexed projectId, address indexed investor, uint256 amount, uint256 tokenAllocation, string paymentReference);
    event ProjectFunded(uint256 indexed projectId, uint256 totalRaised);
    event ProjectForceFunded(uint256 indexed projectId, uint256 totalRaised, uint256 fundingGoal, string reason);
    event ProjectCompleted(uint256 indexed projectId, uint256 platformUSDT, uint256 platformTokens, address liquidityWallet, address treasuryWallet);
    event TokensClaimed(uint256 indexed projectId, address indexed investor, uint256 grossAmount, uint256 fee, uint256 netAmount);
    event MilestoneFundsReleased(uint256 indexed projectId, uint256 amount, string milestoneRef);
    event RefundClaimed(uint256 indexed projectId, address indexed investor, uint256 amount);
    event ProjectStateChanged(uint256 indexed projectId, ProjectState newState);
    event ProjectBlockedByDisputeEvent(uint256 indexed projectId, uint256 snapshotId);
    event ProjectUnblocked(uint256 indexed projectId);
    event DisputeRefundProcessed(uint256 indexed projectId, uint256 totalRefunded, uint256 holdersCount);
    event ClaimFeeUpdated(uint256 oldFee, uint256 newFee);
    event ClaimFeeRecipientUpdated(address oldRecipient, address newRecipient);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event PlatformFeeManagerUpdated(address indexed oldManager, address indexed newManager);
    event OffChainFundsInjected(uint256 indexed projectId, uint256 amount, uint256 remainingOffChain, address paymentToken);

    // Errors
    error InvalidProject();
    error InvalidState();
    error InvalidAmount();
    error InvalidAddress();
    error DeadlinePassed();
    error FundingGoalExceeded();
    error InsufficientBalance();
    error AlreadyClaimed();
    error NotInvestor();
    error PaymentReferenceUsed();
    error NoFundsRaised();
    error KYCNotVerified();
    error ProjectIsBlocked();
    error NotAuthorized();
    error FeeTooHigh();
    error NothingToRelease();
    error PlatformFeesNotTransferred();

    modifier validProject(uint256 _projectId) {
        if (projects[_projectId].projectOwner == address(0)) revert InvalidProject();
        _;
    }

    modifier inState(uint256 _projectId, ProjectState _state) {
        if (projects[_projectId].state != _state) revert InvalidState();
        _;
    }

    modifier notBlocked(uint256 _projectId) {
        if (projectBlockedByDispute[_projectId]) revert ProjectIsBlocked();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _platformFeeManager,
        address _projectNFT
    ) external initializer {
        if (_admin == address(0) || _platformFeeManager == address(0) || _projectNFT == address(0)) 
            revert InvalidAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);

        platformFeeManager = IPlatformFeeManager(_platformFeeManager);
        projectNFT = IRWAProjectNFT(_projectNFT);
        
        claimFeeBps = 0;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ============================================
    // ADMIN CONFIGURATION
    // ============================================

    function setKYCVerifier(address _kycVerifier) external onlyRole(ADMIN_ROLE) {
        if (_kycVerifier == address(0)) revert InvalidAddress();
        address oldVerifier = address(kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
        emit KYCVerifierUpdated(oldVerifier, _kycVerifier);
    }

    function setPlatformFeeManager(address _feeManager) external onlyRole(ADMIN_ROLE) {
        if (_feeManager == address(0)) revert InvalidAddress();
        address oldManager = address(platformFeeManager);
        platformFeeManager = IPlatformFeeManager(_feeManager);
        emit PlatformFeeManagerUpdated(oldManager, _feeManager);
    }

    function setPaymentTokens(address _usdc, address _usdt) external onlyRole(ADMIN_ROLE) {
        if (_usdc == address(0) || _usdt == address(0)) revert InvalidAddress();
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
    }

    function setClaimFee(uint256 _feeBps) external onlyRole(ADMIN_ROLE) {
        if (_feeBps > Constants.MAX_FEE_BPS) revert FeeTooHigh();
        uint256 oldFee = claimFeeBps;
        claimFeeBps = _feeBps;
        emit ClaimFeeUpdated(oldFee, _feeBps);
    }

    function setClaimFeeRecipient(address _recipient) external onlyRole(ADMIN_ROLE) {
        if (_recipient == address(0)) revert InvalidAddress();
        address oldRecipient = claimFeeRecipient;
        claimFeeRecipient = _recipient;
        emit ClaimFeeRecipientUpdated(oldRecipient, _recipient);
    }

    // ============================================
    // PROJECT CREATION & ACTIVATION
    // ============================================

    /**
     * @notice Create a new project
     * @param _projectId Unique project ID (from ProjectNFT)
     * @param _securityToken Security token address for this project
     * @param _fundingGoal Funding goal in payment token units (6 decimals for USDC/USDT)
     * @param _deadline Funding deadline timestamp
     * @param _totalSupply Total token supply for this project
     */
    function createProject(
        uint256 _projectId,
        address _securityToken,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256 _totalSupply
    ) external whenNotPaused {
        if (_securityToken == address(0)) revert InvalidAddress();
        if (_fundingGoal < Constants.MIN_FUNDING_GOAL) revert InvalidAmount();
        if (_deadline <= block.timestamp + Constants.MIN_FUNDRAISE_DURATION) revert DeadlinePassed();
        if (projects[_projectId].projectOwner != address(0)) revert InvalidProject();
        if (_totalSupply == 0) revert InvalidAmount();

        projects[_projectId] = Project({
            projectId: _projectId,
            projectOwner: msg.sender,
            securityToken: _securityToken,
            paymentToken: address(0),
            fundingGoal: _fundingGoal,
            totalRaised: 0,
            deadline: _deadline,
            state: ProjectState.INACTIVE,
            createdAt: block.timestamp,
            fundedAt: 0,
            completedAt: 0,
            totalSupply: _totalSupply,
            platformFeesTransferred: false
        });

        emit ProjectCreated(_projectId, msg.sender, _fundingGoal, _deadline, _totalSupply);
        emit ProjectStateChanged(_projectId, ProjectState.INACTIVE);
    }

    /**
     * @notice Admin activates project after reviewing documentation
     */
    function activateProject(uint256 _projectId) 
        external 
        onlyRole(OPERATOR_ROLE) 
        validProject(_projectId) 
        inState(_projectId, ProjectState.INACTIVE) 
    {
        projects[_projectId].state = ProjectState.ACTIVE;
        emit ProjectActivated(_projectId);
        emit ProjectStateChanged(_projectId, ProjectState.ACTIVE);
    }

    // ============================================
    // INVESTMENT
    // ============================================

    /**
     * @notice Invest in a project with KYC proof
     */
    function invest(
        uint256 _projectId,
        uint256 _amount,
        address _paymentToken,
        KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused validProject(_projectId) inState(_projectId, ProjectState.ACTIVE) {
        Project storage project = projects[_projectId];
        
        if (block.timestamp > project.deadline) revert DeadlinePassed();
        if (_amount == 0) revert InvalidAmount();
        if (_paymentToken != address(usdc) && _paymentToken != address(usdt)) revert InvalidAddress();

        // Verify KYC
        if (!kycVerifier.verify(msg.sender, _kycProof.level, _kycProof.countryCode, _kycProof.expiry, _kycProof.signature)) {
            revert KYCNotVerified();
        }

        // Check funding goal not exceeded
        if (project.totalRaised + _amount > project.fundingGoal) revert FundingGoalExceeded();

        // Transfer payment
        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);

        // Set payment token on first investment
        if (project.paymentToken == address(0)) {
            project.paymentToken = _paymentToken;
        }

        // Update project
        project.totalRaised += _amount;

        // Track investor
        if (!isProjectInvestor[_projectId][msg.sender]) {
            isProjectInvestor[_projectId][msg.sender] = true;
            projectInvestors[_projectId].push(msg.sender);
            projectInvestorCount[_projectId]++;
        }

        investorContribution[_projectId][msg.sender] += _amount;
        investmentTokens[_projectId][msg.sender] = _paymentToken;

        // Calculate token allocation (proportional to contribution, 99% of supply for investors)
        uint256 tokenAllocation = (_amount * project.totalSupply * INVESTOR_TOKEN_BPS) / (project.fundingGoal * Constants.BPS_DENOMINATOR);
        investorTokenAllocation[_projectId][msg.sender] += tokenAllocation;

        investments[_projectId].push(Investment({
            investor: msg.sender,
            amount: _amount,
            tokenAmount: tokenAllocation,
            timestamp: block.timestamp,
            refunded: false,
            paymentReference: "",
            paymentToken: _paymentToken
        }));

        emit InvestmentReceived(_projectId, msg.sender, _amount, tokenAllocation, _paymentToken);

        // Check if funded
        if (project.totalRaised >= project.fundingGoal) {
            _markProjectFunded(_projectId);
        }
    }

    /**
     * @notice Record off-chain investment (fiat, wire transfer, etc.)
     */
    function recordOffChainInvestment(
        uint256 _projectId,
        address _investor,
        uint256 _amount,
        string calldata _paymentReference
    ) external nonReentrant onlyRole(OPERATOR_ROLE) validProject(_projectId) inState(_projectId, ProjectState.ACTIVE) {
        if (_investor == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();
        if (bytes(_paymentReference).length == 0) revert InvalidAmount();
        if (_usedPaymentReferences[_paymentReference]) revert PaymentReferenceUsed();

        Project storage project = projects[_projectId];
        if (block.timestamp > project.deadline) revert DeadlinePassed();
        if (project.totalRaised + _amount > project.fundingGoal) revert FundingGoalExceeded();

        _usedPaymentReferences[_paymentReference] = true;
        project.totalRaised += _amount;

        // Track off-chain amount for later injection
        projectOffChainAmount[_projectId] += _amount;

        // Track investor
        if (!isProjectInvestor[_projectId][_investor]) {
            isProjectInvestor[_projectId][_investor] = true;
            projectInvestors[_projectId].push(_investor);
            projectInvestorCount[_projectId]++;
        }

        investorContribution[_projectId][_investor] += _amount;

        // Calculate token allocation
        uint256 tokenAllocation = (_amount * project.totalSupply * INVESTOR_TOKEN_BPS) / (project.fundingGoal * Constants.BPS_DENOMINATOR);
        investorTokenAllocation[_projectId][_investor] += tokenAllocation;

        investments[_projectId].push(Investment({
            investor: _investor,
            amount: _amount,
            tokenAmount: tokenAllocation,
            timestamp: block.timestamp,
            refunded: false,
            paymentReference: _paymentReference,
            paymentToken: address(0)
        }));

        emit OffChainInvestmentRecorded(_projectId, _investor, _amount, tokenAllocation, _paymentReference);

        if (project.totalRaised >= project.fundingGoal) {
            _markProjectFunded(_projectId);
        }
    }

    /**
     * @notice Force mark project as funded (admin override)
     */
    function forceMarkFunded(uint256 _projectId, string calldata _reason) 
        external 
        onlyRole(ADMIN_ROLE) 
        validProject(_projectId) 
        inState(_projectId, ProjectState.ACTIVE) 
    {
        Project storage project = projects[_projectId];
        if (project.totalRaised == 0) revert NoFundsRaised();

        project.state = ProjectState.FUNDED;
        project.fundedAt = block.timestamp;

        emit ProjectForceFunded(_projectId, project.totalRaised, project.fundingGoal, _reason);
        emit ProjectStateChanged(_projectId, ProjectState.FUNDED);

        projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.FUNDED);
    }

    function _markProjectFunded(uint256 _projectId) internal {
        Project storage project = projects[_projectId];
        project.state = ProjectState.FUNDED;
        project.fundedAt = block.timestamp;

        emit ProjectFunded(_projectId, project.totalRaised);
        emit ProjectStateChanged(_projectId, ProjectState.FUNDED);

        projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.FUNDED);
    }

    // ============================================
    // PROJECT COMPLETION (Owner triggers)
    // ============================================

    /**
     * @notice Owner terminates fundraising and moves to COMPLETED
     * @dev Transfers platform fees (1.5% USDT + 1% tokens)
     *      Investors can then claim their 99% tokens via dashboard
     *      98.5% USDT remains in escrow for milestone releases
     */
    function completeProject(uint256 _projectId) 
    external 
    nonReentrant 
    validProject(_projectId) 
    inState(_projectId, ProjectState.FUNDED) 
{
    Project storage project = projects[_projectId];
    if (msg.sender != project.projectOwner && !hasRole(ADMIN_ROLE, msg.sender)) revert NotAuthorized();
    if (project.platformFeesTransferred) revert InvalidState();

    // Calculate platform fees
    uint256 platformUSDT = (project.totalRaised * PLATFORM_USDT_FEE_BPS) / Constants.BPS_DENOMINATOR;
    uint256 platformTokens = (project.totalSupply * PLATFORM_TOKEN_FEE_BPS) / Constants.BPS_DENOMINATOR;

    // Get wallet addresses directly from fee manager public variables
    address liquidityWallet = platformFeeManager.liquidityWallet();
    address treasuryWallet = platformFeeManager.treasuryWallet();

    // Mint platform tokens directly to wallets (50/50 split)
    uint256 tokensToLiquidity = platformTokens / 2;
    uint256 tokensToTreasury = platformTokens - tokensToLiquidity;

    IRWASecurityToken securityToken = IRWASecurityToken(project.securityToken);
    if (tokensToLiquidity > 0) {
        securityToken.mint(liquidityWallet, tokensToLiquidity);
    }
    if (tokensToTreasury > 0) {
        securityToken.mint(treasuryWallet, tokensToTreasury);
    }

    // Transfer USDT fees to platform fee manager (for 34/33/33 distribution)
    if (project.paymentToken != address(0) && platformUSDT > 0) {
        IERC20(project.paymentToken).safeApprove(address(platformFeeManager), platformUSDT);
        platformFeeManager.receiveFees(
            _projectId,
            project.paymentToken,
            platformUSDT,
            project.securityToken,
            0
        );
    }

    project.platformFeesTransferred = true;
    project.completedAt = block.timestamp;
    project.state = ProjectState.COMPLETED;

    emit ProjectCompleted(_projectId, platformUSDT, platformTokens, liquidityWallet, treasuryWallet);
    emit ProjectStateChanged(_projectId, ProjectState.COMPLETED);

    projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.COMPLETED);
}

    // ============================================
    // TOKEN CLAIMING (Investors via dashboard)
    // ============================================

    /**
     * @notice Investor claims their token allocation
     * @dev Applies claim fee if set
     */
    function claimTokens(uint256 _projectId) 
        external 
        nonReentrant 
        validProject(_projectId) 
        notBlocked(_projectId)
    {
        Project storage project = projects[_projectId];
        if (project.state != ProjectState.COMPLETED) revert InvalidState();
        if (!project.platformFeesTransferred) revert PlatformFeesNotTransferred();
        if (hasClaimed[_projectId][msg.sender]) revert AlreadyClaimed();

        uint256 allocation = investorTokenAllocation[_projectId][msg.sender];
        if (allocation == 0) revert NotInvestor();

        hasClaimed[_projectId][msg.sender] = true;

        // Calculate fee
        uint256 fee = 0;
        uint256 netAmount = allocation;
        
        if (claimFeeBps > 0 && claimFeeRecipient != address(0)) {
            fee = (allocation * claimFeeBps) / Constants.BPS_DENOMINATOR;
            netAmount = allocation - fee;
        }

        // Mint tokens
        IRWASecurityToken securityToken = IRWASecurityToken(project.securityToken);
        securityToken.mint(msg.sender, netAmount);

        if (fee > 0) {
            securityToken.mint(claimFeeRecipient, fee);
        }

        emit TokensClaimed(_projectId, msg.sender, allocation, fee, netAmount);
    }

    /**
     * @notice Get claimable token amount for an investor
     */
    function getClaimableTokens(uint256 _projectId, address _investor) external view returns (uint256) {
        Project storage project = projects[_projectId];
        
        if (project.state != ProjectState.COMPLETED) return 0;
        if (!project.platformFeesTransferred) return 0;
        if (hasClaimed[_projectId][_investor]) return 0;

        return investorTokenAllocation[_projectId][_investor];
    }

    // ============================================
    // MILESTONE FUND RELEASE (Admin triggered, DB managed)
    // ============================================

    /**
     * @notice Admin releases milestone funds to project owner
     * @dev Milestones are managed in DB, this just releases amounts
     * @param _projectId Project ID
     * @param _amount Amount to release
     * @param _milestoneRef DB reference for the milestone (for tracking)
     */
    function releaseMilestoneFunds(
        uint256 _projectId,
        uint256 _amount,
        string calldata _milestoneRef
    ) 
        external 
        nonReentrant 
        onlyRole(OPERATOR_ROLE) 
        validProject(_projectId) 
        notBlocked(_projectId) 
    {
        Project storage project = projects[_projectId];
        if (project.state != ProjectState.COMPLETED) revert InvalidState();
        if (_amount == 0) revert InvalidAmount();

        // Calculate available funds (total - platform fee - already released)
        uint256 platformFee = (project.totalRaised * PLATFORM_USDT_FEE_BPS) / Constants.BPS_DENOMINATOR;
        uint256 availableFunds = project.totalRaised - platformFee - projectReleasedFunds[_projectId];

        if (_amount > availableFunds) revert InsufficientBalance();

        projectReleasedFunds[_projectId] += _amount;

        // Transfer to project owner
        if (project.paymentToken != address(0)) {
            IERC20(project.paymentToken).safeTransfer(project.projectOwner, _amount);
        }

        emit MilestoneFundsReleased(_projectId, _amount, _milestoneRef);
    }

    /**
     * @notice Get remaining funds available for milestone releases
     */
    function getAvailableFunds(uint256 _projectId) external view returns (uint256) {
        Project storage project = projects[_projectId];
        uint256 platformFee = (project.totalRaised * PLATFORM_USDT_FEE_BPS) / Constants.BPS_DENOMINATOR;
        uint256 released = projectReleasedFunds[_projectId];
        
        if (project.totalRaised <= platformFee + released) return 0;
        return project.totalRaised - platformFee - released;
    }

    // ============================================
    // REFUNDS (Failed raise)
    // ============================================

    /**
     * @notice Investor claims refund if project failed to reach goal
     */
    function claimRefund(uint256 _projectId) 
        external 
        nonReentrant 
        validProject(_projectId) 
    {
        Project storage project = projects[_projectId];
        
        // Can refund if: CANCELLED OR (ACTIVE and deadline passed and goal not met)
        bool canRefund = project.state == ProjectState.CANCELLED ||
            (project.state == ProjectState.ACTIVE && 
             block.timestamp > project.deadline && 
             project.totalRaised < project.fundingGoal);
        
        if (!canRefund) revert InvalidState();

        uint256 contribution = investorContribution[_projectId][msg.sender];
        if (contribution == 0) revert NotInvestor();

        address paymentToken = investmentTokens[_projectId][msg.sender];

        // Clear investor data
        investorContribution[_projectId][msg.sender] = 0;
        investorTokenAllocation[_projectId][msg.sender] = 0;

        // Mark investments as refunded
        Investment[] storage projectInvestments = investments[_projectId];
        for (uint256 i = 0; i < projectInvestments.length; i++) {
            if (projectInvestments[i].investor == msg.sender) {
                projectInvestments[i].refunded = true;
            }
        }

        // Transfer refund
        if (paymentToken != address(0) && contribution > 0) {
            IERC20(paymentToken).safeTransfer(msg.sender, contribution);
        }

        emit RefundClaimed(_projectId, msg.sender, contribution);
    }

    // ============================================
    // DISPUTE MANAGEMENT (Called by DisputeManager)
    // ============================================

    /**
     * @notice Block project and take snapshot for fair refund calculation
     */
    function blockProject(uint256 _projectId) 
        external 
        onlyRole(DISPUTE_MANAGER_ROLE) 
        validProject(_projectId) 
    {
        Project storage project = projects[_projectId];
        projectBlockedByDispute[_projectId] = true;
        project.state = ProjectState.DISPUTED;
        
        // Take snapshot for fair refund calculation
        uint256 snapshotId = IRWASecurityToken(project.securityToken).snapshot();
        projectSnapshotId[_projectId] = snapshotId;

        emit ProjectBlockedByDisputeEvent(_projectId, snapshotId);
        emit ProjectStateChanged(_projectId, ProjectState.DISPUTED);
    }

    /**
     * @notice Unblock project (dispute dismissed)
     */
    function unblockProject(uint256 _projectId) 
        external 
        onlyRole(DISPUTE_MANAGER_ROLE) 
        validProject(_projectId) 
    {
        projectBlockedByDispute[_projectId] = false;
        projects[_projectId].state = ProjectState.COMPLETED;
        
        emit ProjectUnblocked(_projectId);
        emit ProjectStateChanged(_projectId, ProjectState.COMPLETED);
    }

    /**
     * @notice Process USDT refund for dispute resolution
     * @dev Refunds remaining USDT proportionally to token holders at snapshot
     *      Tokens are NOT returned - they become worthless
     */
    function refundForDispute(uint256 _projectId) 
        external 
        nonReentrant 
        onlyRole(DISPUTE_MANAGER_ROLE) 
        validProject(_projectId) 
    {
        Project storage project = projects[_projectId];
        if (project.state != ProjectState.DISPUTED) revert InvalidState();

        // Calculate remaining USDT
        uint256 platformFee = (project.totalRaised * PLATFORM_USDT_FEE_BPS) / Constants.BPS_DENOMINATOR;
        uint256 remainingFunds = project.totalRaised - platformFee - projectReleasedFunds[_projectId];

        // Try to get platform USDT back (if not distributed)
        try platformFeeManager.refundUSDTForDispute(_projectId, address(this)) {
            // Platform USDT returned
        } catch {
            // Already distributed to wallets - continue without it
        }

        // Get current balance (may include returned platform fees)
        uint256 refundPool = 0;
        if (project.paymentToken != address(0)) {
            uint256 balance = IERC20(project.paymentToken).balanceOf(address(this));
            refundPool = balance < remainingFunds ? balance : remainingFunds;
        }

        if (refundPool == 0) {
            // No funds to refund, just cancel
            project.state = ProjectState.CANCELLED;
            emit ProjectStateChanged(_projectId, ProjectState.CANCELLED);
            projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.CANCELLED);
            return;
        }

        // Get snapshot data
        IRWASecurityToken securityToken = IRWASecurityToken(project.securityToken);
        uint256 snapshotId = projectSnapshotId[_projectId];
        uint256 totalSupplyAtSnapshot = securityToken.totalSupplyAt(snapshotId);

        if (totalSupplyAtSnapshot == 0) {
            // No tokens minted yet, refund based on contributions
            _refundByContribution(_projectId, refundPool);
        } else {
            // Refund based on token holdings at snapshot
            _refundBySnapshot(_projectId, refundPool, snapshotId, totalSupplyAtSnapshot);
        }

        project.state = ProjectState.CANCELLED;
        emit ProjectStateChanged(_projectId, ProjectState.CANCELLED);
        projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.CANCELLED);
    }

    function _refundByContribution(uint256 _projectId, uint256 _refundPool) internal {
        Project storage project = projects[_projectId];
        address[] memory investors = projectInvestors[_projectId];
        
        uint256 totalRefunded = 0;
        uint256 holdersRefunded = 0;

        for (uint256 i = 0; i < investors.length; i++) {
            address investor = investors[i];
            uint256 contribution = investorContribution[_projectId][investor];
            
            if (contribution > 0) {
                uint256 refundAmount = (_refundPool * contribution) / project.totalRaised;
                
                if (refundAmount > 0 && project.paymentToken != address(0)) {
                    IERC20(project.paymentToken).safeTransfer(investor, refundAmount);
                    totalRefunded += refundAmount;
                    holdersRefunded++;
                }
            }
        }

        emit DisputeRefundProcessed(_projectId, totalRefunded, holdersRefunded);
    }

    function _refundBySnapshot(
        uint256 _projectId, 
        uint256 _refundPool, 
        uint256 _snapshotId,
        uint256 _totalSupply
    ) internal {
        Project storage project = projects[_projectId];
        IRWASecurityToken securityToken = IRWASecurityToken(project.securityToken);
        
        // Get all potential holders (investors + platform wallets)
        address[] memory investors = projectInvestors[_projectId];
        
        // Get wallet addresses directly from public variables
        address feeReceiver = platformFeeManager.feeReceiver();
        address liquidityWallet = platformFeeManager.liquidityWallet();
        address treasuryWallet = platformFeeManager.treasuryWallet();

        uint256 totalRefunded = 0;
        uint256 holdersRefunded = 0;

        // Refund investors
        for (uint256 i = 0; i < investors.length; i++) {
            address holder = investors[i];
            uint256 balanceAtSnapshot = securityToken.balanceOfAt(holder, _snapshotId);
            
            if (balanceAtSnapshot > 0) {
                uint256 refundAmount = (_refundPool * balanceAtSnapshot) / _totalSupply;
                
                if (refundAmount > 0 && project.paymentToken != address(0)) {
                    IERC20(project.paymentToken).safeTransfer(holder, refundAmount);
                    totalRefunded += refundAmount;
                    holdersRefunded++;
                }
            }
        }

        // Refund platform wallets (they hold tokens too)
        address[3] memory platformWallets = [feeReceiver, liquidityWallet, treasuryWallet];
        
        for (uint256 i = 0; i < 3; i++) {
            if (platformWallets[i] != address(0)) {
                uint256 balanceAtSnapshot = securityToken.balanceOfAt(platformWallets[i], _snapshotId);
                
                if (balanceAtSnapshot > 0) {
                    uint256 refundAmount = (_refundPool * balanceAtSnapshot) / _totalSupply;
                    
                    if (refundAmount > 0 && project.paymentToken != address(0)) {
                        IERC20(project.paymentToken).safeTransfer(platformWallets[i], refundAmount);
                        totalRefunded += refundAmount;
                        holdersRefunded++;
                    }
                }
            }
        }

        emit DisputeRefundProcessed(_projectId, totalRefunded, holdersRefunded);
    }

    // ============================================
    // ADMIN ACTIONS
    // ============================================

    /**
     * @notice Cancel project (admin only)
     */
    function cancelProject(uint256 _projectId) 
        external 
        onlyRole(ADMIN_ROLE) 
        validProject(_projectId) 
    {
        Project storage project = projects[_projectId];
        if (project.state == ProjectState.COMPLETED || project.state == ProjectState.CANCELLED) 
            revert InvalidState();

        project.state = ProjectState.CANCELLED;
        emit ProjectStateChanged(_projectId, ProjectState.CANCELLED);
        projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.CANCELLED);
    }

    function grantDisputeManagerRole(address _disputeManager) external onlyRole(ADMIN_ROLE) {
        if (_disputeManager == address(0)) revert InvalidAddress();
        _grantRole(DISPUTE_MANAGER_ROLE, _disputeManager);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getProject(uint256 _projectId) external view returns (Project memory) {
        return projects[_projectId];
    }

    function getInvestments(uint256 _projectId) external view returns (Investment[] memory) {
        return investments[_projectId];
    }

    function getProjectInvestors(uint256 _projectId) external view returns (address[] memory) {
        return projectInvestors[_projectId];
    }

    function getInvestorAllocation(uint256 _projectId, address _investor) external view returns (uint256) {
        return investorTokenAllocation[_projectId][_investor];
    }

    function getInvestorContribution(uint256 _projectId, address _investor) external view returns (uint256) {
        return investorContribution[_projectId][_investor];
    }

    function hasInvestorClaimed(uint256 _projectId, address _investor) external view returns (bool) {
        return hasClaimed[_projectId][_investor];
    }

    function isPaymentReferenceUsed(string calldata _ref) external view returns (bool) {
        return _usedPaymentReferences[_ref];
    }

    // ============================================
    // PAUSABLE
    // ============================================

    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    receive() external payable {}

    /**
     * @notice Inject USDC/USDT to convert off-chain recorded payments to on-chain
     * @dev Decreases projectOffChainAmount until it reaches 0
     * @param _projectId Project ID
     * @param _amount Amount to inject
     * @param _paymentToken USDC or USDT address
     */
    function injectOffChainFunds(
        uint256 _projectId,
        uint256 _amount,
        address _paymentToken
    ) external nonReentrant onlyRole(ADMIN_ROLE) validProject(_projectId) {
        if (_amount == 0) revert InvalidAmount();
        if (_paymentToken != address(usdc) && _paymentToken != address(usdt)) revert InvalidAddress();
        
        Project storage project = projects[_projectId];
        
        // Can inject for active, funded, or completed projects
        if (project.state == ProjectState.INACTIVE || 
            project.state == ProjectState.CANCELLED ||
            project.state == ProjectState.DISPUTED) revert InvalidState();

        // Cannot inject more than off-chain amount
        uint256 offChainRemaining = projectOffChainAmount[_projectId];
        if (_amount > offChainRemaining) revert InvalidAmount();

        // Transfer funds from admin to escrow
        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);

        // Decrease off-chain tracking
        projectOffChainAmount[_projectId] -= _amount;

        // Set payment token if not set
        if (project.paymentToken == address(0)) {
            project.paymentToken = _paymentToken;
        }

        emit OffChainFundsInjected(_projectId, _amount, projectOffChainAmount[_projectId], _paymentToken);
    }

    /**
     * @notice Get off-chain amount pending injection
     * @param _projectId Project ID
     * @return Remaining off-chain amount to be injected
     */
    function getOffChainPending(uint256 _projectId) external view returns (uint256) {
        return projectOffChainAmount[_projectId];
    }
}