// src/lib/crowdfunding/vaultProject.ts
// Server-only: map a crowdfunding project to its escrow vault and the id it has there.

import { getSupabaseAdmin } from '@/lib/supabase';

export interface VaultProjectRecord {
  applicationId: string;
  vaultProjectId: bigint;
  escrowVault: `0x${string}` | null;
  milestones: Array<{ title?: string; description?: string; fundingPercentage?: number; targetDate?: string }>;
}

/**
 * Find the crowdfunding application deployed as on-chain project `projectId`, where the id is the
 * vault project id (vault_project_id) or, for rows without one, the project NFT id. Projects the
 * v2 launchpad factory deploys are booked in their vault under the NFT id.
 */
export async function findVaultProject(chainId: number, projectId: number | bigint): Promise<VaultProjectRecord | null> {
  const id = Number(projectId);
  const { data } = await getSupabaseAdmin()
    .from('crowdfunding_applications')
    .select('id, vault_project_id, project_nft_id, escrow_vault_address, milestones')
    .eq('deployed_chain_id', chainId)
    .or(`vault_project_id.eq.${id},and(vault_project_id.is.null,project_nft_id.eq.${id})`)
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  return {
    applicationId: data.id,
    vaultProjectId: BigInt(data.vault_project_id ?? data.project_nft_id),
    escrowVault: data.escrow_vault_address || null,
    milestones: Array.isArray(data.milestones) ? data.milestones : [],
  };
}

/**
 * Id the project with NFT id `projectNftId` has inside its escrow vault: the stored
 * vault_project_id when there is one, otherwise the NFT id (v2 launchpad deployments).
 */
export async function resolveVaultProjectId(chainId: number, projectNftId: number | bigint): Promise<bigint> {
  const { data } = await getSupabaseAdmin()
    .from('crowdfunding_applications')
    .select('vault_project_id')
    .eq('deployed_chain_id', chainId)
    .eq('project_nft_id', Number(projectNftId))
    .not('vault_project_id', 'is', null)
    .limit(1)
    .maybeSingle();
  return data?.vault_project_id !== undefined && data?.vault_project_id !== null
    ? BigInt(data.vault_project_id)
    : BigInt(projectNftId);
}
