// src/app/admin/kyc/components/SearchSection.tsx
'use client';

import { useState } from 'react';
import { Search, Loader2, X, User } from 'lucide-react';
import { isValidAddress, formatAddress } from '../utils';
import { SearchResult, StoredSubmission } from '../types';
import { StatusBadge, TierBadge } from './StatusBadge';
import { SubmissionDetails } from './SubmissionDetails';

interface SearchSectionProps {
  onSearch: (address: string) => Promise<SearchResult | null>;
  isLoading: boolean;
  explorerUrl: string;
  currencySymbol: string;
  onApprove: (address: string, tier: number) => void;
  onReject: (address: string) => void;
  onReset: (address: string) => void;
  onApproveUpgrade: (address: string) => void;
  onRejectUpgrade: (address: string) => void;
}

export function SearchSection({
  onSearch,
  isLoading,
  explorerUrl,
  currencySymbol,
  onApprove,
  onReject,
  onReset,
  onApproveUpgrade,
  onRejectUpgrade
}: SearchSectionProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    if (!isValidAddress(searchQuery)) {
      setSearchError('Invalid Ethereum address');
      setSearchResult(null);
      return;
    }

    setSearchError(null);
    const result = await onSearch(searchQuery);
    
    if (result) {
      setSearchResult(result);
    } else {
      setSearchError('No KYC data found for this address');
      setSearchResult(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResult(null);
    setSearchError(null);
  };

  return (
    <div className="bg-surface/50 rounded-xl p-6 border border-border/50 mb-6">
      <h2 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
        <Search className="w-5 h-5 text-gold-400" />
        Search KYC Submission
      </h2>
      
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Enter wallet address (0x...)"
            className="w-full px-4 py-3 bg-surface-sunken/50 border border-border rounded-lg text-ink placeholder-ink-faint focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading || !searchQuery.trim()}
          className="px-6 py-3 bg-gold-600 hover:bg-gold-700 disabled:bg-surface-overlay disabled:cursor-not-allowed text-ink font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Search
        </button>
      </div>

      {searchError && (
        <div className="bg-danger/20 border border-danger/30 rounded-lg p-3 text-danger text-sm">
          {searchError}
        </div>
      )}

      {searchResult && searchResult.submission && (
        <SubmissionDetails
          submission={searchResult.submission}
          onChainData={searchResult.onChainData}
          totalInvested={searchResult.totalInvested}
          isValid={searchResult.isValid}
          upgradeRequest={searchResult.upgradeRequest}
          explorerUrl={explorerUrl}
          currencySymbol={currencySymbol}
          onApprove={onApprove}
          onReject={onReject}
          onReset={onReset}
          onApproveUpgrade={onApproveUpgrade}
          onRejectUpgrade={onRejectUpgrade}
        />
      )}
    </div>
  );
}
