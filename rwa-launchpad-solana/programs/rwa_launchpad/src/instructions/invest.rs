// programs/rwa_launchpad/src/instructions/invest.rs
use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::token::{self, Token, TokenAccount, Mint, Transfer};
use crate::state::{
    PlatformConfig, Project, ProjectStatus, EscrowAccount, 
    InvestorAccount, IdentityAccount
};
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(Accounts)]
pub struct Invest<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(
        seeds = [IDENTITY_SEED, investor.key().as_ref()],
        bump = identity_account.bump,
        constraint = identity_account.is_valid(Clock::get()?.unix_timestamp) @ RwaLaunchpadError::IdentityNotVerified
    )]
    pub identity_account: Account<'info, IdentityAccount>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = project.status == ProjectStatus::Active @ RwaLaunchpadError::ProjectNotActive
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        mut,
        seeds = [ESCROW_SEED, project.key().as_ref()],
        bump = escrow_account.bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        init_if_needed,
        payer = investor,
        space = InvestorAccount::LEN,
        seeds = [INVESTOR_SEED, project.key().as_ref(), investor.key().as_ref()],
        bump
    )]
    pub investor_account: Account<'info, InvestorAccount>,
    
    /// CHECK: Security token mint - will be validated
    #[account(mut)]
    pub security_token_mint: UncheckedAccount<'info>,
    
    /// CHECK: Investor's token account for security tokens
    #[account(mut)]
    pub investor_token_account: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn invest(ctx: Context<Invest>, amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    let escrow = &mut ctx.accounts.escrow_account;
    let investor_account = &mut ctx.accounts.investor_account;
    let platform = &mut ctx.accounts.platform_config;

    require!(
        amount > 0,
        RwaLaunchpadError::InvalidInvestmentAmount
    );
    require!(
        clock.unix_timestamp < project.funding_deadline,
        RwaLaunchpadError::FundingDeadlinePassed
    );
    require!(
        project.total_raised < project.funding_goal,
        RwaLaunchpadError::FundingGoalAlreadyReached
    );

    // Transfer SOL from investor to escrow PDA
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        system_program::Transfer {
            from: ctx.accounts.investor.to_account_info(),
            to: ctx.accounts.escrow_account.to_account_info(),
        },
    );
    system_program::transfer(cpi_context, amount)?;

    // Update escrow
    escrow.total_sol_deposited = escrow.total_sol_deposited
        .checked_add(amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Update investor account
    if investor_account.amount_invested == 0 {
        // New investor
        investor_account.investor = ctx.accounts.investor.key();
        investor_account.project = project.key();
        investor_account.invested_at = clock.unix_timestamp;
        investor_account.refund_claimed = false;
        investor_account.bump = ctx.bumps.investor_account;
        
        project.investor_count = project.investor_count
            .checked_add(1)
            .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;
    }
    
    investor_account.amount_invested = investor_account.amount_invested
        .checked_add(amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;
    investor_account.tokens_received = investor_account.tokens_received
        .checked_add(amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Update project total raised
    project.total_raised = project.total_raised
        .checked_add(amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Update platform stats
    platform.total_funds_raised = platform.total_funds_raised
        .checked_add(amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Check if funding goal reached
    if project.total_raised >= project.funding_goal {
        project.status = ProjectStatus::Funded;
        msg!("Project {} fully funded!", project.project_id);
    }

    // TODO: Mint security tokens to investor
    // This would require the security token mint to be initialized
    // and proper CPI to the token program

    msg!(
        "Investment of {} lamports received for project {}",
        amount,
        project.project_id
    );
    Ok(())
}

// SPL Token investment variant
#[derive(Accounts)]
pub struct InvestSpl<'info> {
    #[account(mut)]
    pub investor: Signer<'info>,
    
    #[account(
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(
        seeds = [IDENTITY_SEED, investor.key().as_ref()],
        bump = identity_account.bump,
        constraint = identity_account.is_valid(Clock::get()?.unix_timestamp) @ RwaLaunchpadError::IdentityNotVerified
    )]
    pub identity_account: Account<'info, IdentityAccount>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = project.status == ProjectStatus::Active @ RwaLaunchpadError::ProjectNotActive
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        mut,
        seeds = [ESCROW_SEED, project.key().as_ref()],
        bump = escrow_account.bump
    )]
    pub escrow_account: Account<'info, EscrowAccount>,
    
    #[account(
        init_if_needed,
        payer = investor,
        space = InvestorAccount::LEN,
        seeds = [INVESTOR_SEED, project.key().as_ref(), investor.key().as_ref()],
        bump
    )]
    pub investor_account: Account<'info, InvestorAccount>,
    
    /// Payment token mint (e.g., USDC)
    pub payment_mint: Account<'info, Mint>,
    
    /// Investor's payment token account
    #[account(
        mut,
        constraint = investor_payment_account.owner == investor.key(),
        constraint = investor_payment_account.mint == payment_mint.key()
    )]
    pub investor_payment_account: Account<'info, TokenAccount>,
    
    /// Escrow's payment token vault
    #[account(
        mut,
        seeds = [ESCROW_VAULT_SEED, escrow_account.key().as_ref(), payment_mint.key().as_ref()],
        bump
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

pub fn invest_spl(ctx: Context<InvestSpl>, amount: u64) -> Result<()> {
    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    let escrow = &mut ctx.accounts.escrow_account;
    let investor_account = &mut ctx.accounts.investor_account;

    require!(
        amount > 0,
        RwaLaunchpadError::InvalidInvestmentAmount
    );
    require!(
        clock.unix_timestamp < project.funding_deadline,
        RwaLaunchpadError::FundingDeadlinePassed
    );

    // Transfer SPL tokens from investor to escrow vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.investor_payment_account.to_account_info(),
        to: ctx.accounts.escrow_vault.to_account_info(),
        authority: ctx.accounts.investor.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // Update investor account
    if investor_account.amount_invested == 0 {
        investor_account.investor = ctx.accounts.investor.key();
        investor_account.project = project.key();
        investor_account.invested_at = clock.unix_timestamp;
        investor_account.refund_claimed = false;
        investor_account.bump = ctx.bumps.investor_account;
        
        project.investor_count = project.investor_count
            .checked_add(1)
            .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;
    }
    
    investor_account.amount_invested = investor_account.amount_invested
        .checked_add(amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Update project
    project.total_raised = project.total_raised
        .checked_add(amount)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    if project.total_raised >= project.funding_goal {
        project.status = ProjectStatus::Funded;
    }

    msg!(
        "SPL investment of {} received for project {}",
        amount,
        project.project_id
    );
    Ok(())
}
