// sources/dividend.move
module rwa_launchpad::dividend {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::balance::{Self, Balance};
    use sui::table::{Self, Table};

    use rwa_launchpad::errors;
    use rwa_launchpad::project::{Self, ProjectData, SecurityToken};

    // ============ Constants ============

    const DIVIDEND_EXPIRATION_MS: u64 = 365 * 24 * 60 * 60 * 1000; // 1 year

    // ============ Structs ============

    /// Dividend distribution for a project
    public struct DividendDistribution has key {
        id: UID,
        /// Project ID
        project_id: u64,
        /// Distribution round
        round: u64,
        /// Total amount to distribute
        total_amount: u64,
        /// Amount claimed so far
        claimed_amount: u64,
        /// Total token supply at snapshot
        total_supply_at_snapshot: u64,
        /// Created at timestamp
        created_at: u64,
        /// Expires at timestamp
        expires_at: u64,
        /// Is active
        active: bool,
        /// Balance holding dividend funds
        balance: Balance<SUI>,
        /// Claims tracking
        claims: Table<address, bool>,
    }

    /// Dividend claim receipt
    public struct DividendClaimReceipt has key, store {
        id: UID,
        /// Distribution ID
        distribution_id: ID,
        /// Claimer
        claimer: address,
        /// Amount claimed
        amount: u64,
        /// Claimed at
        claimed_at: u64,
    }

    /// Dividend manager capability
    public struct DividendManagerCap has key, store {
        id: UID,
        /// Project ID this manager is for
        project_id: u64,
    }

    // ============ Events ============

    public struct DividendDistributionCreated has copy, drop {
        distribution_id: ID,
        project_id: u64,
        round: u64,
        total_amount: u64,
        expires_at: u64,
    }

    public struct DividendClaimed has copy, drop {
        distribution_id: ID,
        claimer: address,
        amount: u64,
        round: u64,
    }

    public struct DividendExpired has copy, drop {
        distribution_id: ID,
        unclaimed_amount: u64,
    }

    // ============ Manager Creation ============

    /// Create dividend manager for a project (project owner only)
    public entry fun create_dividend_manager(
        project: &ProjectData,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        assert!(project::project_owner(project) == sender, errors::not_project_owner());

        let manager = DividendManagerCap {
            id: object::new(ctx),
            project_id: project::project_id(project),
        };

        transfer::transfer(manager, sender);
    }

    // ============ Distribution Management ============

    /// Create a new dividend distribution
    public entry fun create_distribution(
        manager: &DividendManagerCap,
        project: &ProjectData,
        payment: Coin<SUI>,
        total_supply: u64,
        round: u64,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let current_time = clock::timestamp_ms(clock);
        let amount = coin::value(&payment);

        // Validate
        assert!(manager.project_id == project::project_id(project), errors::unauthorized());
        assert!(amount > 0, errors::invalid_investment_amount());
        assert!(total_supply > 0, errors::invalid_investment_amount());

        let distribution = DividendDistribution {
            id: object::new(ctx),
            project_id: project::project_id(project),
            round,
            total_amount: amount,
            claimed_amount: 0,
            total_supply_at_snapshot: total_supply,
            created_at: current_time,
            expires_at: current_time + DIVIDEND_EXPIRATION_MS,
            active: true,
            balance: coin::into_balance(payment),
            claims: table::new(ctx),
        };

        let distribution_id = object::id(&distribution);

        event::emit(DividendDistributionCreated {
            distribution_id,
            project_id: project::project_id(project),
            round,
            total_amount: amount,
            expires_at: current_time + DIVIDEND_EXPIRATION_MS,
        });

        transfer::share_object(distribution);
    }

    // ============ Claiming ============

    /// Claim dividend using security token
    public entry fun claim_dividend(
        distribution: &mut DividendDistribution,
        token: &SecurityToken,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);
        let current_time = clock::timestamp_ms(clock);

        // Validate distribution
        assert!(distribution.active, errors::dividend_not_active());
        assert!(current_time < distribution.expires_at, errors::dividend_expired());
        assert!(distribution.project_id == project::token_project_id(token), errors::unauthorized());

        // Check not already claimed
        assert!(!table::contains(&distribution.claims, sender), errors::already_claimed());

        let token_amount = project::token_amount(token);
        assert!(token_amount > 0, errors::no_balance_at_snapshot());

        // Calculate dividend amount
        let dividend_amount = (token_amount * distribution.total_amount) / distribution.total_supply_at_snapshot;
        assert!(dividend_amount > 0, errors::no_balance_at_snapshot());

        // Mark as claimed
        table::add(&mut distribution.claims, sender, true);
        distribution.claimed_amount = distribution.claimed_amount + dividend_amount;

        // Extract dividend
        let dividend_balance = balance::split(&mut distribution.balance, dividend_amount);
        let dividend_coin = coin::from_balance(dividend_balance, ctx);

        // Create receipt
        let receipt = DividendClaimReceipt {
            id: object::new(ctx),
            distribution_id: object::id(distribution),
            claimer: sender,
            amount: dividend_amount,
            claimed_at: current_time,
        };

        event::emit(DividendClaimed {
            distribution_id: object::id(distribution),
            claimer: sender,
            amount: dividend_amount,
            round: distribution.round,
        });

        transfer::transfer(receipt, sender);
        transfer::public_transfer(dividend_coin, sender);
    }

    /// Reclaim expired unclaimed dividends
    public entry fun reclaim_expired(
        manager: &DividendManagerCap,
        distribution: &mut DividendDistribution,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let current_time = clock::timestamp_ms(clock);

        assert!(manager.project_id == distribution.project_id, errors::unauthorized());
        assert!(distribution.active, errors::dividend_not_active());
        assert!(current_time >= distribution.expires_at, errors::grace_period_not_passed());

        let unclaimed = balance::value(&distribution.balance);
        distribution.active = false;

        event::emit(DividendExpired {
            distribution_id: object::id(distribution),
            unclaimed_amount: unclaimed,
        });

        if (unclaimed > 0) {
            let unclaimed_balance = balance::withdraw_all(&mut distribution.balance);
            let unclaimed_coin = coin::from_balance(unclaimed_balance, ctx);
            transfer::public_transfer(unclaimed_coin, tx_context::sender(ctx));
        };
    }

    // ============ View Functions ============

    public fun distribution_total_amount(dist: &DividendDistribution): u64 {
        dist.total_amount
    }

    public fun distribution_claimed_amount(dist: &DividendDistribution): u64 {
        dist.claimed_amount
    }

    public fun distribution_is_active(dist: &DividendDistribution): bool {
        dist.active
    }

    public fun distribution_expires_at(dist: &DividendDistribution): u64 {
        dist.expires_at
    }

    public fun has_claimed(dist: &DividendDistribution, addr: address): bool {
        table::contains(&dist.claims, addr)
    }

    /// Calculate claimable amount for a token holder
    public fun calculate_claimable(
        distribution: &DividendDistribution,
        token_amount: u64,
    ): u64 {
        if (!distribution.active) {
            return 0
        };
        (token_amount * distribution.total_amount) / distribution.total_supply_at_snapshot
    }
}

// Helper in project module to expose token project_id
module rwa_launchpad::project {
    // Add this function to the project module
    public fun token_project_id(token: &SecurityToken): u64 {
        token.project_id
    }
}