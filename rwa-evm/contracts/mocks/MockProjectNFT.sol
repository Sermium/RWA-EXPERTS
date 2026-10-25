// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IRWAProjectNFT.sol";

/// @dev Records the last status the escrow vault reported for each project
contract MockProjectNFT {
    mapping(uint256 => IRWAProjectNFT.ProjectStatus) public status;

    function updateProjectStatus(uint256 _tokenId, IRWAProjectNFT.ProjectStatus _status) external {
        status[_tokenId] = _status;
    }
}
