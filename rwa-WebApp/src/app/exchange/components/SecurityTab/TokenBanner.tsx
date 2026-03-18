'use client';

import { useState, useEffect } from 'react';
import { usePublicClient } from 'wagmi';
import { formatUnits } from 'viem';
import { ListedToken, SecurityTokenData, SecurityOrderBookData } from '../../types';
import { formatSupply } from '../../utils';

// ERC20 ABI for balanceOf and totalSupply
const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface TokenBannerProps {
  selectedListedToken: ListedToken | null;
  selectedSecurityToken: SecurityTokenData | null;
  securityOrderBook: SecurityOrderBookData;
  explorerUrl: string;
}

export function TokenBanner({
  selectedListedToken,
  selectedSecurityToken,
  securityOrderBook,
  explorerUrl,
}: TokenBannerProps) {
  const publicClient = usePublicClient();
  const [showDocuments, setShowDocuments] = useState(false);
  const [tokenImage, setTokenImage] = useState<string | null>(null);
  const [tokenImageLoading, setTokenImageLoading] = useState(false);
  
  // On-chain data
  const [onChainData, setOnChainData] = useState<{
    totalSupply: string | null;
    ownerBalance: string | null;
    loading: boolean;
  }>({
    totalSupply: null,
    ownerBalance: null,
    loading: false,
  });

  // Fetch token image from metadata
  useEffect(() => {
    const fetchTokenImage = async () => {
      const metadataUri = selectedListedToken?.projects?.metadata_uri;
      if (!metadataUri) { setTokenImage(null); return; }
      setTokenImageLoading(true);
      try {
        const response = await fetch(metadataUri);
        if (response.ok) {
          const metadata = await response.json();
          setTokenImage(metadata.image || null);
        }
      } catch { setTokenImage(null); }
      finally { setTokenImageLoading(false); }
    };
    fetchTokenImage();
  }, [selectedListedToken?.projects?.metadata_uri]);

  // Fetch on-chain data (totalSupply + owner balance)
  useEffect(() => {
    const fetchOnChainData = async () => {
      const tokenAddress = selectedListedToken?.token_address;
      const ownerAddress = selectedListedToken?.projects?.owner_address;
      
      if (!publicClient || !tokenAddress) {
        setOnChainData({ totalSupply: null, ownerBalance: null, loading: false });
        return;
      }

      setOnChainData(prev => ({ ...prev, loading: true }));
      
      try {
        const decimals = selectedListedToken?.decimals || 18;
        
        // Fetch total supply
        const totalSupplyRaw = await publicClient.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'totalSupply',
        });
        const totalSupply = formatUnits(totalSupplyRaw, decimals);

        // Fetch owner balance if owner address exists
        let ownerBalance: string | null = null;
        if (ownerAddress) {
          const ownerBalanceRaw = await publicClient.readContract({
            address: tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [ownerAddress as `0x${string}`],
          });
          ownerBalance = formatUnits(ownerBalanceRaw, decimals);
        }

        setOnChainData({
          totalSupply,
          ownerBalance,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching on-chain data:', error);
        setOnChainData({ totalSupply: null, ownerBalance: null, loading: false });
      }
    };

    fetchOnChainData();
  }, [publicClient, selectedListedToken?.token_address, selectedListedToken?.projects?.owner_address, selectedListedToken?.decimals]);

  // Reset states when token changes
  useEffect(() => {
    if (!selectedListedToken) {
      setTokenImage(null);
      setOnChainData({ totalSupply: null, ownerBalance: null, loading: false });
    }
  }, [selectedListedToken]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDocuments && !(event.target as Element).closest('.documents-dropdown')) {
        setShowDocuments(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDocuments]);

  if (!selectedListedToken && !selectedSecurityToken) return null;

  // Use on-chain data if available, fallback to database
  const totalSupply = onChainData.totalSupply 
    ? parseFloat(onChainData.totalSupply) 
    : (selectedListedToken?.projects?.total_supply || 0);
  
  const ownerBalance = onChainData.ownerBalance 
    ? parseFloat(onChainData.ownerBalance) 
    : null;

  const price = securityOrderBook.bestBid > 0 
    ? securityOrderBook.bestBid 
    : parseFloat(String(selectedListedToken?.current_price || selectedListedToken?.initial_price || '1'));

  // Calculate owner's percentage of total supply
  const ownerPercentage = ownerBalance !== null && totalSupply > 0
    ? ((ownerBalance / totalSupply) * 100).toFixed(2)
    : null;

  // Calculate market cap
  const marketCap = price * totalSupply;

  return (
    <div className="relative rounded-xl overflow-visible">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/40 via-purple-900/30 to-gray-900 rounded-xl"></div>
      
      <div className="relative p-6 border border-gray-700/50 rounded-xl backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          
          {/* Token Identity */}
          <div className="flex items-start gap-4">
            <div className="relative">
              {tokenImageLoading ? (
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                </div>
              ) : tokenImage ? (
                <img src={tokenImage} alt="Token" className="w-16 h-16 rounded-2xl object-cover border border-gray-700" onError={() => setTokenImage(null)} />
              ) : (
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold">
                  {(selectedListedToken?.symbol || selectedSecurityToken?.symbol || '?')[0]}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center border-2 border-gray-900">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl font-bold">{selectedListedToken?.symbol || selectedSecurityToken?.symbol}</h2>
                <span className="text-gray-400">/USDC</span>
                <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">{selectedListedToken ? 'RWA' : 'Security'}</span>
              </div>
              <p className="text-gray-400 text-sm">{selectedListedToken?.name || selectedSecurityToken?.name}</p>
              {selectedListedToken?.token_address && (
                <a href={`${explorerUrl}/token/${selectedListedToken.token_address}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2">
                  <span className="font-mono">{selectedListedToken.token_address.slice(0, 6)}...{selectedListedToken.token_address.slice(-4)}</span>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </a>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Price */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <span className="text-xs text-gray-500 uppercase">Price</span>
              <div className="text-xl font-bold mt-1">${price.toFixed(4)}</div>
              <span className="text-xs text-gray-500">{securityOrderBook.bestBid > 0 ? 'Market' : 'Initial'}</span>
            </div>
            
            {/* Market Cap */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <span className="text-xs text-gray-500 uppercase">Market Cap</span>
              <div className="text-xl font-bold mt-1">
                {onChainData.loading ? (
                  <div className="animate-pulse bg-gray-700 h-7 w-20 rounded"></div>
                ) : (
                  `$${formatSupply(marketCap)}`
                )}
              </div>
              <span className="text-xs text-gray-500">Price × Supply</span>
            </div>
            
            {/* Total Supply */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <span className="text-xs text-gray-500 uppercase">Total Supply</span>
              <div className="text-xl font-bold mt-1">
                {onChainData.loading ? (
                  <div className="animate-pulse bg-gray-700 h-7 w-20 rounded"></div>
                ) : (
                  formatSupply(totalSupply)
                )}
              </div>
              <span className="text-xs text-gray-500">
                {onChainData.totalSupply ? 'On-chain' : 'Database'} • {selectedListedToken?.symbol}
              </span>
            </div>
            
            {/* Owner with Balance */}
            <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
              <span className="text-xs text-gray-500 uppercase">Token Owner</span>
              {selectedListedToken?.projects?.owner_address ? (
                <>
                  <a
                    href={`${explorerUrl}/address/${selectedListedToken.projects.owner_address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-mono text-blue-400 hover:text-blue-300 block mt-1"
                  >
                    {selectedListedToken.projects.owner_address.slice(0, 6)}...{selectedListedToken.projects.owner_address.slice(-4)}
                  </a>
                  
                  {/* Owner Balance */}
                  <div className="mt-2 pt-2 border-t border-gray-700/50">
                    {onChainData.loading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                        <span className="text-xs text-gray-500">Loading...</span>
                      </div>
                    ) : ownerBalance !== null ? (
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Balance:</span>
                          <span className="text-sm font-medium text-white">
                            {formatSupply(ownerBalance)}
                          </span>
                        </div>
                        {ownerPercentage && (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-xs text-gray-500">Ownership:</span>
                            <span className={`text-xs font-medium ${
                              parseFloat(ownerPercentage) > 50 ? 'text-yellow-400' : 'text-green-400'
                            }`}>
                              {ownerPercentage}%
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500">Balance unavailable</span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-sm text-gray-500 mt-1 block">N/A</span>
              )}
            </div>
          </div>

          {/* Documents Dropdown */}
          <div className="lg:w-56 documents-dropdown relative">
            <button onClick={() => setShowDocuments(!showDocuments)} className="w-full flex items-center justify-between gap-2 bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="font-medium">Documents</span>
                {(selectedListedToken?.documents?.files?.length || 0) > 0 && (
                  <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">{selectedListedToken?.documents?.files?.length}</span>
                )}
              </div>
              <svg className={`w-4 h-4 text-gray-400 transition-transform ${showDocuments ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>

            {showDocuments && (
              <div className="absolute right-0 mt-2 w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden" style={{ maxHeight: '400px' }}>
                <div className="overflow-y-auto" style={{ maxHeight: '380px' }}>
                  {selectedListedToken?.projects?.metadata_uri && (
                    <a href={selectedListedToken.projects.metadata_uri} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 border-b border-gray-700/50">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg></div>
                      <div className="flex-1"><div className="text-sm font-medium">Token Metadata</div><div className="text-xs text-gray-500">IPFS</div></div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                  {selectedListedToken?.projects?.nft_address && (
                    <a href={`${explorerUrl}/token/${selectedListedToken.projects.nft_address}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 border-b border-gray-700/50">
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg></div>
                      <div className="flex-1"><div className="text-sm font-medium">Asset NFT</div><div className="text-xs text-gray-500">Contract</div></div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                  {selectedListedToken?.documents?.website && (
                    <a href={selectedListedToken.documents.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 border-b border-gray-700/50">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg></div>
                      <div className="flex-1"><div className="text-sm font-medium">Website</div><div className="text-xs text-gray-500 truncate">{selectedListedToken.documents.website.replace(/^https?:\/\//, '')}</div></div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  )}
                  {selectedListedToken?.documents?.files?.map((doc, i) => (
                    <a key={i} href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-700/50 border-b border-gray-700/50 last:border-0">
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center"><svg className="w-4 h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg></div>
                      <div className="flex-1"><div className="text-sm font-medium capitalize">{doc.type?.replace(/_/g, ' ')}</div><div className="text-xs text-gray-500">{doc.mimeType?.split('/')[1]?.toUpperCase()} • {(doc.size / 1024).toFixed(0)} KB</div></div>
                      <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                    </a>
                  ))}
                  {!selectedListedToken?.projects?.metadata_uri && !selectedListedToken?.documents?.files?.length && !selectedListedToken?.documents?.website && (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">No documents available</div>
                  )}
                </div>
              </div>
            )}
            
            {(selectedListedToken?.asset_description || selectedListedToken?.projects?.description) && (
              <div className="mt-3 p-3 bg-gray-800/30 rounded-lg border border-gray-700/30">
                <p className="text-xs text-gray-400 line-clamp-3">{selectedListedToken?.asset_description || selectedListedToken?.projects?.description}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
