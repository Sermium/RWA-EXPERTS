// sources/identity.move
module rwa_launchpad::identity {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::clock::{Self, Clock};
    use sui::event;
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use std::vector;
    
    use rwa_launchpad::errors;

    // ============ Constants ============

    const INVESTOR_RETAIL: u8 = 1;
    const INVESTOR_ACCREDITED: u8 = 2;
    const INVESTOR_QUALIFIED: u8 = 3;
    const INVESTOR_INSTITUTIONAL: u8 = 4;
    const INVESTOR_PROFESSIONAL: u8 = 5;

    // ============ Structs ============

    /// Platform admin capability
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Verifier capability - allows registering identities
    public struct VerifierCap has key, store {
        id: UID,
        name: String,
    }

    /// Identity Registry - shared object storing all identities
    public struct IdentityRegistry has key {
        id: UID,
        /// Total verified identities
        total_verified: u64,
        /// Verified count by country
        verified_by_country: Table<u16, u64>,
        /// Admin address
        admin: address,
    }

    /// Identity object owned by the user
    public struct Identity has key, store {
        id: UID,
        /// Owner address
        owner: address,
        /// Is verified
        verified: bool,
        /// ISO 3166-1 numeric country code
        country: u16,
        /// Investor category (1-5)
        investor_category: u8,
        /// Verification timestamp (ms)
        verification_date: u64,
        /// Expiration timestamp (ms)
        expiration_date: u64,
        /// Hash of identity documents
        identity_hash: vector<u8>,
        /// KYC provider address
        kyc_provider: address,
    }

    /// Claim attached to an identity
    public struct IdentityClaim has key, store {
        id: UID,
        /// Identity this claim belongs to
        identity_id: ID,
        /// Claim topic
        topic: u64,
        /// Claim data
        data: vector<u8>,
        /// Issuer
        issuer: address,
        /// Issued at timestamp
        issued_at: u64,
    }

    // ============ Events ============

    public struct IdentityRegistered has copy, drop {
        identity_id: ID,
        user: address,
        country: u16,
        investor_category: u8,
        expiration_date: u64,
    }

    public struct IdentityUpdated has copy, drop {
        identity_id: ID,
        user: address,
        new_category: u8,
    }

    public struct IdentityRevoked has copy, drop {
        identity_id: ID,
        user: address,
    }

    public struct ClaimAdded has copy, drop {
        claim_id: ID,
        identity_id: ID,
        topic: u64,
        issuer: address,
    }

    // ============ Init ============

