import { ethers } from "hardhat";

const CONTRACTS = {
  RWAEscrowVault: "0xf6bE123965f80b8eA08627F3AA8545a7A92ECC0A",
  PlatformFeeManager: "0xeC644de34d1A641f2E1A67726445C1688ABd44fd",
  USDC: "0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786"
};

const PLATFORM_WALLETS = {
  feeReceiver: "0xdD4104A780142EfB9566659f26d3317714a81510",
  liquidityWallet: "0xe7c533355a7Fa04baf083C726a442db7Dc0971b1",
  treasuryWallet: "0x2Db96c4F203fBc13c98bBa428ba9E09B48543b0A"
};

async function main() {
  console.log("═══ DIAGNOSING PLATFORM FEE MANAGER ═══\n");

  const [deployer] = await ethers.getSigners();
  const platformFeeManager = await ethers.getContractAt("PlatformFeeManager", CONTRACTS.PlatformFeeManager);
  const usdc = await ethers.getContractAt("IERC20", CONTRACTS.USDC);

  // List all functions
  console.log("=== PlatformFeeManager Functions ===");
  const factory = await ethers.getContractFactory("PlatformFeeManager");
  const funcs = factory.interface.fragments.filter(f => f.type === 'function');
  
  funcs.forEach(f => {
    const fn = f as ethers.FunctionFragment;
    const inputs = fn.inputs.map(i => `${i.type} ${i.name}`).join(", ");
    console.log(`  ${fn.name}(${inputs})`);
  });

  // Check roles
  console.log("\n=== Role Checks ===");
  try {
    const ESCROW_ROLE = await platformFeeManager.ESCROW_ROLE();
    console.log(`ESCROW_ROLE hash: ${ESCROW_ROLE}`);
    
    const escrowHasRole = await platformFeeManager.hasRole(ESCROW_ROLE, CONTRACTS.RWAEscrowVault);
    console.log(`EscrowVault has ESCROW_ROLE: ${escrowHasRole}`);
  } catch (e) {
    console.log("Could not check ESCROW_ROLE");
  }

  // Check wallets configuration
  console.log("\n=== Wallet Configuration ===");
  try {
    const wallets = await platformFeeManager.getWallets();
    console.log(`Fee Receiver: ${wallets[0]}`);
    console.log(`Liquidity Wallet: ${wallets[1]}`);
    console.log(`Treasury Wallet: ${wallets[2]}`);
  } catch (e: any) {
    console.log(`Could not get wallets: ${e.message}`);
  }

  // Check fee distribution config
  console.log("\n=== Fee Distribution Config ===");
  const configFuncs = [
    'feeReceiverBps',
    'liquidityBps', 
    'treasuryBps',
    'tokenLiquidityBps',
    'tokenTreasuryBps',
    'usdtFeeReceiverBps',
    'usdtLiquidityBps',
    'usdtTreasuryBps'
  ];
  
  for (const funcName of configFuncs) {
    try {
      const value = await (platformFeeManager as any)[funcName]();
      console.log(`  ${funcName}: ${value}`);
    } catch {}
  }

  // Test receiveFees simulation
  console.log("\n=== Testing receiveFees ===");
  const projectId = 7;
  const platformFee = ethers.parseUnits("150", 6); // 1.5% of 10,000
  const tokenAmount = ethers.parseUnits("10000", 18); // 1% of 1M tokens
  const securityToken = "0xbB074bED20a8db808e42618b7331BA04DF763154";

  // First, let's check if receiveFees expects tokens to be transferred TO it, or if it pulls them
  console.log("\nChecking receiveFees behavior...");
  
  // Check current allowance from escrow to fee manager
  const allowance = await usdc.allowance(CONTRACTS.RWAEscrowVault, CONTRACTS.PlatformFeeManager);
  console.log(`Current Escrow->FeeManager allowance: ${ethers.formatUnits(allowance, 6)} USDC`);

  // Try static call to receiveFees
  console.log("\nStatic call test for receiveFees...");
  try {
    // We need to impersonate the escrow vault to test this
    // For now, let's just check the function signature
    const receiveFeesSig = platformFeeManager.interface.getFunction("receiveFees");
    console.log(`receiveFees signature: ${receiveFeesSig?.format()}`);
  } catch (e: any) {
    console.log(`Error: ${e.message}`);
  }

  // Check if PlatformFeeManager needs to pull tokens or if they're pushed
  console.log("\n=== Checking Token Transfer Flow ===");
  
  // Get the receiveFees function and analyze it
  try {
    const iface = platformFeeManager.interface;
    const receiveFeesFunc = iface.getFunction("receiveFees");
    if (receiveFeesFunc) {
      console.log("receiveFees parameters:");
      receiveFeesFunc.inputs.forEach((input, i) => {
        console.log(`  ${i + 1}. ${input.type} ${input.name}`);
      });
    }
  } catch {}

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("NEXT STEP: Share PlatformFeeManager.sol to see how receiveFees");
  console.log("handles the token transfer internally.");
  console.log("═══════════════════════════════════════════════════════════════");
}

main().catch(console.error);
