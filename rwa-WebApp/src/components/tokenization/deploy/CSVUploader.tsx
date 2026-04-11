// src/components/tokenization/deploy/CSVUploader.tsx
'use client';

import React, { useState, useRef, useCallback } from 'react';
import { isAddress } from 'viem';

interface Allocation {
  address: string;
  amount: number;
  percentage: number;
  isValid: boolean;
  error?: string;
}

interface CSVUploaderProps {
  totalSupply: number;
  allocations: Allocation[];
  onAllocationsChange: (allocations: Allocation[]) => void;
}

export default function CSVUploader({
  totalSupply,
  allocations,
  onAllocationsChange,
}: CSVUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [inputMode, setInputMode] = useState<'manual' | 'csv'>('manual');
  const [manualAddress, setManualAddress] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualError, setManualError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
  const remainingTokens = totalSupply - totalAllocated;
  const allocationPercentage = totalSupply > 0 ? (totalAllocated / totalSupply) * 100 : 0;

  // Calculate percentage and validate allocation
  const processAllocation = useCallback(
    (address: string, amount: number): Allocation => {
      const percentage = totalSupply > 0 ? (amount / totalSupply) * 100 : 0;
      let isValid = true;
      let error: string | undefined;

      if (!isAddress(address)) {
        isValid = false;
        error = 'Invalid Ethereum address';
      } else if (amount <= 0) {
        isValid = false;
        error = 'Amount must be greater than 0';
      } else if (amount > totalSupply) {
        isValid = false;
        error = 'Amount exceeds total supply';
      }

      return { address, amount, percentage, isValid, error };
    },
    [totalSupply]
  );

  // Add manual allocation
  const handleAddManual = useCallback(() => {
    setManualError('');

    const address = manualAddress.trim();
    const amount = parseFloat(manualAmount);

    if (!address) {
      setManualError('Please enter a wallet address');
      return;
    }

    if (!isAddress(address)) {
      setManualError('Invalid Ethereum address');
      return;
    }

    if (isNaN(amount) || amount <= 0) {
      setManualError('Please enter a valid amount greater than 0');
      return;
    }

    // Check for duplicate address
    if (allocations.some((a) => a.address.toLowerCase() === address.toLowerCase())) {
      setManualError('This address has already been added');
      return;
    }

    // Check if amount exceeds remaining
    if (amount > remainingTokens) {
      setManualError(`Amount exceeds remaining tokens (${remainingTokens.toLocaleString()} available)`);
      return;
    }

    const newAllocation = processAllocation(address, amount);
    onAllocationsChange([...allocations, newAllocation]);

    // Clear inputs
    setManualAddress('');
    setManualAmount('');
  }, [manualAddress, manualAmount, allocations, remainingTokens, processAllocation, onAllocationsChange]);

  // Handle Enter key in manual inputs
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddManual();
    }
  };

  // Parse CSV content
  const parseCSV = useCallback(
    (content: string) => {
      const lines = content.split('\n').filter((line) => line.trim());
      const newAllocations: Allocation[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip header row
        if (i === 0 && (line.toLowerCase().includes('address') || line.toLowerCase().includes('wallet'))) {
          continue;
        }

        // Support both comma and semicolon separators
        const separator = line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map((p) => p.trim());

        if (parts.length >= 2) {
          const address = parts[0];
          const amount = parseFloat(parts[1].replace(/,/g, ''));

          // Skip if duplicate
          if (newAllocations.some((a) => a.address.toLowerCase() === address.toLowerCase())) {
            continue;
          }

          newAllocations.push(processAllocation(address, amount));
        }
      }

      onAllocationsChange(newAllocations);
    },
    [processAllocation, onAllocationsChange]
  );

  // Handle file upload
  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
        alert('Please upload a CSV file');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (content) {
          parseCSV(content);
          setInputMode('csv');
        }
      };
      reader.readAsText(file);
    },
    [parseCSV]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  // Download sample CSV
  const downloadTemplate = useCallback(() => {
    const sampleAmount = Math.floor(totalSupply * 0.1);
    const template = `address,amount
0x742d35Cc6634C0532925a3b844Bc454f5E321abc,${sampleAmount}
0x8ba1f109551bD432803012645Ac136Dae85f7890,${Math.floor(sampleAmount / 2)}
0x1234567890abcdef1234567890abcdef12345678,${Math.floor(sampleAmount / 4)}`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'token_distribution_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  }, [totalSupply]);

  // Remove allocation
  const removeAllocation = useCallback(
    (index: number) => {
      const newAllocations = allocations.filter((_, i) => i !== index);
      onAllocationsChange(newAllocations);
    },
    [allocations, onAllocationsChange]
  );

  // Update allocation
  const updateAllocation = useCallback(
    (index: number, field: 'address' | 'amount', value: string) => {
      const newAllocations = [...allocations];
      const current = newAllocations[index];

      if (field === 'address') {
        newAllocations[index] = processAllocation(value, current.amount);
      } else {
        const amount = parseFloat(value) || 0;
        newAllocations[index] = processAllocation(current.address, amount);
      }

      onAllocationsChange(newAllocations);
    },
    [allocations, processAllocation, onAllocationsChange]
  );

  // Clear all allocations
  const clearAll = useCallback(() => {
    onAllocationsChange([]);
    setInputMode('manual');
  }, [onAllocationsChange]);

  // Fill remaining to address
  const fillRemaining = useCallback(
    (index: number) => {
      const newAllocations = [...allocations];
      const currentAlloc = newAllocations[index];
      const otherAllocated = allocations.reduce(
        (sum, a, i) => (i !== index ? sum + a.amount : sum),
        0
      );
      const maxAmount = totalSupply - otherAllocated;

      newAllocations[index] = processAllocation(currentAlloc.address, maxAmount);
      onAllocationsChange(newAllocations);
    },
    [allocations, totalSupply, processAllocation, onAllocationsChange]
  );

  return (
    <div className="space-y-4">
      {/* Input Mode Toggle */}
      <div className="flex items-center gap-2 p-1 bg-slate-800 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setInputMode('manual')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'manual'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Manual Entry
        </button>
        <button
          type="button"
          onClick={() => setInputMode('csv')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            inputMode === 'csv'
              ? 'bg-blue-600 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          CSV Upload
        </button>
      </div>

      {/* Manual Entry Mode */}
      {inputMode === 'manual' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-3">Add Recipient</h4>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-400 mb-1">Wallet Address</label>
              <input
                type="text"
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="0x..."
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="w-full sm:w-40">
              <label className="block text-xs text-slate-400 mb-1">Amount</label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="10000"
                min="0"
                step="any"
                max={remainingTokens}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddManual}
                className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {manualError && (
            <p className="mt-2 text-sm text-red-400">{manualError}</p>
          )}

          <p className="mt-3 text-xs text-slate-500">
            Remaining tokens: <span className="text-slate-300">{remainingTokens.toLocaleString()}</span>
            {remainingTokens > 0 && allocations.length > 0 && (
              <span className="text-slate-500"> • Unallocated tokens will be minted to your wallet</span>
            )}
          </p>
        </div>
      )}

      {/* CSV Upload Mode */}
      {inputMode === 'csv' && (
        <>
          {/* Info Guide */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-700/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm text-slate-300">CSV Format Guide</span>
              </div>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform ${showGuide ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showGuide && (
              <div className="p-4 border-t border-slate-700 space-y-3">
                <div>
                  <p className="text-sm text-slate-300 mb-2">Your CSV should have two columns:</p>
                  <code className="block bg-slate-900 p-3 rounded text-xs text-green-400 font-mono">
                    address,amount<br />
                    0x742d...1abc,400000<br />
                    0x8ba1...7890,250000
                  </code>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                    Supports: comma (,) or semicolon (;)
                  </span>
                  <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-1 rounded">
                    Header row is optional
                  </span>
                </div>

                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download Sample Template
                </button>
              </div>
            )}
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileInput}
              className="hidden"
            />
            <svg className="w-10 h-10 mx-auto mb-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-slate-300">
              Drag & drop your CSV file here, or <span className="text-blue-400">browse</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Or switch to Manual Entry for small distributions
            </p>
          </div>
        </>
      )}

      {/* Allocations List */}
      {allocations.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-slate-700">
            <h4 className="text-sm font-medium text-white">
              Token Distribution ({allocations.length} recipient{allocations.length !== 1 ? 's' : ''})
            </h4>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-red-400 hover:text-red-300"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50 sticky top-0">
                <tr>
                  <th className="text-left text-xs font-medium text-slate-400 px-3 py-2">Address</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-3 py-2">Amount</th>
                  <th className="text-right text-xs font-medium text-slate-400 px-3 py-2">%</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {allocations.map((alloc, index) => (
                  <tr
                    key={index}
                    className={`${!alloc.isValid ? 'bg-red-500/10' : 'hover:bg-slate-700/30'}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={alloc.address}
                        onChange={(e) => updateAllocation(index, 'address', e.target.value)}
                        className={`w-full bg-transparent text-sm font-mono focus:outline-none ${
                          alloc.isValid ? 'text-slate-300' : 'text-red-400'
                        }`}
                      />
                      {alloc.error && (
                        <p className="text-xs text-red-400 mt-1">{alloc.error}</p>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        value={alloc.amount}
                        onChange={(e) => updateAllocation(index, 'amount', e.target.value)}
                        className="w-full bg-transparent text-sm text-right text-white focus:outline-none"
                      />
                    </td>
                    <td className="px-3 py-2 text-right text-sm text-slate-400">
                      {alloc.percentage.toFixed(2)}%
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {remainingTokens > 0 && (
                          <button
                            type="button"
                            onClick={() => fillRemaining(index)}
                            title="Fill remaining tokens"
                            className="p-1 text-slate-500 hover:text-blue-400"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAllocation(index)}
                          className="p-1 text-slate-500 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="p-3 border-t border-slate-700 bg-slate-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Allocated</span>
              <span className="text-sm text-white font-medium">
                {totalAllocated.toLocaleString()} / {totalSupply.toLocaleString()} tokens
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  allocationPercentage > 100 ? 'bg-red-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(allocationPercentage, 100)}%` }}
              />
            </div>

            {allocationPercentage > 100 && (
              <p className="text-xs text-red-400 mt-2">
                Over-allocated by {(totalAllocated - totalSupply).toLocaleString()} tokens
              </p>
            )}

            {remainingTokens > 0 && (
              <p className="text-xs text-slate-500 mt-2">
                {remainingTokens.toLocaleString()} tokens ({(100 - allocationPercentage).toFixed(2)}%) will be minted to your wallet
              </p>
            )}
          </div>
        </div>
      )}

      {/* No allocations message */}
      {allocations.length === 0 && (
        <div className="text-center py-6 text-slate-500">
          <p className="text-sm">No recipients added yet</p>
          <p className="text-xs mt-1">All tokens will be minted to your wallet</p>
        </div>
      )}
    </div>
  );
}
