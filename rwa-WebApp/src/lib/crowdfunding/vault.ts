// src/lib/crowdfunding/vault.ts
// Reads and writes against a crowdfunding project's escrow vault (RWAEscrowVault v2). Client-safe.
//
// What the vault does NOT have, and where it lives instead:
// - no milestone list: milestones are defined in the database (application `milestones` JSON,
//   reviews in `milestone_proofs`); the vault only releases amounts (releaseMilestoneFunds) and
//   /api/crowdfunding/milestones serves the list with the amount each milestone releases
// - no "enable refunds" switch: cancelling a project (cancelProject) opens refunds, and each
//   investor then calls claimRefund
// - no per-project funding struct: getProject plus the per-project books below

import type { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { RWAEscrowVaultABI } from '@/config/abis';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/** RWAEscrowVault.ProjectState */
export const VAULT_STATE = { INACTIVE: 0, ACTIVE: 1, FUNDED: 2, COMPLETED: 3, CANCELLED: 4, DISPUTED: 5 } as const;
export const VAULT_STATE_NAMES = ['Inactive', 'Active', 'Funded', 'Completed', 'Cancelled', 'Disputed'] as const;

export interface VaultFunding {
  state: number;
  stateName: string;
  paymentToken: `0x${string}`;
  fundingGoal: bigint;
  totalRaised: bigint;
  deadline: bigint;
  investorCount: number;
  /** Stablecoins the vault still holds for the project */
  heldAmount: bigint;
  /** Stablecoins already released to the project owner for milestones */
  releasedAmount: bigint;
  /** Investors can claim refunds (project cancelled, not through a dispute pool) */
  refundsEnabled: boolean;
  /** Holders claim from a dispute refund pool instead (claimDisputeRefund) */
  disputeRefundOpen: boolean;
}

export async function readVaultFunding(
  publicClient: PublicClient,
  vault: `0x${string}`,
  vaultProjectId: bigint
): Promise<VaultFunding> {
  const read = <F extends 'getProject' | 'disputeRefundOpen' | 'projectBalance' | 'projectInvestorCount' | 'projectReleasedFunds'>(
    functionName: F
  ) => publicClient.readContract({ address: vault, abi: RWAEscrowVaultABI, functionName, args: [vaultProjectId] } as any);

  const [project, disputeRefundOpen, heldAmount, investorCount, releasedAmount] = (await Promise.all([
    read('getProject'),
    read('disputeRefundOpen'),
    read('projectBalance'),
    read('projectInvestorCount'),
    read('projectReleasedFunds'),
  ])) as [
    { projectOwner: `0x${string}`; paymentToken: `0x${string}`; fundingGoal: bigint; totalRaised: bigint; deadline: bigint; state: number },
    boolean,
    bigint,
    bigint,
    bigint,
  ];
  if (project.projectOwner === ZERO_ADDRESS) {
    throw new Error(`Vault ${vault} has no project ${vaultProjectId}`);
  }
  const state = Number(project.state);
  return {
    state,
    stateName: VAULT_STATE_NAMES[state] ?? `State ${state}`,
    paymentToken: project.paymentToken,
    fundingGoal: project.fundingGoal,
    totalRaised: project.totalRaised,
    deadline: project.deadline,
    investorCount: Number(investorCount),
    heldAmount,
    releasedAmount,
    refundsEnabled: state === VAULT_STATE.CANCELLED && !disputeRefundOpen,
    disputeRefundOpen,
  };
}

/**
 * Cancel a project that has not completed, which lets its investors claim refunds.
 * Returns the transaction hash, or null if refunds were already open.
 */
export async function openVaultRefunds(
  publicClient: PublicClient,
  walletClient: WalletClient<Transport, Chain, Account>,
  vault: `0x${string}`,
  vaultProjectId: bigint
): Promise<`0x${string}` | null> {
  const funding = await readVaultFunding(publicClient, vault, vaultProjectId);
  if (funding.state === VAULT_STATE.CANCELLED) return null;
  if (funding.state === VAULT_STATE.COMPLETED || funding.state === VAULT_STATE.DISPUTED) {
    throw new Error(`A ${funding.stateName.toLowerCase()} project can only be refunded through a dispute`);
  }
  const hash = await walletClient.writeContract({
    address: vault,
    abi: RWAEscrowVaultABI,
    functionName: 'cancelProject',
    args: [vaultProjectId],
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ============================================================================
// Milestones (database-defined, released from the vault)
// ============================================================================

/** State of a milestone as the UI shows it */
export const MILESTONE_STATE = { PENDING: 0, APPROVED: 1, RELEASED: 2, REJECTED: 3 } as const;

export interface ProjectMilestone {
  index: number;
  description: string;
  /** Share of the project's escrowed budget, in percent */
  fundingPercentage: number;
  /** Released amount once released, otherwise what releasing it now would pay out (6 decimals) */
  amount: bigint;
  deadline: bigint;
  state: number;
  /** Status of the latest proof submitted for it, if any */
  proofStatus: string | null;
  releasedAt: bigint;
  approvedAt: bigint;
  releaseTxHash: string | null;
}

/** Reference recorded with releaseMilestoneFunds, so releases can be traced back to a milestone */
export function milestoneRef(projectId: bigint | number, milestoneIndex: number): string {
  return `project-${projectId}-milestone-${milestoneIndex}`;
}

/**
 * What releasing a milestone pays out: its percentage of the project's milestone budget (what the
 * vault held at completion: still held + already released), capped by what is still held. The
 * last unreleased milestone takes whatever is left, so rounding never strands funds.
 */
export function milestoneReleaseAmount(
  heldAmount: bigint,
  releasedAmount: bigint,
  fundingPercentage: number,
  isLastUnreleased: boolean
): bigint {
  if (isLastUnreleased) return heldAmount;
  const budget = heldAmount + releasedAmount;
  const amount = (budget * BigInt(Math.round(fundingPercentage * 100))) / BigInt(10000);
  return amount > heldAmount ? heldAmount : amount;
}

/** A project's escrow as /api/crowdfunding/milestones reports it */
export interface ProjectEscrow {
  /** Null when no deployed crowdfunding project has this id */
  vaultProjectId: bigint | null;
  escrowVault: `0x${string}` | null;
  funding: VaultFunding | null;
  milestones: ProjectMilestone[];
}

/** Escrow summary and milestones of an on-chain project, from /api/crowdfunding/milestones */
export async function fetchProjectEscrow(chainId: number, projectId: bigint | number): Promise<ProjectEscrow> {
  const res = await fetch(`/api/crowdfunding/milestones?chainId=${chainId}&projectId=${projectId}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load milestones');
  const f = data.funding;
  return {
    vaultProjectId: data.vaultProjectId !== undefined ? BigInt(data.vaultProjectId) : null,
    escrowVault: data.escrowVault ?? null,
    funding: f
      ? {
          ...f,
          fundingGoal: BigInt(f.fundingGoal),
          totalRaised: BigInt(f.totalRaised),
          deadline: BigInt(f.deadline),
          heldAmount: BigInt(f.heldAmount),
          releasedAmount: BigInt(f.releasedAmount),
        }
      : null,
    milestones: (data.milestones as Array<Record<string, any>>).map(parseMilestone),
  };
}

/**
 * Milestone in the shape the admin review screens use: status 0 Pending, 1 Submitted (proof
 * waiting for review), 2 Approved, 3 Rejected, 5 Released.
 */
export interface ReviewMilestone {
  description: string;
  /** Basis points of the project's milestone budget */
  percentage: bigint;
  status: number;
  proofURI: string;
  submittedAt: bigint;
  approvedAt: bigint;
  releasedAmount: bigint;
  rejectionReason: string;
  disputeRaiser: string;
  disputeReason: string;
}

const REVIEW_STATUS: Record<number, number> = {
  [MILESTONE_STATE.PENDING]: 0,
  [MILESTONE_STATE.APPROVED]: 2,
  [MILESTONE_STATE.REJECTED]: 3,
  [MILESTONE_STATE.RELEASED]: 5,
};

export function toReviewMilestone(m: ProjectMilestone): ReviewMilestone {
  const submitted = m.state === MILESTONE_STATE.PENDING && m.proofStatus === 'pending';
  return {
    description: m.description,
    percentage: BigInt(Math.round(m.fundingPercentage * 100)),
    status: submitted ? 1 : REVIEW_STATUS[m.state] ?? 0,
    proofURI: '',
    submittedAt: BigInt(0),
    approvedAt: m.approvedAt,
    releasedAmount: m.state === MILESTONE_STATE.RELEASED ? m.amount : BigInt(0),
    rejectionReason: '',
    disputeRaiser: '',
    disputeReason: '',
  };
}

/**
 * Approve or reject a milestone's submitted proof through the milestone-review API. Approving
 * releases the milestone's share of the escrowed funds. Returns the released amount in USD.
 */
export async function reviewMilestoneProof(params: {
  chainId: number;
  projectId: bigint | number;
  milestoneIndex: number;
  action: 'approve' | 'reject';
  adminNotes?: string;
}): Promise<{ releasedAmount: number; txHash?: string }> {
  const response = await fetch('/api/crowdfunding/admin/milestone-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...params, projectId: Number(params.projectId) }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Failed to ${params.action} milestone`);
  return { releasedAmount: Number(data.releasedAmount || 0), txHash: data.txHash };
}

/** Milestones of an on-chain project, from /api/crowdfunding/milestones */
export async function fetchProjectMilestones(chainId: number, projectId: bigint | number): Promise<ProjectMilestone[]> {
  return (await fetchProjectEscrow(chainId, projectId)).milestones;
}

function parseMilestone(m: Record<string, any>): ProjectMilestone {
  return {
    index: m.index,
    description: m.description,
    fundingPercentage: m.fundingPercentage,
    amount: BigInt(m.amount),
    deadline: BigInt(m.deadline),
    state: m.state,
    proofStatus: m.proofStatus,
    releasedAt: BigInt(m.releasedAt),
    approvedAt: BigInt(m.approvedAt),
    releaseTxHash: m.releaseTxHash,
  };
}
