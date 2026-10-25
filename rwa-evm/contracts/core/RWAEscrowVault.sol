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
    function refundForDispute(uint256 projectId, address escrowAddress) external;
    function liquidityWallet() external view returns (address);
    function treasuryWallet() external view returns (address);
    function feeReceiver() external view returns (address);
}

/**
 * @title RWAEscrowVault
 * @notice Crowdfunding escrow. Since v2 every stablecoin the vault holds is booked to exactly one
 *         project (projectBalance), each project settles in a single payment token, and refunds
 *         are claimed by investors rather than pushed in a loop.
 * @dev Storage layout of v1 is unchanged; v2 state is appended at the end. Projects created before
 *      the v2 upgrade have no per-project balance and stay frozen for fund movements until an
 *      admin runs migrateLegacyProject for them.
 */
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

    /// @notice A FUNDED project that has not been completed this long after funding becomes refundable
    uint256 public constant FUNDED_COMPLETION_TIMEOUT = 90 days;

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

    // ============ v2 storage (appended) ============

    /// @notice True for projects whose funds are booked per project (created on v2, or migrated)
    mapping(uint256 => bool) public projectAccountingEnabled;
    /// @notice Stablecoins (in the project's payment token) the vault holds for each project
    mapping(uint256 => uint256) public projectBalance;
    /// @notice Sum of projectBalance per payment token; never exceeds the vault's token balance
    mapping(address => uint256) public totalProjectBalances;
    /// @notice Stablecoins each investor actually paid in on-chain (refundable amount)
    mapping(uint256 => mapping(address => uint256)) public investorOnChainContribution;
    /// @notice Outstanding on-chain contributions per project
    mapping(uint256 => uint256) public projectOnChainRaised;
    /// @notice Injected off-chain funds still held for the project (reclaimable by admin on failure)
    mapping(uint256 => uint256) public projectInjectedFunds;
    /// @dev ProjectState + 1 recorded when a dispute blocks the project; 0 = unknown (blocked pre-v2)
    mapping(uint256 => uint8) private _stateBeforeDispute;
    /// @notice Dispute refunds for completed projects: pool split by token balance at the snapshot
    mapping(uint256 => bool) public disputeRefundOpen;
    mapping(uint256 => uint256) public disputeRefundPool;
    mapping(uint256 => mapping(address => bool)) public disputeRefundClaimed;

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
    event ProjectPaymentTokenSet(uint256 indexed projectId, address paymentToken);
    event DisputeRefundOpened(uint256 indexed projectId, uint256 pool, uint256 snapshotId);
    event DisputeRefundClaimed(uint256 indexed projectId, address indexed holder, uint256 amount);
    event InjectedFundsReclaimed(uint256 indexed projectId, address indexed to, uint256 amount);
    event LegacyProjectMigrated(uint256 indexed projectId, uint256 balance, uint256 onChainRaised);
    event ProjectOwnershipTransferred(uint256 indexed projectId, address indexed previousOwner, address indexed newOwner);
    event ProjectNFTUpdateFailed(uint256 indexed projectId, IRWAProjectNFT.ProjectStatus status);

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
    error PaymentTokenMismatch();
    error LegacyProject();
    error NothingToRefund();

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

    /// @dev Fund movements need per-project books; pre-v2 projects must be migrated first
    modifier accounted(uint256 _projectId) {
        if (!projectAccountingEnabled[_projectId]) revert LegacyProject();
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
        projectAccountingEnabled[_projectId] = true;

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

    /**
     * @notice Hand a project (completion rights, milestone payouts) to a new owner.
     *         Used by RWALaunchpadFactory, which creates projects on behalf of their deployer.
     */
    function transferProjectOwnership(uint256 _projectId, address _newOwner) external validProject(_projectId) {
        Project storage project = projects[_projectId];
        if (msg.sender != project.projectOwner && !hasRole(ADMIN_ROLE, msg.sender)) revert NotAuthorized();
        if (_newOwner == address(0)) revert InvalidAddress();
        emit ProjectOwnershipTransferred(_projectId, project.projectOwner, _newOwner);
        project.projectOwner = _newOwner;
    }

    /**
     * @notice Choose the stablecoin a project settles in, before it has received any.
     *         Without this call the first investment or injection fixes it.
     */
    function setProjectPaymentToken(uint256 _projectId, address _paymentToken) external validProject(_projectId) {
        Project storage project = projects[_projectId];
        if (msg.sender != project.projectOwner && !hasRole(OPERATOR_ROLE, msg.sender)) revert NotAuthorized();
        if (_paymentToken != address(usdc) && _paymentToken != address(usdt)) revert InvalidAddress();
        if (project.paymentToken != address(0)) revert PaymentTokenMismatch();
        project.paymentToken = _paymentToken;
        emit ProjectPaymentTokenSet(_projectId, _paymentToken);
    }

    // ============================================
    // INVESTMENT
    // ============================================

    /**
     * @notice Invest in a project with KYC proof
     * @dev Every investment in a project must use the project's payment token
     */
    function invest(
        uint256 _projectId,
        uint256 _amount,
        address _paymentToken,
        KYCProof calldata _kycProof
    ) external nonReentrant whenNotPaused validProject(_projectId) accounted(_projectId) inState(_projectId, ProjectState.ACTIVE) {
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

        _usePaymentToken(_projectId, _paymentToken);

        // Transfer payment
        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);
        _credit(_projectId, _amount);

        // Update project
        project.totalRaised += _amount;
        projectOnChainRaised[_projectId] += _amount;

        // Track investor
        if (!isProjectInvestor[_projectId][msg.sender]) {
            isProjectInvestor[_projectId][msg.sender] = true;
            projectInvestors[_projectId].push(msg.sender);
            projectInvestorCount[_projectId]++;
        }

        investorContribution[_projectId][msg.sender] += _amount;
        investorOnChainContribution[_projectId][msg.sender] += _amount;
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
     * @dev Only books the allocation. The stablecoins arrive later through injectOffChainFunds.
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

        _setNFTStatus(_projectId, IRWAProjectNFT.ProjectStatus.FUNDED);
    }

    function _markProjectFunded(uint256 _projectId) internal {
        Project storage project = projects[_projectId];
        project.state = ProjectState.FUNDED;
        project.fundedAt = block.timestamp;

        emit ProjectFunded(_projectId, project.totalRaised);
        emit ProjectStateChanged(_projectId, ProjectState.FUNDED);

        _setNFTStatus(_projectId, IRWAProjectNFT.ProjectStatus.FUNDED);
    }

    // ============================================
    // PROJECT COMPLETION (Owner triggers)
    // ============================================

    /**
     * @notice Owner terminates fundraising and moves to COMPLETED
     * @dev Transfers platform fees: 1.5% of the stablecoins actually held for this project, and 1%
     *      of the token supply. Off-chain amounts that were never injected are not on-chain, so no
     *      on-chain fee is taken on them. Investors can then claim their tokens; the rest of the
     *      project's balance stays in escrow for milestone releases.
     */
    function completeProject(uint256 _projectId)
        external
        nonReentrant
        validProject(_projectId)
        accounted(_projectId)
        inState(_projectId, ProjectState.FUNDED)
    {
        Project storage project = projects[_projectId];
        if (msg.sender != project.projectOwner && !hasRole(ADMIN_ROLE, msg.sender)) revert NotAuthorized();
        if (project.platformFeesTransferred) revert InvalidState();

        // Calculate platform fees
        uint256 platformUSDT = (projectBalance[_projectId] * PLATFORM_USDT_FEE_BPS) / Constants.BPS_DENOMINATOR;
        uint256 platformTokens = (project.totalSupply * PLATFORM_TOKEN_FEE_BPS) / Constants.BPS_DENOMINATOR;

        // Get wallet addresses directly from fee manager public variables
        address liquidityWallet = platformFeeManager.liquidityWallet();
        address treasuryWallet = platformFeeManager.treasuryWallet();

        project.platformFeesTransferred = true;
        project.completedAt = block.timestamp;
        project.state = ProjectState.COMPLETED;

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

        // Transfer stablecoin fees to platform fee manager (for 34/33/33 distribution)
        if (platformUSDT > 0) {
            _debit(_projectId, platformUSDT);
            IERC20(project.paymentToken).safeApprove(address(platformFeeManager), platformUSDT);
            platformFeeManager.receiveFees(
                _projectId,
                project.paymentToken,
                platformUSDT,
                project.securityToken,
                0
            );
        }

        emit ProjectCompleted(_projectId, platformUSDT, platformTokens, liquidityWallet, treasuryWallet);
        emit ProjectStateChanged(_projectId, ProjectState.COMPLETED);

        _setNFTStatus(_projectId, IRWAProjectNFT.ProjectStatus.COMPLETED);
    }

    // ============================================
    // TOKEN CLAIMING (Investors via dashboard)
    // ============================================

    /**
     * @notice Investor claims their token allocation
     * @dev Applies claim fee if set. The security token enforces KYC on mint, so the investor (and
     *      the claim fee recipient) need a valid cached KYC on the token.
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
     * @dev Milestones are managed in DB, this just releases amounts out of the project's own balance
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
        accounted(_projectId)
        notBlocked(_projectId)
    {
        Project storage project = projects[_projectId];
        if (project.state != ProjectState.COMPLETED) revert InvalidState();
        if (_amount == 0) revert InvalidAmount();
        if (_amount > projectBalance[_projectId]) revert InsufficientBalance();

        _debit(_projectId, _amount);
        projectReleasedFunds[_projectId] += _amount;

        IERC20(project.paymentToken).safeTransfer(project.projectOwner, _amount);

        emit MilestoneFundsReleased(_projectId, _amount, _milestoneRef);
    }

    /**
     * @notice Get remaining funds available for milestone releases
     */
    function getAvailableFunds(uint256 _projectId) external view returns (uint256) {
        if (projects[_projectId].state != ProjectState.COMPLETED) return 0;
        return projectBalance[_projectId];
    }

    // ============================================
    // REFUNDS (Failed raise)
    // ============================================

    /**
     * @notice Investor claims back what they paid on-chain when the raise failed
     * @dev Refundable when the project was cancelled before completion, when an ACTIVE raise missed
     *      its goal by the deadline, or when a FUNDED project was not completed within
     *      FUNDED_COMPLETION_TIMEOUT. The first claim in the last two cases cancels the project.
     *      Off-chain contributions are refunded off-chain (see reclaimInjectedFunds).
     */
    function claimRefund(uint256 _projectId)
        external
        nonReentrant
        validProject(_projectId)
        accounted(_projectId)
    {
        Project storage project = projects[_projectId];

        if (project.state != ProjectState.CANCELLED) {
            bool raiseFailed = project.state == ProjectState.ACTIVE &&
                block.timestamp > project.deadline &&
                project.totalRaised < project.fundingGoal;
            bool completionTimedOut = project.state == ProjectState.FUNDED &&
                block.timestamp > project.fundedAt + FUNDED_COMPLETION_TIMEOUT;
            if (!raiseFailed && !completionTimedOut) revert InvalidState();
            _cancel(_projectId);
        } else if (disputeRefundOpen[_projectId]) {
            revert InvalidState(); // completed project refunded through a dispute: claimDisputeRefund
        }

        if (investorContribution[_projectId][msg.sender] == 0) revert NotInvestor();
        uint256 refund = investorOnChainContribution[_projectId][msg.sender];
        if (refund == 0) revert NothingToRefund();

        // Clear investor data
        investorContribution[_projectId][msg.sender] = 0;
        investorOnChainContribution[_projectId][msg.sender] = 0;
        investorTokenAllocation[_projectId][msg.sender] = 0;
        projectOnChainRaised[_projectId] -= refund;

        _debit(_projectId, refund);
        IERC20(project.paymentToken).safeTransfer(msg.sender, refund);

        emit RefundClaimed(_projectId, msg.sender, refund);
    }

    /**
     * @notice Return injected off-chain funds of a failed project to the admin, who refunds the
     *         off-chain investors through the channel they paid with
     */
    function reclaimInjectedFunds(uint256 _projectId)
        external
        nonReentrant
        onlyRole(ADMIN_ROLE)
        validProject(_projectId)
        accounted(_projectId)
        inState(_projectId, ProjectState.CANCELLED)
    {
        uint256 amount = projectInjectedFunds[_projectId];
        if (amount == 0) revert NothingToRelease();
        projectInjectedFunds[_projectId] = 0;
        _debit(_projectId, amount);
        IERC20(projects[_projectId].paymentToken).safeTransfer(msg.sender, amount);
        emit InjectedFundsReclaimed(_projectId, msg.sender, amount);
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
        if (project.state == ProjectState.DISPUTED || project.state == ProjectState.CANCELLED) revert InvalidState();

        _stateBeforeDispute[_projectId] = uint8(project.state) + 1;
        projectBlockedByDispute[_projectId] = true;
        project.state = ProjectState.DISPUTED;

        // Take snapshot for fair refund calculation
        uint256 snapshotId = IRWASecurityToken(project.securityToken).snapshot();
        projectSnapshotId[_projectId] = snapshotId;

        emit ProjectBlockedByDisputeEvent(_projectId, snapshotId);
        emit ProjectStateChanged(_projectId, ProjectState.DISPUTED);
    }

    /**
     * @notice Unblock project (dispute dismissed): the project returns to the state it was in
     */
    function unblockProject(uint256 _projectId)
        external
        onlyRole(DISPUTE_MANAGER_ROLE)
        validProject(_projectId)
        inState(_projectId, ProjectState.DISPUTED)
    {
        ProjectState previous = _previousState(_projectId);
        delete _stateBeforeDispute[_projectId];
        projectBlockedByDispute[_projectId] = false;
        projects[_projectId].state = previous;

        emit ProjectUnblocked(_projectId);
        emit ProjectStateChanged(_projectId, previous);
    }

    /**
     * @notice Resolve a dispute with refunds
     * @dev Project disputed before completion: it is cancelled and investors use claimRefund
     *      (their on-chain contribution in full). Completed project: platform stablecoin fees are
     *      pulled back if the fee manager still holds them, and what is left of the project's
     *      balance becomes a pool that token holders at the dispute snapshot claim pro rata with
     *      claimDisputeRefund. Tokens are NOT returned - they become worthless.
     */
    function refundForDispute(uint256 _projectId)
        external
        nonReentrant
        onlyRole(DISPUTE_MANAGER_ROLE)
        validProject(_projectId)
        accounted(_projectId)
        inState(_projectId, ProjectState.DISPUTED)
    {
        Project storage project = projects[_projectId];
        IRWASecurityToken securityToken = IRWASecurityToken(project.securityToken);
        uint256 snapshotId = projectSnapshotId[_projectId];
        uint256 supplyAtSnapshot = securityToken.totalSupplyAt(snapshotId);

        if (_previousState(_projectId) == ProjectState.COMPLETED && supplyAtSnapshot > 0) {
            // Try to get the platform's stablecoin fee back (fails once it was distributed)
            if (project.paymentToken != address(0)) {
                IERC20 paymentToken = IERC20(project.paymentToken);
                uint256 before = paymentToken.balanceOf(address(this));
                try platformFeeManager.refundForDispute(_projectId, address(this)) {} catch {}
                uint256 returned = paymentToken.balanceOf(address(this)) - before;
                if (returned > 0) _credit(_projectId, returned);
            }

            uint256 pool = projectBalance[_projectId];
            // Injected funds were spent alongside investor funds; whatever is left belongs to holders
            projectInjectedFunds[_projectId] = 0;
            if (pool > 0) {
                disputeRefundOpen[_projectId] = true;
                disputeRefundPool[_projectId] = pool;
                emit DisputeRefundOpened(_projectId, pool, snapshotId);
            }
        }

        projectBlockedByDispute[_projectId] = false;
        delete _stateBeforeDispute[_projectId];
        _cancel(_projectId);
    }

    /**
     * @notice Token holder at the dispute snapshot claims their share of the refund pool
     */
    function claimDisputeRefund(uint256 _projectId) external nonReentrant validProject(_projectId) {
        if (!disputeRefundOpen[_projectId]) revert InvalidState();
        if (disputeRefundClaimed[_projectId][msg.sender]) revert AlreadyClaimed();

        Project storage project = projects[_projectId];
        uint256 amount = getDisputeRefund(_projectId, msg.sender);
        if (amount == 0) revert NothingToRefund();

        disputeRefundClaimed[_projectId][msg.sender] = true;
        _debit(_projectId, amount);
        IERC20(project.paymentToken).safeTransfer(msg.sender, amount);

        emit DisputeRefundClaimed(_projectId, msg.sender, amount);
    }

    /**
     * @notice Amount a holder can still claim from a project's dispute refund pool
     */
    function getDisputeRefund(uint256 _projectId, address _holder) public view returns (uint256) {
        if (!disputeRefundOpen[_projectId] || disputeRefundClaimed[_projectId][_holder]) return 0;
        IRWASecurityToken securityToken = IRWASecurityToken(projects[_projectId].securityToken);
        uint256 snapshotId = projectSnapshotId[_projectId];
        uint256 supply = securityToken.totalSupplyAt(snapshotId);
        if (supply == 0) return 0;
        return (disputeRefundPool[_projectId] * securityToken.balanceOfAt(_holder, snapshotId)) / supply;
    }

    // ============================================
    // ADMIN ACTIONS
    // ============================================

    /**
     * @notice Cancel a project that has not completed (admin only). Investors then claim refunds.
     *         A completed project can only be unwound through a dispute.
     */
    function cancelProject(uint256 _projectId)
        external
        onlyRole(ADMIN_ROLE)
        validProject(_projectId)
    {
        ProjectState state = projects[_projectId].state;
        if (state != ProjectState.INACTIVE && state != ProjectState.ACTIVE && state != ProjectState.FUNDED)
            revert InvalidState();

        _cancel(_projectId);
    }

    function grantDisputeManagerRole(address _disputeManager) external onlyRole(ADMIN_ROLE) {
        if (_disputeManager == address(0)) revert InvalidAddress();
        _grantRole(DISPUTE_MANAGER_ROLE, _disputeManager);
    }

    /**
     * @notice Book a project created before v2 into per-project accounting
     * @dev The admin states how much of the vault's balance belongs to the project; the books can
     *      never claim more than the vault holds. Investors' refundable amounts are rebuilt from the
     *      investment records in the project's payment token. Gas grows with the number of
     *      investments of the project.
     * @param _balance Stablecoins (in the project's payment token) held for the project
     * @param _injected Part of _balance that came from injected off-chain funds
     */
    function migrateLegacyProject(uint256 _projectId, uint256 _balance, uint256 _injected)
        external
        onlyRole(ADMIN_ROLE)
        validProject(_projectId)
    {
        if (projectAccountingEnabled[_projectId]) revert InvalidState();
        Project storage project = projects[_projectId];
        if (_injected > _balance) revert InvalidAmount();
        if (_balance > 0 && project.paymentToken == address(0)) revert InvalidAddress();

        projectAccountingEnabled[_projectId] = true;

        uint256 onChainRaised;
        Investment[] storage list = investments[_projectId];
        for (uint256 i = 0; i < list.length; i++) {
            Investment storage inv = list[i];
            // claimRefund zeroed the contribution of investors already refunded
            if (inv.paymentToken != project.paymentToken || inv.paymentToken == address(0)) continue;
            if (inv.refunded || investorContribution[_projectId][inv.investor] == 0) continue;
            investorOnChainContribution[_projectId][inv.investor] += inv.amount;
            onChainRaised += inv.amount;
        }
        projectOnChainRaised[_projectId] = onChainRaised;
        projectInjectedFunds[_projectId] = _injected;
        if (_balance > 0) _credit(_projectId, _balance);

        emit LegacyProjectMigrated(_projectId, _balance, onChainRaised);
    }

    // ============================================
    // INTERNAL ACCOUNTING
    // ============================================

    /// @dev Fix the project's payment token on first use and reject any other token afterwards
    function _usePaymentToken(uint256 _projectId, address _paymentToken) internal {
        Project storage project = projects[_projectId];
        if (project.paymentToken == address(0)) {
            project.paymentToken = _paymentToken;
            emit ProjectPaymentTokenSet(_projectId, _paymentToken);
        } else if (project.paymentToken != _paymentToken) {
            revert PaymentTokenMismatch();
        }
    }

    function _credit(uint256 _projectId, uint256 _amount) internal {
        address token = projects[_projectId].paymentToken;
        projectBalance[_projectId] += _amount;
        totalProjectBalances[token] += _amount;
        if (totalProjectBalances[token] > IERC20(token).balanceOf(address(this))) revert InsufficientBalance();
    }

    function _debit(uint256 _projectId, uint256 _amount) internal {
        if (_amount > projectBalance[_projectId]) revert InsufficientBalance();
        projectBalance[_projectId] -= _amount;
        totalProjectBalances[projects[_projectId].paymentToken] -= _amount;
    }

    /// @dev The project NFT only mirrors the status; a missing role or NFT must not block funds
    function _setNFTStatus(uint256 _projectId, IRWAProjectNFT.ProjectStatus _status) internal {
        try projectNFT.updateProjectStatus(_projectId, _status) {} catch {
            emit ProjectNFTUpdateFailed(_projectId, _status);
        }
    }

    function _cancel(uint256 _projectId) internal {
        projects[_projectId].state = ProjectState.CANCELLED;
        emit ProjectStateChanged(_projectId, ProjectState.CANCELLED);
        _setNFTStatus(_projectId, IRWAProjectNFT.ProjectStatus.CANCELLED);
    }

    /// @dev State recorded when the dispute blocked the project. Projects blocked before v2 have
    ///      no record; they were blocked after completion in practice, as v1 assumed.
    function _previousState(uint256 _projectId) internal view returns (ProjectState) {
        uint8 recorded = _stateBeforeDispute[_projectId];
        return recorded == 0 ? ProjectState.COMPLETED : ProjectState(recorded - 1);
    }

    // ============================================
    // VIEW FUNCTIONS
    // ============================================

    function getProject(uint256 _projectId) external view returns (Project memory) {
        return projects[_projectId];
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
     * @dev Decreases projectOffChainAmount until it reaches 0. Only before completion: the platform
     *      fee is taken on the project's balance at completion.
     * @param _projectId Project ID
     * @param _amount Amount to inject
     * @param _paymentToken The project's payment token
     */
    function injectOffChainFunds(
        uint256 _projectId,
        uint256 _amount,
        address _paymentToken
    ) external nonReentrant onlyRole(ADMIN_ROLE) validProject(_projectId) accounted(_projectId) {
        if (_amount == 0) revert InvalidAmount();
        if (_paymentToken != address(usdc) && _paymentToken != address(usdt)) revert InvalidAddress();

        Project storage project = projects[_projectId];

        if (project.state != ProjectState.ACTIVE && project.state != ProjectState.FUNDED) revert InvalidState();

        // Cannot inject more than off-chain amount
        uint256 offChainRemaining = projectOffChainAmount[_projectId];
        if (_amount > offChainRemaining) revert InvalidAmount();

        _usePaymentToken(_projectId, _paymentToken);

        // Transfer funds from admin to escrow
        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);
        _credit(_projectId, _amount);
        projectInjectedFunds[_projectId] += _amount;

        // Decrease off-chain tracking
        projectOffChainAmount[_projectId] -= _amount;

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
