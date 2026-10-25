// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IModule.sol";

/// @dev Compliance module for tests: counts the callbacks it receives and can be told to block transfers
contract MockComplianceModule is IModule {
    uint256 public transferActions;
    uint256 public mintActions;
    uint256 public burnActions;
    bool public blockTransfers;

    function setBlockTransfers(bool _block) external { blockTransfers = _block; }

    function bindCompliance(address _compliance) external { emit ComplianceBound(_compliance); }
    function unbindCompliance(address _compliance) external { emit ComplianceUnbound(_compliance); }
    function isComplianceBound(address) external pure returns (bool) { return true; }

    function moduleCheck(address, address, uint256, address) external view returns (bool) { return !blockTransfers; }
    function moduleMintAction(address, uint256, address) external { mintActions++; }
    function moduleBurnAction(address, uint256, address) external { burnActions++; }
    function moduleTransferAction(address, address, uint256, address) external { transferActions++; }

    function name() external pure returns (string memory) { return "MockComplianceModule"; }
    function isPlugAndPlay() external pure returns (bool) { return true; }
    function canComplianceBind(address) external pure returns (bool) { return true; }
}
