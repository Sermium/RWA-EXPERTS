// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IModularCompliance {
    // Events
    event ModuleAdded(address indexed module);
    event ModuleRemoved(address indexed module);
    event TokenBound(address indexed token);
    event TokenUnbound(address indexed token);

    // Module management
    function addModule(address _module) external;
    function removeModule(address _module) external;
    function isModuleBound(address _module) external view returns (bool);
    function getModules() external view returns (address[] memory);

    // Token binding
    function bindToken(address _token) external;
    function unbindToken() external;
    function getTokenBound() external view returns (address);

    // Compliance checks
    function canTransfer(address _from, address _to, uint256 _amount) external view returns (bool);
    function transferred(address _from, address _to, uint256 _amount) external;
    function created(address _to, uint256 _amount) external;
    function destroyed(address _from, uint256 _amount) external;

    // Module interaction
    function callModuleFunction(bytes calldata _callData, address _module) external;
}