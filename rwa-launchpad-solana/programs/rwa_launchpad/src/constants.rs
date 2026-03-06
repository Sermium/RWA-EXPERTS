// programs/rwa_launchpad/src/constants.rs

pub const PLATFORM_SEED: &[u8] = b"platform";
pub const PROJECT_SEED: &[u8] = b"project";
pub const MILESTONE_SEED: &[u8] = b"milestone";
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const ESCROW_VAULT_SEED: &[u8] = b"escrow_vault";
pub const IDENTITY_SEED: &[u8] = b"identity";
pub const INVESTOR_SEED: &[u8] = b"investor";
pub const DIVIDEND_SEED: &[u8] = b"dividend";
pub const DIVIDEND_CLAIM_SEED: &[u8] = b"dividend_claim";
pub const SECURITY_TOKEN_SEED: &[u8] = b"security_token";

pub const MAX_MILESTONES: u8 = 10;
pub const MAX_NAME_LEN: usize = 64;
pub const MAX_DESCRIPTION_LEN: usize = 128;
pub const MAX_URI_LEN: usize = 128;
pub const MAX_HASH_LEN: usize = 64;

pub const RELEASE_GRACE_PERIOD: i64 = 3 * 24 * 60 * 60; // 3 days in seconds
pub const DISPUTE_GRACE_PERIOD: i64 = 7 * 24 * 60 * 60; // 7 days in seconds
pub const DIVIDEND_EXPIRATION: i64 = 365 * 24 * 60 * 60; // 1 year in seconds

pub const MAX_FEE_BPS: u16 = 1000; // 10%
pub const BASIS_POINTS_DIVISOR: u64 = 10000;
