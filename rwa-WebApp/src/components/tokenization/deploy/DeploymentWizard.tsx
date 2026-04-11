// src/components/tokenization/deploy/DeploymentWizard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, decodeEventLog, type Hash, type Address, encodeFunctionData } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWATokenizationFactoryABI, RWASecurityTokenABI } from '@/config/abis';
import CSVUploader, { type TokenAllocation } from './CSVUploader';
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, ArrowLeft, ArrowRight,
  Upload, FileText, Rocket, Coins, Users, ExternalLink, Download,
  Shield, Building2, Lock, TrendingUp
} from 'lucide-react';

type DeployStep = 'distribution' | 'review' | 'deploying' | 'minting' | 'success' | 'error';

interface DeployedContracts {
  deploymentId: bigint;
  tokenAddress: Address;
  nftAddress?: Address;
  escrowAddress?: Address;
  dividendAddress?: Address;
}

interface TokenizationApplication {
  id: string;
  user_address: string;
  asset_name: string;
  asset_type: string;
  asset_description: string;
  token_name: string;
  token_symbol: string;
  token_supply: number;
  needs_escrow: boolean;
  needs_dividends: boolean;
  documents: any;
  logo_url?: string;
  banner_url?: string;
  chain_id: number;
}

interface DeploymentWizardProps {
  application: TokenizationApplication;
  onBack: () => void;
  onClose?: () => void;
  onSuccess?: (contracts: DeployedContracts) => void;
}

