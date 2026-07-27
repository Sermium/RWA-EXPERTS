// src/components/ConnectButton.tsx
'use client';

import { useAccount, useConnect, useDisconnect, useChainId, useReconnect } from 'wagmi';
import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { useChainConfig } from '@/hooks/useChainConfig';
import { SupportedChainId } from '@/config/contracts';
import Image from 'next/image';

// Wallet icons
const walletIcons: Record<string, string> = {
  metaMask: '🦊',
  'io.metamask': '🦊',
  phantom: '👻',
  'app.phantom': '👻',
  coinbaseWallet: '🔵',
  coinbaseWalletSDK: '🔵',
  walletConnect: '🔗',
  injected: '💼',
  'app.subwallet': '📱',
};

const walletNames: Record<string, string> = {
  metaMask: 'MetaMask',
  'io.metamask': 'MetaMask',
  phantom: 'Phantom',
  'app.phantom': 'Phantom',
  coinbaseWallet: 'Coinbase Wallet',
  coinbaseWalletSDK: 'Coinbase Wallet',
  walletConnect: 'WalletConnect',
  injected: 'Browser Wallet',
  'app.subwallet': 'SubWallet',
};

// Chain logos mapping
const chainLogos: Record<number, string> = {
  43113: '/chains/avalanche.svg',
  43114: '/chains/avalanche.svg',
  137: '/chains/polygon.svg',
  80002: '/chains/polygon.svg',
  1: '/chains/ethereum.svg',
  11155111: '/chains/ethereum.svg',
  42161: '/chains/arbitrum.svg',
  421614: '/chains/arbitrum.svg',
  8453: '/chains/base.svg',
  84532: '/chains/base.svg',
  10: '/chains/optimism.svg',
  56: '/chains/bnb.svg',
  97: '/chains/bnb.svg',
  31337: '/chains/ethereum.svg',
  25: '/chains/cronos.svg',
  338: '/chains/cronos.svg',
};

