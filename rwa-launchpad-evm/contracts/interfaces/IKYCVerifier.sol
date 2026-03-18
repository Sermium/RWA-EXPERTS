// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IKYCVerifier
 * @notice Interface for off-chain KYC signature verification
 */
interface IKYCVerifier {
    function verify(
        address wallet,
        uint8 level,
        uint16 countryCode,
        uint256 expiry,
        bytes calldata signature
    ) external view returns (bool);

    function trustedSigner() external view returns (address);
    
    function LEVEL_NONE() external pure returns (uint8);
    function LEVEL_BASIC() external pure returns (uint8);
    function LEVEL_STANDARD() external pure returns (uint8);
    function LEVEL_ACCREDITED() external pure returns (uint8);
    function LEVEL_INSTITUTIONAL() external pure returns (uint8);
}