export function DeploymentWizard({ application, onBack, onClose, onSuccess }: DeploymentWizardProps) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  
  const {
    chainId: currentChainId,
    chainName,
    contracts,
    explorerUrl,
    isDeployed,
    isTestnet,
    switchToChain,
    isSwitching,
    deployedChains,
    getTxUrl
  } = useChainConfig();

  const [step, setStep] = useState<DeployStep>('distribution');
  const [error, setError] = useState<string>('');
  const [allocations, setAllocations] = useState<TokenAllocation[]>([]);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContracts | null>(null);
  const [deployTxHash, setDeployTxHash] = useState<Hash | undefined>();
  const [mintTxHash, setMintTxHash] = useState<Hash | undefined>();
  const [metadataUri, setMetadataUri] = useState<string>('');
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });

  const { data: deployReceipt } = useWaitForTransactionReceipt({ hash: deployTxHash });
  const { data: mintReceipt } = useWaitForTransactionReceipt({ hash: mintTxHash });

  const isOwner = address?.toLowerCase() === application.user_address?.toLowerCase();
  const totalSupply = application.token_supply || 1000000;
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const allAllocationsValid = allocations.every(a => a.isValid) && totalAllocated <= totalSupply;

  // Parse deployment events
  useEffect(() => {
    if (deployReceipt && step === 'deploying') {
      parseDeploymentEvents(deployReceipt);
    }
  }, [deployReceipt, step]);

  // Handle mint completion
  useEffect(() => {
    if (mintReceipt && step === 'minting') {
      saveDeploymentToDatabase();
    }
  }, [mintReceipt, step]);

  const parseDeploymentEvents = async (receipt: typeof deployReceipt) => {
    if (!receipt || !contracts) return;

    try {
      let deployed: DeployedContracts | null = null;

      for (const log of receipt.logs) {
        try {
          // Look for TokenDeployed or similar event from factory
          if (log.address.toLowerCase() === contracts.RWATokenizationFactory?.toLowerCase()) {
            // Parse event - adjust based on actual event signature
            const topics = log.topics;
            if (topics.length >= 2) {
              // deploymentId is usually indexed
              const topic = log.topics[1];
              if (!topic) {
                throw new Error('Deployment event missing topic data');
              }
              const deploymentId = BigInt(topic);
              
              // Get deployment details from contract
              const deployment = await publicClient?.readContract({
                address: contracts.RWATokenizationFactory as Address,
                abi: RWATokenizationFactoryABI,
                functionName: 'getDeployment',
                args: [deploymentId],
              });

              if (deployment) {
                const d = deployment as any;
                deployed = {
                  deploymentId,
                  tokenAddress: d.securityToken,
                  nftAddress: d.projectNFT !== '0x0000000000000000000000000000000000000000' ? d.projectNFT : undefined,
                  escrowAddress: d.tradeEscrow !== '0x0000000000000000000000000000000000000000' ? d.tradeEscrow : undefined,
                  dividendAddress: d.dividendDistributor !== '0x0000000000000000000000000000000000000000' ? d.dividendDistributor : undefined,
                };
              }
            }
          }
        } catch {}
      }

      if (deployed) {
        setDeployedContracts(deployed);
        
        // If we have allocations, proceed to mint
        if (allocations.length > 0) {
          await distributeTokens (deployed.tokenAddress);
        } else {
          // No distribution needed, save directly
          await saveDeploymentToDatabase(deployed);
        }
      } else {
        setError('Deployment succeeded but failed to parse contract addresses');
        setStep('error');
      }
    } catch (err) {
      console.error('Parse error:', err);
      setError('Failed to parse deployment events');
      setStep('error');
    }
  };

  const distributeTokens = async (tokenAddress: Address) => {
    if (allocations.length === 0) return;

    setStep('minting');
    setMintProgress({ current: 0, total: allocations.length });

    try {
      const validAllocations = allocations.filter(a => a.isValid && a.amount > 0);
      
      for (let i = 0; i < validAllocations.length; i++) {
        const alloc = validAllocations[i];
        setMintProgress({ current: i + 1, total: validAllocations.length });

        // TRANSFER not mint - tokens are already minted to deployer
        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: RWASecurityTokenABI,
          functionName: 'transfer',  // Changed from 'mint'
          args: [
            alloc.address as Address,
            parseUnits(alloc.amount.toString(), 18)
          ],
          gas: BigInt(100_000),  // Transfer needs less gas
        });

        await publicClient?.waitForTransactionReceipt({ hash });
      }

      // No need to mint remaining - deployer already has all tokens
      await saveDeploymentToDatabase();
      
    } catch (err: any) {
      console.error('Distribution error:', err);
      setError(err.message || 'Failed to distribute tokens');
      setStep('error');
    }
  };

  const saveDeploymentToDatabase = async (deployed?: DeployedContracts) => {
    const finalContracts = deployed || deployedContracts;
    if (!finalContracts) return;

    try {
      const response = await fetch(`/api/tokenization/${application.id}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-wallet-address': address || '',
        },
        body: JSON.stringify({
          token_address: finalContracts.tokenAddress,
          nft_address: finalContracts.nftAddress,
          escrow_address: finalContracts.escrowAddress,
          dividend_distributor_address: finalContracts.dividendAddress,
          deployment_tx_hash: deployTxHash,
          distribution_tx_hash: mintTxHash,
          metadata_uri: metadataUri,
          chain_id: currentChainId,
          token_distribution: allocations.map(a => ({
            address: a.address,
            amount: a.amount,
            percentage: a.percentage,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save deployment');
      }

      setStep('success');
      onSuccess?.(finalContracts);
    } catch (err: any) {
      console.error('Save error:', err);
      // Don't fail the whole flow if DB save fails
      setStep('success');
      onSuccess?.(finalContracts);
    }
  };

  const uploadMetadata = async (): Promise<string> => {
    const metadata = {
      name: application.asset_name,
      description: application.asset_description,
      image: application.logo_url || '',
      attributes: [
        { trait_type: 'Asset Type', value: application.asset_type },
        { trait_type: 'Token Name', value: application.token_name },
        { trait_type: 'Token Symbol', value: application.token_symbol },
        { trait_type: 'Total Supply', value: application.token_supply?.toString() },
      ],
      properties: {
        applicationId: application.id,
        documents: application.documents,
        hasEscrow: application.needs_escrow,
        hasDividends: application.needs_dividends,
      },
    };

    const response = await fetch('/api/ipfs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata, type: 'metadata' }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload metadata to IPFS');
    }

    const { url } = await response.json();
    return url;
  };

  const handleDeploy = async () => {
    if (!isConnected || !address || !contracts?.RWATokenizationFactory) {
      setError('Please connect your wallet');
      return;
    }

    if (!isOwner) {
      setError('Only the project owner can deploy');
      return;
    }

    try {
      setStep('deploying');
      setError('');

      // Upload metadata to IPFS
      const uri = await uploadMetadata();
      setMetadataUri(uri);

      // Determine which deploy function to use
      let functionName: string;
      if (application.needs_escrow) {
        functionName = 'deployWithEscrow';
      } else {
        functionName = 'deployNFTAndToken';
      }

      // Deploy contracts
      const hash = await writeContractAsync({
        address: contracts.RWATokenizationFactory as Address,
        abi: RWATokenizationFactoryABI,
        functionName: functionName as any,
        args: [
          application.token_name,
          application.token_symbol,
          parseUnits(totalSupply.toString(), 18),
          uri,
        ],
        gas: BigInt(10_000_000),
      });

      setDeployTxHash(hash);
    } catch (err: any) {
      console.error('Deploy error:', err);
      if (err.message?.includes('user rejected')) {
        setError('Transaction rejected by user');
      } else {
        setError(err.message || 'Deployment failed');
      }
      setStep('error');
    }
  };

  // Render different states
  const renderContent = () => {
    switch (step) {
      case 'distribution':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Token Distribution</h3>
              <p className="text-slate-400 text-sm">
                Upload a CSV file to specify how tokens should be distributed after deployment.
                Leave empty to receive all tokens to your wallet.
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Total Supply</span>
                <span className="text-white font-semibold">
                  {totalSupply.toLocaleString()} {application.token_symbol}
                </span>
              </div>
            </div>

            <CSVUploader
              totalSupply={totalSupply}
              allocations={allocations}
              onAllocationsChange={setAllocations}
            />

            <div className="flex gap-4 pt-4">
              <button
                onClick={onBack}
                className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back
              </button>
              <button
                onClick={() => setStep('review')}
                disabled={allocations.length > 0 && !allAllocationsValid}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Continue to Review
                <ArrowRight className="w-4 h-4 inline ml-2" />
              </button>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Review Deployment</h3>
              <p className="text-slate-400 text-sm">
                Review the deployment details before proceeding.
              </p>
            </div>

            {/* Project summary */}
            <div className="bg-slate-700/50 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-4">
                {application.logo_url && (
                  <img 
                    src={application.logo_url} 
                    alt="" 
                    className="w-14 h-14 rounded-xl object-cover"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-white">{application.asset_name}</h4>
                  <p className="text-sm text-slate-400">{application.asset_type}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-600">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Token Name</p>
                  <p className="text-white font-medium">{application.token_name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Token Symbol</p>
                  <p className="text-white font-medium">{application.token_symbol}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Total Supply</p>
                  <p className="text-white font-medium">{totalSupply.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Network</p>
                  <p className="text-white font-medium">{chainName}</p>
                </div>
              </div>

              {/* Features */}
              <div className="flex gap-3 pt-4 border-t border-slate-600">
                {application.needs_escrow && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm">
                    <Lock className="w-4 h-4" />
                    Trade Escrow
                  </span>
                )}
                {application.needs_dividends && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-sm">
                    <TrendingUp className="w-4 h-4" />
                    Dividends
                  </span>
                )}
              </div>
            </div>

            {/* Distribution summary */}
            {allocations.length > 0 && (
              <div className="bg-slate-700/50 rounded-xl p-5">
                <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Token Distribution
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Recipients</span>
                    <span className="text-white">{allocations.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Tokens to distribute</span>
                    <span className="text-white">{totalAllocated.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Remaining to owner</span>
                    <span className="text-white">{(totalSupply - totalAllocated).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {allocations.length === 0 && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-blue-400 text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  All {totalSupply.toLocaleString()} tokens will be minted to your wallet ({address?.slice(0, 6)}...{address?.slice(-4)})
                </p>
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                onClick={() => setStep('distribution')}
                className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition"
              >
                <ArrowLeft className="w-4 h-4 inline mr-2" />
                Back
              </button>
              <button
                onClick={handleDeploy}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center gap-2"
              >
                <Rocket className="w-5 h-5" />
                Deploy Token
              </button>
            </div>
          </div>
        );

      case 'deploying':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 text-blue-500 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Deploying Contracts</h3>
            <p className="text-slate-400 mb-6">
              Please confirm the transaction in your wallet and wait for confirmation...
            </p>
            {deployTxHash && (
              <a
                href={getTxUrl(deployTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm font-mono inline-flex items-center gap-1"
              >
                View transaction <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        );

      case 'minting':
        return (
          <div className="text-center py-8">
            <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Distributing Tokens</h3>
            <p className="text-slate-400 mb-4">
              Minting tokens to {mintProgress.total} recipients...
            </p>
            <div className="max-w-xs mx-auto">
              <div className="flex justify-between text-sm text-slate-400 mb-1">
                <span>Progress</span>
                <span>{mintProgress.current} / {mintProgress.total}</span>
              </div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-purple-500 transition-all"
                  style={{ width: `${(mintProgress.current / mintProgress.total) * 100}%` }}
                />
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-green-400 mb-2">Deployment Successful!</h3>
            <p className="text-slate-400 mb-6">
              Your token has been deployed and is now live on {chainName}.
            </p>

            {deployedContracts && (
              <div className="bg-slate-700/50 rounded-xl p-5 text-left mb-6 max-w-md mx-auto">
                <h4 className="font-medium text-white mb-3">Contract Addresses</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Security Token</span>
                    <a
                      href={`${explorerUrl}/address/${deployedContracts.tokenAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                    >
                      {deployedContracts.tokenAddress.slice(0, 8)}...{deployedContracts.tokenAddress.slice(-6)}
                    </a>
                  </div>
                  {deployedContracts.nftAddress && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Project NFT</span>
                      <a
                        href={`${explorerUrl}/address/${deployedContracts.nftAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                      >
                        {deployedContracts.nftAddress.slice(0, 8)}...{deployedContracts.nftAddress.slice(-6)}
                      </a>
                    </div>
                  )}
                  {deployedContracts.escrowAddress && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Trade Escrow</span>
                      <a
                        href={`${explorerUrl}/address/${deployedContracts.escrowAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 font-mono text-xs"
                      >
                        {deployedContracts.escrowAddress.slice(0, 8)}...{deployedContracts.escrowAddress.slice(-6)}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.href = `/tokenization/${application.id}`}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition"
              >
                View Project
              </button>
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition"
              >
                Dashboard
              </button>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-red-400 mb-2">Deployment Failed</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => { setStep('review'); setError(''); }}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-500 transition"
              >
                Try Again
              </button>
              <button
                onClick={onBack}
                className="px-6 py-3 bg-slate-700 text-slate-300 rounded-lg font-medium hover:bg-slate-600 transition"
              >
                Go Back
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Check prerequisites
  if (!isConnected) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Connect Wallet</h3>
        <p className="text-slate-400">Please connect your wallet to deploy.</p>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="p-8 text-center">
        <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-red-400 mb-2">Access Denied</h3>
        <p className="text-slate-400">Only the project owner can deploy this token.</p>
      </div>
    );
  }

  if (!isDeployed) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-yellow-400 mb-2">Wrong Network</h3>
        <p className="text-slate-400 mb-4">Contracts not deployed on {chainName}.</p>
        {deployedChains[0] && (
          <button
            onClick={() => switchToChain(deployedChains[0].id as any)}
            disabled={isSwitching}
            className="px-6 py-3 bg-yellow-600 text-white rounded-lg font-medium hover:bg-yellow-500 disabled:opacity-50 transition"
          >
            {isSwitching ? 'Switching...' : `Switch to ${deployedChains[0].name}`}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <h2 className="text-xl font-semibold text-white">Deploy Token</h2>
        <div className="flex items-center gap-3">
          {isTestnet && (
            <span className="px-2.5 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-medium rounded-full">
              Testnet
            </span>
          )}
          <span className="px-2.5 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded-full">
            {chainName}
          </span>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Step indicator */}
      {['distribution', 'review'].includes(step) && (
        <div className="flex items-center gap-2 mb-6">
          {['distribution', 'review', 'deploy'].map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-2 ${
                (step === 'distribution' && i === 0) ||
                (step === 'review' && i <= 1)
                  ? 'text-blue-400' : 'text-slate-500'
              }`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  (step === 'distribution' && i === 0) ||
                  (step === 'review' && i <= 1)
                    ? 'bg-blue-500/20' : 'bg-slate-700'
                }`}>
                  {i + 1}
                </div>
                <span className="text-sm hidden sm:inline">
                  {s === 'distribution' ? 'Distribution' : s === 'review' ? 'Review' : 'Deploy'}
                </span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-slate-700" />}
            </React.Fragment>
          ))}
        </div>
      )}

      {renderContent()}
    </div>
  );
}