// scripts/check-full-project.mjs
import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';

const PROJECT_NFT = '0x375f38Af0Bf16043F53790B400a4d6dCe0691199';
const ESCROW = '0xe6D318BFD16F83aAAe4d2257e0D981380de8732a';
const FACTORY = '0xE01Da562794820FA44c8B25F02040ad0eAD7C3a2';

const client = createPublicClient({ chain: avalancheFuji, transport: http() });

async function main() {
  console.log('=== Full Project #1 Data Check ===\n');

  // 1. NFT Data
  console.log('--- FROM PROJECT NFT ---');
  try {
    const nft = await client.readContract({
      address: PROJECT_NFT,
      abi: [{ inputs: [{ name: '_tokenId', type: 'uint256' }], name: 'getProject', outputs: [{ components: [{ name: 'owner', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'name', type: 'string' }, { name: 'category', type: 'string' }], type: 'tuple' }], stateMutability: 'view', type: 'function' }],
      functionName: 'getProject',
      args: [1n],
    });
    console.log('  owner:', nft.owner);
    console.log('  securityToken:', nft.securityToken);
    console.log('  escrowVault:', nft.escrowVault);
    console.log('  status:', nft.status);
    console.log('  fundingGoal:', nft.fundingGoal.toString(), `($${Number(nft.fundingGoal) / 1e6})`);
    console.log('  name:', nft.name);
    console.log('  category:', nft.category);
  } catch (e) {
    console.log('  ERROR:', e.message?.slice(0, 100));
  }

  // 2. Token URI / Metadata
  console.log('\n--- METADATA ---');
  try {
    const tokenURI = await client.readContract({
      address: PROJECT_NFT,
      abi: [{ inputs: [{ name: 'tokenId', type: 'uint256' }], name: 'tokenURI', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' }],
      functionName: 'tokenURI',
      args: [1n],
    });
    console.log('  tokenURI:', tokenURI);
    
    if (tokenURI && tokenURI.startsWith('ipfs://')) {
      const url = `https://gateway.pinata.cloud/ipfs/${tokenURI.replace('ipfs://', '')}`;
      console.log('  Fetching metadata from:', url);
      const res = await fetch(url);
      if (res.ok) {
        const metadata = await res.json();
        console.log('  metadata.name:', metadata.name);
        console.log('  metadata.description:', metadata.description?.slice(0, 100));
        console.log('  metadata.image:', metadata.image);
        console.log('  metadata.properties:', JSON.stringify(metadata.properties, null, 2));
        console.log('  metadata.documents:', JSON.stringify(metadata.documents, null, 2));
      }
    }
  } catch (e) {
    console.log('  ERROR:', e.message?.slice(0, 100));
  }

  // 3. Escrow Data
  console.log('\n--- FROM ESCROW VAULT ---');
  try {
    const escrow = await client.readContract({
      address: ESCROW,
      abi: [{ inputs: [{ name: '_projectId', type: 'uint256' }], name: 'getProject', outputs: [{ components: [{ name: 'projectId', type: 'uint256' }, { name: 'projectOwner', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'paymentToken', type: 'address' }, { name: 'priceFeed', type: 'address' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'deadline', type: 'uint256' }, { name: 'state', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'platformFeeBps', type: 'uint256' }, { name: 'maxPriceAge', type: 'uint256' }], type: 'tuple' }], stateMutability: 'view', type: 'function' }],
      functionName: 'getProject',
      args: [1n],
    });
    console.log('  projectId:', escrow.projectId.toString());
    console.log('  projectOwner:', escrow.projectOwner);
    console.log('  securityToken:', escrow.securityToken);
    console.log('  paymentToken:', escrow.paymentToken);
    console.log('  fundingGoal:', escrow.fundingGoal.toString(), `($${Number(escrow.fundingGoal) / 1e6})`);
    console.log('  totalRaised:', escrow.totalRaised.toString());
    console.log('  deadline:', escrow.deadline.toString(), escrow.deadline > 0n ? `(${new Date(Number(escrow.deadline) * 1000).toISOString()})` : '(NOT SET)');
    console.log('  state:', escrow.state, '(0=INACTIVE, 1=ACTIVE, 2=FUNDED)');
    console.log('  platformFeeBps:', escrow.platformFeeBps.toString());
  } catch (e) {
    console.log('  ERROR:', e.message?.slice(0, 100));
  }

  // 4. Factory Deployment Record
  console.log('\n--- FROM FACTORY (Deployment Record) ---');
  try {
    const deployment = await client.readContract({
      address: FACTORY,
      abi: [{ inputs: [{ name: '_projectId', type: 'uint256' }], name: 'getDeployment', outputs: [{ components: [{ name: 'projectId', type: 'uint256' }, { name: 'deployer', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'compliance', type: 'address' }, { name: 'dividendDistributor', type: 'address' }, { name: 'maxBalanceModule', type: 'address' }, { name: 'lockupModule', type: 'address' }, { name: 'deployedAt', type: 'uint256' }, { name: 'isActive', type: 'bool' }, { name: 'minKYCLevel', type: 'uint8' }], type: 'tuple' }], stateMutability: 'view', type: 'function' }],
      functionName: 'getDeployment',
      args: [1n],
    });
    console.log('  projectId:', deployment.projectId.toString());
    console.log('  deployer:', deployment.deployer);
    console.log('  securityToken:', deployment.securityToken);
    console.log('  escrowVault:', deployment.escrowVault);
    console.log('  compliance:', deployment.compliance);
    console.log('  dividendDistributor:', deployment.dividendDistributor);
    console.log('  maxBalanceModule:', deployment.maxBalanceModule);
    console.log('  lockupModule:', deployment.lockupModule);
    console.log('  deployedAt:', deployment.deployedAt.toString(), deployment.deployedAt > 0n ? `(${new Date(Number(deployment.deployedAt) * 1000).toISOString()})` : '');
    console.log('  isActive:', deployment.isActive);
    console.log('  minKYCLevel:', deployment.minKYCLevel);
  } catch (e) {
    console.log('  ERROR:', e.message?.slice(0, 100));
  }

  // 5. Escrow payment tokens
  console.log('\n--- ESCROW PAYMENT TOKENS ---');
  try {
    const usdc = await client.readContract({
      address: ESCROW,
      abi: [{ inputs: [], name: 'usdc', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }],
      functionName: 'usdc',
    });
    const usdt = await client.readContract({
      address: ESCROW,
      abi: [{ inputs: [], name: 'usdt', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }],
      functionName: 'usdt',
    });
    console.log('  USDC:', usdc);
    console.log('  USDT:', usdt);
  } catch (e) {
    console.log('  ERROR:', e.message?.slice(0, 100));
  }

  // 6. Transaction fees
  console.log('\n--- FEES ---');
  try {
    const txFee = await client.readContract({
      address: ESCROW,
      abi: [{ inputs: [], name: 'transactionFee', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }],
      functionName: 'transactionFee',
    });
    const claimFee = await client.readContract({
      address: ESCROW,
      abi: [{ inputs: [], name: 'claimFeeBps', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }],
      functionName: 'claimFeeBps',
    });
    console.log('  transactionFee:', txFee.toString());
    console.log('  claimFeeBps:', claimFee.toString());
  } catch (e) {
    console.log('  ERROR:', e.message?.slice(0, 100));
  }
}

main().catch(console.error);
