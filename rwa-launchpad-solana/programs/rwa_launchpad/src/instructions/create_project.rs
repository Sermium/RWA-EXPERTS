// programs/rwa_launchpad/src/instructions/create_project.rs
use anchor_lang::prelude::*;
use crate::state::{PlatformConfig, Project, ProjectStatus, IdentityAccount};
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateProjectArgs {
    pub name: String,
    pub description_hash: String,
    pub funding_goal: u64,
    pub funding_deadline: i64,
    pub legal_contract_hash: String,
    pub jurisdiction: String,
    pub metadata_uri: String,
}

#[derive(Accounts)]
#[instruction(args: CreateProjectArgs)]
pub struct CreateProject<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [PLATFORM_SEED],
        bump = platform_config.bump
    )]
    pub platform_config: Account<'info, PlatformConfig>,
    
    #[account(
        seeds = [IDENTITY_SEED, owner.key().as_ref()],
        bump = identity_account.bump,
        constraint = identity_account.is_valid(Clock::get()?.unix_timestamp) @ RwaLaunchpadError::IdentityNotVerified
    )]
    pub identity_account: Account<'info, IdentityAccount>,
    
    #[account(
        init,
        payer = owner,
        space = Project::LEN,
        seeds = [PROJECT_SEED, platform_config.total_projects.to_le_bytes().as_ref()],
        bump
    )]
    pub project: Account<'info, Project>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_project(
    ctx: Context<CreateProject>,
    args: CreateProjectArgs,
) -> Result<()> {
    let clock = Clock::get()?;
    
    require!(
        args.funding_goal > 0,
        RwaLaunchpadError::InvalidFundingGoal
    );
    require!(
        args.funding_deadline > clock.unix_timestamp + 24 * 60 * 60, // At least 1 day
        RwaLaunchpadError::InvalidDeadline
    );
    require!(
        args.name.len() <= MAX_NAME_LEN,
        RwaLaunchpadError::StringTooLong
    );
    require!(
        args.metadata_uri.len() <= MAX_URI_LEN,
        RwaLaunchpadError::StringTooLong
    );

    let platform = &mut ctx.accounts.platform_config;
    let project = &mut ctx.accounts.project;

    // Set project ID
    project.project_id = platform.total_projects;
    platform.total_projects = platform.total_projects
        .checked_add(1)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    // Set project details
    project.owner = ctx.accounts.owner.key();
    project.set_name(&args.name);
    
    // Copy description hash
    let desc_bytes = args.description_hash.as_bytes();
    let desc_len = desc_bytes.len().min(MAX_HASH_LEN);
    project.description_hash[..desc_len].copy_from_slice(&desc_bytes[..desc_len]);
    
    // Copy legal hash
    let legal_bytes = args.legal_contract_hash.as_bytes();
    let legal_len = legal_bytes.len().min(MAX_HASH_LEN);
    project.legal_contract_hash[..legal_len].copy_from_slice(&legal_bytes[..legal_len]);
    
    // Copy jurisdiction
    let juris_bytes = args.jurisdiction.as_bytes();
    let juris_len = juris_bytes.len().min(8);
    project.jurisdiction[..juris_len].copy_from_slice(&juris_bytes[..juris_len]);
    
    // Copy metadata URI
    let uri_bytes = args.metadata_uri.as_bytes();
    let uri_len = uri_bytes.len().min(MAX_URI_LEN);
    project.metadata_uri[..uri_len].copy_from_slice(&uri_bytes[..uri_len]);
    project.metadata_uri_len = uri_len as u8;

    project.funding_goal = args.funding_goal;
    project.funding_deadline = args.funding_deadline;
    project.total_raised = 0;
    project.status = ProjectStatus::Draft;
    project.created_at = clock.unix_timestamp;
    project.verified_at = 0;
    project.verifier = Pubkey::default();
    project.security_token_mint = Pubkey::default();
    project.escrow_account = Pubkey::default();
    project.milestone_count = 0;
    project.completed_milestones = 0;
    project.is_disputed = false;
    project.investor_count = 0;
    project.bump = ctx.bumps.project;

    msg!("Project created: {} with ID: {}", args.name, project.project_id);
    Ok(())
}
