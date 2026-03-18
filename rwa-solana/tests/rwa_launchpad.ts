// tests/rwa_launchpad.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { RwaLaunchpad } from "../target/types/rwa_launchpad";
import { expect } from "chai";
import { 
    Keypair, 
    PublicKey, 
    SystemProgram,
    LAMPORTS_PER_SOL 
} from "@solana/web3.js";

describe("rwa_launchpad", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.RwaLaunchpad as Program<RwaLaunchpad>;

    // Test accounts
    const platformAuthority = provider.wallet;
    const projectOwner = Keypair.generate();
    const investor1 = Keypair.generate();
    const investor2 = Keypair.generate();
    const verifier = Keypair.generate();

    // PDAs
    let platformConfigPda: PublicKey;
    let projectPda: PublicKey;
    let escrowPda: PublicKey;
    let ownerIdentityPda: PublicKey;
    let investor1IdentityPda: PublicKey;
    let investor1AccountPda: PublicKey;

    const PLATFORM_FEE_BPS = 250; // 2.5%
    const FUNDING_GOAL = 10 * LAMPORTS_PER_SOL;
    const ONE_DAY = 24 * 60 * 60;

    before(async () => {
        // Airdrop SOL to test accounts
        const airdropAmount = 100 * LAMPORTS_PER_SOL;
        
        await provider.connection.requestAirdrop(projectOwner.publicKey, airdropAmount);
        await provider.connection.requestAirdrop(investor1.publicKey, airdropAmount);
        await provider.connection.requestAirdrop(investor2.publicKey, airdropAmount);
        await provider.connection.requestAirdrop(verifier.publicKey, airdropAmount);

        // Wait for airdrops to confirm
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Derive PDAs
        [platformConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("platform")],
            program.programId
        );

        [ownerIdentityPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("identity"), projectOwner.publicKey.toBuffer()],
            program.programId
        );

        [investor1IdentityPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("identity"), investor1.publicKey.toBuffer()],
            program.programId
        );
    });

    describe("Platform Initialization", () => {
        it("Should initialize the platform", async () => {
            await program.methods
                .initializePlatform(PLATFORM_FEE_BPS)
                .accounts({
                    authority: platformAuthority.publicKey,
                    platformConfig: platformConfigPda,
                    feeRecipient: platformAuthority.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const platformConfig = await program.account.platformConfig.fetch(platformConfigPda);
            expect(platformConfig.platformFeeBps).to.equal(PLATFORM_FEE_BPS);
            expect(platformConfig.authority.toString()).to.equal(platformAuthority.publicKey.toString());
        });
    });

    describe("Identity Registration", () => {
        it("Should register project owner identity", async () => {
            const expirationDate = Math.floor(Date.now() / 1000) + 365 * ONE_DAY;
            const identityHash = Array(32).fill(1);

            await program.methods
                .registerIdentity(
                    840, // US
                    2,   // Accredited
                    new anchor.BN(expirationDate),
                    identityHash
                )
                .accounts({
                    verifier: platformAuthority.publicKey,
                    platformConfig: platformConfigPda,
                    user: projectOwner.publicKey,
                    identityAccount: ownerIdentityPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const identity = await program.account.identityAccount.fetch(ownerIdentityPda);
            expect(identity.verified).to.be.true;
            expect(identity.country).to.equal(840);
            expect(identity.investorCategory).to.equal(2);
        });

        it("Should register investor identity", async () => {
            const expirationDate = Math.floor(Date.now() / 1000) + 365 * ONE_DAY;
            const identityHash = Array(32).fill(2);

            await program.methods
                .registerIdentity(
                    276, // Germany
                    3,   // Qualified
                    new anchor.BN(expirationDate),
                    identityHash
                )
                .accounts({
                    verifier: platformAuthority.publicKey,
                    platformConfig: platformConfigPda,
                    user: investor1.publicKey,
                    identityAccount: investor1IdentityPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const identity = await program.account.identityAccount.fetch(investor1IdentityPda);
            expect(identity.verified).to.be.true;
        });
    });

    describe("Project Creation", () => {
        it("Should create a new project", async () => {
            const fundingDeadline = Math.floor(Date.now() / 1000) + 30 * ONE_DAY;

            // Get current project count for PDA derivation
            const platformConfig = await program.account.platformConfig.fetch(platformConfigPda);
            const projectId = platformConfig.totalProjects;

            [projectPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("project"), new anchor.BN(projectId).toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            const args = {
                name: "Test Solar Farm",
                descriptionHash: "QmTestDescriptionHash",
                fundingGoal: new anchor.BN(FUNDING_GOAL),
                fundingDeadline: new anchor.BN(fundingDeadline),
                legalContractHash: "QmLegalContractHash",
                jurisdiction: "US-NV",
                metadataUri: "ipfs://QmMetadataUri",
            };

            await program.methods
                .createProject(args)
                .accounts({
                    owner: projectOwner.publicKey,
                    platformConfig: platformConfigPda,
                    identityAccount: ownerIdentityPda,
                    project: projectPda,
                    systemProgram: SystemProgram.programId,
                })
                .signers([projectOwner])
                .rpc();

            const project = await program.account.project.fetch(projectPda);
            expect(project.projectId.toNumber()).to.equal(0);
            expect(project.fundingGoal.toNumber()).to.equal(FUNDING_GOAL);
            expect(project.status).to.deep.equal({ draft: {} });
        });

        it("Should add milestones", async () => {
            const project = await program.account.project.fetch(projectPda);
            const fundingDeadline = project.fundingDeadline.toNumber();

            // Add 4 milestones
            for (let i = 0; i < 4; i++) {
                const [milestonePda] = PublicKey.findProgramAddressSync(
                    [Buffer.from("milestone"), projectPda.toBuffer(), Buffer.from([i])],
                    program.programId
                );

                await program.methods
                    .addMilestone(
                        `Milestone ${i + 1}`,
                        new anchor.BN(FUNDING_GOAL / 4),
                        new anchor.BN(fundingDeadline + (i + 1) * 30 * ONE_DAY)
                    )
                    .accounts({
                        owner: projectOwner.publicKey,
                        project: projectPda,
                        milestone: milestonePda,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([projectOwner])
                    .rpc();
            }

            const updatedProject = await program.account.project.fetch(projectPda);
            expect(updatedProject.milestoneCount).to.equal(4);
        });
    });

    describe("Project Verification", () => {
        it("Should submit project for verification", async () => {
            await program.methods
                .submitForVerification()
                .accounts({
                    owner: projectOwner.publicKey,
                    project: projectPda,
                })
                .signers([projectOwner])
                .rpc();

            const project = await program.account.project.fetch(projectPda);
            expect(project.status).to.deep.equal({ pendingVerification: {} });
        });

        it("Should verify the project", async () => {
            [escrowPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("escrow"), projectPda.toBuffer()],
                program.programId
            );

            await program.methods
                .verifyProject()
                .accounts({
                    verifier: platformAuthority.publicKey,
                    platformConfig: platformConfigPda,
                    project: projectPda,
                    escrowAccount: escrowPda,
                    systemProgram: SystemProgram.programId,
                })
                .rpc();

            const project = await program.account.project.fetch(projectPda);
            expect(project.status).to.deep.equal({ active: {} });
            expect(project.escrowAccount.toString()).to.equal(escrowPda.toString());
        });
    });

    describe("Investment", () => {
        it("Should accept investment from verified user", async () => {
            [investor1AccountPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("investor"), projectPda.toBuffer(), investor1.publicKey.toBuffer()],
                program.programId
            );

            const investAmount = 2 * LAMPORTS_PER_SOL;

            const project = await program.account.project.fetch(projectPda);

            await program.methods
                .invest(new anchor.BN(investAmount))
                .accounts({
                    investor: investor1.publicKey,
                    platformConfig: platformConfigPda,
                    identityAccount: investor1IdentityPda,
                    project: projectPda,
                    escrowAccount: escrowPda,
                    investorAccount: investor1AccountPda,
                    securityTokenMint: PublicKey.default, // Placeholder
                    investorTokenAccount: PublicKey.default, // Placeholder
                    systemProgram: SystemProgram.programId,
                    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
                })
                .signers([investor1])
                .rpc();

            const investorAccount = await program.account.investorAccount.fetch(investor1AccountPda);
            expect(investorAccount.amountInvested.toNumber()).to.equal(investAmount);

            const updatedProject = await program.account.project.fetch(projectPda);
            expect(updatedProject.totalRaised.toNumber()).to.equal(investAmount);
        });

        it("Should track multiple investments", async () => {
            const investAmount = 3 * LAMPORTS_PER_SOL;

            await program.methods
                .invest(new anchor.BN(investAmount))
                .accounts({
                    investor: investor1.publicKey,
                    platformConfig: platformConfigPda,
                    identityAccount: investor1IdentityPda,
                    project: projectPda,
                    escrowAccount: escrowPda,
                    investorAccount: investor1AccountPda,
                    securityTokenMint: PublicKey.default,
                    investorTokenAccount: PublicKey.default,
                    systemProgram: SystemProgram.programId,
                    tokenProgram: anchor.utils.token.TOKEN_PROGRAM_ID,
                })
                .signers([investor1])
                .rpc();

            const investorAccount = await program.account.investorAccount.fetch(investor1AccountPda);
            expect(investorAccount.amountInvested.toNumber()).to.equal(5 * LAMPORTS_PER_SOL);
        });
    });

    describe("View Functions", () => {
        it("Should fetch project details", async () => {
            const project = await program.account.project.fetch(projectPda);
            
            console.log("\n=== Project Details ===");
            console.log("Project ID:", project.projectId.toNumber());
            console.log("Owner:", project.owner.toString());
            console.log("Funding Goal:", project.fundingGoal.toNumber() / LAMPORTS_PER_SOL, "SOL");
            console.log("Total Raised:", project.totalRaised.toNumber() / LAMPORTS_PER_SOL, "SOL");
            console.log("Status:", Object.keys(project.status)[0]);
            console.log("Milestone Count:", project.milestoneCount);
            console.log("Investor Count:", project.investorCount);
            console.log("========================\n");
        });

        it("Should fetch platform stats", async () => {
            const platform = await program.account.platformConfig.fetch(platformConfigPda);
            
            console.log("\n=== Platform Stats ===");
            console.log("Total Projects:", platform.totalProjects.toNumber());
            console.log("Total Funds Raised:", platform.totalFundsRaised.toNumber() / LAMPORTS_PER_SOL, "SOL");
            console.log("Platform Fee:", platform.platformFeeBps / 100, "%");
            console.log("======================\n");
        });
    });
});
