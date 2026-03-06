// programs/rwa_launchpad/src/instructions/identity.rs
use anchor_lang::prelude::*;
use crate::state::{PlatformConfig, IdentityAccount};
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(Accounts)]
pub struct RegisterIdentity<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        constraint = platform_config.is_verifier(&verifier.key()) @ RwaLaunchpadError::NotVerifier
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    /// CHECK: User to register identity for
    pub user: UncheckedAccount<'info>,
    
    #[account(
        init,
        payer = verifier,
        space = IdentityAccount::LEN,
        seeds = [IDENTITY_SEED, user.key().as_ref()],
        bump
    )]
    pub identity_account: Account<'info, IdentityAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn register_identity(
    ctx: Context<RegisterIdentity>,
    country: u16,
    investor_category: u8,
    expiration_date: i64,
    identity_hash: [u8; 32],
) -> Result<()> {
    let clock = Clock::get()?;
    
    require!(
        expiration_date > clock.unix_timestamp,
        RwaLaunchpadError::InvalidDeadline
    );
    require!(
        investor_category >= 1 && investor_category <= 5,
        RwaLaunchpadError::InvalidInvestorCategory
    );

    let identity = &mut ctx.accounts.identity_account;
    identity.user = ctx.accounts.user.key();
    identity.verified = true;
    identity.country = country;
    identity.investor_category = investor_category;
    identity.verification_date = clock.unix_timestamp;
    identity.expiration_date = expiration_date;
    identity.identity_hash = identity_hash;
    identity.kyc_provider = ctx.accounts.verifier.key();
    identity.bump = ctx.bumps.identity_account;

    msg!("Identity registered for user: {}", ctx.accounts.user.key());
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateIdentity<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        constraint = platform_config.is_verifier(&verifier.key()) @ RwaLaunchpadError::NotVerifier
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    /// CHECK: User whose identity to update
    pub user: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [IDENTITY_SEED, user.key().as_ref()],
        bump = identity_account.bump,
        constraint = identity_account.verified @ RwaLaunchpadError::IdentityNotVerified
    )]
    pub identity_account: Account<'info, IdentityAccount>,
}

pub fn update_identity(
    ctx: Context<UpdateIdentity>,
    country: u16,
    investor_category: u8,
    expiration_date: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    
    require!(
        expiration_date > clock.unix_timestamp,
        RwaLaunchpadError::InvalidDeadline
    );

    let identity = &mut ctx.accounts.identity_account;
    identity.country = country;
    identity.investor_category = investor_category;
    identity.expiration_date = expiration_date;

    msg!("Identity updated for user: {}", ctx.accounts.user.key());
    Ok(())
}

#[derive(Accounts)]
pub struct RevokeIdentity<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        constraint = platform_config.is_verifier(&verifier.key()) @ RwaLaunchpadError::NotVerifier
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    /// CHECK: User whose identity to revoke
    pub user: UncheckedAccount<'info>,
    
    #[account(
        mut,
        seeds = [IDENTITY_SEED, user.key().as_ref()],
        bump = identity_account.bump,
        close = verifier
    )]
    pub identity_account: Account<'info, IdentityAccount>,
}

pub fn revoke_identity(ctx: Context<RevokeIdentity>) -> Result<()> {
    msg!("Identity revoked for user: {}", ctx.accounts.user.key());
    Ok(())
}
