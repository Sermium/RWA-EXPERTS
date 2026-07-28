'use client';

import { Layers } from 'lucide-react';
import { TOKEN_CATEGORIES } from '../../constants';
import { ListedToken, SecurityTokenData, CategoryCount } from '../../types';

interface TokenListProps {
  securityTokens: SecurityTokenData[];
  listedTokens: ListedToken[];
  selectedSecurityToken: SecurityTokenData | null;
  selectedListedToken: ListedToken | null;
  securityTokenLoading: boolean;
  listedTokensLoading: boolean;
  selectedCategory: string;
  categoryCounts: CategoryCount;
  onSelectSecurityToken: (token: SecurityTokenData) => void;
  onSelectListedToken: (token: ListedToken) => void;
  onCategoryChange: (category: string) => void;
}

export function TokenList({
  securityTokens,
  listedTokens,
  selectedSecurityToken,
  selectedListedToken,
  securityTokenLoading,
  listedTokensLoading,
  selectedCategory,
  categoryCounts,
  onSelectSecurityToken,
  onSelectListedToken,
  onCategoryChange,
}: TokenListProps) {
  return (
    <div className="bg-surface/50 rounded-xl p-4">
      <h3 className="text-lg font-semibold text-ink mb-3">Security Tokens</h3>
      
      {/* Category Filter */}
      <div className="mb-4">
        <div className="flex flex-wrap gap-1">
          {TOKEN_CATEGORIES.filter(cat => 
            cat.value === 'all' || (categoryCounts[cat.value] && categoryCounts[cat.value] > 0)
          ).map((category) => (
            <button
              key={category.value}
              onClick={() => onCategoryChange(category.value)}
              className={`
                px-2 py-1 text-xs rounded-lg transition-colors flex items-center gap-1
                ${selectedCategory === category.value
                  ? 'bg-gold-500 text-ink'
                  : 'bg-surface-overlay text-ink-muted hover:bg-border-strong'
                }
              `}
            >
              <category.icon className="w-3.5 h-3.5" />
              <span>{category.label}</span>
              {categoryCounts[category.value] > 0 && (
                <span className="bg-border-strong px-1.5 py-0.5 rounded-full text-[10px]">
                  {categoryCounts[category.value]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Token List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {(securityTokenLoading || listedTokensLoading) ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500" />
          </div>
        ) : securityTokens.length === 0 && listedTokens.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-ink-faint">No tokens available</p>
            {selectedCategory !== 'all' && (
              <button
                onClick={() => onCategoryChange('all')}
                className="text-gold-400 text-sm mt-2 hover:underline"
              >
                View all categories
              </button>
            )}
          </div>
        ) : (
          <>
            {/* On-chain security tokens */}
            {securityTokens.map((token) => (
              <button
                key={token.address}
                onClick={() => onSelectSecurityToken(token)}
                className={`w-full p-3 rounded-lg text-left transition-colors ${
                  selectedSecurityToken?.address === token.address
                    ? 'bg-gold-600 text-ink'
                    : 'bg-surface-overlay hover:bg-border-strong text-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium">{token.symbol}</span>
                  <span className="text-sm opacity-75">{token.name}</span>
                </div>
              </button>
            ))}

            {/* DB listed tokens (RWA) */}
            {listedTokens.map((token) => {
              const categoryInfo = TOKEN_CATEGORIES.find(c => c.value === token.asset_type);
              return (
                <button
                  key={token.id}
                  onClick={() => onSelectListedToken(token)}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedListedToken?.id === token.id
                      ? 'bg-gold-600 text-ink'
                      : 'bg-surface-overlay hover:bg-border-strong text-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {token.logo_url ? (
                        <img 
                          src={token.logo_url} 
                          alt={token.symbol}
                          className="w-6 h-6 rounded-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        (() => {
                          const CategoryIcon = categoryInfo?.icon || Layers;
                          return <CategoryIcon className="w-4 h-4 text-ink-muted" />;
                        })()
                      )}
                      <span className="font-medium">{token.symbol}</span>
                      <span className="text-xs bg-gold-600 px-1.5 py-0.5 rounded">RWA</span>
                    </div>
                    <span className={`text-sm ${
                      selectedListedToken?.id === token.id ? 'text-ink' : 'text-success'
                    }`}>
                      ${token.current_price || token.initial_price || '1.00'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs opacity-75 truncate max-w-[150px]">{token.name}</span>
                    {categoryInfo && (
                      <span className="text-xs opacity-50">{categoryInfo.label}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}