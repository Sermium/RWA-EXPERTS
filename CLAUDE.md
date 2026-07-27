# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

RWA-EXPERTS is a real-world-asset (RWA) tokenization launchpad. It is a monorepo (single git repo, no npm workspaces — each subproject has its own `package.json` and is built/tested independently) containing:

- **`rwa-WebApp/`** — Next.js 16 (App Router) web app: the primary product. Frontend + backend API routes + Supabase (Postgres) database. This is where most work happens.
- **`rwa-evm/`** — Solidity smart contracts (Hardhat, ERC-3643-style permissioned security tokens) deployed across many EVM chains.
- **`rwa-mobile/`** — Expo / React Native mobile app (expo-router, file-based routing under `app/`).
- **`rwa-solana/`** — Anchor (Rust) program for Solana.
- **`rwa-sui/`** — Move package for Sui.
- **`Documents/`** — Product docs: `API.md` / `API-sumup.md` (REST API reference for the WebApp), `GTM.md`, `Moscow.md`, `RWA-why.md`.
- **`contracts useless/`** — Deprecated/abandoned Solidity contracts, not part of the build. Ignore unless explicitly asked about legacy code.

The chain implementations (evm/solana/sui) and the mobile app are secondary/less active surfaces compared to `rwa-WebApp`. When a task doesn't specify which subproject, check whether it's frontend/API/database work (→ `rwa-WebApp`) before assuming contracts.

## rwa-WebApp (primary app)

### Commands
Run from `rwa-WebApp/`:
```bash
npm run dev              # next dev — local server on :3000
npm run build             # next build
npm run lint               # next lint (eslint-config-next)
npm run test                # vitest (unit/component tests)
npm run test:watch      # vitest --watch
npm run test:ui           # vitest --ui
npm run test:coverage # vitest --coverage
npm run test:e2e         # playwright test
npm run test:e2e:ui    # playwright test --ui
```
Run a single vitest test file: `npx vitest run src/path/to/file.test.ts`. Test files live under `src/**/*.{test,spec}.{ts,tsx}`; setup file is `src/__tests__/setup.ts`. Path alias `@/*` maps to `src/*` (both in `tsconfig.json` and `vitest.config.ts`).

### Architecture
- **App Router structure**: `src/app/<feature>/page.tsx` (+ a `<Feature>Client.tsx` client component alongside most pages) and matching API routes under `src/app/api/<feature>/route.ts`. Major feature areas: `admin`, `crowdfunding`, `dashboard`, `exchange`, `kyc`, `projects`, `tokenize`/`tokenization`, `trade`.
- **Database**: Supabase/Postgres. Schema lives at `rwa-WebApp/database/schema.sql` (single source of truth — read it before writing queries against a new table). It defines ~60 tables covering KYC (`kyc_applications`, `kyc_submissions`, `kyc_documents`, `kyc_personal_data`, `kyc_audit_log`, ...), tokenization (`tokenization_applications`, `tokenization_documents`, `token_creation_queue`), crowdfunding (`crowdfunding_applications`, `milestone_proofs`), trading/escrow (`trades`, `trade_deals`, `trade_disputes`, `trade_milestones`, `trade_kyc`, `security_orders`, `security_trades`), exchange (`exchange_orders`, `exchange_trades`, `exchange_deposits/withdrawals`, `trading_pairs`), admin (`admin_roles`, `admin_activity_log`, `admin_audit_log`), and notifications.
- **Supabase clients** (`src/lib/supabase.ts`): `getSupabaseAdmin()` uses the service-role key (server-only, bypasses RLS — use in API routes) vs `getSupabaseClient()` uses the anon key (client-safe). Never use the admin client in client components.
- **Auth model — two distinct mechanisms, don't confuse them**:
  - Regular users: identified by wallet address via the `x-wallet-address` header (see `Documents/API.md`). No signature required for most endpoints.
  - Admin role check (`src/lib/admin.ts`): looks up `wallet_address` in the `admin_roles` table (`admin` / `super_admin`), gated behind `validateAdminAccess()` / `isAdmin()` / `isSuperAdmin()`. Role changes (promote/demote/remove) are restricted to super admins and always written to `admin_activity_log`.
  - A separate signature-based admin auth (`src/lib/auth.ts`, `verifyAdminAuth`) checks a single hardcoded `NEXT_PUBLIC_ADMIN_ADDRESS` env var with an EIP-191 signed message (5-minute expiry) for mutating requests — this is a different, simpler mechanism than the `admin_roles` table check. Know which one a given route uses before changing auth logic.
