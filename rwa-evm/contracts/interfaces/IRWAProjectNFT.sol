// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IRWAProjectNFT {
    enum ProjectStatus { DRAFT, ACTIVE, FUNDED, COMPLETED, CANCELLED }
    function createProject(address _owner, string calldata _name, string calldata _category, uint256 _fundingGoal, string calldata _uri) external returns (uint256);
    function updateProjectStatus(uint256 _tokenId, ProjectStatus _status) external;
    function linkSecurityToken(uint256 _tokenId, address _securityToken) external;
    function linkEscrowVault(uint256 _tokenId, address _escrowVault) external;
    function updateTotalRaised(uint256 _tokenId, uint256 _amount) external;
    function incrementTotalRaised(uint256 _tokenId, uint256 _amount) external;
    function projectExists(uint256 _tokenId) external view returns (bool);
}