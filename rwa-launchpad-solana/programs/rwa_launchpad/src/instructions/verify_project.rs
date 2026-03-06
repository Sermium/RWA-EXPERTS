// programs/rwa_launchpad/src/instructions/verify_project.rs
use anchor_lang::prelude::*;
use crate::state::{PlatformConfig, Project, ProjectStatus, Milestone, EscrowAccount};
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(Accounts)]
pub struct SubmitForVerification<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = project.owner == owner.key() @ RwaLaunchpadError::NotProjectOwner,
        constraint = project.status == ProjectStatus::Draft @ RwaLaunchpadError::InvalidProjectStatus,
        constraint = project.milestone_count > 0 @ RwaLaunchpadError::InvalidMilestoneIndex
    )]
    pub project: Account<'info, Project>,
}

pub fn submit_for_verification(ctx: Context<SubmitForVerification>) -> Result<()> {
    let project = &mut ctx.accounts.project;
    project.status = ProjectStatus::PendingVerification;

    msg!("Project {} submitted for verification", project.project_id);
    Ok(())
}

#[derive(Accounts)]
pub struct VerifyProject<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        constraint = platform_config.is_verifier(&verifier.key()) @ RwaLaunchpadError::NotVerifier
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = project.status == ProjectStatus::PendingVerification @ RwaLaunchpadError::InvalidProjectStatus
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        init,
        payer = verifier,
        space = EscrowAccount::LEN,
        seeds = [ESCROW_SEED, project.key().as_ref()],
        bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn verify_project(ctx: Context<VerifyProject>) -> Result<()> {
    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    let escrow = &mut ctx.accounts.escrow_account;

    // Initialize escrow
    escrow.project = project.key();
    escrow.project_id = project.project_id;
    escrow.total_sol_deposited = 0;
    escrow.total_released = 0;
    escrow.refunds_enabled = false;
    escrow.payment_mint = Pubkey::default(); // Native SOL
    escrow.token_vault = Pubkey::default();
    escrow.bump = ctx.bumps.escrow_account;

    // Update project
    project.status = ProjectStatus::Active;
    project.verified_at = clock.unix_timestamp;
    project.verifier = ctx.accounts.verifier.key();
    project.escrow_account = escrow.key();

    msg!("Project {} verified and activated", project.project_id);
    Ok(())
}

#[derive(Accounts)]
pub struct RejectProject<'info> {
    #[account(mut)]
    pub verifier: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        constraint = platform_config.is_verifier(&verifier.key()) @ RwaLaunchpadError::NotVerifier
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = project.status == ProjectStatus::PendingVerification @ RwaLaunchpadError::InvalidProjectStatus
    )]
    pub project: Account<'info, Project>,
}

pub fn reject_project(ctx: Context<RejectProject>, _reason: String) -> Result<()> {
    let project = &mut ctx.accounts.project;
    project.status = ProjectStatus::Draft;

    msg!("Project {} rejected", project.project_id);
    Ok(())
}
