// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Plain ERC20 with the frozen/isLocked views RWASecurityExchange queries on security tokens
contract MockExchangeToken is ERC20 {
    constructor() ERC20("Mock Security", "MSEC") {}

    function mint(address to, uint256 amount) external { _mint(to, amount); }
    function frozen(address) external pure returns (bool) { return false; }
    function isLocked(address) external pure returns (bool) { return false; }
}
