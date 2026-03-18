// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.20;

library Constants {
    // ============ Platform Fees (Basis Points) ============
    uint256 constant PLATFORM_FEE_BPS = 250;
    uint256 constant MAX_FEE_BPS = 1000;
    uint256 constant BPS_DENOMINATOR = 10000;
    uint256 constant CREATION_FEE_BPS = 100;
    uint256 constant FUNDRAISE_FEE_BPS = 250;
    uint256 constant DIVIDEND_FEE_BPS = 100;
    uint256 constant EXCHANGE_FEE_BPS = 50;
    uint256 constant MAX_CREATION_FEE = 10 ether;
    uint256 constant MIN_FEE = 1;

    // ============ Time Constants ============
    uint256 constant DEFAULT_LOCKUP_PERIOD = 90 days;
    uint256 constant MIN_LOCKUP_PERIOD = 1 days;
    uint256 constant MAX_LOCKUP_PERIOD = 3650 days;
    uint256 constant MIN_FUNDRAISE_DURATION = 7 days;
    uint256 constant MAX_FUNDRAISE_DURATION = 365 days;
    uint256 constant RELEASE_GRACE_PERIOD = 3 days;
    uint256 constant DISPUTE_GRACE_PERIOD = 7 days;
    uint256 constant DIVIDEND_EXPIRATION = 365 days;
    uint256 constant DEFAULT_KYC_VALIDITY = 365 days;
    uint256 constant MIN_DEADLINE_DAYS = 7;
    uint256 constant UPGRADE_TIMELOCK = 48 hours;
    uint256 constant FEE_CHANGE_TIMELOCK = 24 hours;
    uint256 constant MODULE_CHANGE_TIMELOCK = 24 hours;

    // ============ Price Feed Constants ============
    uint256 constant DEFAULT_MAX_PRICE_AGE = 1 hours;
    uint256 constant MIN_PRICE_AGE = 1 minutes;
    uint256 constant MAX_PRICE_AGE_LIMIT = 24 hours;
    uint256 constant MAX_PRICE_DEVIATION_BPS = 1000;
    uint8 constant USD_DECIMALS = 6;
    uint8 constant TOKEN_DECIMALS = 18;

    // ============ Investment Limits ============
    uint256 constant MIN_FUNDING_GOAL = 10_000 * 1e18;
    uint256 constant MIN_INVESTMENT = 100 * 1e18;
    uint256 constant MAX_INVESTMENT_BASIC = 10_000 * 1e18;
    uint256 constant MAX_INVESTMENT_STANDARD = 100_000 * 1e18;
    uint256 constant MAX_INVESTMENT_ACCREDITED = 1_000_000 * 1e18;

    // ============ Batch & Array Limits ============
    uint256 constant MAX_BATCH_SIZE = 50;
    uint256 constant MAX_MODULES = 25;
    uint256 constant MAX_CLAIM_TOPICS = 15;
    uint256 constant MAX_TRUSTED_ISSUERS = 50;
    uint256 constant MAX_IDENTITY_REGISTRIES = 10;
    uint256 constant MAX_MILESTONES = 20;
    uint256 constant MAX_LOCKUPS_PER_USER = 100;

    // ============ Claim Topics ============
    uint256 constant CLAIM_TOPIC_KYC = 1;
    uint256 constant CLAIM_TOPIC_AML = 2;
    uint256 constant CLAIM_TOPIC_ACCREDITED = 3;
    uint256 constant CLAIM_TOPIC_COUNTRY = 4;
    uint256 constant CLAIM_TOPIC_INSTITUTION = 5;

    // ============ Special Addresses ============
    address constant NATIVE_TOKEN = address(0);
    address constant OFFCHAIN_PAYMENT = address(1);

    // ============ Metadata ============
    string constant SAMPLE_METADATA_URI = "ipfs://QmExampleMetadataHash";
}