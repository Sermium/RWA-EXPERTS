// sources/errors.move
module rwa_launchpad::errors {
    
    // Identity errors
    const EIdentityNotVerified: u64 = 1;
    const EIdentityExpired: u64 = 2;
    const EAlreadyRegistered: u64 = 3;
    const EInvalidInvestorCategory: u64 = 4;

    // Project errors
    const EInvalidProjectStatus: u64 = 10;
    const EProjectNotActive: u64 = 11;
    const EProjectNotFunded: u64 = 12;
    const EFundingDeadlinePassed: u64 = 13;
    const EFundingDeadlineNotPassed: u64 = 14;
    const EFundingGoalNotReached: u64 = 15;
    const EFundingGoalAlreadyReached: u64 = 16;
    const EInvalidFundingGoal: u64 = 17;
    const EInvalidDeadline: u64 = 18;
    const ENotProjectOwner: u64 = 19;
    const EProjectDisputed: u64 = 20;

    // Milestone errors
    const EInvalidMilestoneIndex: u64 = 30;
    const EMilestoneAlreadyCompleted: u64 = 31;
    const EMilestoneNotCompleted: u64 = 32;
    const EPreviousMilestoneNotCompleted: u64 = 33;
    const EFundsAlreadyReleased: u64 = 34;
    const EGracePeriodNotPassed: u64 = 35;
    const EMilestoneAmountsMismatch: u64 = 36;
    const EMilestoneDisputed: u64 = 37;

    // Investment errors
    const EInvalidInvestmentAmount: u64 = 40;
    const EInsufficientFunds: u64 = 41;
    const ENotAnInvestor: u64 = 42;

    // Refund errors
    const ERefundsNotEnabled: u64 = 50;
    const ERefundAlreadyClaimed: u64 = 51;

    // Authorization errors
    const EUnauthorized: u64 = 60;
    const ENotVerifier: u64 = 61;
    const ENotArbitrator: u64 = 62;

    // Dispute errors
    const EAlreadyDisputed: u64 = 70;
    const EDisputeNotFound: u64 = 71;
    const EDisputeAlreadyResolved: u64 = 72;
    const EGracePeriodPassed: u64 = 73;

    // Dividend errors
    const EDividendNotActive: u64 = 80;
    const EDividendExpired: u64 = 81;
    const EAlreadyClaimed: u64 = 82;
    const ENoBalanceAtSnapshot: u64 = 83;

    // Public accessor functions
    public fun identity_not_verified(): u64 { EIdentityNotVerified }
    public fun identity_expired(): u64 { EIdentityExpired }
    public fun already_registered(): u64 { EAlreadyRegistered }
    public fun invalid_investor_category(): u64 { EInvalidInvestorCategory }
    public fun invalid_project_status(): u64 { EInvalidProjectStatus }
    public fun project_not_active(): u64 { EProjectNotActive }
    public fun project_not_funded(): u64 { EProjectNotFunded }
    public fun funding_deadline_passed(): u64 { EFundingDeadlinePassed }
    public fun funding_deadline_not_passed(): u64 { EFundingDeadlineNotPassed }
    public fun funding_goal_not_reached(): u64 { EFundingGoalNotReached }
    public fun funding_goal_already_reached(): u64 { EFundingGoalAlreadyReached }
    public fun invalid_funding_goal(): u64 { EInvalidFundingGoal }
    public fun invalid_deadline(): u64 { EInvalidDeadline }
    public fun not_project_owner(): u64 { ENotProjectOwner }
    public fun project_disputed(): u64 { EProjectDisputed }
    public fun invalid_milestone_index(): u64 { EInvalidMilestoneIndex }
    public fun milestone_already_completed(): u64 { EMilestoneAlreadyCompleted }
    public fun milestone_not_completed(): u64 { EMilestoneNotCompleted }
    public fun previous_milestone_not_completed(): u64 { EPreviousMilestoneNotCompleted }
    public fun funds_already_released(): u64 { EFundsAlreadyReleased }
    public fun grace_period_not_passed(): u64 { EGracePeriodNotPassed }
    public fun milestone_amounts_mismatch(): u64 { EMilestoneAmountsMismatch }
    public fun milestone_disputed(): u64 { EMilestoneDisputed }
    public fun invalid_investment_amount(): u64 { EInvalidInvestmentAmount }
    public fun insufficient_funds(): u64 { EInsufficientFunds }
    public fun not_an_investor(): u64 { ENotAnInvestor }
    public fun refunds_not_enabled(): u64 { ERefundsNotEnabled }
    public fun refund_already_claimed(): u64 { ERefundAlreadyClaimed }
    public fun unauthorized(): u64 { EUnauthorized }
    public fun not_verifier(): u64 { ENotVerifier }
    public fun not_arbitrator(): u64 { ENotArbitrator }
    public fun already_disputed(): u64 { EAlreadyDisputed }
    public fun dispute_not_found(): u64 { EDisputeNotFound }
    public fun dispute_already_resolved(): u64 { EDisputeAlreadyResolved }
    public fun grace_period_passed(): u64 { EGracePeriodPassed }
    public fun dividend_not_active(): u64 { EDividendNotActive }
    public fun dividend_expired(): u64 { EDividendExpired }
    public fun already_claimed(): u64 { EAlreadyClaimed }
    public fun no_balance_at_snapshot(): u64 { ENoBalanceAtSnapshot }
}