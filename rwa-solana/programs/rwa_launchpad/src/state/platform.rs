// programs/rwa_launchpad/src/state/platform.rs
use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct PlatformConfig {
    /// Platform authority
    pub authority: Pubkey,
    /// Fee recipient
    pub fee_recipient: Pubkey,
    /// Platform fee in basis points (e.g., 250 = 2.5%)
    pub platform_fee_bps: u16,
    /// Total projects created
    pub total_projects: u64,
    /// Total funds raised across all projects
    pub total_funds_raised: u64,
    /// Verifiers whitelist (simplified - in production use a separate account)
    pub verifiers: [Pubkey; 5],
    pub verifier_count: u8,
    /// Arbitrators
    pub arbitrators: [Pubkey; 3],
    pub arbitrator_count: u8,
    /// Accepted payment mints (address(0) equivalent = native SOL via system program)
    pub accepted_mints: [Pubkey; 10],
    pub accepted_mint_count: u8,
    /// Bump seed
    pub bump: u8,
}

impl PlatformConfig {
    pub const LEN: usize = 8 +  // discriminator
        32 +                    // authority
        32 +                    // fee_recipient
        2 +                     // platform_fee_bps
        8 +                     // total_projects
        8 +                     // total_funds_raised
        (32 * 5) +              // verifiers
        1 +                     // verifier_count
        (32 * 3) +              // arbitrators
        1 +                     // arbitrator_count
        (32 * 10) +             // accepted_mints
        1 +                     // accepted_mint_count
        1;                      // bump

    pub fn is_verifier(&self, pubkey: &Pubkey) -> bool {
        for i in 0..self.verifier_count as usize {
            if self.verifiers[i] == *pubkey {
                return true;
            }
        }
        false
    }

    pub fn is_arbitrator(&self, pubkey: &Pubkey) -> bool {
        for i in 0..self.arbitrator_count as usize {
            if self.arbitrators[i] == *pubkey {
                return true;
            }
        }
        false
    }

    pub fn is_accepted_mint(&self, pubkey: &Pubkey) -> bool {
        for i in 0..self.accepted_mint_count as usize {
            if self.accepted_mints[i] == *pubkey {
                return true;
            }
        }
        false
    }
}