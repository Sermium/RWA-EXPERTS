// scripts/check-projects-count.mjs
import { createPublicClient, http } from 'viem';
import { avalancheFuji } from 'viem/chains';

const PROJECT_NFT = '0x375f38Af0Bf16043F53790B400a4d6dCe0691199';

const ABI = [
  { inputs: [], name: 'totalProjects', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_tokenId', type: 'uint256' }], name: 'projectExists', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: '_tokenId', type: 'uint256' }], name: 'getProject', outputs: [{ components: [{ name: 'owner', type: 'address' }, { name: 'securityToken', type: 'address' }, { name: 'escrowVault', type: 'address' }, { name: 'status', type: 'uint8' }, { name: 'createdAt', type: 'uint256' }, { name: 'fundingGoal', type: 'uint256' }, { name: 'totalRaised', type: 'uint256' }, { name: 'name', type: 'string' }, { name: 'category', type: 'string' }], type: 'tuple' }], stateMutability: 'view', type: 'function' },
];

const client = createPublicClient({ chain: avalancheFuji, transport: http() });

async function main() {
  const total = await client.readContract({ address: PROJECT_NFT, abi: ABI, functionName: 'totalProjects' });
  console.log('Total projects:', total.toString());

  for (let i = 1; i <= Number(total) + 1; i++) {
    try {
      const exists = await client.readContract({ address: PROJECT_NFT, abi: ABI, functionName: 'projectExists', args: [BigInt(i)] });
      console.log(`Project #${i} exists:`, exists);
      
      if (exists) {
        const project = await client.readContract({ address: PROJECT_NFT, abi: ABI, functionName: 'getProject', args: [BigInt(i)] });
        console.log(`  Name: ${project.name}, Status: ${project.status}, Owner: ${project.owner}`);
      }
    } catch (e) {
      console.log(`Project #${i}: ERROR -`, e.message?.slice(0, 100));
    }
  }
}

main();
