// src/components/tokenization/deploy/DeploymentWizard.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, type Hash, type Address } from 'viem';
import { useChainConfig } from '@/hooks/useChainConfig';
import { RWATokenizationFactoryABI, RWASecurityTokenABI } from '@/config/abis';
import CSVUploader, { type TokenAllocation } from './CSVUploader';
import {
  Loader2, CheckCircle2, XCircle, AlertCircle, ArrowLeft, ArrowRight,
  Rocket, Lock, TrendingUp, Users, ExternalLink
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

const BATCH_SIZE = 50;

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
  } = useChainConfig();

  const [step, setStep] = useState<DeployStep>('distribution');
  const [error, setError] = useState<string>('');
  const [allocations, setAllocations] = useState<TokenAllocation[]>([]);
  const [deployedContracts, setDeployedContracts] = useState<DeployedContracts | null>(null);
  const [deployTxHash, setDeployTxHash] = useState<Hash | undefined>();
  const [mintTxHash, setMintTxHash] = useState<Hash | undefined>();
  const [metadataUri, setMetadataUri] = useState<string>('');
  const [mintProgress, setMintProgress] = useState({ current: 0, total: 0 });

  const isOwner = address?.toLowerCase() === application.user_address?.toLowerCase();
  const totalSupply = application.token_supply || 1000000;
  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainingTokens = totalSupply - totalAllocated;
  const allAllocationsValid = allocations.every(a => a.isValid) && totalAllocated <= totalSupply;

  const getTxUrl = (hash: string) => `${explorerUrl}/tx/${hash}`;
  const getAddressUrl = (addr: string) => `${explorerUrl}/address/${addr}`;

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

  const parseDeploymentEvents = async (receipt: any): Promise<DeployedContracts | null> => {
    if (!receipt || !contracts) return null;

    try {
      for (const log of receipt.logs) {
        if (log.address.toLowerCase() === contracts.RWATokenizationFactory?.toLowerCase()) {
          const topics = log.topics;
          if (topics && topics.length >= 2 && topics[1]) {
            const deploymentId = BigInt(topics[1]);
            
            const deployment = await publicClient?.readContract({
              address: contracts.RWATokenizationFactory as Address,
              abi: RWATokenizationFactoryABI,
              functionName: 'getDeployment',
              args: [deploymentId],
            });

            if (deployment) {
              const d = deployment as any;
              return {
                deploymentId,
                tokenAddress: d.securityToken,
                nftAddress: d.projectNFT !== '0x0000000000000000000000000000000000000000' ? d.projectNFT : undefined,
                escrowAddress: d.tradeEscrow !== '0x0000000000000000000000000000000000000000' ? d.tradeEscrow : undefined,
                dividendAddress: d.dividendDistributor !== '0x0000000000000000000000000000000000000000' ? d.dividendDistributor : undefined,
              };
            }
          }
        }
      }
    } catch (err) {
      console.error('Parse error:', err);
    }
    return null;
  };

  // Pass contracts and txHash as parameters to avoid stale state issues
  const saveDeploymentToDatabase = async (
    contracts: DeployedContracts,
    deployHash: Hash | undefined,
    mintHash: Hash | undefined,
    uri: string
  ) => {
    const payload = {
      token_address: contracts.tokenAddress,
      nft_address: contracts.nftAddress || null,
      nft_token_id: Number(contracts.deploymentId),
      escrow_address: contracts.escrowAddress || null,
      deployment_tx_hash: deployHash,
      metadata_uri: uri,
      chain_id: currentChainId,
    };

    console.log('=== SAVING DEPLOYMENT ===');
    console.log('Application ID:', application.id);
    console.log('Payload:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(`/api/tokenization/${application.id}/deploy`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-wallet-address': address || '',
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response body:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save deployment');
      }

      console.log('Deployment saved successfully!');
      console.log('Token listed on exchange:', result.listed);
      
    } catch (err) {
      console.error('Database save error:', err);
      throw err;
    }
  };

  // Accept contracts as parameter to ensure we have the data
  const mintTokens = async (
    tokenAddress: Address, 
    contracts: DeployedContracts,
    deployHash: Hash | undefined,
    uri: string
  ) => {
    setStep('minting');

    try {
      const validAllocations = allocations.filter(a => a.isValid && a.amount > 0);

      // Use BigInt for ALL calculations to avoid floating-point errors
      const maxSupplyWei = parseUnits(totalSupply.toString(), 18);
      
      // Build mint arrays with BigInt amounts directly
      const mintAddresses: Address[] = [];
      const mintAmounts: bigint[] = [];
      let totalAllocatedWei = BigInt(0);

      for (const alloc of validAllocations) {
        const amountWei = parseUnits(alloc.amount.toString(), 18);
        mintAddresses.push(alloc.address as Address);
        mintAmounts.push(amountWei);
        totalAllocatedWei += amountWei;
      }

      // Calculate remaining using BigInt (exact, no floating-point error)
      const remainingWei = maxSupplyWei - totalAllocatedWei;

      // Add remaining to deployer if any
      if (remainingWei > 0n && address) {
        mintAddresses.push(address as Address);
        mintAmounts.push(remainingWei);
      }

      // Verify total doesn't exceed max supply
      const totalToMint = mintAmounts.reduce((sum, amt) => sum + amt, BigInt(0));
      if (totalToMint > maxSupplyWei) {
        throw new Error(`Total mint amount (${totalToMint}) exceeds max supply (${maxSupplyWei})`);
      }

      console.log('=== MINT DEBUG ===');
      console.log('Max supply (wei):', maxSupplyWei.toString());
      console.log('Total allocated (wei):', totalAllocatedWei.toString());
      console.log('Remaining (wei):', remainingWei.toString());
      console.log('Total to mint (wei):', totalToMint.toString());
      console.log('Recipients:', mintAddresses.length);

      // Batch mint
      const totalBatches = Math.ceil(mintAddresses.length / BATCH_SIZE);
      setMintProgress({ current: 0, total: mintAddresses.length });

      let lastMintHash: Hash | undefined;

      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const start = batchIndex * BATCH_SIZE;
        const end = Math.min(start + BATCH_SIZE, mintAddresses.length);
        
        const batchAddresses = mintAddresses.slice(start, end);
        const batchAmounts = mintAmounts.slice(start, end);

        console.log(`Batch ${batchIndex + 1}/${totalBatches}:`, batchAddresses.length, 'recipients');

        const hash = await writeContractAsync({
          address: tokenAddress,
          abi: RWASecurityTokenABI,
          functionName: 'batchMint',
          args: [batchAddresses, batchAmounts],
          gas: BigInt(150_000 * batchAddresses.length + 100_000),
        });

        lastMintHash = hash;
        setMintTxHash(hash);
        await publicClient?.waitForTransactionReceipt({ hash });
        setMintProgress({ current: end, total: mintAddresses.length });
      }

      // Save to database with all the data passed as parameters
      await saveDeploymentToDatabase(contracts, deployHash, lastMintHash, uri);
      
      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess(contracts);
      }
      
      setStep('success');
    } catch (err: any) {
      console.error('Mint/save error:', err);
      setError(err.message || 'Failed to mint tokens');
      setStep('error');
    }
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
      const functionName = application.needs_escrow ? 'deployWithEscrow' : 'deployNFTAndToken';

      // Deploy contracts (no mint - just creates the token)
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
        gas: BigInt(5_000_000),
      });

      setDeployTxHash(hash);

      // Wait for deployment confirmation
      const receipt = await publicClient?.waitForTransactionReceipt({ hash });
      
      // Parse deployment events to get contract addresses
      const deployed = await parseDeploymentEvents(receipt);
      
      if (!deployed) {
        throw new Error('Failed to parse deployment - contract addresses not found');
      }

      setDeployedContracts(deployed);

      // Now mint tokens - pass all required data as parameters
      await mintTokens(deployed.tokenAddress, deployed, hash, uri);

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

  // Render different steps
  const renderContent = () => {
    switch (step) {
      case 'distribution':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Token Distribution</h3>
              <p className="text-slate-400 text-sm">
                Specify how tokens should be distributed. Add recipients manually or upload a CSV.
                Unallocated tokens will be minted to your wallet.
              </p>
            </div>

            <div className="bg-slate-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400">Total Supply</span>
                <span className="text-white font-semibold">
                  {totalSupply.toLocaleString()} {application.token_symbol}
                </span>
              </div>
              {allocations.length > 0 && (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400">Allocated</span>
                    <span className="text-white">
                      {totalAllocated.toLocaleString()} ({((totalAllocated / totalSupply) * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">To your wallet</span>
                    <span className="text-blue-400">
                      {remainingTokens.toLocaleString()} ({((remainingTokens / totalSupply) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </>
              )}
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
            <div className="bg-slate-700/50 rounded-xl p-5">
              <h4 className="font-medium text-white mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Token Distribution
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Recipients from list</span>
                  <span className="text-white">{allocations.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tokens to recipients</span>
                  <span className="text-white">{totalAllocated.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Tokens to your wallet</span>
                  <span className="text-blue-400">{remainingTokens.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-slate-600">
                  <span className="text-slate-400">Total mint transactions</span>
                  <span className="text-white">
                    {Math.ceil((allocations.length + (remainingTokens > 0 ? 1 : 0)) / BATCH_SIZE)} batch(es)
                  </span>
                </div>
              </div>
            </div>

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
            <h3 className="text-xl font-semibold text-white mb-2">Minting Tokens</h3>
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
            {mintTxHash && (
              <a
                href={getTxUrl(mintTxHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm font-mono inline-flex items-center gap-1 mt-4"
              >
                View latest transaction <ExternalLink className="w-3 h-3" />
              </a>
            )}
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
              Your token has been deployed and tokens have been minted.
            </p>

            {deployedContracts && (
              <div className="bg-slate-700/50 rounded-xl p-5 text-left mb-6 max-w-md mx-auto">
                <h4 className="font-medium text-white mb-3">Contract Addresses</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Security Token</span>
                    <a
                      href={getAddressUrl(deployedContracts.tokenAddress)}
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
                        href={getAddressUrl(deployedContracts.nftAddress)}
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
                        href={getAddressUrl(deployedContracts.escrowAddress)}
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

  // Prerequisites checks
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
