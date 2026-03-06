// sources/compliance.move
module rwa_launchpad::compliance {
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::table::{Self, Table};
    use sui::event;

    use rwa_launchpad::errors;
    use rwa_launchpad::identity::{Self, Identity};

    // ============ Structs ============

    /// Compliance configuration for a project
    public struct ComplianceConfig has key {
        id: UID,
        /// Project ID
        project_id: u64,
        /// Admin
        admin: address,
        /// Restricted countries
        restricted_countries: Table<u16, bool>,
        /// Max balance per category
        max_balance_by_category: Table<u8, u64>,
        /// Global max balance (0 = no limit)
        global_max_balance: u64,
        /// Minimum investment
        min_investment: u64,
        /// Requires accreditation
        requires_accreditation: bool,
        /// Lockup period in ms
        lockup_period_ms: u64,
    }

    /// Lockup record for an investor
    public struct LockupRecord has key, store {
        id: UID,
        /// Investor address
        investor: address,
        /// Project ID
        project_id: u64,
        /// Locked amount
        locked_amount: u64,
        /// Lockup end timestamp
        lockup_end: u64,
    }

    // ============ Events ============

    public struct ComplianceConfigCreated has copy, drop {
        project_id: u64,
        admin: address,
    }

    public struct CountryRestricted has copy, drop {
        project_id: u64,
        country: u16,
        restricted: bool,
    }

    public struct MaxBalanceSet has copy, drop {
        project_id: u64,
        category: u8,
        max_balance: u64,
    }

    // ============ Creation ============

    /// Create compliance config for a project
    public entry fun create_compliance_config(
        project_id: u64,
        min_investment: u64,
        requires_accreditation: bool,
        lockup_period_ms: u64,
        ctx: &mut TxContext,
    ) {
        let sender = tx_context::sender(ctx);

        let config = ComplianceConfig {
            id: object::new(ctx),
            project_id,
            admin: sender,
            restricted_countries: table::new(ctx),
            max_balance_by_category: table::new(ctx),
            global_max_balance: 0,
            min_investment,
            requires_accreditation,
            lockup_period_ms,
        };

        event::emit(ComplianceConfigCreated {
            project_id,
            admin: sender,
        });

        transfer::share_object(config);
    }

    // ============ Configuration ============

    /// Set country restriction
    public entry fun set_country_restriction(
        config: &mut ComplianceConfig,
        country: u16,
        restricted: bool,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == config.admin, errors::unauthorized());

        if (table::contains(&config.restricted_countries, country)) {
            let value = table::borrow_mut(&mut config.restricted_countries, country);
            *value = restricted;
        } else {
            table::add(&mut config.restricted_countries, country, restricted);
        };

