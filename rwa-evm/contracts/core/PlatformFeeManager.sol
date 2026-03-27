// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract PlatformFeeManager is 
    Initializable, 
    AccessControlUpgradeable, 
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable 
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant ESCROW_ROLE = keccak256("ESCROW_ROLE");
    bytes32 public constant DISPUTE_MANAGER_ROLE = keccak256("DISPUTE_MANAGER_ROLE");

    // Distribution percentages (basis points, total 10000)
    uint256 public constant FEE_RECEIVER_BPS = 3400;      // 34%
    uint256 public constant LIQUIDITY_WALLET_BPS = 3300;  // 33%
    uint256 public constant TREASURY_WALLET_BPS = 3300;   // 33%
    uint256 public constant TOKEN_LIQUIDITY_BPS = 5000;   // 50%
    uint256 public constant TOKEN_TREASURY_BPS = 5000;    // 50%

    // Wallet addresses
    address public feeReceiver;
    address public liquidityWallet;
    address public treasuryWallet;

    // Project fee tracking
    struct ProjectFees {
        address usdtToken;
        uint256 usdtAmount;
        address securityToken;
        uint256 tokenAmount;
        bool distributed;
        bool refunded;
    }

    mapping(uint256 => ProjectFees) public projectFees;

    // Events
    event FeesReceived(uint256 indexed projectId, uint256 usdtAmount, uint256 tokenAmount);
    event FeesDistributed(uint256 indexed projectId, uint256 toFeeReceiver, uint256 toLiquidity, uint256 toTreasury);
    event TokensDistributed(uint256 indexed projectId, uint256 toLiquidity, uint256 toTreasury);
    event FeesRefundedForDispute(uint256 indexed projectId, address indexed escrow, uint256 usdtAmount, uint256 tokenAmount);
    event WalletUpdated(string walletType, address oldAddress, address newAddress);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _admin,
        address _feeReceiver,
        address _liquidityWallet,
        address _treasuryWallet
    ) external initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        require(_admin != address(0), "Invalid admin");
        require(_feeReceiver != address(0), "Invalid fee receiver");
        require(_liquidityWallet != address(0), "Invalid liquidity wallet");
        require(_treasuryWallet != address(0), "Invalid treasury wallet");

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);

        feeReceiver = _feeReceiver;
        liquidityWallet = _liquidityWallet;
        treasuryWallet = _treasuryWallet;
    }

    /**
     * @notice Receive fees from escrow after project termination
     * @param projectId The project ID
     * @param usdtToken The USDT token address
     * @param usdtAmount The USDT amount (1.5% of raised)
     * @param securityToken The security token address
     * @param tokenAmount The token amount (1% of supply)
     */
    function receiveFees(
        uint256 projectId,
        address usdtToken,
        uint256 usdtAmount,
        address securityToken,
        uint256 tokenAmount
    ) external onlyRole(ESCROW_ROLE) nonReentrant {
        require(!projectFees[projectId].distributed, "Already distributed");
        require(!projectFees[projectId].refunded, "Already refunded");

        // Transfer USDT from escrow
        if (usdtAmount > 0) {
            IERC20(usdtToken).safeTransferFrom(msg.sender, address(this), usdtAmount);
        }

        // Transfer tokens from escrow
        if (tokenAmount > 0) {
            IERC20(securityToken).safeTransferFrom(msg.sender, address(this), tokenAmount);
        }

        projectFees[projectId] = ProjectFees({
            usdtToken: usdtToken,
            usdtAmount: usdtAmount,
            securityToken: securityToken,
            tokenAmount: tokenAmount,
            distributed: false,
            refunded: false
        });

        emit FeesReceived(projectId, usdtAmount, tokenAmount);
    }

    /**
     * @notice Distribute fees to platform wallets
     * @param projectId The project ID
     */
    function distributeFees(uint256 projectId) external nonReentrant {
        ProjectFees storage fees = projectFees[projectId];
        require(fees.usdtAmount > 0 || fees.tokenAmount > 0, "No fees to distribute");
        require(!fees.distributed, "Already distributed");
        require(!fees.refunded, "Already refunded");

        fees.distributed = true;

        // Distribute USDT
        if (fees.usdtAmount > 0) {
            uint256 toFeeReceiver = (fees.usdtAmount * FEE_RECEIVER_BPS) / 10000;
            uint256 toLiquidity = (fees.usdtAmount * LIQUIDITY_WALLET_BPS) / 10000;
            uint256 toTreasury = fees.usdtAmount - toFeeReceiver - toLiquidity; // Remainder to handle rounding

            IERC20(fees.usdtToken).safeTransfer(feeReceiver, toFeeReceiver);
            IERC20(fees.usdtToken).safeTransfer(liquidityWallet, toLiquidity);
            IERC20(fees.usdtToken).safeTransfer(treasuryWallet, toTreasury);

            emit FeesDistributed(projectId, toFeeReceiver, toLiquidity, toTreasury);
        }

        // Distribute tokens
        if (fees.tokenAmount > 0) {
            uint256 toLiquidity = (fees.tokenAmount * TOKEN_LIQUIDITY_BPS) / 10000;
            uint256 toTreasury = fees.tokenAmount - toLiquidity; // Remainder to handle rounding

            IERC20(fees.securityToken).safeTransfer(liquidityWallet, toLiquidity);
            IERC20(fees.securityToken).safeTransfer(treasuryWallet, toTreasury);

            emit TokensDistributed(projectId, toLiquidity, toTreasury);
        }
    }

    /**
     * @notice Refund fees back to escrow for dispute resolution
     * @param projectId The project ID
     * @param escrowAddress The escrow address to refund to
     */
    function refundForDispute(
        uint256 projectId,
        address escrowAddress
    ) external onlyRole(DISPUTE_MANAGER_ROLE) nonReentrant {
        ProjectFees storage fees = projectFees[projectId];
        require(!fees.refunded, "Already refunded");

        uint256 usdtToRefund;
        uint256 tokensToRefund;

        if (fees.distributed) {
            // Need to pull back from wallets - this requires wallets to approve this contract
            // For simplicity, we track what was distributed and wallets must return manually
            // Or we use a different approach: wallets are contracts that can be called
            revert("Cannot refund after distribution - wallets must return manually");
        } else {
            // Not yet distributed, refund from this contract
            usdtToRefund = fees.usdtAmount;
            tokensToRefund = fees.tokenAmount;
        }

        fees.refunded = true;

        if (usdtToRefund > 0) {
            IERC20(fees.usdtToken).safeTransfer(escrowAddress, usdtToRefund);
        }

        if (tokensToRefund > 0) {
            IERC20(fees.securityToken).safeTransfer(escrowAddress, tokensToRefund);
        }

        emit FeesRefundedForDispute(projectId, escrowAddress, usdtToRefund, tokensToRefund);
    }

    // Admin functions
    function setFeeReceiver(address _feeReceiver) external onlyRole(ADMIN_ROLE) {
        require(_feeReceiver != address(0), "Invalid address");
        emit WalletUpdated("feeReceiver", feeReceiver, _feeReceiver);
        feeReceiver = _feeReceiver;
    }

    function setLiquidityWallet(address _liquidityWallet) external onlyRole(ADMIN_ROLE) {
        require(_liquidityWallet != address(0), "Invalid address");
        emit WalletUpdated("liquidityWallet", liquidityWallet, _liquidityWallet);
        liquidityWallet = _liquidityWallet;
    }

    function setTreasuryWallet(address _treasuryWallet) external onlyRole(ADMIN_ROLE) {
        require(_treasuryWallet != address(0), "Invalid address");
        emit WalletUpdated("treasuryWallet", treasuryWallet, _treasuryWallet);
        treasuryWallet = _treasuryWallet;
    }

    function grantEscrowRole(address escrow) external onlyRole(ADMIN_ROLE) {
        _grantRole(ESCROW_ROLE, escrow);
    }

    function grantDisputeManagerRole(address disputeManager) external onlyRole(ADMIN_ROLE) {
        _grantRole(DISPUTE_MANAGER_ROLE, disputeManager);
    }

    // View functions
    function getProjectFees(uint256 projectId) external view returns (ProjectFees memory) {
        return projectFees[projectId];
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}
}