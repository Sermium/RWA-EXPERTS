// scripts/debug-factory-deployment.mjs
import { createPublicClient, createWalletClient, http, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) { console.error('Set PRIVATE_KEY'); process.exit(1); }

const FACTORY = '0xE01Da562794820FA44c8B25F02040ad0eAD7C3a2';
const ACTUAL_ESCROW = '0xe6D318BFD16F83aAAe4d2257e0D981380de8732a'; // The real escrow from NFT

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });
const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http() });

// Factory ABI - check what getDeployment returns
const FACTORY_ABI = parseAbi([
  'function getDeployment(uint256 _projectId) view returns (address deployer, address securityToken, address escrowVault, address compliance, address dividendDistributor, address maxBalanceModule, address lockupModule, bool approved, uint256 deployedAt)',
  'function setEscrowPaymentTokens(uint256 _projectId, address _usdc, address _usdt) external',
]);

async function main() {
  console.log('=== Debug Factory Deployment Record ===\n');
  console.log('Factory:', FACTORY);
  console.log('Account:', account.address);
  
  // Get deployment from factory
  const deployment = await publicClient.readContract({
    address: FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getDeployment',
    args: [1n],
  });
  
  console.log('\n--- Factory getDeployment(1) ---');
  console.log('deployer:', deployment[0]);
  console.log('securityToken:', deployment[1]);
  console.log('escrowVault:', deployment[2]);
  console.log('compliance:', deployment[3]);
  console.log('dividendDistributor:', deployment[4]);
  console.log('maxBalanceModule:', deployment[5]);
  console.log('lockupModule:', deployment[6]);
  console.log('approved:', deployment[7]);
  console.log('deployedAt:', deployment[8]);
  
  console.log('\n--- Compare ---');
  console.log('Factory thinks escrow is:', deployment[2]);
  console.log('NFT says escrow is:', ACTUAL_ESCROW);
  console.log('Match:', deployment[2].toLowerCase() === ACTUAL_ESCROW.toLowerCase());
  
  // If they don't match, the factory is trying to call setPaymentTokens on wrong address!
  if (deployment[2].toLowerCase() !== ACTUAL_ESCROW.toLowerCase()) {
    console.log('\n⚠️  MISMATCH! Factory has wrong escrow address stored!');
    console.log('This is why setEscrowPaymentTokens fails - it\'s calling the wrong contract');
  }
}

main().catch(console.error);
