// programs/rwa_launchpad/src/instructions/refund.rs
use anchor_lang::prelude::*;
use crate::state::{PlatformConfig, Project, ProjectStatus, EscrowAccount, InvestorAccount};
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(Accounts)]
pub struct EnableRefunds<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump,
        constraint = platform_config.authority == authority.key() @ RwaLaunchpadError::Unauthorized
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = (
            project.status == ProjectStatus::Active ||
            project.status == ProjectStatus::Disputed
        ) @ RwaLaunchpadError::InvalidProjectStatus
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        mut,
        seeds = [ESCROW_SEED, project.key().as_ref()],
        bump = escrow_account.bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
}

pub fn enable_refunds(ctx: Context<EnableRefunds>) -> Result<()> {
    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    let escrow = &mut ctx.accounts.escrow_account;

    // Verify conditions for refund
    require!(
        clock.unix_timestamp > project.funding_deadline,
        RwaLaunchpadError::FundingDeadlineNotPassed
    );
    require!(
        project.total_raised < project.funding_goal,
        RwaLaunchpadError::FundingGoalAlreadyReached
    );

    escrow.refunds_enabled = true;
    project.status = ProjectStatus::Cancelled;

    msg!("Refunds enabled for project {}", project.project_id);
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    
    #[account(
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        mut,
        seeds = [ESCROW_SEED, project.key().as_ref()],
        bump = escrow_account.bump,
        constraint = escrow_account.refunds_enabled @ RwaLaunchpadError::RefundsNotEnabled
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        mut,
        seeds = [INVESTOR_SEED, project.key().as_ref(), investor.key().as_ref()],
        bump = investor_account.bump,
        constraint = investor_account.investor == investor.key() @ RwaLaunchpadError::NotAnInvestor,
        constraint = !investor_account.refund_claimed @ RwaLaunchpadError::RefundAlreadyClaimed,
        close = investor
    )]
    pub investor_account: Account<'info, InvestorAccount>,
    
    pub system_program: Program<'info, System>,
}

pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
    let investor_account = &mut ctx.accounts.investor_account;
    let escrow = &ctx.accounts.escrow_account;
    let project = &ctx.accounts.project;

    let refund_amount = investor_account.amount_invested;
    
    require!(
        refund_amount > 0,
        RwaLaunchpadError::InvalidInvestmentAmount
    );

    // Transfer from escrow PDA to investor
    let project_key = project.key();
    let escrow_seeds = &[
        ESCROW_SEED,
        project_key.as_ref(),
        &[escrow.bump],
    ];

    **ctx.accounts.escrow_account.to_account_info().try_borrow_mut_lamports()? -= refund_amount;
    **ctx.accounts.investor.to_account_info().try_borrow_mut_lamports()? += refund_amount;

    // Account will be closed and rent returned to investor

    msg!(
        "Refund of {} lamports claimed by {}",
        refund_amount,
        ctx.accounts.investor.key()
    );
    Ok(())
}
