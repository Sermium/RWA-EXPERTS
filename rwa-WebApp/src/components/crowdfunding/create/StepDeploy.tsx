'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient
} from 'wagmi';
import { parseUnits, formatEther, decodeEventLog, type Hash, type Address } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWALaunchpadFactoryABI, RWAProjectNFTABI } from '@/config/abis';

type DeployStatus = 'idle' | 'connecting' | 'uploading' | 'waitingWallet' | 'confirming' | 'activating' | 'saving' | 'success' | 'error';

interface DeployedContracts {
  projectId: bigint;
  securityToken: Address;
  escrowVault: Address;
  compliance: Address;
  nftTokenId?: bigint;
}

interface ActivationData {
  activatedAt: Date;
  raiseEndDate: Date;
  deadlineDays: number;
}

interface CrowdfundingApplication {
  id: string;
  wallet_address: string;
  project_name: string;
  description: string;
  category: string;
  website: string;
  funding_goal: number;
  token_name: string;
  token_symbol: string;
  total_supply: number;
  token_price: number;
  investor_share_percentage: number;
  projected_roi: number;
  roi_timeline_months: number;
  revenue_model: string;
  milestones: any[];
  logo_url: string;
  banner_url: string;
  pitch_deck_url: string;
  legal_documents: any[];
  images: string[];
  video_url: string;
  company_name: string;
  jurisdiction: string;
  status: string;
  chain_id: number;
  platform_fee: number;
  local_currency: string;
  exchange_rate: number;
}

interface StepDeployProps {
  application: CrowdfundingApplication;
  deadlineDays?: number;
  onBack: () => void;
  onClose?: () => void;
  onSuccess?: (contracts: DeployedContracts, activation: ActivationData) => void;
}

