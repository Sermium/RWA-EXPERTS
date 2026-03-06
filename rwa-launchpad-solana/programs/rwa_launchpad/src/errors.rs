// programs/rwa_launchpad/src/errors.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum RwaLaunchpadError {
    // Identity errors
    #[msg("Identity not verified")]
    IdentityNotVerified,
    #[msg("Identity expired")]
    IdentityExpired,
    #[msg("Already registered")]
    AlreadyRegistered,
    #[msg("Invalid investor category")]
    InvalidInvestorCategory,

    // Project errors
    #[msg("Invalid project status")]
    InvalidProjectStatus,
    #[msg("Project not active")]
    ProjectNotActive,
    #[msg("Project not funded")]
    ProjectNotFunded,
    #[msg("Funding deadline passed")]
    FundingDeadlinePassed,
    #[msg("Funding deadline not passed")]
    FundingDeadlineNotPassed,
    #[msg("Funding goal not reached")]
    FundingGoalNotReached,
    #[msg("Funding goal already reached")]
    FundingGoalAlreadyReached,
    #[msg("Invalid funding goal")]
    InvalidFundingGoal,
    #[msg("Invalid deadline")]
    InvalidDeadline,
    #[msg("Not project owner")]
    NotProjectOwner,
    #[msg("Project is disputed")]
    ProjectDisputed,

    // Milestone errors
    #[msg("Invalid milestone index")]
    InvalidMilestoneIndex,
    #[msg("Milestone already completed")]
    MilestoneAlreadyCompleted,
    #[msg("Milestone not completed")]
    MilestoneNotCompleted,
    #[msg("Previous milestone not completed")]
    PreviousMilestoneNotCompleted,
    #[msg("Funds already released")]
    FundsAlreadyReleased,
    #[msg("Grace period not passed")]
    GracePeriodNotPassed,
    #[msg("Milestone amounts mismatch")]
    MilestoneAmountsMismatch,
    #[msg("Milestone disputed")]
    MilestoneDisputed,

    // Investment errors
    #[msg("Invalid investment amount")]
    InvalidInvestmentAmount,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Already invested")]
    AlreadyInvested,
    #[msg("Not an investor")]
    NotAnInvestor,

    // Refund errors
    #[msg("Refunds not enabled")]
    RefundsNotEnabled,
    #[msg("Refund already claimed")]
    RefundAlreadyClaimed,

    // Authorization errors
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Not a verifier")]
    NotVerifier,
    #[msg("Not an arbitrator")]
    NotArbitrator,

    // Dispute errors
    #[msg("Already disputed")]
    AlreadyDisputed,
    #[msg("Dispute not found")]
    DisputeNotFound,
    #[msg("Dispute already resolved")]
    DisputeAlreadyResolved,
    #[msg("Grace period passed")]
    GracePeriodPassed,

    // Token errors
    #[msg("Token not configured")]
    TokenNotConfigured,
    #[msg("Transfer not compliant")]
    TransferNotCompliant,

    // Dividend errors
    #[msg("Dividend not active")]
    DividendNotActive,
    #[msg("Dividend expired")]
    DividendExpired,
    #[msg("Already claimed")]
    AlreadyClaimed,
    #[msg("No balance at snapshot")]
    NoBalanceAtSnapshot,

    // General errors
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
    #[msg("String too long")]
    StringTooLong,
}
