// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

interface ITrustedIssuersRegistry {
    // Events
    event TrustedIssuerAdded(address indexed trustedIssuer, uint256[] claimTopics);
    event TrustedIssuerRemoved(address indexed trustedIssuer);
    event ClaimTopicsUpdated(address indexed trustedIssuer, uint256[] claimTopics);

    // Write Functions
    function addTrustedIssuer(address _issuer, uint256[] calldata _claimTopics) external;
    function removeTrustedIssuer(address _issuer) external;
    function updateIssuerClaimTopics(address _issuer, uint256[] calldata _claimTopics) external;

    // View Functions
    function getTrustedIssuers() external view returns (address[] memory);
    function getTrustedIssuersForClaimTopic(uint256 _claimTopic) external view returns (address[] memory);
    function isTrustedIssuer(address _issuer) external view returns (bool);
    function getTrustedIssuerClaimTopics(address _issuer) external view returns (uint256[] memory);
    function hasClaimTopic(address _issuer, uint256 _claimTopic) external view returns (bool);
}