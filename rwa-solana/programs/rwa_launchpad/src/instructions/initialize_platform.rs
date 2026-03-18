// programs/rwa_launchpad/src/instructions/initialize_platform.rs
use anchor_lang::prelude::*;
use crate::state::PlatformConfig;
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = PlatformConfig::LEN,
        seeds = [PLATFORM_SEED],
        bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    /// CHECK: Fee recipient account
    pub fee_recipient: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    platform_fee_bps: u16,
) -> Result<()> {
    require!(
        platform_fee_bps <= MAX_FEE_BPS,
        RwaLaunchpadError::InvalidInvestmentAmount
    );

    let platform = &mut ctx.accounts.platform_config;
    platform.authority = ctx.accounts.authority.key();
    platform.fee_recipient = ctx.accounts.fee_recipient.key();
    platform.platform_fee_bps = platform_fee_bps;
    platform.total_projects = 0;
    platform.total_funds_raised = 0;
    platform.verifier_count = 0;
    platform.arbitrator_count = 0;
    platform.accepted_mint_count = 0;
    platform.bump = ctx.bumps.platform_config;

    // Add authority as first verifier and arbitrator
    platform.verifiers[0] = ctx.accounts.authority.key();
    platform.verifier_count = 1;
    platform.arbitrators[0] = ctx.accounts.authority.key();
    platform.arbitrator_count = 1;

    msg!("Platform initialized with fee: {} bps", platform_fee_bps);
    Ok(())
}
