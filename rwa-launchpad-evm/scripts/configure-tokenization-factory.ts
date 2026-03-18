import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Configuring RWATokenizationFactory with account:", deployer.address);

  const factoryAddress = "0x978128746a220A20F87c82e1d6dbbF22f01F5C6c";
  const factory = await ethers.getContractAt("RWATokenizationFactory", factoryAddress);

  // Fees in USDC (6 decimals)
  const tokenFee = ethers.parseUnits("500", 6);      // $500
  const nftFee = ethers.parseUnits("500", 6);        // $500
  const bundleFee = ethers.parseUnits("750", 6);     // $750
  const escrowFee = ethers.parseUnits("250", 6);     // $250
  const dividendFee = ethers.parseUnits("200", 6);   // $200

  console.log("\n1️⃣ Setting fees...");
  try {
    const tx1 = await factory.setFees(tokenFee, nftFee, bundleFee, escrowFee, dividendFee);
    await tx1.wait();
    console.log("   ✅ Fees set:");
    console.log(`      Token: $500`);
    console.log(`      NFT: $500`);
    console.log(`      Bundle (NFT+Token): $750`);
    console.log(`      Escrow: +$250`);
    console.log(`      Dividend: +$200`);
  } catch (e: any) {
    console.log(`   ❌ Failed to set fees: ${e.message}`);
  }

  console.log("\n2️⃣ Approving deployer...");
  try {
    const tx2 = await factory.setDeployerApproval(deployer.address, true);
    await tx2.wait();
    console.log(`   ✅ Deployer approved: ${deployer.address}`);
  } catch (e: any) {
    console.log(`   ❌ Failed to approve deployer: ${e.message}`);
  }

  console.log("\n3️⃣ Granting REGISTRAR_ROLE on IdentityRegistry...");
  try {
    const identityRegistryAddress = "0x01395d6ac65868A48eE2Df3DB41e2Fd4d4387B5D";
    const identityRegistry = await ethers.getContractAt("IdentityRegistry", identityRegistryAddress);
    const REGISTRAR_ROLE = await identityRegistry.REGISTRAR_ROLE();
    
    const hasRole = await identityRegistry.hasRole(REGISTRAR_ROLE, factoryAddress);
    if (!hasRole) {
      const tx3 = await identityRegistry.grantRole(REGISTRAR_ROLE, factoryAddress);
      await tx3.wait();
      console.log("   ✅ REGISTRAR_ROLE granted to TokenizationFactory");
    } else {
      console.log("   ✅ TokenizationFactory already has REGISTRAR_ROLE");
    }
  } catch (e: any) {
    console.log(`   ❌ Failed to grant role: ${e.message}`);
  }

  console.log("\n4️⃣ Verifying configuration...");
  try {
    const fees = await factory.getFees();
    console.log(`   Token Fee: $${ethers.formatUnits(fees._tokenFee, 6)}`);
    console.log(`   NFT Fee: $${ethers.formatUnits(fees._nftFee, 6)}`);
    console.log(`   Bundle Fee: $${ethers.formatUnits(fees._bundleFee, 6)}`);
    console.log(`   Escrow Fee: $${ethers.formatUnits(fees._escrowFee, 6)}`);
    console.log(`   Dividend Fee: $${ethers.formatUnits(fees._dividendFee, 6)}`);
    console.log(`   Escrow Tx Fee: ${fees._escrowTxFeeBps.toString()} bps (${Number(fees._escrowTxFeeBps) / 100}%)`);
    
    const isApproved = await factory.isDeployerApproved(deployer.address);
    console.log(`   Deployer Approved: ${isApproved ? "✅ Yes" : "❌ No"}`);
  } catch (e: any) {
    console.log(`   ❌ Verification failed: ${e.message}`);
  }

  console.log("\n✅ Configuration complete!");
  console.log("\n📝 Add to src/config/contracts.ts:");
  console.log(`   RWATokenizationFactory: '${factoryAddress}',`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
