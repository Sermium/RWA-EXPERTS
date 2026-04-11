// src/components/tokenization/deploy/CSVUploader.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, AlertCircle, CheckCircle2, Download, Users, Info, HelpCircle } from 'lucide-react';
import { isAddress } from 'viem';

export interface TokenAllocation {
  address: string;
  amount: number;
  percentage: number;
  isValid: boolean;
  error?: string;
}

interface CSVUploaderProps {
  totalSupply: number;
  onAllocationsChange: (allocations: TokenAllocation[]) => void;
  allocations: TokenAllocation[];
}

export function CSVUploader({ totalSupply, onAllocationsChange, allocations }: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback((content: string): TokenAllocation[] => {
    const lines = content.trim().split('\n');
    const results: TokenAllocation[] = [];
    
    // Skip header if present
    const startIndex = lines[0]?.toLowerCase().includes('address') ? 1 : 0;
    
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Support both comma and semicolon separators
      const parts = line.includes(';') ? line.split(';') : line.split(',');
      
      if (parts.length < 2) continue;
      
      const address = parts[0].trim();
      const amountStr = parts[1].trim().replace(/[^0-9.]/g, '');
      const amount = parseFloat(amountStr);
      
      const allocation: TokenAllocation = {
        address,
        amount: isNaN(amount) ? 0 : amount,
        percentage: 0,
        isValid: true,
      };
      
      // Validate address
      if (!isAddress(address)) {
        allocation.isValid = false;
        allocation.error = 'Invalid address';
      }
      
      // Validate amount
      if (isNaN(amount) || amount <= 0) {
        allocation.isValid = false;
        allocation.error = 'Invalid amount';
      }
      
      results.push(allocation);
    }
    
    // Calculate percentages
    results.forEach(a => {
      a.percentage = totalSupply > 0 ? (a.amount / totalSupply) * 100 : 0;
    });
    
    return results;
  }, [totalSupply]);

  const handleFile = useCallback((file: File) => {
    setError(null);
    
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = parseCSV(content);
        
        if (parsed.length === 0) {
          setError('No valid allocations found in CSV');
          return;
        }
        
        onAllocationsChange(parsed);
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    };
    reader.onerror = () => setError('Failed to read file');
    reader.readAsText(file);
  }, [parseCSV, onAllocationsChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const removeAllocation = (index: number) => {
    const updated = [...allocations];
    updated.splice(index, 1);
    onAllocationsChange(updated);
  };

  const clearAllAllocations = () => {
    onAllocationsChange([]);
  };

  const downloadTemplate = () => {
    const template = `address,amount
0x742d35Cc6634C0532925a3b844Bc454f5E321abc,10000
0x8ba1f109551bD432803012645Ac136Dae85f7890,5000
0x1234567890abcdef1234567890abcdef12345678,2500`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'token_distribution_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainingTokens = totalSupply - totalAllocated;
  const allValid = allocations.every(a => a.isValid);

  return (
    <div className="space-y-4">
      {/* CSV Format Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            <span className="font-medium text-blue-400">CSV Format Guide</span>
          </div>
          <HelpCircle className={`w-5 h-5 text-blue-400 transition-transform ${showHelp ? 'rotate-180' : ''}`} />
        </button>
        
        {showHelp && (
          <div className="mt-4 space-y-4">
            <p className="text-slate-300 text-sm">
              Upload a CSV file to distribute tokens to multiple wallets during deployment. 
              Each row should contain a wallet address and the number of tokens to send.
            </p>
            
            {/* Format explanation */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2 text-sm">Required Format:</h4>
              <div className="font-mono text-xs bg-slate-900 rounded p-3 overflow-x-auto">
                <div className="text-slate-500"># Header row (optional)</div>
                <div className="text-green-400">address,amount</div>
                <div className="text-slate-500 mt-2"># Data rows</div>
                <div className="text-white">0x742d35Cc6634C0532925a3b844Bc454f5E321abc,10000</div>
                <div className="text-white">0x8ba1f109551bD432803012645Ac136Dae85f7890,5000</div>
              </div>
            </div>
            
            {/* Rules */}
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Valid Ethereum addresses (0x...)</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Comma or semicolon separated</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Whole numbers or decimals</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300">Header row is optional</span>
              </div>
            </div>

            {/* Example with total supply context */}
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h4 className="text-white font-medium mb-2 text-sm">Example Distribution:</h4>
              <p className="text-slate-400 text-xs mb-2">
                For a token with {totalSupply.toLocaleString()} total supply:
              </p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Investor A:</span>
                  <span className="text-white">{Math.floor(totalSupply * 0.4).toLocaleString()} tokens (40%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Investor B:</span>
                  <span className="text-white">{Math.floor(totalSupply * 0.25).toLocaleString()} tokens (25%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Treasury:</span>
                  <span className="text-white">{Math.floor(totalSupply * 0.2).toLocaleString()} tokens (20%)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Remaining to owner:</span>
                  <span>{Math.floor(totalSupply * 0.15).toLocaleString()} tokens (15%)</span>
                </div>
              </div>
            </div>

            {/* Download template button */}
            <button
              onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition"
            >
              <Download className="w-4 h-4" />
              Download Sample CSV Template
            </button>
          </div>
        )}
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
          isDragging 
            ? 'border-blue-500 bg-blue-500/10' 
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="hidden"
        />
        <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-blue-400' : 'text-slate-500'}`} />
        <p className="text-white font-medium mb-1">
          {isDragging ? 'Drop CSV file here' : 'Upload Token Distribution CSV'}
        </p>
        <p className="text-sm text-slate-400">
          Drag & drop or click to browse
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Supported: .csv files
        </p>
      </div>

      {/* Quick download link (always visible) */}
      {!showHelp && (
        <div className="flex items-center justify-between">
          <button
            onClick={(e) => { e.stopPropagation(); downloadTemplate(); }}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
          >
            <Download className="w-4 h-4" />
            Download CSV template
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-300 transition"
          >
            <HelpCircle className="w-4 h-4" />
            Need help?
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-500/20 rounded transition"
          >
            <X className="w-4 h-4 text-red-400" />
          </button>
        </div>
      )}

      {/* Allocation summary */}
      {allocations.length > 0 && (
        <div className="bg-slate-700/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Token Distribution ({allocations.length} recipient{allocations.length !== 1 ? 's' : ''})
            </h4>
            <div className="flex items-center gap-3">
              {allValid ? (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  All valid
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {allocations.filter(a => !a.isValid).length} invalid
                </span>
              )}
              <button
                onClick={clearAllAllocations}
                className="text-xs text-slate-400 hover:text-red-400 transition"
              >
                Clear all
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-400">Allocated</span>
              <span className="text-white">
                {totalAllocated.toLocaleString()} / {totalSupply.toLocaleString()} tokens
                <span className="text-slate-500 ml-1">
                  ({((totalAllocated / totalSupply) * 100).toFixed(1)}%)
                </span>
              </span>
            </div>
            <div className="h-2 bg-slate-600 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all ${
                  totalAllocated > totalSupply ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, (totalAllocated / totalSupply) * 100)}%` }}
              />
            </div>
            {totalAllocated > totalSupply && (
              <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Over-allocated by {(totalAllocated - totalSupply).toLocaleString()} tokens! 
                Please reduce allocations.
              </p>
            )}
            {remainingTokens > 0 && totalAllocated <= totalSupply && (
              <p className="text-slate-400 text-xs mt-1">
                {remainingTokens.toLocaleString()} tokens ({((remainingTokens / totalSupply) * 100).toFixed(1)}%) will remain with deployer
              </p>
            )}
          </div>

          {/* Allocation list */}
          <div className="max-h-60 overflow-y-auto space-y-2">
            {allocations.map((alloc, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  alloc.isValid ? 'bg-slate-800/50' : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs text-white flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-sm text-white truncate">
                      {alloc.address.slice(0, 10)}...{alloc.address.slice(-8)}
                    </p>
                    {alloc.error && (
                      <p className="text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {alloc.error}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-white font-medium">
                      {alloc.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-400">
                      {alloc.percentage.toFixed(2)}%
                    </p>
                  </div>
                  <button
                    onClick={() => removeAllocation(index)}
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded transition"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Summary footer */}
          <div className="pt-3 border-t border-slate-600 flex justify-between text-sm">
            <span className="text-slate-400">Total to distribute:</span>
            <span className={`font-medium ${totalAllocated > totalSupply ? 'text-red-400' : 'text-white'}`}>
              {totalAllocated.toLocaleString()} tokens
            </span>
          </div>
        </div>
      )}

      {/* No allocation info */}
      {allocations.length === 0 && (
        <div className="bg-slate-700/30 border border-slate-600 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300 text-sm font-medium">No distribution file uploaded</p>
              <p className="text-slate-400 text-xs mt-1">
                All {totalSupply.toLocaleString()} tokens will be minted directly to your wallet. 
                You can transfer them manually later or upload a CSV to distribute during deployment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
