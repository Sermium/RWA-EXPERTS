// scripts/check-project-data.mjs
import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';

const PROJECT_NFT = '0x7c13b3Fd6334F4944AAc73780ff6f90555Ce1Fe5';
const ESCROW = '0x72d613fC933fb5561Cc235bf87Ef7dddF2e6eD23';

const publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });

const NFT_ABI = [
  { inputs: [{ name: '_tokenId', type: 'uint256' }], name: 'getProject', outputs: [{ components: [{ name: 'owner', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'name', type: 'string' }, { name: 'category', type: 'string' }], type: 'tuple' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'tokenURI', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' },
];

const ESCROW_ABI = [
  { inputs: [{ name: '_projectId', type: 'uint256' }], name: 'getProject', outputs: [{ components: [{ name: 'projectId', type: 'uint256' }, { name: 'projectOwner', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'priceFeed', type: 'address' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'state', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'platformFeeBps', type: 'uint256' }, { name: 'maxPriceAge', type: 'uint256' }], type: 'tuple' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'usdc', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'usdt', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
];

async function main() {
  console.log('=== Project #0 Data ===\n');

  // NFT Data
  console.log('--- FROM PROJECT NFT ---');
  const nftProject = await publicClient.readContract({
    address: PROJECT_NFT,
    abi: NFT_ABI,
    functionName: 'getProject',
    args: [0n],
  });
  console.log('Name:', nftProject.name);
  console.log('Category:', nftProject.category);
  console.log('Owner:', nftProject.owner);
  console.log('Status:', nftProject.status);
  console.log('FundingGoal:', Number(nftProject.fundingGoal) / 1e6, 'USD');
  console.log('SecurityToken:', nftProject.securityToken);
  console.log('EscrowVault:', nftProject.escrowVault);

  // Token URI (metadata)
  console.log('\n--- METADATA ---');
  const tokenURI = await publicClient.readContract({
    address: PROJECT_NFT,
    abi: NFT_ABI,
    functionName: 'tokenURI',
    args: [0n],
  });
  console.log('TokenURI:', tokenURI);

  // Fetch metadata if IPFS
  if (tokenURI.startsWith('ipfs://')) {
    const httpUrl = tokenURI.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    console.log('Fetching:', httpUrl);
    try {
      const res = await fetch(httpUrl);
      const metadata = await res.json();
      console.log('\nMetadata JSON:');
      console.log(JSON.stringify(metadata, null, 2));
    } catch (e) {
      console.log('Failed to fetch metadata:', e.message);
    }
  }

  // Escrow Data
  console.log('\n--- FROM ESCROW VAULT ---');
  const escrowProject = await publicClient.readContract({
    address: ESCROW,
    abi: ESCROW_ABI,
    functionName: 'getProject',
    args: [0n],
  });
  console.log('ProjectId:', escrowProject.projectId.toString());
  console.log('FundingGoal:', Number(escrowProject.fundingGoal) / 1e6, 'USD');
  console.log('TotalRaised:', Number(escrowProject.totalRaised) / 1e6, 'USD');
  console.log('Deadline:', new Date(Number(escrowProject.deadline) * 1000).toISOString());
  console.log('State:', escrowProject.state, '(1=ACTIVE)');
  console.log('PaymentToken:', escrowProject.paymentToken);

  // Payment tokens on escrow
  console.log('\n--- PAYMENT TOKENS ---');
  const usdc = await publicClient.readContract({ address: ESCROW, abi: ESCROW_ABI, functionName: 'usdc' });
  const usdt = await publicClient.readContract({ address: ESCROW, abi: ESCROW_ABI, functionName: 'usdt' });
  console.log('USDC:', usdc);
  console.log('USDT:', usdt);
}

main().catch(console.error);
