// ============ Fee Constants ============
export const PLATFORM_FEE_BPS = 250n; // 2.5%
export const MAX_FEE_BPS = 1000n; // 10%
export const CREATION_FEE_BPS = 100n; // 1%
export const DIVIDEND_FEE_BPS = 100n; // 1%
export const BPS_DENOMINATOR = 10000n;

// ============ Time Constants ============
export const ONE_DAY = 24n * 60n * 60n;
export const ONE_WEEK = 7n * ONE_DAY;
export const NINETY_DAYS = 90n * ONE_DAY;
export const ONE_YEAR = 365n * ONE_DAY;

export const DEFAULT_LOCKUP_PERIOD = NINETY_DAYS;
export const RELEASE_GRACE_PERIOD = 3n * ONE_DAY;
export const DISPUTE_GRACE_PERIOD = 7n * ONE_DAY;
export const DIVIDEND_EXPIRATION = ONE_YEAR;
export const MIN_DEADLINE_DAYS = 7n;

// ============ Investment Limits (in wei as bigint) ============
export const MIN_FUNDING_GOAL = 10000n;
export const MIN_INVESTMENT = 100n;

// Default values in ether (as bigint with 18 decimals)
export const ONE_ETHER = 10n ** 18n;
export const DEFAULT_FUNDING_GOAL = 100000n * ONE_ETHER;
export const DEFAULT_MIN_INVESTMENT = 100n * ONE_ETHER;
export const DEFAULT_MAX_INVESTMENT = 10000n * ONE_ETHER;

// ============ Claim Topics ============
export const CLAIM_TOPIC_KYC = 1n;
export const CLAIM_TOPIC_AML = 2n;
export const CLAIM_TOPIC_ACCREDITED = 4n;

// ============ Country Codes (ISO 3166-1 numeric) ============
export const COUNTRY_US = 840;
export const COUNTRY_UK = 826;
export const COUNTRY_DE = 276;
export const COUNTRY_FR = 250;
export const COUNTRY_JP = 392;
export const COUNTRY_CN = 156;

// ============ Key Purposes (ERC-734) ============
export const MANAGEMENT_KEY = 1n;
export const ACTION_KEY = 2n;
export const CLAIM_SIGNER_KEY = 3n;
export const ENCRYPTION_KEY = 4n;

// ============ Key Types (ERC-734) ============
export const ECDSA_TYPE = 1n;
export const RSA_TYPE = 2n;

// ============ Project Status ============
export enum ProjectStatus {
    Draft = 0,
    Pending = 1,
    Active = 2,
    Funded = 3,
    InProgress = 4,
    Completed = 5,
    Cancelled = 6,
    Failed = 7
}

// ============ Milestone Status ============
export enum MilestoneStatus {
    Pending = 0,
    Submitted = 1,
    Approved = 2,
    Rejected = 3,
    Released = 4,
    Disputed = 5
}

// ============ Roles (keccak256 hashes) ============
export const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

// These will be computed at runtime in tests using ethers.id()
// For now, store the string values
export const ROLE_NAMES = {
    AGENT: "AGENT_ROLE",
    OPERATOR: "OPERATOR_ROLE", 
    UPGRADER: "UPGRADER_ROLE",
    FACTORY: "FACTORY_ROLE",
    DISTRIBUTOR: "DISTRIBUTOR_ROLE",
    DISPUTE_RESOLVER: "DISPUTE_RESOLVER_ROLE"
};

// ============ Sample Data ============
export const SAMPLE_METADATA_URI = "ipfs://QmExampleMetadataHash";
export const SAMPLE_PROOF_URI = "ipfs://QmExampleProofHash";
export const SAMPLE_TOKEN_NAME = "Test Security Token";
export const SAMPLE_TOKEN_SYMBOL = "TST";

// ============ Helper function to get role hash ============
export function getRoleHash(roleName: string): string {
    // This will be called with ethers available
    const { keccak256, toUtf8Bytes } = require("ethers");
    return keccak256(toUtf8Bytes(roleName));
}
