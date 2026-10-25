-- Store the id each crowdfunding project has inside its escrow vault.
--
-- RWALaunchpadFactory v2 books a project in its vault under the project NFT id; earlier factory
-- versions booked it under the factory's own project counter (ProjectDeployed.projectId), which
-- was never stored. The app reads vault_project_id first and falls back to project_nft_id.
--
-- After applying, fill the column for projects deployed before this change:
--   npx tsx scripts/backfill-vault-project-ids.ts --chain <chainId>            (dry run, prints SQL)
--   npx tsx scripts/backfill-vault-project-ids.ts --chain <chainId> --apply    (writes the rows)

ALTER TABLE crowdfunding_applications ADD COLUMN IF NOT EXISTS vault_project_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_crowdfunding_vault_project
  ON crowdfunding_applications(deployed_chain_id, vault_project_id);
