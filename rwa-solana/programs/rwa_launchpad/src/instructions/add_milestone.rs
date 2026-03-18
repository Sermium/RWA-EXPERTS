// programs/rwa_launchpad/src/instructions/add_milestone.rs
use anchor_lang::prelude::*;
use crate::state::{Project, ProjectStatus, Milestone};
use crate::constants::*;
use crate::errors::RwaLaunchpadError;

#[derive(Accounts)]
#[instruction(description: String, release_amount: u64, deadline: i64)]
pub struct AddMilestone<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,
    
    #[account(
        mut,
        seeds = [PROJECT_SEED, project.project_id.to_le_bytes().as_ref()],
        bump = project.bump,
        constraint = project.owner == owner.key() @ RwaLaunchpadError::NotProjectOwner,
        constraint = project.status == ProjectStatus::Draft @ RwaLaunchpadError::InvalidProjectStatus,
        constraint = project.milestone_count < MAX_MILESTONES @ RwaLaunchpadError::InvalidMilestoneIndex
    )]
    pub project: Account<'info, Project>,
    
    #[account(
        init,
        payer = owner,
        space = Milestone::LEN,
        seeds = [
            MILESTONE_SEED, 
            project.key().as_ref(), 
            &[project.milestone_count]
        ],
        bump
    )]
    pub milestone: Account<'info, Milestone>,
    
    pub system_program: Program<'info, System>,
}

pub fn add_milestone(
    ctx: Context<AddMilestone>,
    description: String,
    release_amount: u64,
    deadline: i64,
) -> Result<()> {
    let clock = Clock::get()?;
    let project = &mut ctx.accounts.project;
    let milestone = &mut ctx.accounts.milestone;

    require!(
        deadline > clock.unix_timestamp,
        RwaLaunchpadError::InvalidDeadline
    );
    require!(
        deadline > project.funding_deadline,
        RwaLaunchpadError::InvalidDeadline
    );
    require!(
        release_amount > 0,
        RwaLaunchpadError::InvalidInvestmentAmount
    );
    require!(
        description.len() <= MAX_DESCRIPTION_LEN,
        RwaLaunchpadError::StringTooLong
    );

    milestone.project = project.key();
    milestone.index = project.milestone_count;
    
    // Copy description
    let desc_bytes = description.as_bytes();
    let desc_len = desc_bytes.len().min(MAX_DESCRIPTION_LEN);
    milestone.description[..desc_len].copy_from_slice(&desc_bytes[..desc_len]);
    milestone.description_len = desc_len as u8;
    
    milestone.release_amount = release_amount;
    milestone.deadline = deadline;
    milestone.completed = false;
    milestone.funds_released = false;
    milestone.completion_time = 0;
    milestone.is_disputed = false;
    milestone.bump = ctx.bumps.milestone;

    // Increment milestone count
    project.milestone_count = project.milestone_count
        .checked_add(1)
        .ok_or(RwaLaunchpadError::ArithmeticOverflow)?;

    msg!(
        "Milestone {} added to project {}: {} lamports",
        milestone.index,
        project.project_id,
        release_amount
    );
    Ok(())
}
