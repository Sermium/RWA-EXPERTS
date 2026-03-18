// scripts/upgrade-kyc-all-chains.ts
import { ethers, upgrades, network } from "hardhat";

// KYCVerifier proxy addresses per network
const KYC_VERIFIER_PROXIES: Record<string, string> = {
  amoy: "0xee84Effbdb909Daef5e8D6184C64953d7cE04D6f",
  avalancheFuji: "0x24F3c59582C8cf5772DB66C38e6375A0C305771B",
  bscTestnet: "0x697430F860eC4eC6506317B0225861860B76c7d8",
  cronosTestnet: "0x502e3c88828db1b478c38CD251Bfe861429b9482",
};

async function main() {
  const networkName = network.name;
  
  console.log("\n🚀 KYCVerifier Upgrade");
  console.log("=".repeat(50));
  console.log(`📡 Network: ${networkName}`);
  
  const proxyAddress = KYC_VERIFIER_PROXIES[networkName];
  
  if (!proxyAddress) {
    console.error(`❌ No KYCVerifier proxy address configured for network: ${networkName}`);
    console.log("\nAvailable networks:");
    Object.keys(KYC_VERIFIER_PROXIES).forEach(n => console.log(`  - ${n}`));
    process.exit(1);
  }

  console.log(`📋 Proxy Address: ${proxyAddress}`);

  const [deployer] = await ethers.getSigners();
  console.log(`🔑 Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`💰 Balance: ${ethers.formatEther(balance)} ${network.name.includes('bsc') ? 'BNB' : network.name.includes('avax') || network.name.includes('fuji') ? 'AVAX' : network.name.includes('cronos') ? 'CRO' : 'POL'}`);

  console.log("\n📦 Getting contract factory...");
  const KYCVerifier = await ethers.getContractFactory("KYCVerifier");

  console.log("⬆️  Upgrading proxy...");
  
  try {
    const upgraded = await upgrades.upgradeProxy(proxyAddress, KYCVerifier);
    await upgraded.waitForDeployment();
    
    const implementationAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    
    console.log("\n✅ Upgrade successful!");
    console.log(`📋 Proxy: ${proxyAddress}`);
    console.log(`📋 New Implementation: ${implementationAddress}`);
    
    return { network: networkName, status: 'success', implementation: implementationAddress };
  } catch (error: any) {
    console.error(`\n❌ Upgrade failed: ${error.message}`);
    return { network: networkName, status: 'failed', error: error.message };
  }
}

main()
  .then((result) => {
    console.log("\n" + "=".repeat(50));
    console.log("📊 Result:", result);
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
