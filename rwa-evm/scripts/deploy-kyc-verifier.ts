// scripts/deploy-kyc-verifier.ts

import { ethers, upgrades, run } from 'hardhat';

async function main() {
    const [deployer] = await ethers.getSigners();
    const chainId = (await ethers.provider.getNetwork()).chainId;

    console.log('Deploying KYCVerifier...');
    console.log('Chain ID:', chainId);
    console.log('Deployer:', deployer.address);

    // Get trusted signer from env
    const trustedSigner = process.env.KYC_SIGNER_ADDRESS;
    if (!trustedSigner) {
        throw new Error('KYC_SIGNER_ADDRESS not set');
    }

    console.log('Trusted Signer:', trustedSigner);

    // Deploy
    const KYCVerifier = await ethers.getContractFactory('KYCVerifier');
    const verifier = await upgrades.deployProxy(KYCVerifier, [trustedSigner], {
        initializer: 'initialize',
        kind: 'uups'
    });

    await verifier.waitForDeployment();
    const address = await verifier.getAddress();

    console.log('KYCVerifier deployed to:', address);

    // Wait for confirmations
    console.log('Waiting for confirmations...');
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Verify
    try {
        const implementationAddress = await upgrades.erc1967.getImplementationAddress(address);
        
        await run('verify:verify', {
            address: implementationAddress,
            constructorArguments: []
        });
        console.log('Implementation verified');
    } catch (error) {
        console.log('Verification failed:', error);
    }

    // Output for deployments.ts
    console.log('\n--- Add to deployments.ts ---');
    console.log(`KYCVerifier: "${address}",`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
