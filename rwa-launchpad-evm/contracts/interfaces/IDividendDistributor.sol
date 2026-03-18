// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IDividendDistributor {

    struct Distribution {
        uint256 projectId;
        address token; 
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 snapshotId;
        uint256 createdAt;
        uint256 expiresAt;
        bool isActive;
    }
    
    function createDistribution(uint256 _projectId, address _token, uint256 _amount) external payable returns (uint256 distributionId);
    function claimDividend(uint256 _distributionId) external;
    function batchClaimDividends(uint256[] calldata _distributionIds) external;
    function reclaimExpiredDividends(uint256 _distributionId) external;
    function getClaimableAmount(uint256 _distributionId, address _holder) external view returns (uint256);
    function hasClaimed(uint256 _distributionId, address _holder) external view returns (bool);
    function getDistribution(uint256 _distributionId) external view returns (Distribution memory);
    function getDistributionsByProject(uint256 _projectId) external view returns (uint256[] memory);
}