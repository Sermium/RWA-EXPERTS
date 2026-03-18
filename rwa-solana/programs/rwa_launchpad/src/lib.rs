// programs/rwa_launchpad/src/lib.rs
use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("RWA1aunchpad11111111111111111111111111111111");

#[program]
pub mod rwa_launchpad {
    use super::*;

    // ============ Platform Setup ============
    
    pub fn initialize_platform(
        ctx: Context<InitializePlatform>,
        platform_fee_bps: u16,
    ) -> Result<()> {
        instructions::initialize_platform(ctx, platform_fee_bps)
    }

    // ============ Identity Management ============
    
    pub fn register_identity(
        ctx: Context<RegisterIdentity>,
        country: u16,
        investor_category: u8,
        expiration_date: i64,
        identity_hash: [u8; 32],
    ) -> Result<()> {
        instructions::register_identity(ctx, country, investor_category, expiration_date, identity_hash)
    }

    pub fn update_identity(
        ctx: Context<UpdateIdentity>,
        country: u16,
        investor_category: u8,
        expiration_date: i64,
    ) -> Result<()> {
        instructions::update_identity(ctx, country, investor_category, expiration_date)
    }

    pub fn revoke_identity(ctx: Context<RevokeIdentity>) -> Result<()> {
        instructions::revoke_identity(ctx)
    }

    // ============ Project Management ============
    
    pub fn create_project(
        ctx: Context<CreateProject>,
        args: CreateProjectArgs,
    ) -> Result<()> {
        instructions::create_project(ctx, args)
    }

    pub fn add_milestone(
        ctx: Context<AddMilestone>,
        description: String,
        release_amount: u64,
        deadline: i64,
    ) -> Result<()> {
        instructions::add_milestone(ctx, description, release_amount, deadline)
    }

    pub fn submit_for_verification(ctx: Context<SubmitForVerification>) -> Result<()> {
        instructions::submit_for_verification(ctx)
    }

    pub fn verify_project(ctx: Context<VerifyProject>) -> Result<()> {
        instructions::verify_project(ctx)
    }

    pub fn reject_project(ctx: Context<RejectProject>, reason: String) -> Result<()> {
        instructions::reject_project(ctx, reason)
    }

    // ============ Token Setup ============
    
    pub fn initialize_security_token(
        ctx: Context<InitializeSecurityToken>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        instructions::initialize_security_token(ctx, name, symbol, uri)
    }

    // ============ Investment ============
    
    pub fn invest(ctx: Context<Invest>, amount: u64) -> Result<()> {
        instructions::invest(ctx, amount)
    }

    pub fn invest_spl(ctx: Context<InvestSpl>, amount: u64) -> Result<()> {
        instructions::invest_spl(ctx, amount)
    }

    // ============ Milestone Management ============
    
    pub fn submit_milestone_completion(
        ctx: Context<SubmitMilestoneCompletion>,
        milestone_index: u8,
        proof_hash: String,
    ) -> Result<()> {
        instructions::submit_milestone_completion(ctx, milestone_index, proof_hash)
    }

    pub fn release_milestone_funds(
        ctx: Context<ReleaseMilestoneFunds>,
        milestone_index: u8,
    ) -> Result<()> {
        instructions::release_milestone_funds(ctx, milestone_index)
    }

    // ============ Disputes ============
    
    pub fn initiate_dispute(
        ctx: Context<InitiateDispute>,
        milestone_index: u8,
        reason: String,
    ) -> Result<()> {
        instructions::initiate_dispute(ctx, milestone_index, reason)
    }

    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        in_favor_of_project: bool,
    ) -> Result<()> {
        instructions::resolve_dispute(ctx, in_favor_of_project)
    }

    // ============ Refunds ============
    
    pub fn enable_refunds(ctx: Context<EnableRefunds>) -> Result<()> {
        instructions::enable_refunds(ctx)
    }

    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        instructions::claim_refund(ctx)
    }

    // ============ Dividends ============
    
    pub fn create_dividend_distribution(
        ctx: Context<CreateDividendDistribution>,
        amount: u64,
    ) -> Result<()> {
        instructions::create_dividend_distribution(ctx, amount)
    }

    pub fn claim_dividend(ctx: Context<ClaimDividend>, round: u64) -> Result<()> {
        instructions::claim_dividend(ctx, round)
    }
}