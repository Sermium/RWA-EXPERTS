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
import "../interfaces/IAggregatorV3.sol";
import "../libraries/Constants.sol";
import "../interfaces/IKYCVerifier.sol";

contract RWAEscrowVault is Initializable, AccessControlUpgradeable, UUPSUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    enum ProjectState { INACTIVE, ACTIVE, FUNDED, COMPLETED, CANCELLED, DISPUTED }
    enum MilestoneState { PENDING, APPROVED, RELEASED, DISPUTED, CANCELLED }

    struct Milestone {
        string description;
        uint256 amount;
        uint256 deadline;
        MilestoneState state;
        uint256 releasedAt;
        uint256 approvedAt;
    }

    struct Project {
        uint256 projectId;
        address projectOwner;
        address securityToken;
        address paymentToken;
        address priceFeed;
        uint256 fundingGoal;
        uint256 totalRaised;
        uint256 deadline;
        ProjectState state;
        uint256 createdAt;
        uint256 platformFeeBps;
        uint256 maxPriceAge;
    }

    struct Investment {
        address investor;
        uint256 amount;
        uint256 tokenAmount;
        uint256 timestamp;
        bool refunded;
        string paymentReference;
    }

    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }

    mapping(uint256 => Project) public projects;
    mapping(uint256 => Milestone[]) public milestones;
    mapping(uint256 => Investment[]) public investments;
    mapping(uint256 => mapping(address => uint256)) public investorTokenBalance;
    mapping(uint256 => mapping(address => uint256)) public investorContribution;
    mapping(uint256 => uint256) public projectInvestorCount;
    mapping(string => bool) private _usedPaymentReferences;
    mapping(string => uint256) private _paymentReferenceToProject;
    mapping(uint256 => mapping(address => address)) public investmentTokens;
    mapping(uint256 => mapping(address => uint256)) public tokensClaimed;
    
    uint256 public claimFeeBps;
    address public feeRecipient;

    uint256 public lastValidPrice;
    uint256 public lastPriceUpdateTime;
    uint256 public transactionFee;

    address public platformFeeRecipient;
    IKYCVerifier public kycVerifier;
    IRWAProjectNFT public projectNFT;
    IERC20 public usdc;
    IERC20 public usdt;

    event ProjectCreated(uint256 indexed projectId, address indexed owner, uint256 fundingGoal, uint256 deadline);
    event InvestmentReceived(uint256 indexed projectId, address indexed investor, uint256 amount, uint256 tokenAmount);
    event OffChainInvestmentRecorded(uint256 indexed projectId, address indexed investor, uint256 amount, string paymentReference);
    event MilestoneAdded(uint256 indexed projectId, uint256 milestoneIndex, uint256 amount, uint256 deadline);
    event MilestoneApproved(uint256 indexed projectId, uint256 milestoneIndex);
    event MilestoneFundsReleased(uint256 indexed projectId, uint256 milestoneIndex, uint256 amount);
    event RefundClaimed(uint256 indexed projectId, address indexed investor, uint256 amount);
    event ProjectStateChanged(uint256 indexed projectId, ProjectState newState);
    event DisputeRaised(uint256 indexed projectId, uint256 milestoneIndex, string reason);
    event DisputeResolved(uint256 indexed projectId, uint256 milestoneIndex, bool approved);
    event PlatformFeeUpdated(uint256 indexed projectId, uint256 newFeeBps);
    event PriceFeedUpdated(uint256 indexed projectId, address newPriceFeed);
    event PriceDeviationDetected(uint256 oldPrice, uint256 newPrice, uint256 deviationBps);
    event KYCVerifierUpdated(address indexed oldVerifier, address indexed newVerifier);
    event ProjectFinalized(uint256 indexed projectId, uint256 totalRaised);
    event TokensClaimed(uint256 indexed projectId, address indexed investor, uint256 tokenAmount, uint256 fee);
    event ClaimFeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address oldRecipient, address newRecipient);
    event TransactionFeeUpdated(uint256 oldFee, uint256 newFee);
    event ProjectForceFunded(uint256 indexed projectId, uint256 totalRaised, uint256 fundingGoal, string reason);

    error InvalidProject();
    error InvalidState();
    error InvalidAmount();
    error InvalidAddress();
    error DeadlinePassed();
    error DeadlineNotPassed();
    error FundingGoalNotMet();
    error FundingGoalMet();
    error MilestoneNotApproved();
    error MilestoneAlreadyReleased();
    error InsufficientBalance();
    error AlreadyRefunded();
    error NotInvestor();
    error InvalidMilestone();
    error BatchTooLarge();
    error PaymentReferenceUsed();
    error StalePrice();
    error InvalidPrice();
    error PriceDeviationTooHigh();
    error FeeTooHigh();
    error TooManyMilestones();
    error NoFundsRaised();
    error KYCNotVerified();

    modifier validProject(uint256 _projectId) {
        if (projects[_projectId].projectOwner == address(0)) revert InvalidProject();
        _;
    }

    modifier inState(uint256 _projectId, ProjectState _state) {
        if (projects[_projectId].state != _state) revert InvalidState();
        _;
    }

    function setTransactionFee(uint256 _fee) external onlyRole(ADMIN_ROLE) {
        uint256 oldFee = transactionFee;
        transactionFee = _fee;
        emit TransactionFeeUpdated(oldFee, _fee);
    }

    function initialize(address _admin, address _platformFeeRecipient, address _projectNFT) external initializer {
        if (_admin == address(0) || _platformFeeRecipient == address(0) || _projectNFT == address(0)) revert InvalidAddress();
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(OPERATOR_ROLE, _admin);
        _grantRole(DISPUTE_RESOLVER_ROLE, _admin);
        platformFeeRecipient = _platformFeeRecipient;
        projectNFT = IRWAProjectNFT(_projectNFT);
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    function setKYCVerifier(address _kycVerifier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_kycVerifier != address(0), "Zero address");
        address oldVerifier = address(kycVerifier);
        kycVerifier = IKYCVerifier(_kycVerifier);
        emit KYCVerifierUpdated(oldVerifier, _kycVerifier);
    }

    function setPaymentTokens(address _usdc, address _usdt) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_usdc != address(0) && _usdt != address(0), "Zero address");
        usdc = IERC20(_usdc);
        usdt = IERC20(_usdt);
    }

    function claimTokens(uint256 _projectId) external payable nonReentrant validProject(_projectId) {
        Project storage project = projects[_projectId];
        require(project.state == ProjectState.FUNDED || project.state == ProjectState.COMPLETED, "Cannot claim");

        uint256 totalTokens = investorTokenBalance[_projectId][msg.sender];
        require(totalTokens > 0, "No tokens to claim");

        uint256 releasedAmount = _getReleasedAmount(_projectId);
        uint256 releasedBps = (releasedAmount * Constants.BPS_DENOMINATOR) / project.totalRaised;

        uint256 totalClaimable = (totalTokens * releasedBps) / Constants.BPS_DENOMINATOR;
        uint256 alreadyClaimed = tokensClaimed[_projectId][msg.sender];
        uint256 claimableNow = totalClaimable - alreadyClaimed;

        require(claimableNow > 0, "Nothing to claim");

        uint256 fee = (claimableNow * claimFeeBps) / Constants.BPS_DENOMINATOR;
        uint256 netTokens = claimableNow - fee;

        tokensClaimed[_projectId][msg.sender] = totalClaimable;

        IRWASecurityToken(project.securityToken).mint(msg.sender, netTokens);

        if (fee > 0 && feeRecipient != address(0)) {
            IRWASecurityToken(project.securityToken).mint(feeRecipient, fee);
        }

        emit TokensClaimed(_projectId, msg.sender, netTokens, fee);
    }

    function getClaimableTokens(uint256 _projectId, address _investor) external view returns (uint256) {
        Project storage project = projects[_projectId];
        if (project.state != ProjectState.FUNDED && project.state != ProjectState.COMPLETED) {
            return 0;
        }

        uint256 totalTokens = investorTokenBalance[_projectId][_investor];
        if (totalTokens == 0) return 0;

        uint256 releasedAmount = _getReleasedAmount(_projectId);
        uint256 releasedBps = project.totalRaised > 0 ? (releasedAmount * Constants.BPS_DENOMINATOR) / project.totalRaised : 0;
        uint256 totalClaimable = (totalTokens * releasedBps) / Constants.BPS_DENOMINATOR;
        uint256 alreadyClaimed = tokensClaimed[_projectId][_investor];

        return totalClaimable > alreadyClaimed ? totalClaimable - alreadyClaimed : 0;
    }

    function setClaimFee(uint256 _feeBps) external onlyRole(ADMIN_ROLE) {
        require(_feeBps <= Constants.MAX_FEE_BPS, "Fee too high");
        uint256 oldFee = claimFeeBps;
        claimFeeBps = _feeBps;
        emit ClaimFeeUpdated(oldFee, _feeBps);
    }

    function setFeeRecipient(address _recipient) external onlyRole(ADMIN_ROLE) {
        require(_recipient != address(0), "Zero address");
        address oldRecipient = feeRecipient;
        feeRecipient = _recipient;
        emit FeeRecipientUpdated(oldRecipient, _recipient);
    }

    function createProject(uint256 _projectId, address _securityToken, address _paymentToken, address _priceFeed, uint256 _fundingGoal, uint256 _deadline, uint256 _platformFeeBps, uint256 _maxPriceAge) external payable whenNotPaused {
        if (_securityToken == address(0)) revert InvalidAddress();
        if (_fundingGoal < Constants.MIN_FUNDING_GOAL) revert InvalidAmount();
        if (_deadline <= block.timestamp + Constants.MIN_FUNDRAISE_DURATION) revert DeadlinePassed();
        if (_platformFeeBps > Constants.MAX_FEE_BPS) revert FeeTooHigh();
        if (_maxPriceAge < Constants.MIN_PRICE_AGE || _maxPriceAge > Constants.MAX_PRICE_AGE_LIMIT) revert InvalidAmount();
        if (projects[_projectId].projectOwner != address(0)) revert InvalidProject();

        projects[_projectId] = Project({
            projectId: _projectId,
            projectOwner: msg.sender,
            securityToken: _securityToken,
            paymentToken: _paymentToken,
            priceFeed: _priceFeed,
            fundingGoal: _fundingGoal,
            totalRaised: 0,
            deadline: _deadline,
            state: ProjectState.INACTIVE,
            createdAt: block.timestamp,
            platformFeeBps: _platformFeeBps,
            maxPriceAge: _maxPriceAge
        });

        emit ProjectCreated(_projectId, msg.sender, _fundingGoal, _deadline);
        emit ProjectStateChanged(_projectId, ProjectState.INACTIVE);
    }

    function activateProject(uint256 _projectId) external onlyRole(OPERATOR_ROLE) validProject(_projectId) inState(_projectId, ProjectState.INACTIVE) {
        projects[_projectId].state = ProjectState.ACTIVE;
        emit ProjectStateChanged(_projectId, ProjectState.ACTIVE);
    }

    function addMilestone(uint256 _projectId, string calldata _description, uint256 _amount, uint256 _deadline) external payable validProject(_projectId) {
        Project storage project = projects[_projectId];
        require(msg.sender == project.projectOwner || hasRole(OPERATOR_ROLE, msg.sender), "Not authorized");

        if (milestones[_projectId].length >= Constants.MAX_MILESTONES) revert TooManyMilestones();
        if (_amount == 0) revert InvalidAmount();
        if (_deadline <= block.timestamp) revert DeadlinePassed();

        milestones[_projectId].push(Milestone({
            description: _description,
            amount: _amount,
            deadline: _deadline,
            state: MilestoneState.PENDING,
            releasedAt: 0,
            approvedAt: 0
        }));

        emit MilestoneAdded(_projectId, milestones[_projectId].length - 1, _amount, _deadline);
    }

    /**
     * @notice Invest in a project with KYC proof
     * @param _projectId Project ID
     * @param _amount Amount to invest (for token payments)
     * @param _paymentToken Payment token address (address(0) for native)
     * @param _kycProof KYC proof containing level, country, expiry, and signature
     */
    function invest(
        uint256 _projectId,
        uint256 _amount,
        address _paymentToken,
        KYCProof calldata _kycProof
    ) external payable nonReentrant whenNotPaused validProject(_projectId) inState(_projectId, ProjectState.ACTIVE) {
        Project storage project = projects[_projectId];
        require(block.timestamp <= project.deadline, "Outside funding window");
        
        // Verify KYC with signature
        if (!kycVerifier.verify(msg.sender, _kycProof.level, _kycProof.countryCode, _kycProof.expiry, _kycProof.signature)) {
            revert KYCNotVerified();
        }

        uint256 investmentAmount;

        if (_paymentToken == address(0)) {
            investmentAmount = msg.value;
        } else {
            require(_paymentToken == address(usdc) || _paymentToken == address(usdt), "Invalid payment token");
            require(msg.value == 0, "ETH not accepted with token payment");
            investmentAmount = _amount;
            IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);
        }

        require(investmentAmount > 0, "Invalid investment amount");
        require(project.totalRaised + investmentAmount <= project.fundingGoal, "Exceeds funding goal");

        project.totalRaised += investmentAmount;
        investorContribution[_projectId][msg.sender] += investmentAmount;
        investmentTokens[_projectId][msg.sender] = _paymentToken;

        if (investorContribution[_projectId][msg.sender] == investmentAmount) {
            projectInvestorCount[_projectId]++;
        }

        uint256 tokenAmount = _calculateTokenAmount(_projectId, investmentAmount);
        investorTokenBalance[_projectId][msg.sender] += tokenAmount;

        investments[_projectId].push(Investment({
            investor: msg.sender,
            amount: investmentAmount,
            tokenAmount: tokenAmount,
            timestamp: block.timestamp,
            refunded: false,
            paymentReference: ""
        }));

        emit InvestmentReceived(_projectId, msg.sender, investmentAmount, tokenAmount);

        if (project.totalRaised >= project.fundingGoal) {
            project.state = ProjectState.FUNDED;
            emit ProjectStateChanged(_projectId, ProjectState.FUNDED);
            projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.FUNDED);
        }
    }

    function recordOffChainInvestment(uint256 _projectId, address _investor, uint256 _amount, uint256 _tokenAmount, string calldata _paymentReference) external nonReentrant onlyRole(OPERATOR_ROLE) validProject(_projectId) inState(_projectId, ProjectState.ACTIVE) {
        if (_investor == address(0)) revert InvalidAddress();
        if (_amount == 0 || _tokenAmount == 0) revert InvalidAmount();
        if (bytes(_paymentReference).length == 0) revert InvalidAmount();
        if (_usedPaymentReferences[_paymentReference]) revert PaymentReferenceUsed();

        Project storage project = projects[_projectId];
        if (block.timestamp > project.deadline) revert DeadlinePassed();

        _usedPaymentReferences[_paymentReference] = true;
        _paymentReferenceToProject[_paymentReference] = _projectId;
        project.totalRaised += _amount;
        investorContribution[_projectId][_investor] += _amount;
        investorTokenBalance[_projectId][_investor] += _tokenAmount;

        if (investorContribution[_projectId][_investor] == _amount) {
            projectInvestorCount[_projectId]++;
        }

        investments[_projectId].push(Investment({
            investor: _investor,
            amount: _amount,
            tokenAmount: _tokenAmount,
            timestamp: block.timestamp,
            refunded: false,
            paymentReference: _paymentReference
        }));

        emit OffChainInvestmentRecorded(_projectId, _investor, _amount, _paymentReference);

        if (project.totalRaised >= project.fundingGoal) {
            project.state = ProjectState.FUNDED;
            emit ProjectStateChanged(_projectId, ProjectState.FUNDED);
            projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.FUNDED);
        }
    }

    function forceMarkFunded(uint256 _projectId, string calldata _reason) external onlyRole(ADMIN_ROLE) validProject(_projectId) inState(_projectId, ProjectState.ACTIVE) {
        Project storage project = projects[_projectId];
        
        if (project.totalRaised == 0) revert NoFundsRaised();
        
        project.state = ProjectState.FUNDED;
        emit ProjectStateChanged(_projectId, ProjectState.FUNDED);
        emit ProjectForceFunded(_projectId, project.totalRaised, project.fundingGoal, _reason);
        
        projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.FUNDED);
    }

    function approveMilestone(uint256 _projectId, uint256 _milestoneIndex) external validProject(_projectId) onlyRole(OPERATOR_ROLE) {
        if (_milestoneIndex >= milestones[_projectId].length) revert InvalidMilestone();
        Milestone storage milestone = milestones[_projectId][_milestoneIndex];
        if (milestone.state != MilestoneState.PENDING) revert InvalidState();

        milestone.state = MilestoneState.APPROVED;
        milestone.approvedAt = block.timestamp;

        emit MilestoneApproved(_projectId, _milestoneIndex);
    }

    function releaseMilestoneFunds(uint256 _projectId, uint256 _milestoneIndex) external payable nonReentrant validProject(_projectId) {
        Project storage project = projects[_projectId];
        require(msg.sender == project.projectOwner, "Not project owner");
        if (project.state != ProjectState.FUNDED && project.state != ProjectState.COMPLETED) revert InvalidState();
        if (_milestoneIndex >= milestones[_projectId].length) revert InvalidMilestone();

        Milestone storage milestone = milestones[_projectId][_milestoneIndex];
        if (milestone.state != MilestoneState.APPROVED) revert MilestoneNotApproved();

        uint256 releaseAmount = milestone.amount;
        uint256 platformFee = (releaseAmount * project.platformFeeBps) / Constants.BPS_DENOMINATOR;
        if (platformFee < Constants.MIN_FEE) platformFee = Constants.MIN_FEE;
        uint256 netAmount = releaseAmount - platformFee;

        milestone.state = MilestoneState.RELEASED;
        milestone.releasedAt = block.timestamp;

        _transferFunds(platformFeeRecipient, platformFee, project.paymentToken);
        _transferFunds(project.projectOwner, netAmount, project.paymentToken);

        emit MilestoneFundsReleased(_projectId, _milestoneIndex, releaseAmount);

        bool allReleased = true;
        uint256 length = milestones[_projectId].length;
        for (uint256 i = 0; i < length; ++i) {
            if (milestones[_projectId][i].state != MilestoneState.RELEASED && milestones[_projectId][i].state != MilestoneState.CANCELLED) {
                allReleased = false;
                break;
            }
        }
        
        if (allReleased) {
            project.state = ProjectState.COMPLETED;
            emit ProjectStateChanged(_projectId, ProjectState.COMPLETED);
            projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.COMPLETED);
        }
    }

    function claimRefund(uint256 _projectId) external payable nonReentrant validProject(_projectId) {
        Project storage project = projects[_projectId];
        require(project.state == ProjectState.CANCELLED, "Refund not available");

        uint256 contribution = investorContribution[_projectId][msg.sender];
        require(contribution > 0, "No investment found");

        address paymentToken = investmentTokens[_projectId][msg.sender];

        uint256 releasedAmount = _getReleasedAmount(_projectId);
        uint256 releasedBps = project.totalRaised > 0 ? (releasedAmount * Constants.BPS_DENOMINATOR) / project.totalRaised : 0;
        uint256 unreleasedBps = Constants.BPS_DENOMINATOR - releasedBps;
        uint256 refundAmount = (contribution * unreleasedBps) / Constants.BPS_DENOMINATOR;

        investorContribution[_projectId][msg.sender] = 0;
        investorTokenBalance[_projectId][msg.sender] = 0;
        investmentTokens[_projectId][msg.sender] = address(0);

        uint256 len = investments[_projectId].length;
        for (uint256 i = 0; i < len; ++i) {
            if (investments[_projectId][i].investor == msg.sender) {
                investments[_projectId][i].refunded = true;
            }
        }

        if (refundAmount > 0) {
            _transferFunds(msg.sender, refundAmount, paymentToken);
        }

        emit RefundClaimed(_projectId, msg.sender, refundAmount);
    }

    function _getReleasedAmount(uint256 _projectId) internal view returns (uint256) {
        uint256 released = 0;
        uint256 len = milestones[_projectId].length;
        for (uint256 i = 0; i < len; ++i) {
            if (milestones[_projectId][i].state == MilestoneState.RELEASED) {
                released += milestones[_projectId][i].amount;
            }
        }
        return released;
    }

    function raiseDispute(uint256 _projectId, uint256 _milestoneIndex, string calldata _reason) external payable validProject(_projectId) {
        Project storage project = projects[_projectId];
        require(msg.sender == project.projectOwner || hasRole(DISPUTE_RESOLVER_ROLE, msg.sender), "Not authorized");
        if (_milestoneIndex >= milestones[_projectId].length) revert InvalidMilestone();

        Milestone storage milestone = milestones[_projectId][_milestoneIndex];
        milestone.state = MilestoneState.DISPUTED;
        project.state = ProjectState.DISPUTED;

        emit DisputeRaised(_projectId, _milestoneIndex, _reason);
        emit ProjectStateChanged(_projectId, ProjectState.DISPUTED);
    }

    function resolveDispute(uint256 _projectId, uint256 _milestoneIndex, bool _approve) external onlyRole(DISPUTE_RESOLVER_ROLE) validProject(_projectId) {
        if (_milestoneIndex >= milestones[_projectId].length) revert InvalidMilestone();
        Milestone storage milestone = milestones[_projectId][_milestoneIndex];
        if (milestone.state != MilestoneState.DISPUTED) revert InvalidState();

        if (_approve) {
            milestone.state = MilestoneState.APPROVED;
            milestone.approvedAt = block.timestamp;
        } else {
            milestone.state = MilestoneState.CANCELLED;
        }

        projects[_projectId].state = ProjectState.FUNDED;
        emit DisputeResolved(_projectId, _milestoneIndex, _approve);
        emit ProjectStateChanged(_projectId, ProjectState.FUNDED);
    }

    function cancelProject(uint256 _projectId) external onlyRole(ADMIN_ROLE) validProject(_projectId) {
        Project storage project = projects[_projectId];
        if (project.state == ProjectState.COMPLETED) revert InvalidState();

        project.state = ProjectState.CANCELLED;
        emit ProjectStateChanged(_projectId, ProjectState.CANCELLED);
        projectNFT.updateProjectStatus(_projectId, IRWAProjectNFT.ProjectStatus.CANCELLED);
    }

    function _calculateTokenAmount(uint256 _projectId, uint256 _paymentAmount) internal returns (uint256) {
        Project storage project = projects[_projectId];
        if (project.priceFeed == address(0)) {
            return _paymentAmount;
        }

        uint256 price = _getValidatedPrice(project.priceFeed, project.maxPriceAge);
        return (_paymentAmount * (10 ** Constants.TOKEN_DECIMALS)) / price;
    }

    function _getValidatedPrice(address _priceFeed, uint256 _maxAge) internal returns (uint256) {
        (, int256 price, , uint256 updatedAt, ) = AggregatorV3Interface(_priceFeed).latestRoundData();

        if (price <= 0) revert InvalidPrice();
        if (block.timestamp - updatedAt > _maxAge) revert StalePrice();

        uint256 currentPrice = uint256(price);

        if (lastValidPrice > 0) {
            uint256 deviation;
            if (currentPrice > lastValidPrice) {
                deviation = ((currentPrice - lastValidPrice) * Constants.BPS_DENOMINATOR) / lastValidPrice;
            } else {
                deviation = ((lastValidPrice - currentPrice) * Constants.BPS_DENOMINATOR) / lastValidPrice;
            }

            if (deviation > Constants.MAX_PRICE_DEVIATION_BPS) {
                emit PriceDeviationDetected(lastValidPrice, currentPrice, deviation);
                revert PriceDeviationTooHigh();
            }
        }

        lastValidPrice = currentPrice;
        lastPriceUpdateTime = block.timestamp;

        return currentPrice;
    }

    function _transferFunds(address _to, uint256 _amount, address _token) internal {
        if (_token == Constants.NATIVE_TOKEN) {
            (bool success, ) = _to.call{value: _amount}("");
            require(success, "Transfer failed");
        } else {
            IERC20(_token).safeTransfer(_to, _amount);
        }
    }

    function setPlatformFeeRecipient(address _recipient) external onlyRole(ADMIN_ROLE) {
        if (_recipient == address(0)) revert InvalidAddress();
        platformFeeRecipient = _recipient;
    }

    function updateProjectPriceFeed(uint256 _projectId, address _priceFeed) external onlyRole(ADMIN_ROLE) validProject(_projectId) {
        if (_priceFeed == address(0)) revert InvalidAddress();
        projects[_projectId].priceFeed = _priceFeed;
        emit PriceFeedUpdated(_projectId, _priceFeed);
    }

    function getProject(uint256 _projectId) external view returns (Project memory) { return projects[_projectId]; }
    function getMilestones(uint256 _projectId) external view returns (Milestone[] memory) { return milestones[_projectId]; }
    function getInvestments(uint256 _projectId) external view returns (Investment[] memory) { return investments[_projectId]; }
    function getInvestorBalance(uint256 _projectId, address _investor) external view returns (uint256) { return investorTokenBalance[_projectId][_investor]; }
    function getInvestorContribution(uint256 _projectId, address _investor) external view returns (uint256) { return investorContribution[_projectId][_investor]; }
    function isPaymentReferenceUsed(string calldata _ref) external view returns (bool) { return _usedPaymentReferences[_ref]; }

    function pause() external onlyRole(ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(ADMIN_ROLE) { _unpause(); }

    receive() external payable {}
}