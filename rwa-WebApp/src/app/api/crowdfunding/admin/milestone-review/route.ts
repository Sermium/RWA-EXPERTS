import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getChainById, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI } from '@/config/abis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Type for milestone data from escrow contract
interface EscrowMilestone {
  description: string;
  amount: bigint;
  deadline: bigint;
  state: number;
  releasedAt: bigint;
  approvedAt: bigint;
}

export async function POST(request: NextRequest) {
  try {
    const { chainId, projectId, milestoneIndex, action, adminNotes, adminAddress } = await request.json();

    if (!chainId || projectId === undefined || milestoneIndex === undefined || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Get the proof
    const { data: proof, error: proofError } = await supabase
      .from('milestone_proofs')
      .select('*')
      .eq('chain_id', chainId)
      .eq('project_id', projectId)
      .eq('milestone_index', milestoneIndex)
      .eq('status', 'pending')
      .single();

    if (proofError || !proof) {
      return NextResponse.json({ error: 'Proof not found or not pending' }, { status: 404 });
    }

    if (action === 'reject') {
      // Update proof status to rejected
      const { error: updateError } = await supabase
        .from('milestone_proofs')
        .update({
          status: 'rejected',
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminAddress,
          updated_at: new Date().toISOString(),
        })
        .eq('id', proof.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update proof' }, { status: 500 });
      }

      return NextResponse.json({ success: true, status: 'rejected' });
    }

    // Approve: release funds on-chain
    const chainInfo = getChainById(chainId as SupportedChainId);
    const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS];

    if (!chainInfo || !deployment?.contracts?.RWAEscrowVault) {
      return NextResponse.json({ error: 'Chain not supported' }, { status: 400 });
    }

    const escrowAddress = deployment.contracts.RWAEscrowVault as `0x${string}`;

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

    // Release milestone funds
    let releaseTxHash: `0x${string}`;
    let releasedAmount: bigint;

    try {
      // Get milestone info from contract with proper typing
      const milestones = await publicClient.readContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'getMilestones',
        args: [BigInt(projectId)],
      }) as readonly EscrowMilestone[];

      if (!milestones || milestones.length <= milestoneIndex) {
        return NextResponse.json({ error: 'Milestone not found on chain' }, { status: 400 });
      }

      const milestone = milestones[milestoneIndex];
      releasedAmount = milestone.amount;

      // Call releaseMilestoneFunds
      releaseTxHash = await walletClient.writeContract({
        address: escrowAddress,
        abi: RWAEscrowVaultABI,
        functionName: 'releaseMilestoneFunds',
        args: [BigInt(projectId), BigInt(milestoneIndex)],
      });

      await publicClient.waitForTransactionReceipt({ hash: releaseTxHash });
    } catch (err) {
      console.error('Contract error:', err);
      return NextResponse.json({ 
        error: 'Failed to release funds on chain',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 });
    }

    // Update proof status
    const { error: updateError } = await supabase
      .from('milestone_proofs')
      .update({
        status: 'approved',
        admin_notes: adminNotes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminAddress,
        release_tx_hash: releaseTxHash,
        released_at: new Date().toISOString(),
        released_amount: Number(releasedAmount) / 1e6,
        updated_at: new Date().toISOString(),
      })
      .eq('id', proof.id);

    if (updateError) {
      console.error('Failed to update proof status:', updateError);
    }

    return NextResponse.json({
      success: true,
      status: 'approved',
      txHash: releaseTxHash,
      releasedAmount: Number(releasedAmount) / 1e6,
    });
  } catch (error) {
    console.error('Error reviewing milestone:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
