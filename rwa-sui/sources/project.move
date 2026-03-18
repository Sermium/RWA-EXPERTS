// sources/project.move
module rwa_launchpad::project {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::dynamic_field;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use std::string::{Self, String};
    use std::vector;
    use std::option::{Self, Option};

    use rwa_launchpad::errors;
    use rwa_launchpad::identity::{Self, Identity, VerifierCap};

    // ============ Constants ============

    const STATUS_DRAFT: u8 = 0;
    const STATUS_PENDING_VERIFICATION: u8 = 1;
    const STATUS_ACTIVE: u8 = 2;
    const STATUS_FUNDED: u8 = 3;
    const STATUS_IN_PROGRESS: u8 = 4;
    const STATUS_COMPLETED: u8 = 5;
    const STATUS_DISPUTED: u8 = 6;
    const STATUS_CANCELLED: u8 = 7;

    const RELEASE_GRACE_PERIOD_MS: u64 = 3 * 24 * 60 * 60 * 1000; // 3 days
    const BASIS_POINTS_DIVISOR: u64 = 10000;

    // ============ Structs ============

    /// Platform configuration - shared object
    public struct PlatformConfig has key {
        id: UID,
        /// Platform admin
        admin: address,
        /// Fee recipient
        fee_recipient: address,
        /// Platform fee in basis points
        platform_fee_bps: u64,
        /// Total projects created
        total_projects: u64,
        /// Total funds raised
        total_funds_raised: u64,
    }

    /// Project NFT - represents ownership of the project
    public struct ProjectNFT has key, store {
        id: UID,
        /// Project ID
        project_id: u64,
        /// Project data reference
        project_data_id: ID,
    }

    /// Project data - shared object containing all project details
    public struct ProjectData has key {
        id: UID,
        /// Project ID
        project_id: u64,
        /// Project owner
        owner: address,
        /// Project name
        name: String,
        /// Description (IPFS hash)
        description_hash: String,
        /// Funding goal in MIST (1 SUI = 10^9 MIST)
        funding_goal: u64,
        /// Total raised
        total_raised: u64,
        /// Funding deadline (timestamp in ms)
        funding_deadline: u64,
        /// Project status
        status: u8,
        /// Legal contract hash (IPFS)
        legal_contract_hash: String,
        /// Jurisdiction
        jurisdiction: String,
        /// Metadata URI
        metadata_uri: String,
        /// Created at timestamp
        created_at: u64,
        /// Verified at timestamp
        verified_at: u64,
        /// Verifier address
        verifier: address,
        /// Is disputed
        is_disputed: bool,
        /// Investor count
        investor_count: u64,
        /// Milestones
        milestones: vector<Milestone>,
        /// Completed milestones count
        completed_milestones: u8,
    }

    /// Milestone structure
    public struct Milestone has store, copy, drop {
        /// Milestone index
        index: u8,
        /// Description
        description: String,
        /// Amount to release
        release_amount: u64,
        /// Deadline
        deadline: u64,
        /// Is completed
        completed: bool,
        /// Funds released
        funds_released: bool,
        /// Completion timestamp
        completion_time: u64,
        /// Proof hash (IPFS)
        proof_hash: String,
        /// Is disputed
        is_disputed: bool,
    }

    /// Escrow vault for project funds
    public struct EscrowVault has key {
        id: UID,
        /// Project ID
        project_id: u64,
        /// Project data reference
        project_data_id: ID,
        /// SUI balance
        balance: Balance<SUI>,
        /// Total released
        total_released: u64,
        /// Refunds enabled
        refunds_enabled: bool,
    }

    /// Investor position - tracks investment in a project
    public struct InvestorPosition has key, store {
        id: UID,
        /// Investor address
        investor: address,
        /// Project ID
        project_id: u64,
        /// Project data reference
        project_data_id: ID,
        /// Amount invested
        amount_invested: u64,
        /// Security tokens received
        tokens_received: u64,
        /// Investment timestamp
        invested_at: u64,
        /// Refund claimed
        refund_claimed: bool,
    }

