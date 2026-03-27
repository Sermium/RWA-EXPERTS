// scripts/fix-escrow-admin.mjs
import { createPublicClient, createWalletClient, http, keccak256, toBytes } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('Set PRIVATE_KEY environment variable');
  process.exit(1);
}

const ESCROW = '0xe6D318BFD16F83aAAe4d2257e0D981380de8732a';
const FACTORY = '0xE01Da562794820FA44c8B25F02040ad0eAD7C3a2';
const YOUR_ADDRESS = '0xA2fF1ef754b3186f12d2d8D4D922CC31d7BF1969';

const DEFAULT_ADMIN_ROLE = '0x0000000000000000000000000000000000000000000000000000000000000000';
const ADMIN_ROLE = keccak256(toBytes('ADMIN_ROLE'));

const ABI = [
  { inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], name: 'hasRole', outputs: [{ type: 'bool' }], stateMutability: 'view', type: 'function' },
  { inputs: [{ name: 'role', type: 'bytes32' }, { name: 'account', type: 'address' }], name: 'grantRole', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [{ name: 'role', type: 'bytes32' }], name: 'getRoleAdmin', outputs: [{ type: 'bytes32' }], stateMutability: 'view', type: 'function' },
];

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });
const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http() });

async function main() {
  console.log('=== Check Escrow Admin Roles ===\n');
  console.log('Your address:', YOUR_ADDRESS);
  console.log('Escrow:', ESCROW);
  console.log('Factory:', FACTORY);
  
  console.log('\nDEFAULT_ADMIN_ROLE:', DEFAULT_ADMIN_ROLE);
  console.log('ADMIN_ROLE:', ADMIN_ROLE);

  // Check who has admin roles
  const yourDefaultAdmin = await publicClient.readContract({
    address: ESCROW, abi: ABI, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, YOUR_ADDRESS]
  });
  const yourAdminRole = await publicClient.readContract({
    address: ESCROW, abi: ABI, functionName: 'hasRole', args: [ADMIN_ROLE, YOUR_ADDRESS]
  });
  const factoryDefaultAdmin = await publicClient.readContract({
    address: ESCROW, abi: ABI, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, FACTORY]
  });
  const factoryAdminRole = await publicClient.readContract({
    address: ESCROW, abi: ABI, functionName: 'hasRole', args: [ADMIN_ROLE, FACTORY]
  });

  console.log('\n--- Role Check ---');
  console.log(`Your DEFAULT_ADMIN_ROLE: ${yourDefaultAdmin}`);
  console.log(`Your ADMIN_ROLE: ${yourAdminRole}`);
  console.log(`Factory DEFAULT_ADMIN_ROLE: ${factoryDefaultAdmin}`);
  console.log(`Factory ADMIN_ROLE: ${factoryAdminRole}`);

  // The factory should be the admin since it deployed the escrow
  // We need to call from factory to grant you admin, or add a function to factory

  if (factoryDefaultAdmin) {
    console.log('\n⚠️  Factory is the DEFAULT_ADMIN. Need to grant role via factory.');
    console.log('The factory needs a function to call escrow.grantRole()');
    console.log('\nOption 1: Add grantEscrowRole() to factory and upgrade');
    console.log('Option 2: Add your address as admin during escrow initialization in factory');
  }

  // Check if platformFeeRecipient has admin (it was passed to initialize())
  const platformFeeRecipient = await publicClient.readContract({
    address: ESCROW,
    abi: [{ inputs: [], name: 'platformFeeRecipient', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' }],
    functionName: 'platformFeeRecipient',
  });
  
  console.log('\nplatformFeeRecipient:', platformFeeRecipient);
  
  const feeRecipientAdmin = await publicClient.readContract({
    address: ESCROW, abi: ABI, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, platformFeeRecipient]
  });
  console.log(`platformFeeRecipient has DEFAULT_ADMIN_ROLE: ${feeRecipientAdmin}`);
}

main().catch(console.error);
