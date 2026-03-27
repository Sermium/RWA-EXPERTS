import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, http } from 'viem';
import { getChainById, type SupportedChainId } from '@/config/chains';
import { DEPLOYMENTS } from '@/config/deployments';
import { RWAEscrowVaultABI } from '@/config/abis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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

export async function GET(request: NextRequest) {
  try {
    // Get deployed and active projects
    const { data: applications, error: appError } = await supabase
      .from('tokenization_applications')
      .select('*')
      .eq('project_type', 'crowdfund')
      .eq('status', 'deployed')
      .not('project_id', 'is', null)
      .not('chain_id', 'is', null);

    if (appError) {
      console.error('Supabase error:', appError);
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 });
    }

    const projects = [];

    for (const app of applications || []) {
      try {
        const chainId = app.chain_id as SupportedChainId;
        const chainInfo = getChainById(chainId);
        const deployment = DEPLOYMENTS[chainId as keyof typeof DEPLOYMENTS];

        if (!chainInfo || !deployment?.contracts?.RWAEscrowVault) continue;

        const publicClient = createPublicClient({
          chain: chainInfo.chain,
          transport: http(chainInfo.rpcUrl),
        });

        // Get project data from escrow with proper typing
        const projectData = await publicClient.readContract({
          address: deployment.contracts.RWAEscrowVault as `0x${string}`,
          abi: RWAEscrowVaultABI,
          functionName: 'getProject',
          args: [BigInt(app.project_id)],
        }) as EscrowProject;

        // Extract values from the properly typed struct
        const totalRaised = Number(projectData.totalRaised) / 1e6; // Assuming 6 decimals
        const fundingGoal = Number(projectData.fundingGoal) / 1e6;
        const state = projectData.state;

        // State 1 = Active (fundraising), check if goal reached
        if (state !== 1 || totalRaised < fundingGoal) continue;

        // Get pending off-chain payments
        const { data: payments } = await supabase
          .from('offchain_payments')
          .select('*')
          .eq('chain_id', chainId)
          .eq('project_id', app.project_id)
          .eq('status', 'pending');

        const offchainPayments = (payments || []).map(p => ({
          id: p.id,
          investorAddress: p.investor_address,
          investorEmail: p.investor_email,
          amountUsd: p.amount_usd,
          paymentMethod: p.payment_method,
          paymentIntentId: p.payment_intent_id,
          status: p.status,
          createdAt: p.created_at,
        }));

        const totalOffchainPending = offchainPayments.reduce((sum, p) => sum + p.amountUsd, 0);

        projects.push({
          id: app.id,
          chainId,
          projectId: app.project_id,
          name: app.asset_name,
          fundingGoal,
          totalRaisedOnChain: totalRaised,
          totalOffchainPending,
          offchainPayments,
          status: 'pending_validation',
          tokenAddress: app.token_address || projectData.securityToken,
          escrowAddress: deployment.contracts.RWAEscrowVault,
        });
      } catch (err) {
        console.error(`Error processing project ${app.id}:`, err);
      }
    }

    return NextResponse.json({ projects });
  } catch (error) {
    console.error('Error fetching pending funding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