    /// Security Token representing fractional ownership
    public struct SecurityToken has key, store {
        id: UID,
        /// Project ID
        project_id: u64,
        /// Amount
        amount: u64,
        /// Original investor
        original_investor: address,
    }

    /// Dispute record
    public struct Dispute has key, store {
        id: UID,
        /// Project ID
        project_id: u64,
        /// Milestone index
        milestone_index: u8,
        /// Initiator
        initiator: address,
        /// Reason
        reason: String,
        /// Created at
        created_at: u64,
        /// Resolved
        resolved: bool,
        /// In favor of project
        in_favor_of_project: bool,
    }

    // ============ Events ============

    public struct PlatformInitialized has copy, drop {
        admin: address,
        fee_recipient: address,
        platform_fee_bps: u64,
    }

    public struct ProjectCreated has copy, drop {
        project_id: u64,
        project_data_id: ID,
        owner: address,
        name: String,
        funding_goal: u64,
        funding_deadline: u64,
    }

    public struct MilestoneAdded has copy, drop {
        project_id: u64,
        milestone_index: u8,
        description: String,
        release_amount: u64,
        deadline: u64,
    }

    public struct ProjectSubmittedForVerification has copy, drop {
        project_id: u64,
    }

    public struct ProjectVerified has copy, drop {
        project_id: u64,
        verifier: address,
        escrow_id: ID,
    }

    public struct ProjectRejected has copy, drop {
        project_id: u64,
        reason: String,
    }

    public struct InvestmentReceived has copy, drop {
        project_id: u64,
        investor: address,
        amount: u64,
        total_raised: u64,
    }

    public struct FundingGoalReached has copy, drop {
        project_id: u64,
        total_raised: u64,
    }

    public struct MilestoneCompleted has copy, drop {
        project_id: u64,
        milestone_index: u8,
        proof_hash: String,
    }

    public struct FundsReleased has copy, drop {
        project_id: u64,
        milestone_index: u8,
        amount: u64,
        fee: u64,
    }

    public struct RefundsEnabled has copy, drop {
        project_id: u64,
    }

    public struct RefundClaimed has copy, drop {
        project_id: u64,
        investor: address,
        amount: u64,
    }

    public struct DisputeCreated has copy, drop {
        dispute_id: ID,
        project_id: u64,
        milestone_index: u8,
        initiator: address,
    }

    public struct DisputeResolved has copy, drop {
        dispute_id: ID,
        in_favor_of_project: bool,
    }

    // ============ Init ============

    fun init(ctx: &mut TxContext) {
        let sender = tx_context::sender(ctx);
        
        let platform = PlatformConfig {
            id: object::new(ctx),
            admin: sender,
            fee_recipient: sender,
            platform_fee_bps: 250, // 2.5%
            total_projects: 0,
            total_funds_raised: 0,
        };

        event::emit(PlatformInitialized {
            admin: sender,
            fee_recipient: sender,
            platform_fee_bps: 250,
        });

        transfer::share_object(platform);
    }

    // ============ Platform Admin Functions ============