        event::emit(CountryRestricted {
            project_id: config.project_id,
            country,
            restricted,
        });
    }

    /// Batch set country restrictions
    public entry fun batch_set_country_restrictions(
        config: &mut ComplianceConfig,
        countries: vector<u16>,
        restricted: bool,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == config.admin, errors::unauthorized());

        let i = 0;
        let len = std::vector::length(&countries);
        while (i < len) {
            let country = *std::vector::borrow(&countries, i);
            if (table::contains(&config.restricted_countries, country)) {
                let value = table::borrow_mut(&mut config.restricted_countries, country);
                *value = restricted;
            } else {
                table::add(&mut config.restricted_countries, country, restricted);
            };
            i = i + 1;
        };
    }

    /// Set max balance for investor category
    public entry fun set_max_balance(
        config: &mut ComplianceConfig,
        category: u8,
        max_balance: u64,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == config.admin, errors::unauthorized());

        if (table::contains(&config.max_balance_by_category, category)) {
            let value = table::borrow_mut(&mut config.max_balance_by_category, category);
            *value = max_balance;
        } else {
            table::add(&mut config.max_balance_by_category, category, max_balance);
        };

        event::emit(MaxBalanceSet {
            project_id: config.project_id,
            category,
            max_balance,
        });
    }

    /// Set global max balance
    public entry fun set_global_max_balance(
        config: &mut ComplianceConfig,
        max_balance: u64,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == config.admin, errors::unauthorized());
        config.global_max_balance = max_balance;
    }

    /// Set minimum investment
    public entry fun set_min_investment(
        config: &mut ComplianceConfig,
        min_investment: u64,
        ctx: &TxContext,
    ) {
        assert!(tx_context::sender(ctx) == config.admin, errors::unauthorized());
        config.min_investment = min_investment;
    }

    // ============ Compliance Checks ============

    /// Check if a transfer is compliant
    public fun can_transfer(
        config: &ComplianceConfig,
        recipient_identity: &Identity,
        amount: u64,
        recipient_current_balance: u64,
        clock: &sui::clock::Clock,
    ): bool {
        // Check identity is valid
        if (!identity::is_valid(recipient_identity, clock)) {
            return false
        };

        // Check country restriction
        let country = identity::country(recipient_identity);
        if (table::contains(&config.restricted_countries, country)) {
            let restricted = *table::borrow(&config.restricted_countries, country);
            if (restricted) {
                return false
            };
        };

        // Check accreditation requirement
        if (config.requires_accreditation) {
            let category = identity::investor_category(recipient_identity);
            if (category < 2) { // Less than accredited
                return false
            };
        };

        // Check minimum investment
        if (amount < config.min_investment) {
            return false
        };

        let new_balance = recipient_current_balance + amount;

        // Check global max balance
        if (config.global_max_balance > 0 && new_balance > config.global_max_balance) {
            return false
        };

        // Check category max balance
        let category = identity::investor_category(recipient_identity);
        if (table::contains(&config.max_balance_by_category, category)) {
            let max = *table::borrow(&config.max_balance_by_category, category);
            if (max > 0 && new_balance > max) {
                return false
            };
        };

        true
    }

    /// Check if investment is compliant
    public fun can_invest(
        config: &ComplianceConfig,
        investor_identity: &Identity,
        amount: u64,
        clock: &sui::clock::Clock,
    ): bool {
        // Check identity is valid
        if (!identity::is_valid(investor_identity, clock)) {
            return false
        };

        // Check country restriction
        let country = identity::country(investor_identity);
        if (table::contains(&config.restricted_countries, country)) {
            let restricted = *table::borrow(&config.restricted_countries, country);
            if (restricted) {
                return false
            };
        };

        // Check accreditation requirement
        if (config.requires_accreditation) {
            let category = identity::investor_category(investor_identity);
            if (category < 2) {
                return false
            };
        };

        // Check minimum investment
        if (amount < config.min_investment) {
            return false
        };

        true
    }

    // ============ Lockup Management ============

    /// Create lockup record for an investor
    public entry fun create_lockup(
        config: &ComplianceConfig,
        investor: address,
        locked_amount: u64,
        lockup_end: u64,
        ctx: &mut TxContext,
    ) {
        assert!(tx_context::sender(ctx) == config.admin, errors::unauthorized());

        let record = LockupRecord {
            id: object::new(ctx),
            investor,
            project_id: config.project_id,
            locked_amount,
            lockup_end,
        };

        transfer::transfer(record, investor);
    }

    /// Check if tokens are locked
    public fun is_locked(
        record: &LockupRecord,
        clock: &sui::clock::Clock,
    ): bool {
        let current_time = sui::clock::timestamp_ms(clock);
        current_time < record.lockup_end
    }

    /// Get unlocked amount
    public fun unlocked_amount(
        record: &LockupRecord,
        total_balance: u64,
        clock: &sui::clock::Clock,
    ): u64 {
        if (is_locked(record, clock)) {
            if (total_balance > record.locked_amount) {
                total_balance - record.locked_amount
            } else {
                0
            }
        } else {
            total_balance
        }
    }

    // ============ View Functions ============

    public fun is_country_restricted(config: &ComplianceConfig, country: u16): bool {
        if (table::contains(&config.restricted_countries, country)) {
            *table::borrow(&config.restricted_countries, country)
        } else {
            false
        }
    }

    public fun get_min_investment(config: &ComplianceConfig): u64 {
        config.min_investment
    }

    public fun get_global_max_balance(config: &ComplianceConfig): u64 {
        config.global_max_balance
    }

    public fun get_lockup_period(config: &ComplianceConfig): u64 {
        config.lockup_period_ms
    }
}