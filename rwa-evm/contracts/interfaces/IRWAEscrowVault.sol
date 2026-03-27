// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IRWAEscrowVault {
    
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

    // Project creation and management
    function createProject(
        uint256 _projectId,
        address _securityToken,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256 _totalSupply
    ) external;

    function activateProject(uint256 _projectId) external;
    
    // Configuration
    function setKYCVerifier(address _kycVerifier) external;
    function setPaymentTokens(address _usdc, address _usdt) external;
    
    // Milestones
    function addMilestone(uint256 _projectId, string calldata _description, uint256 _amount, uint256 _deadline) external;
    function approveMilestone(uint256 _projectId, uint256 _milestoneIndex) external;
    function releaseMilestoneFunds(uint256 _projectId, uint256 _milestoneIndex) external;
    function raiseDispute(uint256 _projectId, uint256 _milestoneIndex, string calldata _reason) external;
    function resolveDispute(uint256 _projectId, uint256 _milestoneIndex, bool _approved) external;
    
    // Refunds
    function cancelProject(uint256 _projectId) external;
    function claimRefund(uint256 _projectId) external;
    
    // View functions
    function getProject(uint256 _projectId) external view returns (Project memory);
    function getMilestones(uint256 _projectId) external view returns (Milestone[] memory);
    function getInvestorContribution(uint256 _projectId, address _investor) external view returns (uint256);
    function getInvestorBalance(uint256 _projectId, address _investor) external view returns (uint256);
    function getClaimableTokens(uint256 _projectId, address _investor) external view returns (uint256);
    
    // Access control (from AccessControlUpgradeable)
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;
    
    // Upgrade
    function upgradeTo(address newImplementation) external;
    function updateProjectPriceFeed(uint256 _projectId, address _priceFeed) external;
}