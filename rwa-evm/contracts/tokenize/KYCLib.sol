// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

import "../interfaces/IKYCVerifier.sol";

/**
 * @title KYCLib
 * @notice Library for KYC verification logic
 */
library KYCLib {
    error InvalidKYCProof();
    error KYCLevelTooLow(uint8 required, uint8 provided);
    error KYCExpired();
    error CountryRestricted(uint16 countryCode);

    struct KYCProof {
        uint8 level;
        uint16 countryCode;
        uint256 expiry;
        bytes signature;
    }

    function verifyKYCProof(
        address _kycVerifier,
        address _user,
        KYCProof calldata _proof,
        uint8 _minLevel,
        uint16[] storage _defaultRestrictedCountries,
        mapping(uint256 => mapping(uint16 => bool)) storage _deploymentRestrictedCountries,
        uint256 _deploymentId
    ) internal view {
        if (_kycVerifier == address(0)) {
            return;
        }

        IKYCVerifier verifier = IKYCVerifier(_kycVerifier);

        bool valid = verifier.verify(
            _user,
            _proof.level,
            _proof.countryCode,
            _proof.expiry,
            _proof.signature
        );

        if (!valid) revert InvalidKYCProof();
        if (_proof.level < _minLevel) revert KYCLevelTooLow(_minLevel, _proof.level);
        if (block.timestamp > _proof.expiry) revert KYCExpired();

        if (isCountryRestricted(
            _proof.countryCode,
            _deploymentId,
            _defaultRestrictedCountries,
            _deploymentRestrictedCountries
        )) {
            revert CountryRestricted(_proof.countryCode);
        }
    }

    function isCountryRestricted(
        uint16 _countryCode,
        uint256 _deploymentId,
        uint16[] storage _defaultRestrictedCountries,
        mapping(uint256 => mapping(uint16 => bool)) storage _deploymentRestrictedCountries
    ) internal view returns (bool) {
        if (_deploymentId > 0 && _deploymentRestrictedCountries[_deploymentId][_countryCode]) {
            return true;
        }

        uint256 length = _defaultRestrictedCountries.length;
        for (uint256 i = 0; i < length; ++i) {
            if (_defaultRestrictedCountries[i] == _countryCode) {
                return true;
            }
        }

        return false;
    }
}