    fun init(ctx: &mut TxContext) {
        // Create admin cap and transfer to deployer
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));

        // Create and share the identity registry
        let registry = IdentityRegistry {
            id: object::new(ctx),
            total_verified: 0,
            verified_by_country: table::new(ctx),
            admin: tx_context::sender(ctx),
        };
        transfer::share_object(registry);
    }

    // ============ Admin Functions ============

    /// Create a new verifier capability
    public entry fun create_verifier(
        _admin_cap: &AdminCap,
        name: vector<u8>,
        recipient: address,
        ctx: &mut TxContext,
    ) {
        let verifier_cap = VerifierCap {
            id: object::new(ctx),
            name: string::utf8(name),
        };
        transfer::transfer(verifier_cap, recipient);
    }

    // ============ Identity Management ============

    /// Register a new identity for a user
    public entry fun register_identity(
        _verifier_cap: &VerifierCap,
        registry: &mut IdentityRegistry,
        user: address,
        country: u16,
        investor_category: u8,
        expiration_date: u64,
        identity_hash: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let current_time = clock::timestamp_ms(clock);
        
        // Validate inputs
        assert!(expiration_date > current_time, errors::invalid_deadline());
        assert!(
            investor_category >= INVESTOR_RETAIL && investor_category <= INVESTOR_PROFESSIONAL,
            errors::invalid_investor_category()
        );

        // Create identity object
        let identity = Identity {
            id: object::new(ctx),
            owner: user,
            verified: true,
            country,
            investor_category,
            verification_date: current_time,
            expiration_date,
            identity_hash,
            kyc_provider: tx_context::sender(ctx),
        };

        let identity_id = object::id(&identity);

        // Update registry stats
        registry.total_verified = registry.total_verified + 1;
        if (table::contains(&registry.verified_by_country, country)) {
            let count = table::borrow_mut(&mut registry.verified_by_country, country);
            *count = *count + 1;
        } else {
            table::add(&mut registry.verified_by_country, country, 1);
        };

        // Emit event
        event::emit(IdentityRegistered {
            identity_id,
            user,
            country,
            investor_category,
            expiration_date,
        });

        // Transfer identity to user
        transfer::transfer(identity, user);
    }

    /// Update an existing identity
    public entry fun update_identity(
        _verifier_cap: &VerifierCap,
        identity: &mut Identity,
        country: u16,
        investor_category: u8,
        expiration_date: u64,
        clock: &Clock,
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(expiration_date > current_time, errors::invalid_deadline());
        assert!(
            investor_category >= INVESTOR_RETAIL && investor_category <= INVESTOR_PROFESSIONAL,
            errors::invalid_investor_category()
        );

        identity.country = country;
        identity.investor_category = investor_category;
        identity.expiration_date = expiration_date;

        event::emit(IdentityUpdated {
            identity_id: object::id(identity),
            user: identity.owner,
            new_category: investor_category,
        });
    }

    /// Renew identity expiration
    public entry fun renew_identity(
        _verifier_cap: &VerifierCap,
        identity: &mut Identity,
        new_expiration_date: u64,
        clock: &Clock,
    ) {
        let current_time = clock::timestamp_ms(clock);
        assert!(new_expiration_date > current_time, errors::invalid_deadline());

        identity.expiration_date = new_expiration_date;
        identity.verification_date = current_time;
    }

    /// Revoke an identity (verifier burns it)
    public entry fun revoke_identity(
        _verifier_cap: &VerifierCap,
        registry: &mut IdentityRegistry,
        identity: Identity,
    ) {
        let Identity {
            id,
            owner,
            verified: _,
            country,
            investor_category: _,
            verification_date: _,
            expiration_date: _,
            identity_hash: _,
            kyc_provider: _,
        } = identity;

        // Update registry stats
        registry.total_verified = registry.total_verified - 1;
        let count = table::borrow_mut(&mut registry.verified_by_country, country);
        *count = *count - 1;

        event::emit(IdentityRevoked {
            identity_id: object::uid_to_inner(&id),
            user: owner,
        });

        object::delete(id);
    }

    // ============ Claims ============

    /// Add a claim to an identity
    public entry fun add_claim(
        _verifier_cap: &VerifierCap,
        identity: &Identity,
        topic: u64,
        data: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext,
    ) {
        let claim = IdentityClaim {
            id: object::new(ctx),
            identity_id: object::id(identity),
            topic,
            data,
            issuer: tx_context::sender(ctx),
            issued_at: clock::timestamp_ms(clock),
        };

        let claim_id = object::id(&claim);

        event::emit(ClaimAdded {
            claim_id,
            identity_id: object::id(identity),
            topic,
            issuer: tx_context::sender(ctx),
        });

        // Transfer claim to identity owner
        transfer::transfer(claim, identity.owner);
    }

    // ============ View Functions ============

    /// Check if identity is valid (verified and not expired)
    public fun is_valid(identity: &Identity, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        identity.verified && identity.expiration_date > current_time
    }

    /// Get identity owner
    public fun owner(identity: &Identity): address {
        identity.owner
    }

    /// Get identity country
    public fun country(identity: &Identity): u16 {
        identity.country
    }

    /// Get investor category
    public fun investor_category(identity: &Identity): u8 {
        identity.investor_category
    }

    /// Get expiration date
    public fun expiration_date(identity: &Identity): u64 {
        identity.expiration_date
    }

    /// Get verification date
    public fun verification_date(identity: &Identity): u64 {
        identity.verification_date
    }

    /// Check if identity is expiring soon (within 30 days)
    public fun is_expiring_soon(identity: &Identity, clock: &Clock): bool {
        let current_time = clock::timestamp_ms(clock);
        let thirty_days_ms = 30 * 24 * 60 * 60 * 1000;
        identity.verified && 
            identity.expiration_date > current_time &&
            identity.expiration_date < current_time + thirty_days_ms
    }

    /// Get registry total verified
    public fun total_verified(registry: &IdentityRegistry): u64 {
        registry.total_verified
    }

    // ============ Test Only ============

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx)
    }
}