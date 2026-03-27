// scripts/sync-project-status.mjs
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('Set PRIVATE_KEY environment variable');
  process.exit(1);
}

const PROJECT_NFT = '0x375f38Af0Bf16043F53790B400a4d6dCe0691199';

const ABI = [
  { inputs: [{ name: '_tokenId', type: 'uint256' }, { name: '_status', type: 'uint8' }], name: 'updateProjectStatus', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: '_tokenId', type: 'uint256' }], name: 'getProject', outputs: [{ components: [{ name: 'owner', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'name', type: 'string' }, { name: 'category', type: 'string' }], type: 'tuple' }], stateMutability: 'view', type: 'function' },
];

// NFT Status enum: 0=DRAFT, 1=PENDING, 2=ACTIVE, 3=FUNDED, 4=IN_PROGRESS, 5=COMPLETED, 6=CANCELLED, 7=FAILED
const NFT_STATUS_ACTIVE = 2;

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });
const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http() });

async function main() {
  console.log('=== Sync Project #1 Status ===\n');
  console.log('Account:', account.address);

  // Check current status
  const project = await publicClient.readContract({
    address: PROJECT_NFT,
    abi: ABI,
    functionName: 'getProject',
    args: [1n],
  });
  
  console.log('Current NFT status:', project.status, '(0=Draft, 2=Active)');
  
  if (project.status === NFT_STATUS_ACTIVE) {
    console.log('✅ Already ACTIVE, no update needed');
    return;
  }

  console.log('\nUpdating to ACTIVE (2)...');
  
  const hash = await walletClient.writeContract({
    address: PROJECT_NFT,
    abi: ABI,
    functionName: 'updateProjectStatus',
    args: [1n, NFT_STATUS_ACTIVE],
  });

  console.log('Transaction:', hash);
  
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');

  // Verify
  const updated = await publicClient.readContract({
    address: PROJECT_NFT,
    abi: ABI,
    functionName: 'getProject',
    args: [1n],
  });
  
  console.log('New NFT status:', updated.status);
}

main().catch(console.error);
