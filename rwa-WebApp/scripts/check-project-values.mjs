// scripts/check-project-values.mjs
import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';

const PROJECT_NFT = '0x375f38Af0Bf16043F53790B400a4d6dCe0691199';
const ESCROW = '0xe6D318BFD16F83aAAe4d2257e0D981380de8732a';

const NFT_ABI = [
  { inputs: [{ name: '_tokenId', type: 'uint256' }], name: 'getProject', outputs: [{ components: [{ name: 'owner', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'name', type: 'string' }, { name: 'category', type: 'string' }], type: 'tuple' }], stateMutability: 'view', type: 'function' },
];

// Use the getProject VIEW function instead of the mapping
const ESCROW_ABI = [
  { 
    inputs: [{ name: '_projectId', type: 'uint256' }], 
    name: 'getProject', 
    outputs: [{ 
      components: [
        { name: 'projectId', type: 'uint256' },
        { name: 'projectOwner', type: 'address' },
        { name: 'securityToken', type: 'address' },
        { name: 'paymentToken', type: 'address' },
        { name: 'priceFeed', type: 'address' },
        { name: 'fundingGoal', type: 'uint256' },
        { name: 'totalRaised', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'state', type: 'uint8' },
        { name: 'createdAt', type: 'uint256' },
        { name: 'platformFeeBps', type: 'uint256' },
        { name: 'maxPriceAge', type: 'uint256' }
      ],
      type: 'tuple'
    }], 
    stateMutability: 'view', 
    type: 'function' 
  },
];

const client = createPublicClient({ chain: avalancheFuji, transport: http() });

async function main() {
  console.log('=== Project #1 Data ===\n');

  // From NFT
  const nftData = await client.readContract({ address: PROJECT_NFT, abi: NFT_ABI, functionName: 'getProject', args: [1n] });
  console.log('FROM PROJECT NFT:');
  console.log('  fundingGoal (raw):', nftData.fundingGoal.toString());
  console.log('  fundingGoal ($):', (Number(nftData.fundingGoal) / 1e6).toLocaleString());
  console.log('  totalRaised (raw):', nftData.totalRaised.toString());
  console.log('  status:', nftData.status);
  console.log('  name:', nftData.name);

  // From Escrow - using getProject() view function
  try {
    const escrowData = await client.readContract({ address: ESCROW, abi: ESCROW_ABI, functionName: 'getProject', args: [1n] });
    console.log('\nFROM ESCROW VAULT (getProject):');
    console.log('  projectId:', escrowData.projectId?.toString());
    console.log('  projectOwner:', escrowData.projectOwner);
    console.log('  securityToken:', escrowData.securityToken);
    console.log('  paymentToken:', escrowData.paymentToken);
    console.log('  fundingGoal (raw):', escrowData.fundingGoal?.toString());
    console.log('  fundingGoal ($):', escrowData.fundingGoal ? (Number(escrowData.fundingGoal) / 1e6).toLocaleString() : '0');
    console.log('  totalRaised (raw):', escrowData.totalRaised?.toString());
    console.log('  deadline (raw):', escrowData.deadline?.toString());
    console.log('  deadline (date):', escrowData.deadline > 0n ? new Date(Number(escrowData.deadline) * 1000).toISOString() : 'NOT SET');
    console.log('  state:', escrowData.state, '(0=INACTIVE, 1=ACTIVE, 2=FUNDED, 3=COMPLETED, 4=CANCELLED, 5=DISPUTED)');
    console.log('  createdAt:', escrowData.createdAt?.toString());
    console.log('  createdAt (date):', escrowData.createdAt > 0n ? new Date(Number(escrowData.createdAt) * 1000).toISOString() : 'NOT SET');
    console.log('  platformFeeBps:', escrowData.platformFeeBps?.toString());
    
    // Check if project exists in escrow
    if (escrowData.projectOwner === '0x0000000000000000000000000000000000000000') {
      console.log('\n⚠️  PROJECT NOT CREATED IN ESCROW - projectOwner is zero address');
    }
  } catch (e) {
    console.log('\nESCROW getProject() FAILED:', e.message?.slice(0, 200));
  }
}

main();
