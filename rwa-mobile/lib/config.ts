// lib/config.ts
//
// Runtime configuration. Values come from Expo public env vars (EXPO_PUBLIC_*, inlined at build
// time from .env / EAS env) and fall back to app config `extra` (app.json / app.config.js).
// Nothing falls back to a placeholder: if a required value is missing, getConfig() throws and the
// root layout shows a configuration error instead of the app.
//
// Note: EXPO_PUBLIC_* vars are only inlined when referenced literally as process.env.EXPO_PUBLIC_X,
// so every variable below is spelled out.

import Constants from 'expo-constants';
import { ethers } from 'ethers';

export interface ContractAddresses {
  rwaToken: string;
  marketplace: string;
  staking: string;
  governance: string; // optional, '' when not deployed
}

export interface AppConfig {
  apiUrl: string; // without trailing slash, e.g. https://api.example.org
  walletConnectProjectId: string;
  contracts: ContractAddresses; // active network (Avalanche Fuji)
  mainnetContracts: ContractAddresses; // optional, '' when not deployed
}

export class ConfigError extends Error {
  readonly problems: string[];
  constructor(problems: string[]) {
    super(
      'RWA Mobile is missing required configuration:\n' +
        problems.map((p) => `  - ${p}`).join('\n') +
        '\nSet these in rwa-mobile/.env (see .env.example) or in app config "extra", then rebuild.'
    );
    this.name = 'ConfigError';
    this.problems = problems;
  }
}

type Extra = {
  apiUrl?: string;
  walletConnectProjectId?: string;
  contracts?: Partial<ContractAddresses>;
  mainnetContracts?: Partial<ContractAddresses>;
};

const extra: Extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function pick(envValue: string | undefined, extraValue: string | undefined): string {
  const v = (envValue ?? '').trim() || (extraValue ?? '').trim();
  return v;
}

const raw = {
  apiUrl: pick(process.env.EXPO_PUBLIC_API_URL, extra.apiUrl),
  walletConnectProjectId: pick(process.env.EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID, extra.walletConnectProjectId),
  contracts: {
    rwaToken: pick(process.env.EXPO_PUBLIC_RWA_TOKEN_ADDRESS, extra.contracts?.rwaToken),
    marketplace: pick(process.env.EXPO_PUBLIC_MARKETPLACE_ADDRESS, extra.contracts?.marketplace),
    staking: pick(process.env.EXPO_PUBLIC_STAKING_ADDRESS, extra.contracts?.staking),
    governance: pick(process.env.EXPO_PUBLIC_GOVERNANCE_ADDRESS, extra.contracts?.governance),
  },
  mainnetContracts: {
    rwaToken: pick(process.env.EXPO_PUBLIC_MAINNET_RWA_TOKEN_ADDRESS, extra.mainnetContracts?.rwaToken),
    marketplace: pick(process.env.EXPO_PUBLIC_MAINNET_MARKETPLACE_ADDRESS, extra.mainnetContracts?.marketplace),
    staking: pick(process.env.EXPO_PUBLIC_MAINNET_STAKING_ADDRESS, extra.mainnetContracts?.staking),
    governance: pick(process.env.EXPO_PUBLIC_MAINNET_GOVERNANCE_ADDRESS, extra.mainnetContracts?.governance),
  },
};

const PLACEHOLDER_HOSTS = ['your-domain.com', 'example.com', 'example.org', 'localhost.invalid'];
const PLACEHOLDER_VALUES = ['your_project_id', 'changeme', 'todo', 'xxx'];

function validateApiUrl(value: string, problems: string[]): string {
  if (!value) {
    problems.push('EXPO_PUBLIC_API_URL is not set (backend base URL, e.g. https://api.yourcompany.com)');
    return '';
  }
  const match = /^(https?):\/\/([^/:?#]+)/i.exec(value);
  if (!match) {
    problems.push(`EXPO_PUBLIC_API_URL is not a valid http(s) URL: "${value}"`);
    return '';
  }
  const [, scheme, host] = match;
  if (PLACEHOLDER_HOSTS.some((h) => host.toLowerCase() === h || host.toLowerCase().endsWith(`.${h}`))) {
    problems.push(`EXPO_PUBLIC_API_URL still points to a placeholder host: "${value}"`);
    return '';
  }
  if (scheme.toLowerCase() !== 'https' && !__DEV__) {
    problems.push(`EXPO_PUBLIC_API_URL must use https in release builds: "${value}"`);
    return '';
  }
  return value.replace(/\/+$/, '');
}

function validateProjectId(value: string, problems: string[]): string {
  if (!value || PLACEHOLDER_VALUES.includes(value.toLowerCase())) {
    problems.push(
      'EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID is not set (create one at https://cloud.reown.com)'
    );
    return '';
  }
  if (!/^[A-Za-z0-9]{16,64}$/.test(value)) {
    problems.push(`EXPO_PUBLIC_WALLETCONNECT_PROJECT_ID does not look like a project ID: "${value}"`);
    return '';
  }
  return value;
}

function validateAddress(name: string, value: string, required: boolean, problems: string[]): string {
  if (!value) {
    if (required) problems.push(`${name} is not set (deployed contract address)`);
    return '';
  }
  if (!ethers.utils.isAddress(value) || value.toLowerCase() === ethers.constants.AddressZero) {
    problems.push(`${name} is not a valid contract address: "${value}"`);
    return '';
  }
  return ethers.utils.getAddress(value);
}

function validate(): { config: AppConfig; problems: string[] } {
  const problems: string[] = [];
  const config: AppConfig = {
    apiUrl: validateApiUrl(raw.apiUrl, problems),
    walletConnectProjectId: validateProjectId(raw.walletConnectProjectId, problems),
    contracts: {
      rwaToken: validateAddress('EXPO_PUBLIC_RWA_TOKEN_ADDRESS', raw.contracts.rwaToken, true, problems),
      marketplace: validateAddress('EXPO_PUBLIC_MARKETPLACE_ADDRESS', raw.contracts.marketplace, true, problems),
      staking: validateAddress('EXPO_PUBLIC_STAKING_ADDRESS', raw.contracts.staking, true, problems),
      governance: validateAddress('EXPO_PUBLIC_GOVERNANCE_ADDRESS', raw.contracts.governance, false, problems),
    },
    mainnetContracts: {
      rwaToken: validateAddress('EXPO_PUBLIC_MAINNET_RWA_TOKEN_ADDRESS', raw.mainnetContracts.rwaToken, false, problems),
      marketplace: validateAddress(
        'EXPO_PUBLIC_MAINNET_MARKETPLACE_ADDRESS',
        raw.mainnetContracts.marketplace,
        false,
        problems
      ),
      staking: validateAddress('EXPO_PUBLIC_MAINNET_STAKING_ADDRESS', raw.mainnetContracts.staking, false, problems),
      governance: validateAddress(
        'EXPO_PUBLIC_MAINNET_GOVERNANCE_ADDRESS',
        raw.mainnetContracts.governance,
        false,
        problems
      ),
    },
  };
  return { config, problems };
}

const result = validate();

/** Problems with the current configuration; empty when everything required is set. */
export function getConfigProblems(): string[] {
  return [...result.problems];
}

/** The validated configuration. Throws ConfigError if anything required is missing or invalid. */
export function getConfig(): AppConfig {
  if (result.problems.length > 0) throw new ConfigError(result.problems);
  return result.config;
}