// Chain Logo Component
function ChainLogo({ chainId, size = 24, className = "" }: { chainId: number; size?: number; className?: string }) {
  const logo = chainLogos[chainId];
  const [hasError, setHasError] = useState(false);

  if (!logo || hasError) {
    return (
      <div 
        className={`rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-ink" style={{ fontSize: size * 0.5 }}>⛓</span>
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt="Chain logo"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
      onError={() => setHasError(true)}
    />
  );
}

// Connect Modal Context
interface ConnectModalContextType {
  openConnectModal: () => void;
  closeConnectModal: () => void;
  isOpen: boolean;
  isConnecting: boolean;
}

const ConnectModalContext = createContext<ConnectModalContextType | null>(null);

export function useConnectModal() {
  const context = useContext(ConnectModalContext);
  const [isOpen, setIsOpen] = useState(false);
  const { isPending } = useConnect();
  
  if (!context) {
    return {
      openConnectModal: () => setIsOpen(true),
      closeConnectModal: () => setIsOpen(false),
      isOpen,
      isConnecting: isPending,
    };
  }
  
  return context;
}

export function ConnectModalProvider({ children }: { children: ReactNode }) {
  const { isPending } = useConnect();
  const [isOpen, setIsOpen] = useState(false);

  const openConnectModal = useCallback(() => setIsOpen(true), []);
  const closeConnectModal = useCallback(() => setIsOpen(false), []);

  return (
    <ConnectModalContext.Provider value={{ 
      openConnectModal, 
      closeConnectModal, 
      isOpen, 
      isConnecting: isPending 
    }}>
      {children}
      {isOpen && <WalletModal onClose={closeConnectModal} />}
    </ConnectModalContext.Provider>
  );
}

// Check if wallet provider is available
function isProviderAvailable(connectorId: string): boolean {
  if (typeof window === 'undefined') return false;
  
  const ethereum = (window as any).ethereum;
  
  if (!ethereum) return false;
  
  // Check for specific wallet providers
  if (connectorId === 'metaMask' || connectorId === 'io.metamask') {
    return ethereum.isMetaMask === true;
  }
  
  if (connectorId === 'coinbaseWallet' || connectorId === 'coinbaseWalletSDK') {
    return ethereum.isCoinbaseWallet === true || ethereum.providers?.some((p: any) => p.isCoinbaseWallet);
  }
  
  if (connectorId === 'phantom' || connectorId === 'app.phantom') {
    return ethereum.isPhantom === true || !!(window as any).phantom?.ethereum;
  }
  
  // For injected, just check if ethereum exists
  if (connectorId === 'injected') {
    return true;
  }
  
  // WalletConnect doesn't need a provider check
  if (connectorId === 'walletConnect') {
    return true;
  }
  
  return true;
}

// Wallet Selection Modal
function WalletModal({ onClose }: { onClose: () => void }) {
  const { connect, connectors, isPending, error } = useConnect();
  const { isConnected, address } = useAccount();
  const { reconnect } = useReconnect();
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (isConnected && address) {
      console.log('Connected to:', address);
      onClose();
    }
  }, [isConnected, address, onClose]);

  // Filter and deduplicate connectors, also check availability
  const availableConnectors = connectors
    .filter((connector, index, self) => {
      const isFirst = index === self.findIndex(c => c.id === connector.id);
      if (connector.id === 'injected') {
        const hasSpecific = self.some(c => 
          c.id !== 'injected' && c.type === 'injected'
        );
        return !hasSpecific;
      }
      return isFirst;
    })
    .filter((connector, index, self) => {
      const name = walletNames[connector.id] || connector.name;
      const firstWithName = self.findIndex(c => 
        (walletNames[c.id] || c.name) === name
      );
      return index === firstWithName;
    });

  const handleConnect = async (connector: typeof connectors[0]) => {
    console.log('Attempting to connect with:', connector.id, connector.name);
    setConnectingId(connector.id);
    setLocalError(null);

    try {
      // Check if provider is available for injected wallets
      const isInjected = connector.type === 'injected' || 
                         connector.id === 'injected' || 
                         connector.id === 'metaMask' ||
                         connector.id === 'io.metamask';
      
      if (isInjected && typeof window !== 'undefined') {
        const ethereum = (window as any).ethereum;
        
        if (!ethereum) {
          setConnectingId(null);
          setLocalError('No wallet detected. Please install MetaMask or another Web3 wallet.');
          
          // Open MetaMask install page after a short delay
          setTimeout(() => {
            if (confirm('Would you like to install MetaMask?')) {
              window.open('https://metamask.io/download/', '_blank');
            }
          }, 100);
          return;
        }
        
        // Check for specific wallet
        if ((connector.id === 'metaMask' || connector.id === 'io.metamask') && !ethereum.isMetaMask) {
          // MetaMask not detected, but another wallet might be
          const hasOtherWallet = ethereum.isCoinbaseWallet || ethereum.isPhantom;
          if (hasOtherWallet) {
            setConnectingId(null);
            setLocalError('MetaMask not detected. Please use the detected wallet or install MetaMask.');
            return;
          }
        }
      }

      // Proceed with connection
      connect(
        { connector },
        {
          onSuccess: (data) => {
            console.log('Connection successful:', data);
            setConnectingId(null);
            onClose();
          },
          onError: (err) => {
            console.error('Connection failed:', err);
            setConnectingId(null);
            
            const errorMessage = err.message || '';
            const errorName = (err as any).name || '';
            
            // Handle ProviderNotFoundError (check message since it's not in type union)
            if (errorName === 'ProviderNotFoundError' || 
                errorMessage.includes('Provider not found') ||
                errorMessage.includes('No provider was found')) {
              setLocalError('Wallet not detected. Please install a Web3 wallet like MetaMask.');
              return;
            }
            
            // Handle already connected
            if (errorMessage.includes('already connected') || 
                errorMessage.includes('Connector already connected')) {
              try {
                reconnect();
              } catch (e) {
                console.log('Reconnect attempt:', e);
              }
              onClose();
              return;
            }
            
            // Handle user rejection
            if (errorMessage.includes('User rejected') || 
                errorMessage.includes('user rejected')) {
              setLocalError('Connection cancelled by user');
              return;
            }

            // Handle provider.on error
            if (errorMessage.includes('provider.on is not a function')) {
              setLocalError('Wallet connection issue. Please refresh the page and try again.');
              return;
            }

            // Handle chain not configured
            if (errorMessage.includes('Chain not configured')) {
              setLocalError('Network not supported. Please switch to a supported network in your wallet.');
              return;
            }
            
            setLocalError(errorMessage || 'Connection failed. Please try again.');
          },
        }
      );
    } catch (err: any) {
      console.error('Connection error:', err);
      setConnectingId(null);
      
      const errorMessage = err?.message || '';
      const errorName = err?.name || '';
      
      if (errorName === 'ProviderNotFoundError' || 
          errorMessage.includes('Provider not found')) {
        setLocalError('No wallet detected. Please install MetaMask.');
      } else {
        setLocalError(errorMessage || 'Connection failed');
      }
    }
  };

  // Check if any wallet is available
  const hasAnyWallet = typeof window !== 'undefined' && !!(window as any).ethereum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-surface-sunken/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative bg-surface rounded-2xl border border-border shadow-panel w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-xl font-bold text-ink">Connect Wallet</h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {(error || localError) && (
          <div className="mx-4 mt-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <p className="text-danger text-sm">{localError || error?.message}</p>
          </div>
        )}

        {/* No wallet detected message */}
        {!hasAnyWallet && (
          <div className="mx-4 mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🦊</span>
              <div>
                <p className="text-amber-400 font-medium">No wallet detected</p>
                <p className="text-sm text-ink-muted mt-1">
                  Install a Web3 wallet to connect to the platform.
                </p>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-black font-medium rounded-lg transition-colors text-sm"
                >
                  Install MetaMask
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        )}
        
        <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
          {availableConnectors.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-ink-muted">No wallet connectors available.</p>
              <p className="text-ink-faint text-sm mt-2">
                Please install MetaMask or another Web3 wallet.
              </p>
            </div>
          ) : (
            availableConnectors.map((connector) => {
              const isConnecting = connectingId === connector.id;
              const icon = walletIcons[connector.id] || '💼';
              const name = walletNames[connector.id] || connector.name;
              
              // Check if this specific connector is available
              const isInjected = connector.type === 'injected' || connector.id === 'injected';
              const isWalletConnect = connector.id === 'walletConnect';
              const providerAvailable = isWalletConnect || (hasAnyWallet && isInjected) || isProviderAvailable(connector.id);
              
              return (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  disabled={isPending || isConnecting}
                  className={`
                    w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group
                    ${providerAvailable 
                      ? 'bg-surface-raised hover:bg-surface-overlay' 
                      : 'bg-surface-raised/50 opacity-60'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <span className="text-3xl">{icon}</span>
                  <div className="flex-1 text-left">
                    <div className="text-ink font-semibold group-hover:text-gold transition-colors">
                      {name}
                    </div>
                    {!providerAvailable && !isWalletConnect && (
                      <div className="text-xs text-ink-faint">Not installed</div>
                    )}
                  </div>
                  {isConnecting ? (
                    <div className="w-5 h-5 border-2 border-gold border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-5 h-5 text-ink-faint group-hover:text-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              );
            })
          )}
        </div>
        
        <div className="p-4 border-t border-border bg-surface-raised/50">
          <p className="text-ink-muted text-sm text-center">
            By connecting, you agree to the Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}

// Main Connect Button with integrated Chain Selector
export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const [showModal, setShowModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNetworks, setShowNetworks] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { 
    chainId, 
    chainName, 
    isTestnet, 
    isDeployed, 
    deployedChains, 
    switchToChain, 
    isSwitching,
    explorerUrl
  } = useChainConfig();

  const context = useContext(ConnectModalContext);
  const openModal = context ? context.openConnectModal : () => setShowModal(true);
  const closeModal = context ? context.closeConnectModal : () => setShowModal(false);
  const isModalOpen = context ? context.isOpen : showModal;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setShowNetworks(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyAddress = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleNetworkSwitch = async (newChainId: SupportedChainId) => {
    try {
      await switchToChain(newChainId);
      setShowNetworks(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
    }
  };

  if (!isConnected || !address) {
    return (
      <>
        <button
          onClick={openModal}
          className="bg-gold hover:bg-gold-light text-surface-sunken font-semibold px-5 py-2.5 rounded-lg transition-all duration-200 shadow-lg shadow-gold/25"
        >
          Connect Wallet
        </button>

        {!context && isModalOpen && <WalletModal onClose={closeModal} />}
      </>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Main Button */}
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          setShowNetworks(false);
        }}
        className="flex items-center gap-2 bg-surface-raised hover:bg-surface-overlay border border-border rounded-xl px-3 py-2 transition-all"
      >
        {/* Chain Logo */}
        <div className="relative">
          {isSwitching ? (
            <div className="w-6 h-6 rounded-full bg-surface-overlay flex items-center justify-center">
              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ChainLogo chainId={chainId} size={24} />
          )}
        </div>

        {/* Status dot */}
        <div className={`w-2 h-2 rounded-full ${isDeployed ? 'bg-green-500' : 'bg-yellow-500'}`} />

        {/* Address */}
        <span className="text-ink font-mono text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>

        {/* Dropdown Arrow */}
        <svg 
          className={`w-4 h-4 text-ink-muted transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-xl shadow-panel z-50 overflow-hidden">
          
          {/* Network Section */}
          <div className="p-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-ink-faint uppercase tracking-wider font-medium">Network</span>
              {!isDeployed && (
                <span className="text-xs text-yellow-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
                  Not Deployed
                </span>
              )}
            </div>
            
            <button
              onClick={() => setShowNetworks(!showNetworks)}
              className="w-full flex items-center justify-between p-2.5 bg-surface-raised hover:bg-gray-750 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-3">
                <ChainLogo chainId={chainId} size={32} />
                <div className="text-left">
                  <div className="text-ink font-medium text-sm">{chainName}</div>
                  <div className="text-xs text-ink-muted">
                    {isTestnet ? 'Testnet' : 'Mainnet'}
                  </div>
                </div>
              </div>
              <svg 
                className={`w-4 h-4 text-ink-muted transition-transform ${showNetworks ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Network List */}
            {showNetworks && (
              <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                {deployedChains.length > 0 ? (
                  deployedChains.map((chain) => {
                    const isSelected = chain.id === chainId;
                    
                    return (
                      <button
                        key={chain.id}
                        onClick={() => handleNetworkSwitch(chain.id)}
                        disabled={isSwitching}
                        className={`
                          w-full flex items-center gap-3 p-2.5 rounded-lg transition-all
                          ${isSelected
                            ? 'bg-gold/10 border border-gold/50'
                            : 'bg-surface-raised/50 hover:bg-surface-raised border border-transparent'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        <ChainLogo chainId={chain.id} size={28} />
                        <div className="flex-1 text-left">
                          <div className="text-ink text-sm font-medium">{chain.name}</div>
                          <div className="text-xs text-ink-faint">
                            {chain.testnet ? 'Testnet' : 'Mainnet'}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-gold flex items-center justify-center">
                            <svg className="w-3 h-3 text-surface-sunken" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-ink-faint text-sm">
                    No deployed networks available
                  </div>
                )}
                
                {deployedChains.length === 1 && (
                  <div className="mt-2 p-2 bg-gold/10 border border-gold/30 rounded-lg">
                    <p className="text-xs text-gold text-center">
                      More networks coming soon!
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Wallet Section */}
          <div className="p-3 border-b border-border">
            <div className="text-xs text-ink-faint uppercase tracking-wider font-medium mb-2">Wallet</div>
            <div className="flex items-center justify-between p-2.5 bg-surface-raised rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold to-gold-light" />
                <div>
                  <div className="text-ink font-mono text-sm">{address.slice(0, 6)}...{address.slice(-4)}</div>
                  <div className="text-xs text-ink-faint">Connected</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopyAddress}
                  className="p-1.5 hover:bg-surface-overlay rounded-lg transition-colors"
                  title={copied ? 'Copied!' : 'Copy address'}
                >
                  {copied ? (
                    <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-ink-muted hover:text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
                <a
                  href={`${explorerUrl}/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 hover:bg-surface-overlay rounded-lg transition-colors"
                  title="View on explorer"
                >
                  <svg className="w-4 h-4 text-ink-muted hover:text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Disconnect */}
          <div className="p-2">
            <button
              onClick={() => {
                disconnect();
                setShowDropdown(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-danger hover:bg-danger/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="text-sm font-medium">Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
