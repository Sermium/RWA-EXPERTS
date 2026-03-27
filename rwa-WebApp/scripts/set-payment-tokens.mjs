// scripts/set-payment-tokens.mjs
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { avalancheFuji } from 'viem/chains';

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error('Set PRIVATE_KEY environment variable');
  process.exit(1);
}

const ESCROW = '0xe6D318BFD16F83aAAe4d2257e0D981380de8732a';

// From your deployments.ts for Avalanche Fuji
const USDC = '0x81C7eb2f9FC7a11beC348Ba8846faC9A6FCC4786';
const USDT = '0x224e403397F3aec9a0D2875445dC32dB00ea31C3';

const ABI = [
  { inputs: [{ name: '_usdc', type: 'address' }, { name: '_usdt', type: 'address' }], name: 'setPaymentTokens', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { inputs: [], name: 'usdc', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'usdt', outputs: [{ type: 'address' }], stateMutability: 'view', type: 'function' },
];

const account = privateKeyToAccount(PRIVATE_KEY);
const publicClient = createPublicClient({ chain: avalancheFuji, transport: http() });
const walletClient = createWalletClient({ account, chain: avalancheFuji, transport: http() });

async function main() {
  console.log('=== Set Payment Tokens on Escrow ===\n');
  console.log('Account:', account.address);
  console.log('Escrow:', ESCROW);
  console.log('USDC:', USDC);
  console.log('USDT:', USDT);

  const currentUSDC = await publicClient.readContract({ address: ESCROW, abi: ABI, functionName: 'usdc' });
  const currentUSDT = await publicClient.readContract({ address: ESCROW, abi: ABI, functionName: 'usdt' });
  console.log('\nCurrent USDC:', currentUSDC);
  console.log('Current USDT:', currentUSDT);

  if (currentUSDC !== '0x0000000000000000000000000000000000000000') {
    console.log('\n✅ Payment tokens already set');
    return;
  }

  console.log('\nSetting payment tokens...');
  const hash = await walletClient.writeContract({
    address: ESCROW,
    abi: ABI,
    functionName: 'setPaymentTokens',
    args: [USDC, USDT],
  });

  console.log('Transaction:', hash);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  console.log('Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');

  const newUSDC = await publicClient.readContract({ address: ESCROW, abi: ABI, functionName: 'usdc' });
  const newUSDT = await publicClient.readContract({ address: ESCROW, abi: ABI, functionName: 'usdt' });
  console.log('\nNew USDC:', newUSDC);
  console.log('New USDT:', newUSDT);
}

main().catch(console.error);
