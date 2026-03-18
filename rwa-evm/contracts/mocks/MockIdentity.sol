// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockIdentity
 * @dev Mock identity contract for testing ERC-3643 compliance
 */
contract MockIdentity is Ownable {
    struct Claim {
        uint256 topic;
        uint256 scheme;
        address issuer;
        bytes signature;
        bytes data;
        string uri;
    }

    mapping(bytes32 => Claim) private _claims;
    mapping(uint256 => bytes32[]) private _claimsByTopic;
    bytes32[] private _claimIds;

    event ClaimAdded(bytes32 indexed claimId, uint256 indexed topic, address indexed issuer);
    event ClaimRemoved(bytes32 indexed claimId, uint256 indexed topic, address indexed issuer);

    constructor(address _owner) Ownable() {
        _transferOwnership(_owner);
    }

    /**
     * @dev Add a claim to this identity
     */
    function addClaim(
        uint256 _topic,
        uint256 _scheme,
        address _issuer,
        bytes calldata _signature,
        bytes calldata _data,
        string calldata _uri
    ) external returns (bytes32 claimId) {
        claimId = keccak256(abi.encodePacked(_issuer, _topic));
        
        _claims[claimId] = Claim({
            topic: _topic,
            scheme: _scheme,
            issuer: _issuer,
            signature: _signature,
            data: _data,
            uri: _uri
        });
        
        _claimsByTopic[_topic].push(claimId);
        _claimIds.push(claimId);
        
        emit ClaimAdded(claimId, _topic, _issuer);
    }

    /**
     * @dev Remove a claim from this identity
     */
    function removeClaim(bytes32 _claimId) external onlyOwner returns (bool) {
        Claim storage claim = _claims[_claimId];
        if (claim.issuer == address(0)) {
            return false;
        }

        uint256 topic = claim.topic;
        address issuer = claim.issuer;

        // Remove from topic mapping
        bytes32[] storage topicClaims = _claimsByTopic[topic];
        for (uint256 i = 0; i < topicClaims.length; i++) {
            if (topicClaims[i] == _claimId) {
                topicClaims[i] = topicClaims[topicClaims.length - 1];
                topicClaims.pop();
                break;
            }
        }

        // Remove from all claims array
        for (uint256 i = 0; i < _claimIds.length; i++) {
            if (_claimIds[i] == _claimId) {
                _claimIds[i] = _claimIds[_claimIds.length - 1];
                _claimIds.pop();
                break;
            }
        }

        delete _claims[_claimId];
        
        emit ClaimRemoved(_claimId, topic, issuer);
        return true;
    }

    /**
     * @dev Get a claim by ID
     */
    function getClaim(bytes32 _claimId) public view virtual returns (
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes memory signature,
        bytes memory data,
        string memory uri
    ) {
        Claim storage claim = _claims[_claimId];
        return (
            claim.topic,
            claim.scheme,
            claim.issuer,
            claim.signature,
            claim.data,
            claim.uri
        );
    }

    /**
     * @dev Get claim IDs by topic
     */
    function getClaimIdsByTopic(uint256 _topic) public view virtual returns (bytes32[] memory) {
        return _claimsByTopic[_topic];
    }

    /**
     * @dev Get all claim IDs
     */
    function getAllClaimIds() external view returns (bytes32[] memory) {
        return _claimIds;
    }

    /**
     * @dev Check if a claim exists
     */
    function hasClaim(bytes32 _claimId) external view returns (bool) {
        return _claims[_claimId].issuer != address(0);
    }
}