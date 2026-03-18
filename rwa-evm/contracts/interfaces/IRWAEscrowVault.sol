// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRWAEscrowVault {
    
    enum MilestoneStatus { Pending, Submitted, Approved, Rejected, Released, Disputed}
    
    struct Milestone {
        string description;
        uint256 percentage;
        MilestoneStatus status;
        string proofURI;
        uint256 submittedAt;
        uint256 approvedAt;
        uint256 releasedAmount;
    }
    
    struct ProjectFunding {
        uint256 projectId;
        uint256 fundingGoal;
        uint256 totalRaised;
        uint256 totalReleased;
        uint256 deadline;
        address paymentToken;
        bool fundingComplete;
        bool refundsEnabled;
        uint256 currentMilestone;
    }

    function invest(uint256 _projectId, uint256 _amount, address _paymentToken) external payable;
    function addMilestone(uint256 _projectId, string calldata _description, uint256 _percentage) external; 
    function submitMilestone(uint256 _projectId, uint256 _milestoneIndex, string calldata _proofURI) external;  
    function approveMilestone(uint256 _projectId, uint256 _milestoneIndex) external;   
    function rejectMilestone(uint256 _projectId, uint256 _milestoneIndex, string calldata _reason) external;  
    function releaseMilestoneFunds(uint256 _projectId, uint256 _milestoneIndex) external;  
    function raiseDispute(uint256 _projectId, uint256 _milestoneIndex, string calldata _reason) external;  
    function resolveDispute(uint256 _projectId, uint256 _milestoneIndex, bool _approved) external;   
    function enableRefunds(uint256 _projectId) external;
    function claimRefund(uint256 _projectId) external;
    function getProjectFunding(uint256 _projectId) external view returns (ProjectFunding memory);
    function getMilestones(uint256 _projectId) external view returns (Milestone[] memory);
    function getInvestorAmount(uint256 _projectId, address _investor) external view returns (uint256);
    function getReleasableAmount(uint256 _projectId, uint256 _milestoneIndex) external view returns (uint256);
    function createProject(uint256 projectId, address securityToken, uint256 softCap, uint256 hardCap, uint256 minInvestment, uint256 maxInvestment, uint256 tokenPrice, uint256 startTime, uint256 endTime) external;
}