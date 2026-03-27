import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, createWalletClient, http, parseUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainById, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI, ERC20ABI, RWASecurityTokenABI } from '@/config/abis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const;

// Type for project data from escrow contract
interface EscrowProject {
  projectId: bigint;
  projectOwner: `0x${string}`;
  securityToken: `0x${string}`;
  paymentToken: `0x${string}`;
  priceFeed: `0x${string}`;
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  state: number;
  createdAt: bigint;
  platformFeeBps: bigint;
  maxPriceAge: bigint;
}

export async function POST(request: NextRequest) {
  try {
    const { chainId, projectId, adminAddress } = await request.json();

    if (!chainId || projectId === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get chain info and deployment
    const chainInfo = getChainById(chainId as SupportedChainId);
    const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS];

    if (!chainInfo) {
      return NextResponse.json({ error: 'Invalid chain' }, { status: 400 });
    }

    if (!deployment?.contracts?.RWAEscrowVault) {
      return NextResponse.json({ error: 'No escrow deployed on this chain' }, { status: 400 });
    }

    const escrowAddress = deployment.contracts.RWAEscrowVault as `0x${string}`;
    const usdcAddress = deployment.tokens?.USDC as `0x${string}` | undefined;

    // Create clients
    const publicClient = createPublicClient({
      chain: chainInfo.chain,
      transport: http(chainInfo.rpcUrl),
    });

    const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
    if (!adminPrivateKey) {
      return NextResponse.json({ error: 'Admin key not configured' }, { status: 500 });
    }

    const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: chainInfo.chain,
      transport: http(chainInfo.rpcUrl),
    });

    // Get project data with proper typing
    const projectData = await publicClient.readContract({
      address: escrowAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'getProject',
      args: [BigInt(projectId)],
    }) as EscrowProject;

    const totalRaisedOnChain = Number(projectData.totalRaised) / 1e6;
    const fundingGoal = Number(projectData.fundingGoal) / 1e6;
    const platformFeeBps = Number(projectData.platformFeeBps);

    // Get pending off-chain payments
    const { data: pendingPayments } = await supabase
      .from('offchain_payments')
      .select('*')
      .eq('chain_id', chainId)
      .eq('project_id', projectId)
      .eq('status', 'pending');

    const totalOffchain = (pendingPayments || []).reduce(
      (sum, p) => sum + Number(p.amount_usd), 
      0
    );

    // Calculate totals and fees
    const totalRaised = totalRaisedOnChain + totalOffchain;
    const platformFee = (totalRaised * platformFeeBps) / 10000;

    // Transaction hashes for tracking
    const txHashes: {
      approval?: `0x${string}`;
      injection?: `0x${string}`;
      completion?: `0x${string}`;
      minting?: `0x${string}`[];
    } = {};

    // Inject off-chain funds if any
    if (totalOffchain > 0 && usdcAddress && usdcAddress !== ZERO_ADDRESS) {
      const amountToInject = parseUnits(totalOffchain.toFixed(6), 6);

      // Approve USDC spending
      const approveTx = await walletClient.writeContract({
        address: usdcAddress,
        abi: ERC20ABI,
        functionName: 'approve',
        args: [escrowAddress, amountToInject],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });
      txHashes.approval = approveTx;

      // Inject funds with payment token
      const injectionTx = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'injectOffChainFunds',
        args: [BigInt(projectId), amountToInject, usdcAddress],
      });
      await publicClient.waitForTransactionReceipt({ hash: injectionTx });
      txHashes.injection = injectionTx;

      // Update off-chain payments as converted
      await supabase
        .from('offchain_payments')
        .update({
          status: 'converted',
          converted_at: new Date().toISOString(),
          converted_by: adminAddress?.toLowerCase() || account.address.toLowerCase(),
          conversion_tx_hash: injectionTx,
        })
        .eq('chain_id', chainId)
        .eq('project_id', projectId)
        .eq('status', 'pending');
    }

    // Complete the project funding
    const completionTx = await walletClient.writeContract({
      address: escrowAddress,
      abi: RWAEscrowVaultABI,
      functionName: 'completeProject',
      args: [BigInt(projectId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: completionTx });
    txHashes.completion = completionTx;

    // Mint tokens for off-chain investors
    let tokensMinted = 0;
    txHashes.minting = [];

    if (pendingPayments && pendingPayments.length > 0 && projectData.securityToken !== ZERO_ADDRESS) {
      // Get token price from application
      const { data: appData } = await supabase
        .from('tokenization_applications')
        .select('token_price_estimate')
        .eq('chain_id', chainId)
        .eq('project_id', projectId)
        .single();

      const tokenPrice = appData?.token_price_estimate || 1;

      for (const payment of pendingPayments) {
        const tokenAmount = parseUnits(
          (payment.amount_usd / tokenPrice).toFixed(6),
          6
        );

        try {
          const mintTx = await walletClient.writeContract({
            address: projectData.securityToken,
            abi: RWASecurityTokenABI,
            functionName: 'mint',
            args: [payment.investor_address as `0x${string}`, tokenAmount],
          });
          await publicClient.waitForTransactionReceipt({ hash: mintTx });
          txHashes.minting.push(mintTx);
          tokensMinted += Number(tokenAmount) / 1e6;
        } catch (mintError) {
          console.error(`Failed to mint for ${payment.investor_address}:`, mintError);
        }
      }
    }

    // Record validation in database
    await supabase.from('funding_validations').upsert({
      chain_id: chainId,
      project_id: projectId,
      total_raised_crypto: totalRaisedOnChain,
      total_raised_offchain: totalOffchain,
      total_raised: totalRaised,
      platform_fee_amount: platformFee,
      platform_fee_bps: platformFeeBps,
      validated_at: new Date().toISOString(),
      validated_by: adminAddress?.toLowerCase() || account.address.toLowerCase(),
      injection_tx_hash: txHashes.injection || null,
      completion_tx_hash: txHashes.completion,
      status: 'completed',
    }, {
      onConflict: 'chain_id,project_id',
    });

    // Update application status
    await supabase
      .from('tokenization_applications')
      .update({
        status: 'funded',
        updated_at: new Date().toISOString(),
      })
      .eq('chain_id', chainId)
      .eq('project_id', projectId);

    return NextResponse.json({
      success: true,
      summary: {
        totalRaised,
        totalOnChain: totalRaisedOnChain,
        totalOffchain,
        platformFee,
        tokensMinted,
      },
      txHashes,
    });
  } catch (error) {
    console.error('Error validating funding:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