export function StepDeploy({ application, deadlineDays = 30, onBack, onClose, onSuccess }: StepDeployProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  
  const { 
    chainId: currentChainId,
    chainName, 
    contracts, 
    fees, 
    explorerUrl, 
    nativeCurrency,
    isDeployed, 
    isTestnet, 
    switchToChain, 
    isSwitching, 
    deployedChains, 
    getTxUrl
  } = useChainConfig();

  const { writeContractAsync } = useWriteContract();

  const [status, setStatus] = useState<DeployStatus>('idle');
  const [error, setError] = useState('');
  const [deployedContracts, setDeployedContracts] = useState<DeployedContracts | null>(null);
  const [activationData, setActivationData] = useState<ActivationData | null>(null);
  const [txHash, setTxHash] = useState<Hash | undefined>();
  const [activationTxHash, setActivationTxHash] = useState<Hash | undefined>();
  const [creationFee, setCreationFee] = useState<bigint>(BigInt(0));
  const [selectedDeadlineDays, setSelectedDeadlineDays] = useState(deadlineDays);
  const [showContractDetails, setShowContractDetails] = useState(false);

  const previewEndDate = new Date();
  previewEndDate.setDate(previewEndDate.getDate() + selectedDeadlineDays);

  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });
  const { data: activationReceipt } = useWaitForTransactionReceipt({ hash: activationTxHash });

  const isOwner = address?.toLowerCase() === application.wallet_address?.toLowerCase();
  const canActivate = application.status === 'approved' && isOwner;

  // Fetch creation fee
  useEffect(() => {
    async function fetchContractState() {
      if (!publicClient || !contracts?.RWALaunchpadFactory || !isDeployed) return;
      
      try {
        // Fetch all relevant contract state

        const implementations = await publicClient.readContract({
          address: contracts.RWALaunchpadFactory as Address,
          abi: RWALaunchpadFactoryABI,
          functionName: 'getImplementations',
        });

        console.log('Implementations:', implementations);
        const [fee, requireApprovalState, ownerAddress, isApproved] = await Promise.all([
          publicClient.readContract({
            address: contracts.RWALaunchpadFactory as Address,
            abi: RWALaunchpadFactoryABI,
            functionName: 'creationFee',
          }),
          publicClient.readContract({
            address: contracts.RWALaunchpadFactory as Address,
            abi: RWALaunchpadFactoryABI,
            functionName: 'requireApproval',
          }),
          publicClient.readContract({
            address: contracts.RWALaunchpadFactory as Address,
            abi: RWALaunchpadFactoryABI,
            functionName: 'owner',
          }),
          address ? publicClient.readContract({
            address: contracts.RWALaunchpadFactory as Address,
            abi: RWALaunchpadFactoryABI,
            functionName: 'approvedDeployers',
            args: [address],
          }) : Promise.resolve(false),
        ]);

        console.log('=== CONTRACT STATE ===');
        console.log('Factory address:', contracts.RWALaunchpadFactory);
        console.log('Creation fee:', fee?.toString(), 'wei');
        console.log('Require approval:', requireApprovalState);
        console.log('Contract owner:', ownerAddress);
        console.log('Your wallet:', address);
        console.log('Is owner?:', (ownerAddress as string)?.toLowerCase() === address?.toLowerCase());
        console.log('Is approved deployer?:', isApproved);
        console.log('======================');

        setCreationFee(fee as bigint);
      } catch (err) {
        console.error('Failed to fetch contract state:', err);
        if (fees?.CREATION_FEE) setCreationFee(BigInt(fees.CREATION_FEE));
      }
    }
    
    fetchContractState();
  }, [publicClient, contracts, fees, isDeployed, nativeCurrency, address]);

  useEffect(() => {
    if (receipt && status === 'confirming') parseDeploymentEvents(receipt);
  }, [receipt, status]);

  useEffect(() => {
    if (activationReceipt && status === 'activating' && deployedContracts && activationData) {
      saveActivationToDatabase(deployedContracts, activationData);
    }
  }, [activationReceipt, status, deployedContracts, activationData]);

  const saveActivationToDatabase = async (deployed: DeployedContracts, activation: ActivationData) => {
    setStatus('saving');
    try {
      const response = await fetch(`/api/crowdfunding/applications/${application.id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          escrow_vault_address: deployed.escrowVault,
          security_token_address: deployed.securityToken,
          compliance_address: deployed.compliance,
          project_nft_id: deployed.nftTokenId?.toString(),
          deployment_tx_hash: txHash,
          activation_tx_hash: activationTxHash,
          chain_id: currentChainId,
          deadline_days: activation.deadlineDays,
          activated_at: activation.activatedAt.toISOString(),
          raise_end_date: activation.raiseEndDate.toISOString(),
        }),
      });
      if (!response.ok) throw new Error((await response.json()).error || 'Failed to save');
      setStatus('success');
      onSuccess?.(deployed, activation);
    } catch (err) {
      console.error('Save failed:', err);
      setStatus('success');
    }
  };

  const activateProject = async (projectId: bigint, activation: ActivationData) => {
    if (!contracts?.RWALaunchpadFactory) return;
    try {
      setStatus('activating');
      const hash = await writeContractAsync({
        address: contracts.RWALaunchpadFactory as Address,
        abi: RWALaunchpadFactoryABI,
        functionName: 'activateProject',
        args: [projectId],
      });
      setActivationTxHash(hash);
    } catch (err) {
      console.error('Activation failed:', err);
      if (deployedContracts) saveActivationToDatabase(deployedContracts, activation);
    }
  };

  const parseDeploymentEvents = async (txReceipt: typeof receipt) => {
    if (!txReceipt || !contracts) return;
    try {
      let deployed: DeployedContracts | null = null;
      for (const log of txReceipt.logs) {
        try {
          if (log.address.toLowerCase() === contracts.RWALaunchpadFactory?.toLowerCase()) {
            const decoded = decodeEventLog({ abi: RWALaunchpadFactoryABI, data: log.data, topics: log.topics });
            if (decoded.eventName === 'ProjectDeployed') {
              const args = decoded.args as any;
              deployed = { projectId: args.projectId, securityToken: args.securityToken, escrowVault: args.escrowVault, compliance: args.compliance };
            }
          }
          if (log.address.toLowerCase() === contracts.RWAProjectNFT?.toLowerCase() && deployed) {
            const decoded = decodeEventLog({ abi: RWAProjectNFTABI, data: log.data, topics: log.topics });
            if (decoded.eventName === 'ProjectCreated') deployed.nftTokenId = (decoded.args as any).tokenId;
          }
        } catch {}
      }
      if (deployed) {
        setDeployedContracts(deployed);
        const activatedAt = new Date();
        const raiseEndDate = new Date(activatedAt);
        raiseEndDate.setDate(raiseEndDate.getDate() + selectedDeadlineDays);
        const activation = { activatedAt, raiseEndDate, deadlineDays: selectedDeadlineDays };
        setActivationData(activation);
        await activateProject(deployed.projectId, activation);
      } else {
        setError('Deployment succeeded but failed to parse events.');
        setStatus('success');
      }
    } catch (err) {
      console.error('Parse failed:', err);
      setStatus('success');
    }
  };

  const handleConnect = useCallback(() => {
    setStatus('connecting');
    const injected = connectors.find(c => c.id === 'injected' || c.id === 'metaMask');
    if (injected) connect({ connector: injected }, { 
      onSuccess: () => setStatus('idle'), 
      onError: (err) => { setError(err.message); setStatus('error'); } 
    });
  }, [connect, connectors]);

  const handleDeploy = async () => {
    if (!isConnected || !address) return handleConnect();
    if (!canActivate) { 
      setError(!isOwner ? 'Only the project owner can activate.' : `Cannot activate: ${application.status}`); 
      setStatus('error'); 
      return; 
    }
    if (!isDeployed || !contracts) { 
      setError(`Contracts not deployed on ${chainName}.`); 
      setStatus('error'); 
      return; 
    }

    // ===== DEBUG LOGGING =====
    console.log('=== FULL DEPLOYMENT DEBUG ===');
    console.log('Contract address:', contracts.RWALaunchpadFactory);
    console.log('Creation fee from contract:', creationFee?.toString(), 'wei');
    console.log('Wallet address:', address);
    console.log('Application:', {
      id: application.id,
      token_name: application.token_name,
      token_symbol: application.token_symbol,
      category: application.category,
      total_supply: application.total_supply,
      funding_goal: application.funding_goal,
    });
    console.log('Deadline days:', selectedDeadlineDays);
    // ===========================

    try {
      setStatus('uploading');
      setError('');

      const metadata = {
        name: application.project_name,
        description: application.description || '',
        image: application.logo_url || '',
        external_url: application.website || '',
        attributes: [
          { trait_type: 'Category', value: application.category },
          { trait_type: 'Token Symbol', value: application.token_symbol },
          { trait_type: 'Funding Goal', value: application.funding_goal?.toString() },
        ],
        properties: { 
          applicationId: application.id, 
          tokenName: application.token_name, 
          fundingGoal: application.funding_goal,
          milestones: application.milestones || [],
        },
      };

      const ipfsRes = await fetch('/api/ipfs/upload', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ metadata, type: 'metadata' }) 
      });
      if (!ipfsRes.ok) throw new Error((await ipfsRes.json()).error || 'IPFS upload failed');
      const { url } = await ipfsRes.json();

      // ===== DEBUG: Log all args before calling contract =====
      const tokenName = application.token_name || application.project_name;
      const tokenSymbol = application.token_symbol || 'RWA';
      const category = application.category || 'real-estate';
      const maxSupply = parseUnits((application.total_supply || 1000000).toString(), 18);
      const fundingGoal = parseUnits((application.funding_goal || 100000).toString(), 6);
      const deadlineDays = BigInt(selectedDeadlineDays);

      console.log('=== CONTRACT CALL ARGS ===');
      console.log('tokenName:', tokenName);
      console.log('tokenSymbol:', tokenSymbol);
      console.log('category:', category);
      console.log('maxSupply:', maxSupply.toString(), '(raw wei)');
      console.log('fundingGoal:', fundingGoal.toString(), '(raw 6 decimals)');
      console.log('deadlineDays:', deadlineDays.toString());
      console.log('metadataUri:', url);
      console.log('value (creation fee):', creationFee.toString(), 'wei');
      console.log('=============================');
      // =========================================================

      setStatus('waitingWallet');

      const hash = await writeContractAsync({
        address: contracts.RWALaunchpadFactory as Address,
        abi: RWALaunchpadFactoryABI,
        functionName: 'deployProject',
        args: [
          tokenName,
          tokenSymbol,
          category,
          maxSupply,
          fundingGoal,
          deadlineDays,
          url,
        ],
        value: creationFee,
      });

      console.log('=== TX SUBMITTED ===');
      console.log('Hash:', hash);

      setTxHash(hash);
      setStatus('confirming');
    } catch (err: any) {
      console.error('=== DEPLOY FAILED ===');
      console.error('Error:', err);
      console.error('Message:', err.message);
      
      if (err.message?.includes('user rejected')) setError('Transaction rejected.');
      else if (err.message?.includes('insufficient funds')) setError(`Insufficient ${nativeCurrency}.`);
      else setError(err.message || 'Deployment failed');
      setStatus('error');
    }
  };

  const formatShortDate = (d: Date) => d.toLocaleDateString('en-US', { 
    month: 'short', day: 'numeric', year: 'numeric' 
  });

  const getStepStatus = (step: DeployStatus[]) => {
    if (step.includes(status)) return 'active';
    const order: DeployStatus[] = ['idle', 'uploading', 'waitingWallet', 'confirming', 'activating', 'saving', 'success'];
    const currentIdx = order.indexOf(status);
    const stepIdx = Math.min(...step.map(s => order.indexOf(s)));
    return currentIdx > stepIdx ? 'complete' : 'pending';
  };

  // ============ MODAL HEADER (shared across all states) ============
  const ModalHeader = ({ title }: { title: string }) => (
    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex items-center gap-3">
        {isTestnet && (
          <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
            Testnet
          </span>
        )}
        {chainName && (
          <span className="px-2.5 py-1 bg-gold-500/20 text-gold-400 text-xs font-medium rounded-full">
            {chainName}
          </span>
        )}
        {onClose && (
          <button 
            onClick={onClose}
            className="ml-2 p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  // ============ RENDER STATES ============

  // Not connected
  if (!isConnected) {
    return (
      <div className="p-8">
        <ModalHeader title="Activate Fundraise" />
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-gold-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h3>
          <p className="text-sm text-gray-400 mb-6">Connect your wallet to activate the fundraise.</p>
          <button 
            onClick={handleConnect} 
            disabled={status === 'connecting'} 
            className="px-8 py-3 bg-gold-600 text-white rounded-lg font-medium hover:bg-gold-700 disabled:opacity-50 transition-colors"
          >
            {status === 'connecting' ? 'Connecting...' : 'Connect Wallet'}
          </button>
        </div>
      </div>
    );
  }

  // Access denied - not owner
  if (!isOwner) {
    return (
      <div className="p-8">
        <ModalHeader title="Activate Fundraise" />
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">Access Denied</h3>
          <p className="text-sm text-gray-400 mb-6">Only the project owner can activate this fundraise.</p>
          <div className="text-sm text-gray-500 bg-slate-700/50 p-4 rounded-lg mb-6 inline-block text-left">
            <p className="mb-1">
              <span className="text-gray-400">Your wallet:</span>{' '}
              <span className="text-gray-300 font-mono">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </p>
            <p>
              <span className="text-gray-400">Owner:</span>{' '}
              <span className="text-gray-300 font-mono">{application.wallet_address?.slice(0, 6)}...{application.wallet_address?.slice(-4)}</span>
            </p>
          </div>
          <div>
            <button 
              onClick={() => disconnect()} 
              className="px-8 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Disconnect & Switch Wallet
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wrong network
  if (!isDeployed) {
    return (
      <div className="p-8">
        <ModalHeader title="Activate Fundraise" />
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-yellow-400 mb-2">Wrong Network</h3>
          <p className="text-sm text-gray-400 mb-6">
            {chainName ? `Contracts not deployed on ${chainName}.` : 'Please connect to a supported network.'}
          </p>
          {deployedChains[0] && (
            <button 
              onClick={() => switchToChain(deployedChains[0].id as any)} 
              disabled={isSwitching} 
              className="px-8 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              {isSwitching ? 'Switching...' : `Switch to ${deployedChains[0].name}`}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Success
  if (status === 'success' && deployedContracts && activationData) {
    return (
      <div className="p-8">
        <ModalHeader title="Activation Complete" />
        
        {/* Success icon & message */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-green-400 mb-2">Fundraise Activated!</h3>
          <p className="text-sm text-gray-400">
            Project #{deployedContracts.projectId.toString()} is now live
          </p>
        </div>

        {/* Timeline */}
        <div className="bg-gradient-to-r from-green-900/20 to-gold-light-900/20 rounded-xl p-5 mb-6 border border-green-500/20">
          <h4 className="text-sm font-medium text-gray-300 mb-4">Fundraise Timeline</h4>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Started</p>
              <p className="text-lg font-semibold text-green-400">{formatShortDate(activationData.activatedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Ends</p>
              <p className="text-lg font-semibold text-gold-400">{formatShortDate(activationData.raiseEndDate)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50 text-sm text-gray-400">
            Duration: <span className="text-white font-medium">{activationData.deadlineDays} days</span>
          </div>
        </div>

        {/* Contract details (collapsible) */}
        <div className="mb-6">
          <button 
            onClick={() => setShowContractDetails(!showContractDetails)} 
            className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-300 py-2"
          >
            <span className="font-medium">Contract Details</span>
            <svg 
              className={`w-5 h-5 transition-transform ${showContractDetails ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showContractDetails && (
            <div className="bg-slate-700/30 rounded-lg p-4 mt-2 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Security Token</span>
                <a 
                  href={`${explorerUrl}/address/${deployedContracts.securityToken}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gold-400 hover:text-gold-300 font-mono text-xs"
                >
                  {deployedContracts.securityToken.slice(0, 10)}...{deployedContracts.securityToken.slice(-6)}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Escrow Vault</span>
                <a 
                  href={`${explorerUrl}/address/${deployedContracts.escrowVault}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gold-400 hover:text-gold-300 font-mono text-xs"
                >
                  {deployedContracts.escrowVault.slice(0, 10)}...{deployedContracts.escrowVault.slice(-6)}
                </a>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Compliance</span>
                <a 
                  href={`${explorerUrl}/address/${deployedContracts.compliance}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-gold-400 hover:text-gold-300 font-mono text-xs"
                >
                  {deployedContracts.compliance.slice(0, 10)}...{deployedContracts.compliance.slice(-6)}
                </a>
              </div>
              {deployedContracts.nftTokenId !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-400">NFT Token ID</span>
                  <span className="text-gold-400 font-medium">#{deployedContracts.nftTokenId.toString()}</span>
                </div>
              )}
              {txHash && (
                <div className="flex justify-between items-center pt-3 border-t border-slate-600/50">
                  <span className="text-sm text-gray-400">Deploy Tx</span>
                  <a 
                    href={getTxUrl(txHash)} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gold-400 hover:text-gold-300 font-mono text-xs"
                  >
                    {txHash.slice(0, 10)}...{txHash.slice(-6)}
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button 
            onClick={() => window.location.href = `/projects/${application.id}`} 
            className="flex-1 px-6 py-3 bg-gold-600 text-white rounded-lg font-medium hover:bg-gold-700 transition-colors"
          >
            View Project
          </button>
          <button 
            onClick={() => window.location.href = '/dashboard'} 
            className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Error
  if (status === 'error') {
    return (
      <div className="p-8">
        <ModalHeader title="Activation Failed" />
        <div className="text-center py-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-red-400 mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-md mx-auto">{error}</p>
          <div className="flex gap-4 justify-center">
            <button 
              onClick={() => { setStatus('idle'); setError(''); }} 
              className="px-8 py-3 bg-gold-600 text-white rounded-lg font-medium hover:bg-gold-700 transition-colors"
            >
              Try Again
            </button>
            <button 
              onClick={onBack} 
              className="px-8 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============ MAIN FORM ============
  return (
    <div className="p-8">
      <ModalHeader title="Activate Fundraise" />

      {/* Project info card */}
      <div className="flex items-center gap-4 p-4 bg-slate-700/40 rounded-xl mb-6">
        {application.logo_url && (
          <img 
            src={application.logo_url} 
            alt="" 
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0" 
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-lg truncate">{application.project_name}</h3>
          <p className="text-sm text-gray-400">
            {application.token_symbol} Â· ${application.funding_goal?.toLocaleString()} goal Â· {application.total_supply?.toLocaleString()} tokens
          </p>
        </div>
      </div>

      {/* Deadline selector */}
      {status === 'idle' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Fundraise Duration</label>
          <div className="grid grid-cols-5 gap-2">
            {[14, 30, 45, 60, 90].map(d => (
              <button 
                key={d} 
                onClick={() => setSelectedDeadlineDays(d)} 
                className={`py-3 text-sm rounded-lg font-medium transition-all ${
                  selectedDeadlineDays === d 
                    ? 'bg-gold-600 text-white ring-2 ring-blue-400 ring-offset-2 ring-offset-slate-800' 
                    : 'bg-slate-700 text-gray-400 hover:bg-slate-600 hover:text-gray-300'
                }`}
              >
                {d} days
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline preview */}
      {status === 'idle' && (
        <div className="bg-slate-700/40 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-white">Timeline Preview</span>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-gray-500 mb-1">Starts</p>
              <p className="text-lg font-semibold text-green-400">Now</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Ends</p>
              <p className="text-lg font-semibold text-gold-400">{formatShortDate(previewEndDate)}</p>
            </div>
          </div>
          {creationFee > BigInt(0) && (
            <div className="mt-4 pt-4 border-t border-slate-600/50 flex justify-between text-sm">
              <span className="text-gray-400">Creation Fee</span>
              <span className="text-white font-medium">{formatEther(creationFee)} {nativeCurrency}</span>
            </div>
          )}
        </div>
      )}

      {/* Progress steps */}
      {status !== 'idle' && (
        <div className="mb-6">
          <div className="space-y-4">
            {[
              { key: ['uploading'], label: 'Uploading metadata to IPFS' },
              { key: ['waitingWallet'], label: 'Confirm in your wallet' },
              { key: ['confirming'], label: 'Deploying contracts' },
              { key: ['activating'], label: 'Activating project' },
              { key: ['saving'], label: 'Saving to database' },
            ].map(({ key, label }) => {
              const stepStatus = getStepStatus(key as DeployStatus[]);
              return (
                <div key={key[0]} className="flex items-center gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    stepStatus === 'complete' ? 'bg-green-500' : 
                    stepStatus === 'active' ? 'bg-gold-500' : 'bg-slate-600'
                  }`}>
                    {stepStatus === 'complete' && (
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {stepStatus === 'active' && (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    stepStatus === 'complete' ? 'text-green-400' : 
                    stepStatus === 'active' ? 'text-gold-400 font-medium' : 'text-gray-500'
                  }`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Transaction link */}
          {txHash && (
            <div className="mt-6 p-4 bg-slate-700/40 rounded-xl">
              <p className="text-xs text-gray-400 mb-2">Transaction Submitted</p>
              <a 
                href={getTxUrl(txHash)} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gold-400 hover:text-gold-300 text-sm font-mono break-all"
              >
                {txHash}
              </a>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <button 
          onClick={onBack} 
          disabled={status !== 'idle'} 
          className="px-6 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          Back
        </button>
        <button 
          onClick={handleDeploy} 
          disabled={status !== 'idle'} 
          className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-colors"
        >
          {status === 'idle' 
            ? 'Activate Fundraise' 
            : status === 'uploading' ? 'Uploading...'
            : status === 'waitingWallet' ? 'Confirm in Wallet...'
            : status === 'confirming' ? 'Deploying...'
            : status === 'activating' ? 'Activating...'
            : status === 'saving' ? 'Saving...'
            : 'Processing...'
          }
        </button>
      </div>
    </div>
  );
}
