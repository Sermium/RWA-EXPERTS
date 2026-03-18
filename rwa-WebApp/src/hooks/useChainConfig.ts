// src/hooks/useChainConfig.ts
"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useSwitchChain, useChainId } from "wagmi";
import {
  setCurrentChain,
  getCurrentChainId,
  subscribeToChainChanges,
  isCurrentChainDeployed,
  getSupportedChains,
  getDeployedChains,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  getContractsForChain,  // Use explicit chain getter
  getTokensForChain,     // Use explicit chain getter
  getFeesForChain,       // Use explicit chain getter
  getChainInfo,          // Use this for chain-specific info
  ZERO_ADDRESS,
  SupportedChainId,
  ChainInfo,
  ContractsConfig,
  TokensConfig,
  FeesConfig,
} from "@/config/contracts";

export interface UseChainConfigReturn {
  // Current chain state
  chainId: SupportedChainId;
  chainName: string;
  isSupported: boolean;
  isDeployed: boolean;
  isTestnet: boolean;
  nativeCurrency: string;
  explorerUrl: string;
  
  // Contract data (null if chain not deployed)
  contracts: ContractsConfig | null;
  tokens: TokensConfig | null;
  fees: FeesConfig | null;
  
  // Chain lists
  supportedChains: ChainInfo[];
  deployedChains: ChainInfo[];
  
  // Actions
  switchToChain: (chainId: SupportedChainId) => Promise<void>;
  
  // URL helpers
  getTxUrl: (hash: string) => string;
  getAddressUrl: (address: string) => string;
  
  // Loading state
  isSwitching: boolean;
  switchError: Error | null;
}

export function useChainConfig(): UseChainConfigReturn {
  const { chain: connectedChain, isConnected } = useAccount();
  const wagmiChainId = useChainId();
  const { switchChainAsync, isPending: isSwitchPending, error: switchChainError } = useSwitchChain();
  
  const [chainId, setChainIdState] = useState<SupportedChainId>(getCurrentChainId());
  const [isSupported, setIsSupported] = useState(true);
  const [isDeployed, setIsDeployed] = useState(isCurrentChainDeployed());
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<Error | null>(null);

  // Sync when wallet chain changes
  useEffect(() => {
    const walletChainId = connectedChain?.id || wagmiChainId;
    
    if (walletChainId && isConnected) {
      const supportedChains = getSupportedChains();
      const supported = supportedChains.some(c => c.id === walletChainId);
      
      setIsSupported(supported);
      
      if (supported) {
        const typedChainId = walletChainId as SupportedChainId;
        
        // Only update if actually different to prevent loops
        if (typedChainId !== chainId) {
          setCurrentChain(typedChainId);
          setChainIdState(typedChainId);
          setIsDeployed(isCurrentChainDeployed());
          console.log(`[ChainConfig] Synced to wallet chain: ${typedChainId}`);
        }
      } else {
        console.warn(`[ChainConfig] Wallet on unsupported chain: ${walletChainId}`);
      }
    }
  }, [connectedChain?.id, wagmiChainId, isConnected, chainId]);

  // Subscribe to programmatic chain changes
  useEffect(() => {
    return subscribeToChainChanges((newChainId) => {
      if (newChainId !== chainId) {
        setChainIdState(newChainId);
        setIsDeployed(isCurrentChainDeployed());
      }
    });
  }, [chainId]);

  // Switch chain function
  const switchToChain = useCallback(async (targetChainId: SupportedChainId) => {
    if (targetChainId === chainId) return; // Already on this chain
    
    setIsSwitching(true);
    setSwitchError(null);

    try {
      if (switchChainAsync && isConnected) {
        await switchChainAsync({ chainId: targetChainId });
        console.log(`[ChainConfig] Wallet switched to: ${targetChainId}`);
      }
      
      setCurrentChain(targetChainId);
      setChainIdState(targetChainId);
      setIsDeployed(isCurrentChainDeployed());
      
      console.log(`[ChainConfig] Config updated to: ${targetChainId}`);
    } catch (error: any) {
      console.error('[ChainConfig] Switch failed:', error);
      setSwitchError(error);
      throw error;
    } finally {
      setIsSwitching(false);
    }
  }, [switchChainAsync, isConnected, chainId]);

  // Get chain info using the LOCAL chainId state (not global)
  const currentChainInfo = getChainInfo(chainId);
  const supportedChains = getSupportedChains();
  const deployedChains = getDeployedChains();

  // Build explorer URL helpers that use the current chainId
  const getTxUrl = useCallback((hash: string) => {
    const info = getChainInfo(chainId);
    return `${info?.explorerUrl || ''}/tx/${hash}`;
  }, [chainId]);

  const getAddressUrl = useCallback((address: string) => {
    const info = getChainInfo(chainId);
    return `${info?.explorerUrl || ''}/address/${address}`;
  }, [chainId]);

  return {
    chainId,
    chainName: currentChainInfo?.name || "Unknown Network",
    isSupported,
    isDeployed,
    isTestnet: currentChainInfo?.testnet ?? true,
    nativeCurrency: currentChainInfo?.nativeCurrency || 'ETH',
    explorerUrl: currentChainInfo?.explorerUrl || '',
    
    // Use explicit chain getters with the LOCAL chainId state
    contracts: isSupported && isDeployed ? getContractsForChain(chainId) : null,
    tokens: isSupported && isDeployed ? getTokensForChain(chainId) : null,
    fees: isSupported && isDeployed ? getFeesForChain(chainId) : null,
    
    supportedChains,
    deployedChains,
    
    switchToChain,
    
    getTxUrl,
    getAddressUrl,
    
    isSwitching: isSwitching || isSwitchPending,
    switchError: switchError || switchChainError || null,
  };
}
