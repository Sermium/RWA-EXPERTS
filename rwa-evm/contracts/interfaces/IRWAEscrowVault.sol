// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

/**
 * @title IRWAEscrowVault
 * @notice The parts of RWAEscrowVault that RWALaunchpadFactory drives
 */
interface IRWAEscrowVault {
    enum ProjectState { INACTIVE, ACTIVE, FUNDED, COMPLETED, CANCELLED, DISPUTED }

    // Project creation and management
    function createProject(
        uint256 _projectId,
        address _securityToken,
        uint256 _fundingGoal,
        uint256 _deadline,
        uint256 _totalSupply
    ) external;
    function activateProject(uint256 _projectId) external;
    function transferProjectOwnership(uint256 _projectId, address _newOwner) external;
    function cancelProject(uint256 _projectId) external;

    // Configuration
    function setKYCVerifier(address _kycVerifier) external;
    function setPaymentTokens(address _usdc, address _usdt) external;

    // Views
    function getInvestorContribution(uint256 _projectId, address _investor) external view returns (uint256);
    function getClaimableTokens(uint256 _projectId, address _investor) external view returns (uint256);
    function getAvailableFunds(uint256 _projectId) external view returns (uint256);

    // Access control (from AccessControlUpgradeable)
    function grantRole(bytes32 role, address account) external;
    function revokeRole(bytes32 role, address account) external;

    // Upgrade
    function upgradeTo(address newImplementation) external;
}
