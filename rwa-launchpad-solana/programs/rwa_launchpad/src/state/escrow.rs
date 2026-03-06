// programs/rwa_launchpad/src/state/escrow.rs
use anchor_lang::prelude::*;

#[account]
pub struct EscrowAccount {
    /// Project this escrow belongs to
    pub project: Pubkey,
    /// Project ID
    pub project_id: u64,
    /// Total deposited (SOL)
    pub total_sol_deposited: u64,
    /// Total released
    pub total_released: u64,
    /// Is refunds enabled
    pub refunds_enabled: bool,
    /// Payment mint (Pubkey::default() for native SOL)
    pub payment_mint: Pubkey,
    /// SPL token vault (if using SPL tokens)
    pub token_vault: Pubkey,
    /// Bump seed
    pub bump: u8,
    /// Vault bump (for PDA token account)
    pub vault_bump: u8,
}

impl EscrowAccount {
    pub const LEN: usize = 8 +   // discriminator
        32 +                     // project
        8 +                      // project_id
        8 +                      // total_sol_deposited
        8 +                      // total_released
        1 +                      // refunds_enabled
        32 +                     // payment_mint
        32 +                     // token_vault
        1 +                      // bump
        1;                       // vault_bump
}
