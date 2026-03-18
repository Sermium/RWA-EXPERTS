// programs/rwa_launchpad/src/state/dividend.rs
use anchor_lang::prelude::*;

#[account]
pub struct DividendDistribution {
    /// Project
    pub project: Pubkey,
    /// Round number
    pub round: u64,
    /// Total amount to distribute
    pub total_amount: u64,
    /// Amount claimed so far
    pub claimed_amount: u64,
    /// Token supply at snapshot
    pub supply_at_snapshot: u64,
    /// Created at timestamp
    pub created_at: i64,
    /// Expires at timestamp
    pub expires_at: i64,
    /// Is active
    pub active: bool,
    /// Payment mint
    pub payment_mint: Pubkey,
    /// Bump seed
    pub bump: u8,
}

impl DividendDistribution {
    pub const LEN: usize = 8 +   // discriminator
        32 +                     // project
        8 +                      // round
        8 +                      // total_amount
        8 +                      // claimed_amount
        8 +                      // supply_at_snapshot
        8 +                      // created_at
        8 +                      // expires_at
        1 +                      // active
        32 +                     // payment_mint
        1;                       // bump
}

#[account]
pub struct DividendClaim {
    /// Distribution this claim is for
    pub distribution: Pubkey,
    /// Investor
    pub investor: Pubkey,
    /// Amount claimed
    pub amount_claimed: u64,
    /// Claimed at timestamp
    pub claimed_at: i64,
    /// Bump seed
    pub bump: u8,
}

impl DividendClaim {
    pub const LEN: usize = 8 +   // discriminator
        32 +                     // distribution
        32 +                     // investor
        8 +                      // amount_claimed
        8 +                      // claimed_at
        1;                       // bump
}