- **Multi-chain config** (`src/config/chains.ts`): `CHAINS` is the single registry of every supported EVM chain (mainnet + testnet pairs, e.g. Polygon/Amoy, Avalanche/Fuji, Ethereum/Sepolia, BSC/testnet, Cronos/testnet, plus Arbitrum/Base/Optimism mainnet-only). Each entry links to its deployed `KYCVerifier` contract address via `src/config/deployments.ts`. Use the exported helpers (`getChainById`, `getSupportedChainIds`, `getDeployedChainIds`, `getChainPair`, etc.) rather than hardcoding chain IDs — adding a new chain means updating this file, `deployments.ts`, and `hardhat.config.ts` in `rwa-evm`.
- **Fees**: `src/config/deployments.ts` re-exports fee logic from `src/lib/feesService.ts` — fees are DB-backed with defaults as fallback, not static config.
- **KYC subsystem** is substantial: encryption/consent/audit/proof logic under `src/lib/kyc/`, face-liveness detection (`@vladmandic/face-api`, `@tensorflow/tfjs`, `blazeface`) and MRZ document parsing (`mrz`, `tesseract.js`) for ID verification, wallet-linking flow (`linked_wallets`, `wallet_link_codes` tables) to associate multiple wallets to one verified identity.
- **Notifications**: `src/lib/notifications/` — email (SMTP + templates), websocket, daily digest, deadline reminders, dispute notifications. Triggered by scheduled GitHub Actions (`.github/workflows/cron-jobs.yml`) calling `/api/cron/deadlines` and `/api/cron/digest`, authenticated via `Authorization: Bearer $CRON_SECRET`.
- **API documentation**: `Documents/API.md` and `Documents/API-sumup.md` describe the REST surface (base path `/api`, wallet-address-header auth). Keep these in sync when changing API contracts — they are hand-maintained, not generated.
- **Payments**: Stripe (`@stripe/stripe-js`, `stripe`) for off-chain/fiat investment flows alongside on-chain crypto payments (`ethers`/`viem`/`wagmi`).

## rwa-evm (Solidity contracts)

### Commands
Run from `rwa-evm/`:
```bash
npm run compile                    # hardhat compile
npm test                              # hardhat test (all)
npm run test:core                # hardhat test test/core/*.test.ts
npm run test:registry           # hardhat test test/registry/*.test.ts
npm run test:integration      # hardhat test test/integration/*.test.ts
npm run test:coverage           # hardhat coverage
npm run test:gas                    # gas reporter enabled
npm run node                          # local hardhat node
npm run deploy:local               # scripts/deploy.ts on localhost
npm run deploy:amoy                # scripts/deploy.ts on Polygon Amoy
```
Run a single test file: `npx hardhat test test/core/SomeContract.test.ts`.

### Architecture
- Solidity 0.8.20, optimizer + `viaIR` enabled (contracts are large; without viaIR some may fail to compile).
- `contracts/core/` — main platform contracts: `RWALaunchpadFactory`, `RWASecurityToken`, `RWAProjectNFT`, `RWAEscrowVault`, `PlatformFeeManager`, `DividendDistributor`, `DisputeManager`, `ProjectBadgeManager`.
- `contracts/registry/` + `contracts/compliance/` — ERC-3643-style identity/claims permissioning: `ClaimTopicsRegistry`, `TrustedIssuersRegistry`, `ModularCompliance` (+ pluggable `compliance/modules/`).
- `contracts/tokenize/` — separate tokenization factory/escrow path (`RWATokenizationFactory`, `RWATradeEscrow`, `KYCLib`).
- `contracts/trade/TradeEscrow.sol` and `RWASecurityExchange.sol` — trading/escrow layer distinct from the tokenize-time escrow.
- `KYCVerifier.sol` at contracts root is the identity-gate contract referenced by `rwa-WebApp`'s `chains.ts`/`deployments.ts` per-chain config — its address must match what the WebApp reads.
- Deployed to many networks in parallel (`hardhat.config.ts`): Ethereum/Sepolia, Polygon/Amoy, Avalanche/Fuji, Arbitrum, Base, Optimism, BSC/testnet, Cronos/testnet. Verification uses Etherscan V2 unified API (single `ETHERSCAN_API_KEY` for most chains) except Cronos, which uses a separate Cronoscan key/API and is not on Etherscan V2.
- `deployments/` and `verification-*.json` track per-network deployment addresses — check these before assuming a contract isn't deployed somewhere.

## rwa-mobile (Expo app)

Run from `rwa-mobile/`: `npm start` (`expo start`), `npm run android` / `npm run ios` / `npm run web`. File-based routing via `expo-router` under `app/`; tab screens in `app/(tabs)/`. Uses `ethers` v5 (not v6, unlike the WebApp) and WalletConnect for wallet interactions.

## rwa-solana / rwa-sui

- `rwa-solana/`: Anchor program in `programs/rwa_launchpad/src/`. `npm run build` (anchor build), `npm test` (anchor test), `npm run deploy:devnet`/`deploy:mainnet`. Tests in `tests/*.ts` via ts-mocha.
- `rwa-sui/`: Move package, source in `sources/*.move` (`compliance`, `dividend`, `identity`, `project`, `errors`). Tests in `tests/*.move`. Build/test via the `sui move` CLI.
- These implement the same conceptual platform (compliance/identity, dividends, project/token issuance) as `rwa-evm`, ported per-chain — when changing platform logic (e.g. compliance rules, fee structure), consider whether the equivalent change is needed across `rwa-evm`, `rwa-solana`, and `rwa-sui`.
