// programs/rwa_launchpad/src/state/investor.rs
use anchor_lang::prelude::*;

#[account]
pub struct InvestorAccount {
    /// Investor wallet
    pub investor: Pubkey,
    /// Project invested in
    pub project: Pubkey,
    /// Amount invested (in lamports or token base units)
    pub amount_invested: u64,
    /// Security tokens received
    pub tokens_received: u64,
    /// Investment timestamp
    pub invested_at: i64,
    /// Has claimed refund
    pub refund_claimed: bool,
    /// Bump seed
    pub bump: u8,
}

impl InvestorAccount {
    pub const LEN: usize = 8 +   // discriminator
        32 +                     // investor
        32 +                     // project
        8 +                      // amount_invested
        8 +                      // tokens_received
        8 +                      // invested_at
        1 +                      // refund_claimed
        1;                       // bump
}
