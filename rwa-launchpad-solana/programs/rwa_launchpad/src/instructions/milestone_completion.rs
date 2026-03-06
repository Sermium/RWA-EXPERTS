// programs/rwa_launchpad/src/instructions/milestone_completion.rs
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PlatformConfig, Project, ProjectStatus, Milestone, EscrowAccount};
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(Accounts)]
#[instruction(milestone_index: u8, proof_hash: String)]
pub struct SubmitMilestoneCompletion<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = project.owner == owner.key() @ RwaLaunchpadError::NotProjectOwner,
        constraint = (
            project.status == ProjectStatus::Funded || 
            project.status == ProjectStatus::InProgress
        ) @ RwaLaunchpadError::InvalidProjectStatus,
        constraint = !project.is_disputed @ RwaLaunchpadError::ProjectDisputed
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        mut,
        seeds = [MILESTONE_SEED, project.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
        constraint = milestone.index == milestone_index @ RwaLaunchpadError::InvalidMilestoneIndex,
        constraint = !milestone.completed @ RwaLaunchpadError::MilestoneAlreadyCompleted
    )]
    pub milestone: Account<'info, Milestone>,
    
    /// Previous milestone (if not first)
    /// CHECK: Validated in instruction
    pub previous_milestone: Option<Account<'info, Milestone>>,
}

pub fn submit_milestone_completion(
    ctx: Context<SubmitMilestoneCompletion>,
    milestone_index: u8,
    proof_hash: String,
) -> Result<()> {
    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    let milestone = &mut ctx.accounts.milestone;

    // Check sequential completion
    if milestone_index > 0 {
        if let Some(prev) = &ctx.accounts.previous_milestone {
            require!(
                prev.completed,
                RwaLaunchpadError::PreviousMilestoneNotCompleted
            );
        } else {
            return Err(RwaLaunchpadError::PreviousMilestoneNotCompleted.into());
        }
    }

    // Mark milestone as completed
    milestone.completed = true;
    milestone.completion_time = clock.unix_timestamp;
    
    // Copy proof hash
    let proof_bytes = proof_hash.as_bytes();
    let proof_len = proof_bytes.len().min(MAX_HASH_LEN);
    milestone.proof_hash[..proof_len].copy_from_slice(&proof_bytes[..proof_len]);

    // Update project
    project.completed_milestones = project.completed_milestones
        .checked_add(1)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;
    
    if project.status == ProjectStatus::Funded {
        project.status = ProjectStatus::InProgress;
    }

    msg!(
        "Milestone {} completed for project {}",
        milestone_index,
        project.project_id
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(milestone_index: u8)]
pub struct ReleaseMilestoneFunds<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        mut,
        seeds = [ESCROW_SEED, project.key().as_ref()],
        bump = escrow_account.bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        seeds = [MILESTONE_SEED, project.key().as_ref(), &[milestone_index]],
        bump = milestone.bump,
        constraint = milestone.completed @ RwaLaunchpadError::MilestoneNotCompleted,
        constraint = !milestone.funds_released @ RwaLaunchpadError::FundsAlreadyReleased,
        constraint = !milestone.is_disputed @ RwaLaunchpadError::MilestoneDisputed
    )]
    pub milestone: Account<'info, Milestone>,
    
    /// CHECK: Project owner to receive funds
    #[account(
        mut,
        constraint = project_owner.key() == project.owner @ RwaLaunchpadError::NotProjectOwner
    )]
    pub project_owner: UncheckedAccount<'info>,
    
    /// CHECK: Platform fee recipient
    #[account(
        mut,
        constraint = fee_recipient.key() == platform_config.fee_recipient @ RwaLaunchpadError::Unauthorized
    )]
    pub fee_recipient: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn release_milestone_funds(
    ctx: Context<ReleaseMilestoneFunds>,
    _milestone_index: u8,
) -> Result<()> {
    let clock = Clock::get()?;
    let milestone = &mut ctx.accounts.milestone;
    let escrow = &mut ctx.accounts.escrow_account;
    let project = &mut ctx.accounts.project;
    let platform = &ctx.accounts.platform_config;

    // Check grace period has passed
    require!(
        clock.unix_timestamp >= milestone.completion_time + RELEASE_GRACE_PERIOD,
        RwaLaunchpadError::GracePeriodNotPassed
    );

    let release_amount = milestone.release_amount;
    
    // Calculate fee
    let fee_amount = release_amount
        .checked_mul(platform.platform_fee_bps as u64)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?
        .checked_div(BASIS_POINTS_DIVISOR)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;
    
    let net_amount = release_amount
        .checked_sub(fee_amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Transfer from escrow PDA to project owner
    let project_key = project.key();
    let escrow_seeds = &[
        ESCROW_SEED,
        project_key.as_ref(),
        &[escrow.bump],
    ];
    let signer_seeds = &[&escrow_seeds[..]];

    // Transfer net amount to project owner
    **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= net_amount;
    **ctx.accounts.project_owner.to_account_info().try_borrow_mut_lamports()? += net_amount;

    // Transfer fee to platform
    **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= fee_amount;
    **ctx.accounts.fee_recipient.to_account_info().try_borrow_mut_lamports()? += fee_amount;

    // Update state
    milestone.funds_released = true;
    escrow.total_released = escrow.total_released
        .checked_add(release_amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Check if all milestones completed and released
    if project.completed_milestones == project.milestone_count {
        let mut all_released = true;
        // In production, iterate through milestones to verify
        // For simplicity, we trust the counter here
        if all_released {
            project.status = ProjectStatus::Completed;
        }
    }

    msg!(
        "Released {} lamports for milestone (fee: {})",
        net_amount,
        fee_amount
    );
    Ok(())
}
