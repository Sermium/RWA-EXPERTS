// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "./MockIdentity.sol";
import "../interfaces/IClaimIssuer.sol";

/**
 * @title MockClaimIssuer
 * @dev Mock claim issuer for testing ERC-3643 compliance
 */
contract MockClaimIssuer is MockIdentity, IClaimIssuer {
    mapping(bytes32 => bool) private _revokedClaims;
    mapping(bytes => bool) private _revokedSignatures;

    event ClaimRevoked(bytes32 indexed claimId);
    event SignatureRevoked(bytes indexed signature);

    constructor(address _owner) MockIdentity(_owner) {}

    /**
     * @dev Revoke a claim
     */
    function revokeClaim(bytes32 _claimId) external override onlyOwner {
        _revokedClaims[_claimId] = true;
        emit ClaimRevoked(_claimId);
    }

    /**
     * @dev Check if a claim is valid
     */
    function isClaimValid(
        address _identity,
        bytes32 _claimId
    ) external view override returns (bool) {
        if (_revokedClaims[_claimId]) {
            return false;
        }
        
        // Try to get the claim from the identity
        try MockIdentity(_identity).getClaim(_claimId) returns (
            uint256 ,
            uint256 ,
            address issuer,
            bytes memory signature,
            bytes memory ,
            string memory
        ) {
            // Claim exists and issuer is this contract
            if (issuer == address(this) && !_revokedSignatures[signature]) {
                return true;
            }
        } catch {
            // Claim doesn't exist or call failed
        }
        
        return false;
    }

    /**
     * @dev Get claim IDs by topic (override to satisfy interface)
     */
    function getClaimIdsByTopic(uint256 _topic) public view override(MockIdentity, IClaimIssuer) returns (bytes32[] memory) {
        return super.getClaimIdsByTopic(_topic);
    }

    /**
     * @dev Get a claim (override to satisfy interface)
     */
    function getClaim(bytes32 _claimId) public view override(MockIdentity, IClaimIssuer) returns (
        uint256 topic,
        uint256 scheme,
        address issuer,
        bytes memory signature,
        bytes memory data,
        string memory uri
    ) {
        return super.getClaim(_claimId);
    }

    /**
     * @dev Revoke a signature
     */
    function revokeSignature(bytes calldata _signature) external onlyOwner {
        _revokedSignatures[_signature] = true;
        emit SignatureRevoked(_signature);
    }

    /**
     * @dev Check if a claim is revoked
     */
    function isClaimRevoked(bytes32 _claimId) external view returns (bool) {
        return _revokedClaims[_claimId];
    }

    /**
     * @dev Check if a signature is revoked
     */
    function isSignatureRevoked(bytes calldata _signature) external view returns (bool) {
        return _revokedSignatures[_signature];
    }
}