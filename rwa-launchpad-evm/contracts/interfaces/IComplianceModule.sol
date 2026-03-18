// SPDX-License-Identifier: MIT
// contracts/interfaces/IComplianceModule.sol
pragma solidity ^0.8.20;

interface IComplianceModule {
    function moduleCheck(
        address from,
        address to,
        uint256 amount,
        address token
    ) external view returns (bool);
    
    function moduleMintAction(address to, uint256 amount) external;
    function moduleBurnAction(address from, uint256 amount) external;
    function moduleTransferAction(address from, address to, uint256 amount) external;
    
    function name() external view returns (string memory);
}