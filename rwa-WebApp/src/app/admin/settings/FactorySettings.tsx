// src/app/admin/settings/FactorySettings.tsx
'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { isAddress, formatEther, parseEther } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { ZERO_ADDRESS } from '@/config/contracts';
import { RWALaunchpadFactoryABI } from '@/config/abis';
import { SupportedChainId } from '@/config/chains';
import {
  Settings,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Pause,
  Play,
  Globe,
  Lock,
  Unlock,
  DollarSign,
  Code,
  Shield,
} from 'lucide-react';

// ============================================
// INTERFACES
// ============================================

interface ImplementationAddresses {
  securityToken: string;
  escrowVault: string;
  compliance: string;
  dividendDistributor: string;
  maxBalanceModule: string;
  lockupModule: string;
}

interface FactoryData {
  owner: string;
  paused: boolean;
  requireApproval: boolean;
  creationFee: bigint;
  platformFeeBps: bigint;
  platformFeeRecipient: string;
  projectNFT: string;
  defaultPriceFeed: string;
  projectCounter: bigint;
  implementations: ImplementationAddresses;
}

// ============================================
// NETWORK BADGE COMPONENT
// ============================================

function NetworkBadge({ 
  chainName, 
  isTestnet 
}: { 
  chainName: string; 
  isTestnet: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-raised/50 rounded-lg">
      <div className={`w-2 h-2 rounded-full ${isTestnet ? 'bg-yellow-400' : 'bg-green-400'}`} />
      <span className="text-sm text-ink-muted">{chainName}</span>
      {isTestnet && (
        <span className="text-xs px-1.5 py-0.5 bg-warning/20 text-warning rounded">
          Testnet
        </span>
      )}
    </div>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export default function FactorySettings() {
  // Chain configuration
  const {
    chainId,
    chainName,
    contracts,
    explorerUrl,
    nativeCurrency,
    isTestnet,
    isDeployed,
    switchToChain,
    isSwitching,
    deployedChains
  } = useChainConfig();

  const publicClient = usePublicClient();
  const currencySymbol = nativeCurrency || 'ETH';

  // Factory contract address
  const factoryAddress = contracts?.RWALaunchpadFactory as `0x${string}` | undefined;

  const [factoryData, setFactoryData] = useState<FactoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'status' | 'implementations' | 'fees' | 'access'>('status');

  // Form states
  const [newCreationFee, setNewCreationFee] = useState('');
  const [newPlatformFeeBps, setNewPlatformFeeBps] = useState('');
  const [newFeeRecipient, setNewFeeRecipient] = useState('');
  const [newProjectNFT, setNewProjectNFT] = useState('');
  const [newPriceFeed, setNewPriceFeed] = useState('');
  const [newDeployerAddress, setNewDeployerAddress] = useState('');
  const [newDeployerApproval, setNewDeployerApproval] = useState(true);

  // Implementation updates
  const [newSecurityToken, setNewSecurityToken] = useState('');
  const [newEscrowVault, setNewEscrowVault] = useState('');
  const [newCompliance, setNewCompliance] = useState('');
  const [newDividendDistributor, setNewDividendDistributor] = useState('');
  const [newMaxBalanceModule, setNewMaxBalanceModule] = useState('');
  const [newLockupModule, setNewLockupModule] = useState('');

  const { writeContractAsync, data: txHash, reset: resetTx } = useWriteContract();
  const { isSuccess: txSuccess, isLoading: txLoading } = useWaitForTransactionReceipt({ hash: txHash });

  // Helper functions
  const getExplorerAddressUrl = (address: string) => {
    return explorerUrl ? `${explorerUrl}/address/${address}` : '#';
  };

  const getExplorerTxUrl = (hash: string) => {
    return explorerUrl ? `${explorerUrl}/tx/${hash}` : '#';
  };

  // Handle network switch
  const handleSwitchNetwork = async (targetChainId: number) => {
    if (switchToChain) {
      await switchToChain(targetChainId as SupportedChainId);
    }
  };

  useEffect(() => {
    fetchFactoryData();
  }, [chainId, factoryAddress, publicClient]);

  useEffect(() => {
    if (txSuccess) {
      setProcessing(false);
      setResult({ success: true, message: `Transaction successful on ${chainName}!` });
      fetchFactoryData();
      resetTx();
    }
  }, [txSuccess, chainName]);

  const fetchFactoryData = async () => {
    if (!factoryAddress || !publicClient) {
      setLoading(false);
      setFactoryData(null);
      return;
    }

    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        owner,
        paused,
        requireApproval,
        creationFee,
        platformFeeBps,
        platformFeeRecipient,
        projectNFT,
        defaultPriceFeed,
        projectCounter,
      ] = await Promise.all([
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'owner' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'paused' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'requireApproval' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'creationFee' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'platformFeeBps' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'platformFeeRecipient' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'projectNFT' }),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'defaultPriceFeed' }).catch(() => ZERO_ADDRESS),
        publicClient.readContract({ address: factoryAddress, abi: RWALaunchpadFactoryABI, functionName: 'projectCounter' }),
      ]);

      // Fetch implementations - updated struct without identityRegistry
      const implementations = await publicClient.readContract({
        address: factoryAddress,
        abi: [{
          inputs: [],
          name: 'getImplementations',
          outputs: [{
            components: [
              { name: 'securityToken', type: 'address' },
              { name: 'escrowVault', type: 'address' },
              { name: 'compliance', type: 'address' },
              { name: 'dividendDistributor', type: 'address' },
              { name: 'maxBalanceModule', type: 'address' },
              { name: 'lockupModule', type: 'address' },
            ],
            type: 'tuple'
          }],
          stateMutability: 'view',
          type: 'function'
        }],
        functionName: 'getImplementations',
      }).catch(() => ({
        securityToken: ZERO_ADDRESS,
        escrowVault: ZERO_ADDRESS,
        compliance: ZERO_ADDRESS,
        dividendDistributor: ZERO_ADDRESS,
        maxBalanceModule: ZERO_ADDRESS,
        lockupModule: ZERO_ADDRESS,
      })) as ImplementationAddresses;

      setFactoryData({
        owner: owner as string,
        paused: paused as boolean,
        requireApproval: requireApproval as boolean,
        creationFee: creationFee as bigint,
        platformFeeBps: platformFeeBps as bigint,
        platformFeeRecipient: platformFeeRecipient as string,
        projectNFT: projectNFT as string,
        defaultPriceFeed: defaultPriceFeed as string,
        projectCounter: projectCounter as bigint,
        implementations,
      });
    } catch (error) {
      console.error(`[FactorySettings] Error fetching factory data on ${chainName}:`, error);
      setResult({ success: false, message: `Failed to load factory data on ${chainName}` });
      setFactoryData(null);
    } finally {
      setLoading(false);
    }
  };

  const executeTransaction = async (functionName: string, args: any[], successMessage: string) => {
    if (!factoryAddress) {
      setResult({ success: false, message: 'Factory contract not configured' });
      return;
    }

    setProcessing(true);
    setResult(null);
    try {
      await writeContractAsync({
        address: factoryAddress,
        abi: RWALaunchpadFactoryABI,
        functionName,
        args,
      } as any);
      setResult({ success: true, message: `${successMessage} on ${chainName}` });
    } catch (error: any) {
      console.error(`[FactorySettings] Transaction failed on ${chainName}:`, error);
      setResult({ success: false, message: error.shortMessage || error.message || 'Transaction failed' });
      setProcessing(false);
    }
  };

  // Action handlers
  const handlePause = () => executeTransaction('pause', [], 'Factory paused');
  const handleUnpause = () => executeTransaction('unpause', [], 'Factory unpaused');
  const handleSetRequireApproval = (value: boolean) => executeTransaction('setRequireApproval', [value], `Approval requirement ${value ? 'enabled' : 'disabled'}`);
  const handleSetCreationFee = () => executeTransaction('setCreationFee', [parseEther(newCreationFee || '0')], 'Creation fee updated');
  const handleSetPlatformFeeBps = () => executeTransaction('setPlatformFeeBps', [BigInt(newPlatformFeeBps || '0')], 'Platform fee updated');
  const handleSetFeeRecipient = () => executeTransaction('setPlatformFeeRecipient', [newFeeRecipient], 'Fee recipient updated');
  const handleSetProjectNFT = () => executeTransaction('setProjectNFT', [newProjectNFT], 'Project NFT updated');
  const handleSetPriceFeed = () => executeTransaction('setDefaultPriceFeed', [newPriceFeed], 'Price feed updated');
  const handleSetDeployerApproval = () => executeTransaction('setDeployerApproval', [newDeployerAddress, newDeployerApproval], `Deployer ${newDeployerApproval ? 'approved' : 'revoked'}`);

  // Implementation handlers - removed IdentityRegistry
  const handleSetSecurityToken = () => executeTransaction('setSecurityTokenImplementation', [newSecurityToken], 'SecurityToken implementation updated');
  const handleSetEscrowVault = () => executeTransaction('setEscrowVaultImplementation', [newEscrowVault], 'EscrowVault implementation updated');
  const handleSetCompliance = () => executeTransaction('setComplianceImplementation', [newCompliance], 'Compliance implementation updated');
  const handleSetDividendDistributor = () => executeTransaction('setDividendDistributorImplementation', [newDividendDistributor], 'DividendDistributor implementation updated');
  const handleSetMaxBalanceModule = () => executeTransaction('setMaxBalanceModuleImplementation', [newMaxBalanceModule], 'MaxBalanceModule implementation updated');
  const handleSetLockupModule = () => executeTransaction('setLockupModuleImplementation', [newLockupModule], 'LockupModule implementation updated');

  // Address Display Component
  const AddressDisplay = ({ label, address, warning }: { label: string; address: string; warning?: boolean }) => (
    <div className="flex justify-between items-center py-2 border-b border-border">
      <span className="text-ink-muted">{label}</span>
      {address && address !== ZERO_ADDRESS ? (
        <a 
          href={getExplorerAddressUrl(address)} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-gold-400 font-mono text-xs hover:underline flex items-center gap-1"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
          <ExternalLink className="w-3 h-3" />
        </a>
      ) : (
        <span className={`inline-flex items-center gap-1 ${warning ? 'text-danger' : 'text-warning'}`}>
          {warning && <XCircle className="w-3.5 h-3.5" />} Not Set
        </span>
      )}
    </div>
  );

  // Input with Button Component
  const InputWithButton = ({ 
    label, placeholder, value, setValue, onClick, buttonText, disabled 
  }: { 
    label: string; placeholder: string; value: string; setValue: (v: string) => void; onClick: () => void; buttonText: string; disabled?: boolean 
  }) => (
    <div className="space-y-2">
      <label className="block text-ink-muted text-sm">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="flex-1 p-3 bg-surface-raised border border-border-strong rounded-lg text-ink placeholder-ink-faint text-sm font-mono"
        />
        <button
          onClick={onClick}
          disabled={disabled || processing || !value}
          className="px-4 py-3 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-ink font-medium text-sm whitespace-nowrap flex items-center gap-2"
        >
          {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : buttonText}
        </button>
      </div>
    </div>
  );

  // Not deployed state
  if (!factoryAddress) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-ink flex items-center gap-3">
            <Settings className="w-7 h-7 text-gold-400" />
            Factory Settings
          </h2>
          <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
        </div>

        <div className="bg-surface rounded-xl p-8 text-center border border-border">
          <AlertCircle className="w-16 h-16 text-warning mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-ink mb-2">Factory Not Deployed</h3>
          <p className="text-ink-muted mb-6">
            RWALaunchpadFactory contract is not configured for {chainName}.
          </p>
          
          {deployedChains.length > 0 && (
            <div>
              <p className="text-ink-faint text-sm mb-3">Switch to a network with factory deployed:</p>
              <div className="flex justify-center gap-2 flex-wrap">
                {deployedChains
                  .filter(chain => chain.id !== chainId)
                  .map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => handleSwitchNetwork(chain.id)}
                      disabled={isSwitching}
                      className="px-4 py-2 bg-gold-600 hover:bg-gold-500 text-ink rounded-lg transition disabled:opacity-50"
                    >
                      {isSwitching ? <RefreshCw className="w-4 h-4 animate-spin" /> : chain.name}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-ink flex items-center gap-3">
            <Settings className="w-7 h-7 text-gold-400" />
            Factory Settings
          </h2>
          <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
        </div>
        <div className="bg-surface rounded-xl p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-surface-raised rounded w-1/4"></div>
            <div className="h-10 bg-surface-raised rounded"></div>
            <div className="h-10 bg-surface-raised rounded"></div>
          </div>
          <p className="text-ink-faint text-center mt-4">Loading factory data from {chainName}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-ink flex items-center gap-3">
          <Settings className="w-7 h-7 text-gold-400" />
          Factory Settings
        </h2>
        <div className="flex items-center gap-3">
          <NetworkBadge chainName={chainName || 'Unknown'} isTestnet={isTestnet} />
          <button 
            onClick={fetchFactoryData} 
            className="px-4 py-2 bg-surface-raised hover:bg-surface-overlay rounded-lg text-ink text-sm flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Network Switcher */}
      {deployedChains.length > 1 && (
        <div className="bg-surface/50 border border-border rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="w-5 h-5 text-gold-400" />
              <span className="text-ink-muted">Manage factory on:</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {deployedChains.map((chain) => (
                <button
                  key={chain.id}
                  onClick={() => handleSwitchNetwork(chain.id)}
                  disabled={chain.id === chainId || isSwitching}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    chain.id === chainId
                      ? 'bg-gold-500/20 text-gold-400 cursor-default'
                      : 'bg-surface-raised text-ink-muted hover:bg-surface-overlay hover:text-ink'
                  } disabled:opacity-50`}
                >
                  {isSwitching ? <RefreshCw className="w-3 h-3 animate-spin" /> : chain.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Result Message */}
      {result && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          result.success 
            ? 'bg-success-muted border border-success text-success' 
            : 'bg-danger-muted border border-danger text-danger'
        }`}>
          {result.success ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{result.message}</span>
          {txHash && explorerUrl && (
            <a 
              href={getExplorerTxUrl(txHash)} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="ml-2 underline flex items-center gap-1"
            >
              View TX <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* Quick Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className={`p-4 rounded-xl ${factoryData?.paused ? 'bg-danger-muted border border-danger' : 'bg-success-muted border border-success'}`}>
          <p className="text-ink-muted text-sm">Status</p>
          <p className={`text-xl font-bold flex items-center gap-1.5 ${factoryData?.paused ? 'text-danger' : 'text-success'}`}>
            {factoryData?.paused ? <><Pause className="w-4 h-4" /> PAUSED</> : <><CheckCircle2 className="w-4 h-4" /> ACTIVE</>}
          </p>
        </div>
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-ink-muted text-sm">Projects</p>
          <p className="text-xl font-bold text-ink">{factoryData?.projectCounter?.toString() || '0'}</p>
        </div>
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-ink-muted text-sm">Creation Fee</p>
          <p className="text-xl font-bold text-ink">{formatEther(factoryData?.creationFee || 0n)} {currencySymbol}</p>
        </div>
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-ink-muted text-sm">Platform Fee</p>
          <p className="text-xl font-bold text-ink">{Number(factoryData?.platformFeeBps || 0) / 100}%</p>
        </div>
        <div className="p-4 bg-surface rounded-xl border border-border">
          <p className="text-ink-muted text-sm">Network</p>
          <p className="text-xl font-bold text-ink truncate">{chainName}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {([
          { key: 'status', label: 'Status', icon: Settings },
          { key: 'implementations', label: 'Implementations', icon: Code },
          { key: 'fees', label: 'Fees', icon: DollarSign },
          { key: 'access', label: 'Access', icon: Shield },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg font-medium transition flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.key ? 'bg-surface-raised text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-surface rounded-xl p-6 border border-border">
        {/* STATUS TAB */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <Settings className="w-5 h-5 text-gold-400" />
              Contract Status on {chainName}
            </h3>
            
            {/* Pause Controls */}
            <div className="p-4 bg-surface-raised/50 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-ink font-medium">Pause Status</p>
                  <p className="text-ink-muted text-sm">When paused, no new projects can be deployed on {chainName}</p>
                </div>
                <div className="flex gap-2">
                  {factoryData?.paused ? (
                    <button
                      onClick={handleUnpause}
                      disabled={processing}
                      className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-ink font-medium flex items-center gap-2"
                    >
                      {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      UNPAUSE
                    </button>
                  ) : (
                    <button
                      onClick={handlePause}
                      disabled={processing}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-ink font-medium flex items-center gap-2"
                    >
                      {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                      PAUSE
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Key Addresses */}
            <div>
              <h4 className="text-ink font-medium mb-3">Key Addresses</h4>
              <div className="bg-surface-raised/50 rounded-lg p-4">
                <AddressDisplay label="Owner" address={factoryData?.owner || ''} />
                <AddressDisplay label="Project NFT" address={factoryData?.projectNFT || ''} warning={!factoryData?.projectNFT || factoryData.projectNFT === ZERO_ADDRESS} />
                <AddressDisplay label="Fee Recipient" address={factoryData?.platformFeeRecipient || ''} />
                <AddressDisplay label="Price Feed" address={factoryData?.defaultPriceFeed || ''} />
              </div>
            </div>

            {/* Update ProjectNFT */}
            <InputWithButton
              label="Update Project NFT Address"
              placeholder="0x..."
              value={newProjectNFT}
              setValue={setNewProjectNFT}
              onClick={handleSetProjectNFT}
              buttonText="Update"
              disabled={!isAddress(newProjectNFT)}
            />

            {/* Update Price Feed */}
            <InputWithButton
              label="Update Default Price Feed"
              placeholder="0x..."
              value={newPriceFeed}
              setValue={setNewPriceFeed}
              onClick={handleSetPriceFeed}
              buttonText="Update"
              disabled={!isAddress(newPriceFeed)}
            />
          </div>
        )}

        {/* IMPLEMENTATIONS TAB */}
        {activeTab === 'implementations' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <Code className="w-5 h-5 text-gold-400" />
              Implementation Contracts on {chainName}
            </h3>
            <p className="text-ink-muted text-sm">These are the base contracts used when deploying new projects on {chainName}.</p>

            {/* KYC Info Box */}
            <div className="bg-gold-900/20 border border-gold-500/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="text-gold-400 font-medium">KYC is DB-Driven</p>
                  <p className="text-ink-muted text-sm">
                    KYC verification is managed through the database and KYCVerifier contract. 
                    Identity registries are no longer required as implementations.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Implementations */}
            <div className="bg-surface-raised/50 rounded-lg p-4">
              <h4 className="text-ink font-medium mb-3">Current Implementations</h4>
              <AddressDisplay label="SecurityToken" address={factoryData?.implementations?.securityToken || ''} warning />
              <AddressDisplay label="EscrowVault" address={factoryData?.implementations?.escrowVault || ''} warning />
              <AddressDisplay label="Compliance" address={factoryData?.implementations?.compliance || ''} warning />
              <AddressDisplay label="DividendDistributor" address={factoryData?.implementations?.dividendDistributor || ''} />
              <AddressDisplay label="MaxBalanceModule" address={factoryData?.implementations?.maxBalanceModule || ''} />
              <AddressDisplay label="LockupModule" address={factoryData?.implementations?.lockupModule || ''} />
            </div>

            {/* Update Forms */}
            <div className="grid gap-4">
              <InputWithButton label="SecurityToken Implementation" placeholder="0x..." value={newSecurityToken} setValue={setNewSecurityToken} onClick={handleSetSecurityToken} buttonText="Update" disabled={!isAddress(newSecurityToken)} />
              <InputWithButton label="EscrowVault Implementation" placeholder="0x..." value={newEscrowVault} setValue={setNewEscrowVault} onClick={handleSetEscrowVault} buttonText="Update" disabled={!isAddress(newEscrowVault)} />
              <InputWithButton label="Compliance Implementation" placeholder="0x..." value={newCompliance} setValue={setNewCompliance} onClick={handleSetCompliance} buttonText="Update" disabled={!isAddress(newCompliance)} />
              <InputWithButton label="DividendDistributor Implementation" placeholder="0x..." value={newDividendDistributor} setValue={setNewDividendDistributor} onClick={handleSetDividendDistributor} buttonText="Update" disabled={!isAddress(newDividendDistributor)} />
              <InputWithButton label="MaxBalanceModule Implementation" placeholder="0x..." value={newMaxBalanceModule} setValue={setNewMaxBalanceModule} onClick={handleSetMaxBalanceModule} buttonText="Update" disabled={!isAddress(newMaxBalanceModule)} />
              <InputWithButton label="LockupModule Implementation" placeholder="0x..." value={newLockupModule} setValue={setNewLockupModule} onClick={handleSetLockupModule} buttonText="Update" disabled={!isAddress(newLockupModule)} />
            </div>
          </div>
        )}

        {/* FEES TAB */}
        {activeTab === 'fees' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-success" />
              Fee Configuration on {chainName}
            </h3>

            {/* Current Fees */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-surface-raised/50 rounded-lg">
                <p className="text-ink-muted text-sm">Creation Fee</p>
                <p className="text-2xl font-bold text-ink">{formatEther(factoryData?.creationFee || 0n)} {currencySymbol}</p>
                <p className="text-ink-faint text-xs">Paid when deploying a new project</p>
              </div>
              <div className="p-4 bg-surface-raised/50 rounded-lg">
                <p className="text-ink-muted text-sm">Platform Fee</p>
                <p className="text-2xl font-bold text-ink">{Number(factoryData?.platformFeeBps || 0) / 100}%</p>
                <p className="text-ink-faint text-xs">{factoryData?.platformFeeBps?.toString() || '0'} basis points</p>
              </div>
            </div>

            {/* Fee Recipient */}
            <div className="p-4 bg-surface-raised/50 rounded-lg">
              <p className="text-ink-muted text-sm">Fee Recipient</p>
              {explorerUrl ? (
                <a 
                  href={getExplorerAddressUrl(factoryData?.platformFeeRecipient || '')} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gold-400 font-mono text-sm hover:underline flex items-center gap-1"
                >
                  {factoryData?.platformFeeRecipient}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <p className="text-ink font-mono text-sm">{factoryData?.platformFeeRecipient}</p>
              )}
            </div>

            {/* Update Forms */}
            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="block text-ink-muted text-sm">Creation Fee (in {currencySymbol})</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.001"
                    value={newCreationFee}
                    onChange={(e) => setNewCreationFee(e.target.value)}
                    placeholder="0.1"
                    className="flex-1 p-3 bg-surface-raised border border-border-strong rounded-lg text-ink placeholder-ink-faint"
                  />
                  <button
                    onClick={handleSetCreationFee}
                    disabled={processing || !newCreationFee}
                    className="px-4 py-3 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 rounded-lg text-ink font-medium flex items-center gap-2"
                  >
                    {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-ink-muted text-sm">Platform Fee (basis points, 100 = 1%)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newPlatformFeeBps}
                    onChange={(e) => setNewPlatformFeeBps(e.target.value)}
                    placeholder="250"
                    className="flex-1 p-3 bg-surface-raised border border-border-strong rounded-lg text-ink placeholder-ink-faint"
                  />
                  <button
                    onClick={handleSetPlatformFeeBps}
                    disabled={processing || !newPlatformFeeBps}
                    className="px-4 py-3 bg-gold-600 hover:bg-gold-700 disabled:opacity-50 rounded-lg text-ink font-medium flex items-center gap-2"
                  >
                    {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
                <p className="text-ink-faint text-xs">Current: {Number(factoryData?.platformFeeBps || 0)} bps = {Number(factoryData?.platformFeeBps || 0) / 100}%</p>
              </div>

              <InputWithButton
                label="Fee Recipient Address"
                placeholder="0x..."
                value={newFeeRecipient}
                setValue={setNewFeeRecipient}
                onClick={handleSetFeeRecipient}
                buttonText="Update"
                disabled={!isAddress(newFeeRecipient)}
              />
            </div>
          </div>
        )}

        {/* ACCESS TAB */}
        {activeTab === 'access' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-ink flex items-center gap-2">
              <Shield className="w-5 h-5 text-warning" />
              Access Control on {chainName}
            </h3>

            {/* Approval Requirement */}
            <div className="p-4 bg-surface-raised/50 rounded-lg">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-ink font-medium">Require Deployer Approval</p>
                  <p className="text-ink-muted text-sm">
                    {factoryData?.requireApproval 
                      ? `Only approved addresses can deploy projects on ${chainName}` 
                      : `Anyone can deploy projects on ${chainName}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
                    factoryData?.requireApproval 
                      ? 'bg-warning/20 text-warning' 
                      : 'bg-success/20 text-success'
                  }`}>
                    {factoryData?.requireApproval ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    {factoryData?.requireApproval ? 'Restricted' : 'Open'}
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleSetRequireApproval(true)}
                  disabled={processing || factoryData?.requireApproval}
                  className="flex-1 px-4 py-2 bg-gold hover:bg-gold-dark disabled:opacity-50 rounded-lg text-ink font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Enable Approval
                </button>
                <button
                  onClick={() => handleSetRequireApproval(false)}
                  disabled={processing || !factoryData?.requireApproval}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-ink font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  Disable (Open)
                </button>
              </div>
            </div>

            {/* Manage Deployer Approval */}
            <div className="p-4 bg-surface-raised/50 rounded-lg space-y-4">
              <h4 className="text-ink font-medium">Manage Deployer Approval</h4>
              <div className="space-y-2">
                <label className="block text-ink-muted text-sm">Deployer Address</label>
                <input
                  type="text"
                  value={newDeployerAddress}
                  onChange={(e) => setNewDeployerAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-3 bg-surface-raised border border-border-strong rounded-lg text-ink placeholder-ink-faint font-mono"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setNewDeployerApproval(true); handleSetDeployerApproval(); }}
                  disabled={processing || !isAddress(newDeployerAddress)}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg text-ink font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => { setNewDeployerApproval(false); handleSetDeployerApproval(); }}
                  disabled={processing || !isAddress(newDeployerAddress)}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg text-ink font-medium flex items-center justify-center gap-2"
                >
                  {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <AlertCircle className="w-4 h-4" />}
                  Revoke
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Network Info Footer */}
      <div className="bg-surface/30 border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-4 text-ink-faint flex-wrap">
            <span>Network: <span className="text-ink-muted">{chainName}</span></span>
            <span>•</span>
            <span>Chain ID: <span className="text-ink-muted">{chainId}</span></span>
            <span>•</span>
            <span>Currency: <span className="text-ink-muted">{currencySymbol}</span></span>
            <span>•</span>
            <span>Factory: <span className="text-ink-muted font-mono text-xs">{factoryAddress?.slice(0, 10)}...</span></span>
          </div>
          {explorerUrl && (
            <a
              href={getExplorerAddressUrl(factoryAddress || '')}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-gold-400 hover:text-gold-300 transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              View Factory Contract
            </a>
          )}
        </div>
      </div>

      {/* Processing Overlay */}
      {(processing || txLoading) && (
        <div className="fixed inset-0 bg-surface-sunken/50 flex items-center justify-center z-50">
          <div className="bg-surface p-6 rounded-xl text-center border border-border">
            <div className="animate-spin w-12 h-12 border-4 border-gold-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-ink">Processing transaction on {chainName}...</p>
            {txHash && explorerUrl && (
              <a 
                href={getExplorerTxUrl(txHash)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gold-400 text-sm hover:underline flex items-center justify-center gap-1 mt-2"
              >
                View on Explorer <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
