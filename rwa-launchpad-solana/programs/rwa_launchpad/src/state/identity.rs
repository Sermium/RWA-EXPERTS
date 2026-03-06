// programs/rwa_launchpad/src/state/identity.rs
use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq)]
pub enum InvestorCategory {
    Retail = 1,
    Accredited = 2,
    Qualified = 3,
    Institutional = 4,
    Professional = 5,
}

impl Default for InvestorCategory {
    fn default() -> Self {
        InvestorCategory::Retail
    }
}

#[account]
#[derive(Default)]
pub struct IdentityAccount {
    /// User wallet address
    pub user: Pubkey,
    /// Is verified
    pub verified: bool,
    /// ISO 3166-1 numeric country code
    pub country: u16,
    /// Investor category
    pub investor_category: u8,
    /// Verification timestamp
    pub verification_date: i64,
    /// Expiration timestamp
    pub expiration_date: i64,
    /// Hash of identity documents (off-chain reference)
    pub identity_hash: [u8; 32],
    /// KYC provider that verified
    pub kyc_provider: Pubkey,
    /// Bump seed
    pub bump: u8,
}

impl IdentityAccount {
    pub const LEN: usize = 8 +  // discriminator
        32 +                    // user
        1 +                     // verified
        2 +                     // country
        1 +                     // investor_category
        8 +                     // verification_date
        8 +                     // expiration_date
        32 +                    // identity_hash
        32 +                    // kyc_provider
        1;                      // bump

    pub fn is_valid(&self, current_timestamp: i64) -> bool {
        self.verified && self.expiration_date > current_timestamp
    }
}