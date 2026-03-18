// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface IClaimIssuer {

    function isClaimValid(address _identity, bytes32 _claimId) external view returns (bool);
    function revokeClaim(bytes32 _claimId) external;
    function getClaimIdsByTopic(uint256 _topic) external view returns (bytes32[] memory);
    function getClaim(bytes32 _claimId) external view returns (uint256 topic, uint256 scheme, address issuer, bytes memory signature, bytes memory data, string memory uri);
}