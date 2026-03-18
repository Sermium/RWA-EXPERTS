// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IModule {
    // Events
    event ComplianceBound(address indexed compliance);
    event ComplianceUnbound(address indexed compliance);

    // Compliance binding
    function bindCompliance(address _compliance) external;
    function unbindCompliance(address _compliance) external;
    function isComplianceBound(address _compliance) external view returns (bool);

    // Module checks
    function moduleCheck(address _from, address _to, uint256 _amount, address _compliance) external view returns (bool);
    function moduleMintAction(address _to, uint256 _amount, address _compliance) external;
    function moduleBurnAction(address _from, uint256 _amount, address _compliance) external;
    function moduleTransferAction(address _from, address _to, uint256 _amount, address _compliance) external;

    // Module info
    function name() external view returns (string memory);
    function isPlugAndPlay() external pure returns (bool);
    function canComplianceBind(address _compliance) external view returns (bool);
}