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
import "../libraries/Constants.sol";

contract DividendDistributor is Initializable, UUPSUpgradeable, AccessControlUpgradeable, PausableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");

    struct Distribution {
        uint256 snapshotId;
        uint256 snapshotBlock;
        address paymentToken;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 createdAt;
        uint256 expiresAt;
        bool reclaimed;
        string description;
    }

    IRWASecurityToken public securityToken;
    Distribution[] public distributions;
    mapping(uint256 => mapping(address => bool)) public hasClaimed;
    mapping(uint256 => mapping(address => uint256)) public claimedAmounts;

    address public feeRecipient;
    uint256 public dividendFeeBps;

    // Events
    event DistributionCreated(uint256 indexed distributionId, uint256 snapshotId, address paymentToken, uint256 totalAmount, uint256 expiresAt);
    event DividendClaimed(uint256 indexed distributionId, address indexed investor, uint256 amount, uint256 fee);
    event UnclaimedReclaimed(uint256 indexed distributionId, uint256 amount);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event SecurityTokenUpdated(address indexed oldToken, address indexed newToken);
    event DistributionCancelled(uint256 indexed distributionId);

    // Errors
    error InvalidAddress();
    error InvalidAmount();
    error InvalidDistribution();
    error AlreadyClaimed();
    error DistributionExpired();
    error DistributionNotExpired();
    error AlreadyReclaimed();
    error NoBalance();
    error BatchTooLarge();
    error SnapshotTooRecent();
    error FeeTooHigh();
    error DistributionCancelled_Error();

    function initialize(address _securityToken, address _admin, address _feeRecipient) external initializer {
        if (_securityToken == address(0) || _admin == address(0) || _feeRecipient == address(0)) revert InvalidAddress();

        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(DISTRIBUTOR_ROLE, _admin);

        securityToken = IRWASecurityToken(_securityToken);
        feeRecipient = _feeRecipient;
        dividendFeeBps = Constants.DIVIDEND_FEE_BPS;
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}

    // ============ Distribution Management ============

    function createDistribution(
        address _paymentToken,
        uint256 _amount,
        string calldata _description
    ) external nonReentrant onlyRole(DISTRIBUTOR_ROLE) whenNotPaused returns (uint256) {
        if (_paymentToken == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();

        uint256 snapshotId = securityToken.getCurrentSnapshotId();
        if (snapshotId == 0) revert InvalidDistribution();

        uint256 snapshotBlock = securityToken.getSnapshotBlock(snapshotId);
        if (snapshotBlock >= block.number) revert SnapshotTooRecent();

        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);

        uint256 distributionId = distributions.length;
        distributions.push(Distribution({
            snapshotId: snapshotId,
            snapshotBlock: snapshotBlock,
            paymentToken: _paymentToken,
            totalAmount: _amount,
            claimedAmount: 0,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + Constants.DIVIDEND_EXPIRATION,
            reclaimed: false,
            description: _description
        }));

        emit DistributionCreated(distributionId, snapshotId, _paymentToken, _amount, block.timestamp + Constants.DIVIDEND_EXPIRATION);
        return distributionId;
    }

    function createDistributionWithSnapshot(
        address _paymentToken,
        uint256 _amount,
        string calldata _description
    ) external nonReentrant onlyRole(DISTRIBUTOR_ROLE) whenNotPaused returns (uint256 distributionId, uint256 snapshotId) {
        if (_paymentToken == address(0)) revert InvalidAddress();
        if (_amount == 0) revert InvalidAmount();

        // Create new snapshot
        snapshotId = securityToken.snapshot();
        uint256 snapshotBlock = block.number;

        IERC20(_paymentToken).safeTransferFrom(msg.sender, address(this), _amount);

        distributionId = distributions.length;
        distributions.push(Distribution({
            snapshotId: snapshotId,
            snapshotBlock: snapshotBlock,
            paymentToken: _paymentToken,
            totalAmount: _amount,
            claimedAmount: 0,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + Constants.DIVIDEND_EXPIRATION,
            reclaimed: false,
            description: _description
        }));

        emit DistributionCreated(distributionId, snapshotId, _paymentToken, _amount, block.timestamp + Constants.DIVIDEND_EXPIRATION);
    }

    // ============ Claiming ============

    function claimDividend(uint256 _distributionId) external nonReentrant whenNotPaused {
        if (_distributionId >= distributions.length) revert InvalidDistribution();

        Distribution storage dist = distributions[_distributionId];
        if (dist.reclaimed) revert DistributionCancelled_Error();
        if (block.timestamp > dist.expiresAt) revert DistributionExpired();
        if (hasClaimed[_distributionId][msg.sender]) revert AlreadyClaimed();

        uint256 balance = securityToken.balanceOfAt(msg.sender, dist.snapshotId);
        if (balance == 0) revert NoBalance();

        uint256 totalSupply = securityToken.totalSupplyAt(dist.snapshotId);
        uint256 dividend = (dist.totalAmount * balance) / totalSupply;
        if (dividend == 0) revert InvalidAmount();

        uint256 fee = (dividend * dividendFeeBps) / Constants.BPS_DENOMINATOR;
        if (fee < Constants.MIN_FEE && dividendFeeBps > 0) fee = Constants.MIN_FEE;
        uint256 netDividend = dividend - fee;

        // CEI: Effects
        hasClaimed[_distributionId][msg.sender] = true;
        claimedAmounts[_distributionId][msg.sender] = dividend;
        dist.claimedAmount += dividend;

        // CEI: Interactions
        if (fee > 0) {
            IERC20(dist.paymentToken).safeTransfer(feeRecipient, fee);
        }
        IERC20(dist.paymentToken).safeTransfer(msg.sender, netDividend);

        emit DividendClaimed(_distributionId, msg.sender, netDividend, fee);
    }

    function batchClaimDividends(uint256[] calldata _distributionIds) external nonReentrant whenNotPaused {
        if (_distributionIds.length > Constants.MAX_BATCH_SIZE) revert BatchTooLarge();

        uint256 length = _distributionIds.length;
        for (uint256 i = 0; i < length; ++i) {
            uint256 distId = _distributionIds[i];
            if (distId >= distributions.length) continue;

            Distribution storage dist = distributions[distId];
            if (dist.reclaimed) continue;
            if (block.timestamp > dist.expiresAt) continue;
            if (hasClaimed[distId][msg.sender]) continue;

            uint256 balance = securityToken.balanceOfAt(msg.sender, dist.snapshotId);
            if (balance == 0) continue;

            uint256 totalSupply = securityToken.totalSupplyAt(dist.snapshotId);
            uint256 dividend = (dist.totalAmount * balance) / totalSupply;
            if (dividend == 0) continue;

            uint256 fee = (dividend * dividendFeeBps) / Constants.BPS_DENOMINATOR;
            if (fee < Constants.MIN_FEE && dividendFeeBps > 0) fee = Constants.MIN_FEE;
            uint256 netDividend = dividend - fee;

            hasClaimed[distId][msg.sender] = true;
            claimedAmounts[distId][msg.sender] = dividend;
            dist.claimedAmount += dividend;

            if (fee > 0) {
                IERC20(dist.paymentToken).safeTransfer(feeRecipient, fee);
            }
            IERC20(dist.paymentToken).safeTransfer(msg.sender, netDividend);

            emit DividendClaimed(distId, msg.sender, netDividend, fee);
        }
    }

    // ============ Admin Functions ============

    function reclaimUnclaimed(uint256 _distributionId) external nonReentrant onlyRole(DISTRIBUTOR_ROLE) {
        if (_distributionId >= distributions.length) revert InvalidDistribution();

        Distribution storage dist = distributions[_distributionId];
        if (block.timestamp <= dist.expiresAt) revert DistributionNotExpired();
        if (dist.reclaimed) revert AlreadyReclaimed();

        uint256 unclaimed = dist.totalAmount - dist.claimedAmount;
        if (unclaimed == 0) revert InvalidAmount();

        dist.reclaimed = true;
        IERC20(dist.paymentToken).safeTransfer(msg.sender, unclaimed);

        emit UnclaimedReclaimed(_distributionId, unclaimed);
    }

    function cancelDistribution(uint256 _distributionId) external nonReentrant onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_distributionId >= distributions.length) revert InvalidDistribution();

        Distribution storage dist = distributions[_distributionId];
        if (dist.reclaimed) revert AlreadyReclaimed();

        uint256 remaining = dist.totalAmount - dist.claimedAmount;
        dist.reclaimed = true;

        if (remaining > 0) {
            IERC20(dist.paymentToken).safeTransfer(msg.sender, remaining);
        }

        emit DistributionCancelled(_distributionId);
    }

    function setFeeRecipient(address _feeRecipient) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        address oldRecipient = feeRecipient;
        feeRecipient = _feeRecipient;
        emit FeeRecipientUpdated(oldRecipient, _feeRecipient);
    }

    function setDividendFee(uint256 _feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_feeBps > Constants.MAX_FEE_BPS) revert FeeTooHigh();
        uint256 oldFee = dividendFeeBps;
        dividendFeeBps = _feeBps;
        emit FeeUpdated(oldFee, _feeBps);
    }

    function setSecurityToken(address _securityToken) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_securityToken == address(0)) revert InvalidAddress();
        address oldToken = address(securityToken);
        securityToken = IRWASecurityToken(_securityToken);
        emit SecurityTokenUpdated(oldToken, _securityToken);
    }

    // ============ View Functions ============

    function getDistribution(uint256 _distributionId) external view returns (Distribution memory) {
        if (_distributionId >= distributions.length) revert InvalidDistribution();
        return distributions[_distributionId];
    }

    function getClaimableAmount(uint256 _distributionId, address _investor) external view returns (uint256) {
        if (_distributionId >= distributions.length) return 0;

        Distribution storage dist = distributions[_distributionId];
        if (dist.reclaimed) return 0;
        if (block.timestamp > dist.expiresAt) return 0;
        if (hasClaimed[_distributionId][_investor]) return 0;

        uint256 balance = securityToken.balanceOfAt(_investor, dist.snapshotId);
        if (balance == 0) return 0;

        uint256 totalSupply = securityToken.totalSupplyAt(dist.snapshotId);
        uint256 dividend = (dist.totalAmount * balance) / totalSupply;
        uint256 fee = (dividend * dividendFeeBps) / Constants.BPS_DENOMINATOR;
        return dividend - fee;
    }

    function getDistributionCount() external view returns (uint256) {
        return distributions.length;
    }

    function getActiveDistributions() external view returns (uint256[] memory) {
        uint256 count = 0;
        uint256 totalLength = distributions.length;

        for (uint256 i = 0; i < totalLength; ++i) {
            if (!distributions[i].reclaimed && block.timestamp <= distributions[i].expiresAt) {
                count++;
            }
        }

        uint256[] memory activeIds = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < totalLength; ++i) {
            if (!distributions[i].reclaimed && block.timestamp <= distributions[i].expiresAt) {
                activeIds[index] = i;
                index++;
            }
        }

        return activeIds;
    }

    function getInvestorClaimableDistributions(address _investor) external view returns (uint256[] memory) {
        uint256 count = 0;
        uint256 totalLength = distributions.length;

        for (uint256 i = 0; i < totalLength; ++i) {
            Distribution storage dist = distributions[i];
            if (!dist.reclaimed && block.timestamp <= dist.expiresAt && !hasClaimed[i][_investor]) {
                uint256 balance = securityToken.balanceOfAt(_investor, dist.snapshotId);
                if (balance > 0) {
                    count++;
                }
            }
        }

        uint256[] memory claimableIds = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < totalLength; ++i) {
            Distribution storage dist = distributions[i];
            if (!dist.reclaimed && block.timestamp <= dist.expiresAt && !hasClaimed[i][_investor]) {
                uint256 balance = securityToken.balanceOfAt(_investor, dist.snapshotId);
                if (balance > 0) {
                    claimableIds[index] = i;
                    index++;
                }
            }
        }

        return claimableIds;
    }

    // ============ Pause Functions ============

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }
}