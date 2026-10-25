/**
 * Fill crowdfunding_applications.vault_project_id for projects deployed before the column existed
 * (migration database/migrations/20261025_add_vault_project_id.sql).
 *
 * For each deployed row without a vault_project_id it reads the ProjectDeployed event from the
 * row's deployment transaction, asks the RWALaunchpadFactory for the id the escrow vault books the
 * project under (getVaultProjectId; factories without it booked the project under the
 * ProjectDeployed projectId), and checks that the vault holds that project for the row's token.
 *
 * Usage (from rwa-WebApp/, with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set):
 *   npx tsx scripts/backfill-vault-project-ids.ts --chain 43113            dry run: prints SQL
 *   npx tsx scripts/backfill-vault-project-ids.ts --chain 43113 --apply    writes the rows
 *
 * Read-only on chain. The RPC comes from src/config/chains.ts (override with --rpc <url>).
 */
import { createClient } from '@supabase/supabase-js';
import { createPublicClient, decodeEventLog, http, type Address } from 'viem';
import { getChainById, type SupportedChainId } from '../src/config/chains';
import { RWAEscrowVaultABI, RWALaunchpadFactoryABI } from '../src/config/abis';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const chainId = Number(arg('chain'));
  const apply = process.argv.includes('--apply');
  const chain = getChainById(chainId as SupportedChainId);
  if (!chain) throw new Error('Pass --chain <supported chain id>');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  const supabase = createClient(supabaseUrl, serviceKey);
  const publicClient = createPublicClient({ chain: chain.chain, transport: http(arg('rpc') || chain.rpcUrl) });

  const { data: rows, error } = await supabase
    .from('crowdfunding_applications')
    .select('id, project_nft_id, escrow_vault_address, security_token_address, deployment_tx_hash')
    .eq('deployed_chain_id', chainId)
    .not('escrow_vault_address', 'is', null)
    .is('vault_project_id', null);
  if (error) throw error;
  console.log(`-- ${rows?.length ?? 0} deployed project(s) on ${chain.name} without vault_project_id`);

  for (const row of rows || []) {
    try {
      if (!row.deployment_tx_hash) throw new Error('no deployment_tx_hash');
      const receipt = await publicClient.getTransactionReceipt({ hash: row.deployment_tx_hash });

      let factory: Address | null = null;
      let factoryProjectId: bigint | null = null;
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({ abi: RWALaunchpadFactoryABI, data: log.data, topics: log.topics });
          const args = decoded.args as any;
          if (decoded.eventName === 'ProjectDeployed' &&
              String(args.escrowVault).toLowerCase() === String(row.escrow_vault_address).toLowerCase()) {
            factory = log.address;
            factoryProjectId = args.projectId;
          }
        } catch {
          // Not a factory event
        }
      }
      if (!factory || factoryProjectId === null) throw new Error('no matching ProjectDeployed event');

      const vaultProjectId = await publicClient
        .readContract({ address: factory, abi: RWALaunchpadFactoryABI, functionName: 'getVaultProjectId', args: [factoryProjectId] })
        .catch(() => factoryProjectId as bigint);

      const project = await publicClient.readContract({
        address: row.escrow_vault_address as Address,
        abi: RWAEscrowVaultABI,
        functionName: 'getProject',
        args: [vaultProjectId],
      });
      if (String(project.securityToken).toLowerCase() !== String(row.security_token_address).toLowerCase()) {
        throw new Error(`vault project ${vaultProjectId} is not this row's token`);
      }

      console.log(`UPDATE crowdfunding_applications SET vault_project_id = ${vaultProjectId} WHERE id = '${row.id}';`);
      if (apply) {
        const { error: updateError } = await supabase
          .from('crowdfunding_applications')
          .update({ vault_project_id: Number(vaultProjectId) })
          .eq('id', row.id);
        if (updateError) throw updateError;
      }
    } catch (e) {
      console.log(`-- skipped ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  if (!apply) console.log('-- dry run: nothing written (pass --apply to write)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
