// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRWALaunchpadFactory {
    
    struct ProjectDeployment {
        uint256 projectId;
        address securityToken;
        address escrowVault;
        address compliance;
        uint256 deployedAt;
    }
    
    function deployProjectContracts(string calldata _name, string calldata _symbol, string calldata _metadataURI, uint256 _fundingGoal, uint256 _minInvestment, uint256 _maxInvestment, uint256 _deadline, uint256 _maxSupply, address _paymentToken) external payable returns (uint256 projectId);
    function getProjectDeployment(uint256 _projectId) external view returns (ProjectDeployment memory);
    function getDeploymentsByOwner(address _owner) external view returns (uint256[] memory);
    function platformFeeBps() external view returns (uint256);
    function feeRecipient() external view returns (address);   
    function projectNFT() external view returns (address);
    function identityRegistry() external view returns (address);
}