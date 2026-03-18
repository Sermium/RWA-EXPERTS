// SPDX-License-Identifier: MIT
// contracts/interfaces/ICompliance.sol
pragma solidity ^0.8.20;

interface ICompliance {
    function canTransfer(address from, address to, uint256 amount) external view returns (bool);
    function transferred(address from, address to, uint256 amount) external;
    function created(address to, uint256 amount) external;
    function destroyed(address from, uint256 amount) external;
}