    /// Update platform fee
    public entry fun update_platform_fee(
        platform: &mut PlatformConfig,
        new_fee_bps: u64,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, errors::unauthorized());
        assert!(new_fee_bps <= 1000, errors::invalid_investment_amount()); // Max 10%
        platform.platform_fee_bps = new_fee_bps;
    }

    /// Update fee recipient
    public entry fun update_fee_recipient(
        platform: &mut PlatformConfig,
        new_recipient: address,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == platform.admin, errors::unauthorized());
        platform.fee_recipient = new_recipient;
    }

    // ============ Project Creation ============

    /// Create a new project
    public entry fun create_project(
        platform: &mut PlatformConfig,
        identity: &Identity,
        name: vector<u8>,
        description_hash: vector<u8>,
        funding_goal: u64,
        funding_deadline: u64,
        legal_contract_hash: vector<u8>,
        jurisdiction: vector<u8>,
        metadata_uri: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate identity
        assert!(identity::is_valid(identity, clock), errors::identity_not_verified());
        assert!(identity::owner(identity) == sender, errors::unauthorized());

        // Validate inputs
        assert!(funding_goal > 0, errors::invalid_funding_goal());
        assert!(funding_deadline > current_time + 24 * 60 * 60 * 1000, errors::invalid_deadline()); // At least 1 day

        // Generate project ID
        let project_id = platform.total_projects;
        platform.total_projects = platform.total_projects + 1;

        // Create project data (shared object)
        let project_data = ProjectData {
            id: object::new(ctx),
            project_id,
            owner: sender,
            name: string::utf8(name),
            description_hash: string::utf8(description_hash),
            funding_goal,
            total_raised: 0,
            funding_deadline,
            status: STATUS_DRAFT,
            legal_contract_hash: string::utf8(legal_contract_hash),
            jurisdiction: string::utf8(jurisdiction),
            metadata_uri: string::utf8(metadata_uri),
            created_at: current_time,
            verified_at: 0,
            verifier: @0x0,
            is_disputed: false,
            investor_count: 0,
            milestones: vector::empty(),
            completed_milestones: 0,
        };

        let project_data_id = object::id(&project_data);

        // Create project NFT (owned by creator)
        let project_nft = ProjectNFT {
            id: object::new(ctx),
            project_id,
            project_data_id,
        };

        event::emit(ProjectCreated {
            project_id,
            project_data_id,
            owner: sender,
            name: string::utf8(name),
            funding_goal,
            funding_deadline,
        });

        // Share project data and transfer NFT to owner
        transfer::share_object(project_data);
        transfer::transfer(project_nft, sender);
    }

    // ============ Milestone Management ============

    /// Add a milestone to a project
    public entry fun add_milestone(
        project_nft: &ProjectNFT,
        project_data: &mut ProjectData,
        description: vector<u8>,
        release_amount: u64,
        deadline: u64,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate ownership and status
        assert!(project_data.owner == sender, errors::not_project_owner());
        assert!(project_data.status == STATUS_DRAFT, errors::invalid_project_status());
        assert!(project_nft.project_id == project_data.project_id, errors::unauthorized());

        // Validate milestone
        assert!(release_amount > 0, errors::invalid_investment_amount());
        assert!(deadline > current_time, errors::invalid_deadline());
        assert!(deadline > project_data.funding_deadline, errors::invalid_deadline());

        // Check sequential deadlines
        let milestone_count = vector::length(&project_data.milestones);
        if (milestone_count > 0) {
            let last_milestone = vector::borrow(&project_data.milestones, milestone_count - 1);
            assert!(deadline > last_milestone.deadline, errors::invalid_deadline());
        };

        let milestone = Milestone {
            index: (milestone_count as u8),
            description: string::utf8(description),
            release_amount,
            deadline,
            completed: false,
            funds_released: false,
            completion_time: 0,
            proof_hash: string::utf8(b""),
            is_disputed: false,
        };

        event::emit(MilestoneAdded {
            project_id: project_data.project_id,
            milestone_index: milestone.index,
            description: string::utf8(description),
            release_amount,
            deadline,
        });

        vector::push_back(&mut project_data.milestones, milestone);
    }

    /// Add multiple milestones at once
    public entry fun add_milestones_batch(
        project_nft: &ProjectNFT,
        project_data: &mut ProjectData,
        descriptions: vector<vector<u8>>,
        release_amounts: vector<u64>,
        deadlines: vector<u64>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let len = vector::length(&descriptions);
        assert!(len == vector::length(&release_amounts), errors::milestone_amounts_mismatch());
        assert!(len == vector::length(&deadlines), errors::milestone_amounts_mismatch());

        let i = 0;
        while (i < len) {
            add_milestone(
                project_nft,
                project_data,
                *vector::borrow(&descriptions, i),
                *vector::borrow(&release_amounts, i),
                *vector::borrow(&deadlines, i),
                clock,
                ctx,
            );
            i = i + 1;
        };
    }

    // ============ Verification ============

    /// Submit project for verification
    public entry fun submit_for_verification(
        project_nft: &ProjectNFT,
        project_data: &mut ProjectData,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);

        assert!(project_data.owner == sender, errors::not_project_owner());
        assert!(project_data.status == STATUS_DRAFT, errors::invalid_project_status());
        assert!(project_nft.project_id == project_data.project_id, errors::unauthorized());
        assert!(vector::length(&project_data.milestones) > 0, errors::invalid_milestone_index());

        // Validate milestone amounts equal funding goal
        let total_milestone_amount = 0u64;
        let i = 0;
        let len = vector::length(&project_data.milestones);
        while (i < len) {
            let milestone = vector::borrow(&project_data.milestones, i);
            total_milestone_amount = total_milestone_amount + milestone.release_amount;
            i = i + 1;
        };
        assert!(total_milestone_amount == project_data.funding_goal, errors::milestone_amounts_mismatch());

        project_data.status = STATUS_PENDING_VERIFICATION;

        event::emit(ProjectSubmittedForVerification {
            project_id: project_data.project_id,
        });
    }

    /// Verify a project (creates escrow)
    public entry fun verify_project(
        _verifier_cap: &VerifierCap,
        project_data: &mut ProjectData,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        assert!(project_data.status == STATUS_PENDING_VERIFICATION, errors::invalid_project_status());

        let current_time = clock::timestamp_ms(clock);
        let verifier = tx_context::sender(ctx);

        // Create escrow vault
        let escrow = EscrowVault {
            id: object::new(ctx),
            project_id: project_data.project_id,
            project_data_id: object::id(project_data),
            balance: balance::zero(),
            total_released: 0,
            refunds_enabled: false,
        };

        let escrow_id = object::id(&escrow);

        // Update project
        project_data.status = STATUS_ACTIVE;
        project_data.verified_at = current_time;
        project_data.verifier = verifier;

        event::emit(ProjectVerified {
            project_id: project_data.project_id,
            verifier,
            escrow_id,
        });

        transfer::share_object(escrow);
    }

    /// Reject a project
    public entry fun reject_project(
        _verifier_cap: &VerifierCap,
        project_data: &mut ProjectData,
        reason: vector<u8>,
    ) {
        assert!(project_data.status == STATUS_PENDING_VERIFICATION, errors::invalid_project_status());

        project_data.status = STATUS_DRAFT;

        event::emit(ProjectRejected {
            project_id: project_data.project_id,
            reason: string::utf8(reason),
        });
    }

    // ============ Investment ============

    /// Invest in a project
    public entry fun invest(
        platform: &mut PlatformConfig,
        project_data: &mut ProjectData,
        escrow: &mut EscrowVault,
        identity: &Identity,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);
        let amount = coin::value(&payment);

        // Validate identity
        assert!(identity::is_valid(identity, clock), errors::identity_not_verified());
        assert!(identity::owner(identity) == sender, errors::unauthorized());

        // Validate project state
        assert!(project_data.status == STATUS_ACTIVE, errors::project_not_active());
        assert!(current_time < project_data.funding_deadline, errors::funding_deadline_passed());
        assert!(escrow.project_id == project_data.project_id, errors::unauthorized());

        // Validate investment
        assert!(amount > 0, errors::invalid_investment_amount());

        // Add funds to escrow
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut escrow.balance, payment_balance);

        // Update project totals
        project_data.total_raised = project_data.total_raised + amount;
        platform.total_funds_raised = platform.total_funds_raised + amount;

        // Create investor position
        let position = InvestorPosition {
            id: object::new(ctx),
            investor: sender,
            project_id: project_data.project_id,
            project_data_id: object::id(project_data),
            amount_invested: amount,
            tokens_received: amount, // 1:1 ratio
            invested_at: current_time,
            refund_claimed: false,
        };

        // Create security token
        let token = SecurityToken {
            id: object::new(ctx),
            project_id: project_data.project_id,
            amount,
            original_investor: sender,
        };

        project_data.investor_count = project_data.investor_count + 1;

        event::emit(InvestmentReceived {
            project_id: project_data.project_id,
            investor: sender,
            amount,
            total_raised: project_data.total_raised,
        });

        // Check if funding goal reached
        if (project_data.total_raised >= project_data.funding_goal) {
            project_data.status = STATUS_FUNDED;
            event::emit(FundingGoalReached {
                project_id: project_data.project_id,
                total_raised: project_data.total_raised,
            });
        };

        transfer::transfer(position, sender);
        transfer::transfer(token, sender);
    }

    // ============ Milestone Completion ============

    /// Submit milestone completion
    public entry fun submit_milestone_completion(
        project_nft: &ProjectNFT,
        project_data: &mut ProjectData,
        milestone_index: u64,
        proof_hash: vector<u8>,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate ownership
        assert!(project_data.owner == sender, errors::not_project_owner());
        assert!(project_nft.project_id == project_data.project_id, errors::unauthorized());
        
        // Validate status
        assert!(
            project_data.status == STATUS_FUNDED || project_data.status == STATUS_IN_PROGRESS,
            errors::invalid_project_status()
        );
        assert!(!project_data.is_disputed, errors::project_disputed());

        // Validate milestone
        assert!(milestone_index < vector::length(&project_data.milestones), errors::invalid_milestone_index());

        // Check sequential completion
        if (milestone_index > 0) {
            let prev_milestone = vector::borrow(&project_data.milestones, milestone_index - 1);
            assert!(prev_milestone.completed, errors::previous_milestone_not_completed());
        };

        let milestone = vector::borrow_mut(&mut project_data.milestones, milestone_index);
        assert!(!milestone.completed, errors::milestone_already_completed());

        // Update milestone
        milestone.completed = true;
        milestone.completion_time = current_time;
        milestone.proof_hash = string::utf8(proof_hash);

        project_data.completed_milestones = project_data.completed_milestones + 1;

        // Update status if first milestone
        if (project_data.status == STATUS_FUNDED) {
            project_data.status = STATUS_IN_PROGRESS;
        };

        event::emit(MilestoneCompleted {
            project_id: project_data.project_id,
            milestone_index: (milestone_index as u8),
            proof_hash: string::utf8(proof_hash),
        });
    }

    /// Release funds for a completed milestone
    public entry fun release_milestone_funds(
        platform: &PlatformConfig,
        project_data: &mut ProjectData,
        escrow: &mut EscrowVault,
        milestone_index: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let current_time = clock::timestamp_ms(clock);

        // Validate milestone
        assert!(milestone_index < vector::length(&project_data.milestones), errors::invalid_milestone_index());
        
        let milestone = vector::borrow(&project_data.milestones, milestone_index);
        assert!(milestone.completed, errors::milestone_not_completed());
        assert!(!milestone.funds_released, errors::funds_already_released());
        assert!(!milestone.is_disputed, errors::milestone_disputed());

        // Check grace period
        assert!(
            current_time >= milestone.completion_time + RELEASE_GRACE_PERIOD_MS,
            errors::grace_period_not_passed()
        );

        let release_amount = milestone.release_amount;

        // Calculate fee
        let fee = (release_amount * platform.platform_fee_bps) / BASIS_POINTS_DIVISOR;
        let net_amount = release_amount - fee;

        // Extract funds from escrow
        let release_balance = balance::split(&mut escrow.balance, release_amount);
        let net_balance = balance::split(&mut release_balance, net_amount);
        
        // Transfer net amount to project owner
        let net_coin = coin::from_balance(net_balance, ctx);
        transfer::public_transfer(net_coin, project_data.owner);

        // Transfer fee to platform
        let fee_coin = coin::from_balance(release_balance, ctx);
        transfer::public_transfer(fee_coin, platform.fee_recipient);

        // Update escrow
        escrow.total_released = escrow.total_released + release_amount;

        // Update milestone
        let milestone_mut = vector::borrow_mut(&mut project_data.milestones, milestone_index);
        milestone_mut.funds_released = true;

        event::emit(FundsReleased {
            project_id: project_data.project_id,
            milestone_index: (milestone_index as u8),
            amount: net_amount,
            fee,
        });

        // Check if all milestones completed
        if (project_data.completed_milestones == (vector::length(&project_data.milestones) as u8)) {
            let all_released = true;
            let i = 0;
            while (i < vector::length(&project_data.milestones)) {
                let m = vector::borrow(&project_data.milestones, i);
                if (!m.funds_released) {
                    // Not using the result since we just want to check
                    let _ = all_released;
                };
                i = i + 1;
            };
            
            // Check if all funds released
            if (balance::value(&escrow.balance) == 0) {
                project_data.status = STATUS_COMPLETED;
            };
        };
    }

    // ============ Disputes ============

    /// Initiate a dispute
    public entry fun initiate_dispute(
        project_data: &mut ProjectData,
        investor_position: &InvestorPosition,
        milestone_index: u64,
        reason: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate investor
        assert!(investor_position.investor == sender, errors::not_an_investor());
        assert!(investor_position.project_id == project_data.project_id, errors::unauthorized());

        // Validate milestone
        assert!(milestone_index < vector::length(&project_data.milestones), errors::invalid_milestone_index());
        
        let milestone = vector::borrow(&project_data.milestones, milestone_index);
        assert!(milestone.completed, errors::milestone_not_completed());
        assert!(!milestone.funds_released, errors::funds_already_released());
        assert!(!milestone.is_disputed, errors::already_disputed());

        // Must be within grace period
        assert!(
            current_time < milestone.completion_time + RELEASE_GRACE_PERIOD_MS,
            errors::grace_period_passed()
        );

        // Update milestone
        let milestone_mut = vector::borrow_mut(&mut project_data.milestones, milestone_index);
        milestone_mut.is_disputed = true;

        project_data.is_disputed = true;
        project_data.status = STATUS_DISPUTED;

        // Create dispute record
        let dispute = Dispute {
            id: object::new(ctx),
            project_id: project_data.project_id,
            milestone_index: (milestone_index as u8),
            initiator: sender,
            reason: string::utf8(reason),
            created_at: current_time,
            resolved: false,
            in_favor_of_project: false,
        };

        let dispute_id = object::id(&dispute);

        event::emit(DisputeCreated {
            dispute_id,
            project_id: project_data.project_id,
            milestone_index: (milestone_index as u8),
            initiator: sender,
        });

        transfer::share_object(dispute);
    }

    /// Resolve a dispute (admin/arbitrator only)
    public entry fun resolve_dispute(
        platform: &PlatformConfig,
        project_data: &mut ProjectData,
        dispute: &mut Dispute,
        in_favor_of_project: bool,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Only admin can resolve
        assert!(sender == platform.admin, errors::unauthorized());
        assert!(!dispute.resolved, errors::dispute_already_resolved());
        assert!(dispute.project_id == project_data.project_id, errors::unauthorized());

        dispute.resolved = true;
        dispute.in_favor_of_project = in_favor_of_project;

        let milestone_index = (dispute.milestone_index as u64);
        let milestone = vector::borrow_mut(&mut project_data.milestones, milestone_index);
        milestone.is_disputed = false;

        project_data.is_disputed = false;

        if (in_favor_of_project) {
            // Reset completion time to allow immediate release
            milestone.completion_time = current_time - RELEASE_GRACE_PERIOD_MS;
            project_data.status = STATUS_IN_PROGRESS;
        } else {
            // Milestone needs to be redone
            milestone.completed = false;
            milestone.completion_time = 0;
            milestone.proof_hash = string::utf8(b"");
            project_data.completed_milestones = project_data.completed_milestones - 1;
            project_data.status = STATUS_IN_PROGRESS;
        };

        event::emit(DisputeResolved {
            dispute_id: object::id(dispute),
            in_favor_of_project,
        });
    }

    // ============ Refunds ============

    /// Enable refunds for a failed project
    public entry fun enable_refunds(
        platform: &PlatformConfig,
        project_data: &mut ProjectData,
        escrow: &mut EscrowVault,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Only admin can enable refunds
        assert!(sender == platform.admin, errors::unauthorized());
        
        // Validate status
        assert!(
            project_data.status == STATUS_ACTIVE || project_data.status == STATUS_DISPUTED,
            errors::invalid_project_status()
        );

        // Deadline must have passed and goal not reached
        assert!(current_time > project_data.funding_deadline, errors::funding_deadline_not_passed());
        assert!(project_data.total_raised < project_data.funding_goal, errors::funding_goal_already_reached());

        escrow.refunds_enabled = true;
        project_data.status = STATUS_CANCELLED;

        event::emit(RefundsEnabled {
            project_id: project_data.project_id,
        });
    }

    /// Claim refund
    public entry fun claim_refund(
        project_data: &ProjectData,
        escrow: &mut EscrowVault,
        investor_position: InvestorPosition,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);

        // Validate
        assert!(escrow.refunds_enabled, errors::refunds_not_enabled());
        assert!(investor_position.investor == sender, errors::not_an_investor());
        assert!(investor_position.project_id == project_data.project_id, errors::unauthorized());
        assert!(!investor_position.refund_claimed, errors::refund_already_claimed());

        let refund_amount = investor_position.amount_invested;

        // Extract refund from escrow
        let refund_balance = balance::split(&mut escrow.balance, refund_amount);
        let refund_coin = coin::from_balance(refund_balance, ctx);

        event::emit(RefundClaimed {
            project_id: project_data.project_id,
            investor: sender,
            amount: refund_amount,
        });

        // Delete investor position and transfer refund
        let InvestorPosition {
            id,
            investor: _,
            project_id: _,
            project_data_id: _,
            amount_invested: _,
            tokens_received: _,
            invested_at: _,
            refund_claimed: _,
        } = investor_position;
        object::delete(id);

        transfer::public_transfer(refund_coin, sender);
    }

    // ============ Security Token Transfer ============

    /// Transfer security token (with compliance check)
    public entry fun transfer_security_token(
        sender_identity: &Identity,
        recipient_identity: &Identity,
        token: SecurityToken,
        clock: &Clock,
        ctx: &TxContext,
    ) {
        let sender = tx_context::sender(ctx);

        // Validate sender identity
        assert!(identity::is_valid(sender_identity, clock), errors::identity_not_verified());
        assert!(identity::owner(sender_identity) == sender, errors::unauthorized());

        // Validate recipient identity
        assert!(identity::is_valid(recipient_identity, clock), errors::identity_not_verified());

        let recipient = identity::owner(recipient_identity);

        // Transfer token
        transfer::transfer(token, recipient);
    }

    // ============ View Functions ============

    public fun project_id(project: &ProjectData): u64 {
        project.project_id
    }

    public fun project_owner(project: &ProjectData): address {
        project.owner
    }

    public fun project_status(project: &ProjectData): u8 {
        project.status
    }

    public fun funding_goal(project: &ProjectData): u64 {
        project.funding_goal
    }

    public fun total_raised(project: &ProjectData): u64 {
        project.total_raised
    }

    public fun funding_deadline(project: &ProjectData): u64 {
        project.funding_deadline
    }

    public fun milestone_count(project: &ProjectData): u64 {
        vector::length(&project.milestones)
    }

    public fun escrow_balance(escrow: &EscrowVault): u64 {
        balance::value(&escrow.balance)
    }

    public fun token_amount(token: &SecurityToken): u64 {
        token.amount
    }

    public fun investor_amount(position: &InvestorPosition): u64 {
        position.amount_invested
    }

    // ============ Test Only ============

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }
}