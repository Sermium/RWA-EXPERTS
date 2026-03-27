import { ethers } from "hardhat";

async function main() {
  const factory = await ethers.getContractAt(
    "RWALaunchpadFactory", 
    "0x496f98ecc190ac342C78601B5E01563464958E98"
  );
  
  console.log("Setting payment tokens...");
  const tx = await factory.setDefaultPaymentTokens(
    "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786",
    "0x224e403397F3aec9a0D2875445dC32dB00ea31C3"
  );
  await tx.wait();
  
  console.log("USDC:", await factory.defaultUSDC());
  console.log("USDT:", await factory.defaultUSDT());
  console.log("✅ Done");
}

main().catch(console.error);