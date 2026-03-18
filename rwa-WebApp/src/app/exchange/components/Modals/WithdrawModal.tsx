'use client';

import { useState } from 'react';

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  nativeCurrency: string;
  usdtAvailable: boolean;
  usdcAvailable: boolean;
  onWithdraw: (token: string, amount: string) => void;
}

export function WithdrawModal({
  isOpen,
  onClose,
  nativeCurrency,
  usdtAvailable,
  usdcAvailable,
  onWithdraw,
}: WithdrawModalProps) {
  const [withdrawToken, setWithdrawToken] = useState<'native' | 'USDT' | 'USDC'>('native');
  const [amount, setAmount] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (amount) {
      onWithdraw(withdrawToken, amount);
      setAmount('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold">Withdraw Funds</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* Token Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Select Token</label>
          <div className="flex gap-2">
            <button
              onClick={() => setWithdrawToken('native')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                withdrawToken === 'native' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              {nativeCurrency || 'NATIVE'}
            </button>
            {usdtAvailable && (
              <button
                onClick={() => setWithdrawToken('USDT')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  withdrawToken === 'USDT' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                USDT
              </button>
            )}
            {usdcAvailable && (
              <button
                onClick={() => setWithdrawToken('USDC')}
                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                  withdrawToken === 'USDC' ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                USDC
              </button>
            )}
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!amount}
          className="w-full py-3 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
        >
          Request Withdrawal
        </button>
      </div>
    </div>
  );
}
