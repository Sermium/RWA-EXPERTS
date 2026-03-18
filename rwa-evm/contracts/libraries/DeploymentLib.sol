// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

library DeploymentLib {function deployProxy(address implementation, bytes memory data) internal returns (address proxy) {proxy = address(new ERC1967Proxy(implementation, data));}}