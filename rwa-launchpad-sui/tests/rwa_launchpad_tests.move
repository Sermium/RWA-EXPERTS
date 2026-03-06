// tests/rwa_launchpad_tests.move
#[test_only]
module rwa_launchpad::rwa_launchpad_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use std::string;

    use rwa_launchpad::identity::{Self, Identity, IdentityRegistry, AdminCap, VerifierCap};
    use rwa_launchpad::project::{Self, PlatformConfig, ProjectData, ProjectNFT, EscrowVault, InvestorPosition, SecurityToken};

    // Test addresses
    const ADMIN: address = @0xAD;
    const VERIFIER: address = @0xVE;
    const PROJECT_OWNER: address = @0xPO;
    const INVESTOR1: address = @0xI1;
    const INVESTOR2: address = @0xI2;

    // Test constants
    const FUNDING_GOAL: u64 = 10_000_000_000; // 10 SUI
    const ONE_DAY_MS: u64 = 24 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS: u64 = 30 * ONE_DAY_MS;

    // ============ Helper Functions ============

    fun setup_platform(scenario: &mut Scenario) {
        // Initialize identity module
        ts::next_tx(scenario, ADMIN);
        {
            identity::init_for_testing(ts::ctx(scenario));
        };

        // Initialize project module
        ts::next_tx(scenario, ADMIN);
        {
            project::init_for_testing(ts::ctx(scenario));
        };
    }

    fun create_test_clock(scenario: &mut Scenario): Clock {
        ts::next_tx(scenario, ADMIN);
        clock::create_for_testing(ts::ctx(scenario))
    }

    fun advance_clock(clock: &mut Clock, ms: u64) {
        clock::increment_for_testing(clock, ms);
    }

    // ============ Identity Tests ============

    #[test]
    fun test_register_identity() {
        let mut scenario = ts::begin(ADMIN);
        setup_platform(&mut scenario);

        // Create verifier
        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(&scenario);
            identity::create_verifier(
                &admin_cap,
                b"Test Verifier",
                VERIFIER,
                ts::ctx(&mut scenario)
            );
            ts::return_to_sender(&scenario, admin_cap);
        };

        // Register identity
        ts::next_tx(&mut scenario, VERIFIER);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut registry = ts::take_shared<IdentityRegistry>(&scenario);
            let clock = create_test_clock(&mut scenario);
            
            let expiration = clock::timestamp_ms(&clock) + 365 * ONE_DAY_MS;
            
            identity::register_identity(
                &verifier_cap,
                &mut registry,
                PROJECT_OWNER,
                840, // US
                2,   // Accredited
                expiration,
                b"test-identity-hash",
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(identity::total_verified(&registry) == 1, 0);

            ts::return_to_sender(&scenario, verifier_cap);
            ts::return_shared(registry);
            clock::destroy_for_testing(clock);
        };

        // Verify identity was created
        ts::next_tx(&mut scenario, PROJECT_OWNER);
        {
            let identity = ts::take_from_sender<Identity>(&scenario);
            assert!(identity::country(&identity) == 840, 1);
            assert!(identity::investor_category(&identity) == 2, 2);
            ts::return_to_sender(&scenario, identity);
        };

        ts::end(scenario);
    }

    // ============ Project Tests ============

    #[test]
    fun test_create_project() {
        let mut scenario = ts::begin(ADMIN);
        setup_platform(&mut scenario);

        // Setup identities
        let mut clock = create_test_clock(&mut scenario);
        setup_identities(&mut scenario, &clock);

        // Create project
        ts::next_tx(&mut scenario, PROJECT_OWNER);
        {
            let mut platform = ts::take_shared<PlatformConfig>(&scenario);
            let identity = ts::take_from_sender<Identity>(&scenario);
            
            let funding_deadline = clock::timestamp_ms(&clock) + THIRTY_DAYS_MS;

            project::create_project(
                &mut platform,
                &identity,
                b"Test Solar Farm",
                b"QmDescriptionHash",
                FUNDING_GOAL,
                funding_deadline,
                b"QmLegalHash",
                b"US-NV",
                b"ipfs://metadata",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(platform);
            ts::return_to_sender(&scenario, identity);
        };

        // Verify project was created
        ts::next_tx(&mut scenario, PROJECT_OWNER);
        {
            let project_nft = ts::take_from_sender<ProjectNFT>(&scenario);
            let project_data = ts::take_shared<ProjectData>(&scenario);

            assert!(project::project_id(&project_data) == 0, 0);
            assert!(project::project_owner(&project_data) == PROJECT_OWNER, 1);
            assert!(project::funding_goal(&project_data) == FUNDING_GOAL, 2);
            assert!(project::project_status(&project_data) == 0, 3); // Draft

            ts::return_to_sender(&scenario, project_nft);
            ts::return_shared(project_data);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_add_milestones() {
        let mut scenario = ts::begin(ADMIN);
        setup_platform(&mut scenario);

        let mut clock = create_test_clock(&mut scenario);
        setup_identities(&mut scenario, &clock);
        create_test_project(&mut scenario, &clock);

        // Add milestones
        ts::next_tx(&mut scenario, PROJECT_OWNER);
        {
            let project_nft = ts::take_from_sender<ProjectNFT>(&scenario);
            let mut project_data = ts::take_shared<ProjectData>(&scenario);

            let funding_deadline = project::funding_deadline(&project_data);

            // Add 4 milestones
            let descriptions = vector[
                b"Milestone 1",
                b"Milestone 2",
                b"Milestone 3",
                b"Milestone 4"
            ];
            let amounts = vector[
                FUNDING_GOAL / 4,
                FUNDING_GOAL / 4,
                FUNDING_GOAL / 4,
                FUNDING_GOAL / 4
            ];
            let deadlines = vector[
                funding_deadline + 30 * ONE_DAY_MS,
                funding_deadline + 60 * ONE_DAY_MS,
                funding_deadline + 90 * ONE_DAY_MS,
                funding_deadline + 120 * ONE_DAY_MS
            ];

            project::add_milestones_batch(
                &project_nft,
                &mut project_data,
                descriptions,
                amounts,
                deadlines,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(project::milestone_count(&project_data) == 4, 0);

            ts::return_to_sender(&scenario, project_nft);
            ts::return_shared(project_data);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_verify_project() {
        let mut scenario = ts::begin(ADMIN);
        setup_platform(&mut scenario);

        let mut clock = create_test_clock(&mut scenario);
        setup_identities(&mut scenario, &clock);
        create_test_project(&mut scenario, &clock);
        add_test_milestones(&mut scenario, &clock);

        // Submit for verification
        ts::next_tx(&mut scenario, PROJECT_OWNER);
        {
            let project_nft = ts::take_from_sender<ProjectNFT>(&scenario);
            let mut project_data = ts::take_shared<ProjectData>(&scenario);

            project::submit_for_verification(
                &project_nft,
                &mut project_data,
                ts::ctx(&mut scenario)
            );

            assert!(project::project_status(&project_data) == 1, 0); // PendingVerification

            ts::return_to_sender(&scenario, project_nft);
            ts::return_shared(project_data);
        };

        // Verify project
        ts::next_tx(&mut scenario, VERIFIER);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(&scenario);
            let mut project_data = ts::take_shared<ProjectData>(&scenario);

            project::verify_project(
                &verifier_cap,
                &mut project_data,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(project::project_status(&project_data) == 2, 1); // Active

            ts::return_to_sender(&scenario, verifier_cap);
            ts::return_shared(project_data);
        };

        // Check escrow was created
        ts::next_tx(&mut scenario, ADMIN);
        {
            let escrow = ts::take_shared<EscrowVault>(&scenario);
            assert!(project::escrow_balance(&escrow) == 0, 2);
            ts::return_shared(escrow);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_invest() {
        let mut scenario = ts::begin(ADMIN);
        setup_platform(&mut scenario);

        let mut clock = create_test_clock(&mut scenario);
        setup_identities(&mut scenario, &clock);
        create_test_project(&mut scenario, &clock);
        add_test_milestones(&mut scenario, &clock);
        verify_test_project(&mut scenario, &clock);

        // Invest
        ts::next_tx(&mut scenario, INVESTOR1);
        {
            let mut platform = ts::take_shared<PlatformConfig>(&scenario);
            let mut project_data = ts::take_shared<ProjectData>(&scenario);
            let mut escrow = ts::take_shared<EscrowVault>(&scenario);
            let identity = ts::take_from_sender<Identity>(&scenario);

            let investment = coin::mint_for_testing<SUI>(2_000_000_000, ts::ctx(&mut scenario)); // 2 SUI

            project::invest(
                &mut platform,
                &mut project_data,
                &mut escrow,
                &identity,
                investment,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(project::total_raised(&project_data) == 2_000_000_000, 0);
            assert!(project::escrow_balance(&escrow) == 2_000_000_000, 1);

            ts::return_shared(platform);
            ts::return_shared(project_data);
            ts::return_shared(escrow);
            ts::return_to_sender(&scenario, identity);
        };

        // Check investor position
        ts::next_tx(&mut scenario, INVESTOR1);
        {
            let position = ts::take_from_sender<InvestorPosition>(&scenario);
            assert!(project::investor_amount(&position) == 2_000_000_000, 2);
            ts::return_to_sender(&scenario, position);

            let token = ts::take_from_sender<SecurityToken>(&scenario);
            assert!(project::token_amount(&token) == 2_000_000_000, 3);
            ts::return_to_sender(&scenario, token);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_full_funding_and_milestone_release() {
        let mut scenario = ts::begin(ADMIN);
        setup_platform(&mut scenario);

        let mut clock = create_test_clock(&mut scenario);
        setup_identities(&mut scenario, &clock);
        create_test_project(&mut scenario, &clock);
        add_test_milestones(&mut scenario, &clock);
        verify_test_project(&mut scenario, &clock);

        // Fully fund project
        ts::next_tx(&mut scenario, INVESTOR1);
        {
            let mut platform = ts::take_shared<PlatformConfig>(&scenario);
            let mut project_data = ts::take_shared<ProjectData>(&scenario);
            let mut escrow = ts::take_shared<EscrowVault>(&scenario);
            let identity = ts::take_from_sender<Identity>(&scenario);

            let investment = coin::mint_for_testing<SUI>(FUNDING_GOAL, ts::ctx(&mut scenario));

            project::invest(
                &mut platform,
                &mut project_data,
                &mut escrow,
                &identity,
                investment,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(project::project_status(&project_data) == 3, 0); // Funded

            ts::return_shared(platform);
            ts::return_shared(project_data);
            ts::return_shared(escrow);
            ts::return_to_sender(&scenario, identity);
        };

        // Submit milestone completion
        ts::next_tx(&mut scenario, PROJECT_OWNER);
        {
            let project_nft = ts::take_from_sender<ProjectNFT>(&scenario);
            let mut project_data = ts::take_shared<ProjectData>(&scenario);

            project::submit_milestone_completion(
                &project_nft,
                &mut project_data,
                0, // First milestone
                b"QmProofHash",
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(project::project_status(&project_data) == 4, 1); // InProgress

            ts::return_to_sender(&scenario, project_nft);
            ts::return_shared(project_data);
        };

        // Advance time past grace period
        advance_clock(&mut clock, 4 * ONE_DAY_MS);

        // Release milestone funds
        ts::next_tx(&mut scenario, ADMIN);
        {
            let platform = ts::take_shared<PlatformConfig>(&scenario);
            let mut project_data = ts::take_shared<ProjectData>(&scenario);
            let mut escrow = ts::take_shared<EscrowVault>(&scenario);

            let balance_before = project::escrow_balance(&escrow);

            project::release_milestone_funds(
                &platform,
                &mut project_data,
                &mut escrow,
                0,
                &clock,
                ts::ctx(&mut scenario)
            );

            let balance_after = project::escrow_balance(&escrow);
            let released = balance_before - balance_after;
            
            // Should release 25% (first milestone) = 2.5 SUI
            assert!(released == FUNDING_GOAL / 4, 2);

            ts::return_shared(platform);
            ts::return_shared(project_data);
            ts::return_shared(escrow);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ============ Helper Test Setup Functions ============

    fun setup_identities(scenario: &mut Scenario, clock: &Clock) {
        // Create verifier
        ts::next_tx(scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<AdminCap>(scenario);
            identity::create_verifier(
                &admin_cap,
                b"Test Verifier",
                VERIFIER,
                ts::ctx(scenario)
            );
            ts::return_to_sender(scenario, admin_cap);
        };

        // Register project owner identity
        ts::next_tx(scenario, VERIFIER);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(scenario);
            let mut registry = ts::take_shared<IdentityRegistry>(scenario);
            let expiration = clock::timestamp_ms(clock) + 365 * ONE_DAY_MS;
            
            identity::register_identity(
                &verifier_cap,
                &mut registry,
                PROJECT_OWNER,
                840,
                2,
                expiration,
                b"owner-kyc",
                clock,
                ts::ctx(scenario)
            );

            // Register investor1 identity
            identity::register_identity(
                &verifier_cap,
                &mut registry,
                INVESTOR1,
                840,
                2,
                expiration,
                b"investor1-kyc",
                clock,
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, verifier_cap);
            ts::return_shared(registry);
        };
    }

    fun create_test_project(scenario: &mut Scenario, clock: &Clock) {
        ts::next_tx(scenario, PROJECT_OWNER);
        {
            let mut platform = ts::take_shared<PlatformConfig>(scenario);
            let identity = ts::take_from_sender<Identity>(scenario);
            
            let funding_deadline = clock::timestamp_ms(clock) + THIRTY_DAYS_MS;

            project::create_project(
                &mut platform,
                &identity,
                b"Test Project",
                b"QmDescription",
                FUNDING_GOAL,
                funding_deadline,
                b"QmLegal",
                b"US-NV",
                b"ipfs://meta",
                clock,
                ts::ctx(scenario)
            );

            ts::return_shared(platform);
            ts::return_to_sender(scenario, identity);
        };
    }

    fun add_test_milestones(scenario: &mut Scenario, clock: &Clock) {
        ts::next_tx(scenario, PROJECT_OWNER);
        {
            let project_nft = ts::take_from_sender<ProjectNFT>(scenario);
            let mut project_data = ts::take_shared<ProjectData>(scenario);
            let funding_deadline = project::funding_deadline(&project_data);

            project::add_milestones_batch(
                &project_nft,
                &mut project_data,
                vector[b"M1", b"M2", b"M3", b"M4"],
                vector[FUNDING_GOAL/4, FUNDING_GOAL/4, FUNDING_GOAL/4, FUNDING_GOAL/4],
                vector[
                    funding_deadline + 30*ONE_DAY_MS,
                    funding_deadline + 60*ONE_DAY_MS,
                    funding_deadline + 90*ONE_DAY_MS,
                    funding_deadline + 120*ONE_DAY_MS
                ],
                clock,
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, project_nft);
            ts::return_shared(project_data);
        };
    }

    fun verify_test_project(scenario: &mut Scenario, clock: &Clock) {
        // Submit
        ts::next_tx(scenario, PROJECT_OWNER);
        {
            let project_nft = ts::take_from_sender<ProjectNFT>(scenario);
            let mut project_data = ts::take_shared<ProjectData>(scenario);

            project::submit_for_verification(
                &project_nft,
                &mut project_data,
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, project_nft);
            ts::return_shared(project_data);
        };

        // Verify
        ts::next_tx(scenario, VERIFIER);
        {
            let verifier_cap = ts::take_from_sender<VerifierCap>(scenario);
            let mut project_data = ts::take_shared<ProjectData>(scenario);

            project::verify_project(
                &verifier_cap,
                &mut project_data,
                clock,
                ts::ctx(scenario)
            );

            ts::return_to_sender(scenario, verifier_cap);
            ts::return_shared(project_data);
        };
    }
}