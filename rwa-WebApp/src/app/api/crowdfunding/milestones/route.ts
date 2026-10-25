// src/app/api/crowdfunding/milestones/route.ts
// Milestones of an on-chain crowdfunding project. The escrow vault keeps no milestone list: the
// milestones are defined on the application, their reviews are in milestone_proofs, and the vault
// releases each milestone's share of the project's escrowed funds (releaseMilestoneFunds).
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { getChainById, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { getSupabaseAdmin } from '@/lib/supabase';
import { findVaultProject } from '@/lib/crowdfunding/vaultProject';
import { MILESTONE_STATE, milestoneReleaseAmount, readVaultFunding } from '@/lib/crowdfunding/vault';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chainId = Number(searchParams.get('chainId'));
    const projectId = searchParams.get('projectId');
    if (!chainId || projectId === null || !/^\d+$/.test(projectId)) {
      return NextResponse.json({ error: 'chainId and a numeric projectId are required' }, { status: 400 });
    }

    const chainInfo = getChainById(chainId as SupportedChainId);
    if (!chainInfo) {
      return NextResponse.json({ error: `Unsupported chain: ${chainId}` }, { status: 400 });
    }

    const project = await findVaultProject(chainId, BigInt(projectId));
    if (!project) {
      return NextResponse.json({ funding: null, milestones: [], message: 'No crowdfunding project deployed with this id' });
    }
    const vault = (project.escrowVault ||
      DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS]?.contracts?.RWAEscrowVault) as `0x${string}` | undefined;
    if (!vault) {
      return NextResponse.json({ error: 'No escrow vault for this project' }, { status: 400 });
    }

    const publicClient = createPublicClient({ chain: chainInfo.chain, transport: http(chainInfo.rpcUrl) });
    const funding = await readVaultFunding(publicClient, vault, project.vaultProjectId);

    const { data: proofs } = await getSupabaseAdmin()
      .from('milestone_proofs')
      .select('milestone_index, status, reviewed_at, released_at, released_amount, release_tx_hash')
      .eq('chain_id', chainId)
      .eq('project_id', projectId);
    const proofByIndex = new Map((proofs || []).map((p) => [Number(p.milestone_index), p]));

    const toSeconds = (iso?: string | null) => (iso ? Math.floor(new Date(iso).getTime() / 1000) : 0);
    const unreleased = project.milestones
      .map((_, index) => index)
      .filter((index) => !proofByIndex.get(index)?.release_tx_hash);
    const lastUnreleased = unreleased[unreleased.length - 1];

    const milestones = project.milestones.map((m, index) => {
      const proof = proofByIndex.get(index);
      const released = !!proof?.release_tx_hash;
      const state = released
        ? MILESTONE_STATE.RELEASED
        : proof?.status === 'approved'
          ? MILESTONE_STATE.APPROVED
          : proof?.status === 'rejected'
            ? MILESTONE_STATE.REJECTED
            : MILESTONE_STATE.PENDING;
      const amount = released
        ? BigInt(Math.round(Number(proof.released_amount || 0) * 1e6))
        : milestoneReleaseAmount(funding.heldAmount, funding.releasedAmount, Number(m.fundingPercentage || 0), index === lastUnreleased);
      return {
        index,
        description: m.title || m.description || `Milestone ${index + 1}`,
        fundingPercentage: Number(m.fundingPercentage || 0),
        amount: amount.toString(),
        deadline: String(toSeconds(m.targetDate)),
        state,
        proofStatus: proof?.status ?? null,
        releasedAt: String(toSeconds(proof?.released_at)),
        approvedAt: String(toSeconds(proof?.reviewed_at)),
        releaseTxHash: proof?.release_tx_hash ?? null,
      };
    });

    return NextResponse.json({
      projectId,
      vaultProjectId: project.vaultProjectId.toString(),
      escrowVault: vault,
      funding: {
        ...funding,
        fundingGoal: funding.fundingGoal.toString(),
        totalRaised: funding.totalRaised.toString(),
        deadline: funding.deadline.toString(),
        heldAmount: funding.heldAmount.toString(),
        releasedAmount: funding.releasedAmount.toString(),
      },
      milestones,
    });
  } catch (error) {
    console.error('Error loading milestones:', error);
    return NextResponse.json({ error: 'Failed to load milestones' }, { status: 500 });
  }
}
