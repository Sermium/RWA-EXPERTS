'use client';

import { useState } from 'react';
import { useAccount } from 'wagmi';
import { 
  FileText, 
  DollarSign, 
  CheckSquare,
  Shield
} from 'lucide-react';
import CrowdfundingReviewPanel from './CrowdfundingReviewPanel';
import FundingValidationPanel from './FundingValidationPanel';
import MilestoneReviewPanel from './MilestoneReviewPanel';

type TabId = 'applications' | 'funding' | 'milestones';

const TABS = [
  { id: 'applications' as TabId, label: 'Applications', icon: FileText },
  { id: 'funding' as TabId, label: 'Funding Validation', icon: DollarSign },
  { id: 'milestones' as TabId, label: 'Milestone Review', icon: CheckSquare },
];

export default function AdminCrowdfundingPage() {
  const { isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<TabId>('applications');

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
          <p className="text-gray-400">Please connect your wallet to access the admin panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Crowdfunding Admin</h1>
          <p className="text-gray-400">Manage crowdfunding applications, funding, and milestones</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-700 pb-4">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'applications' && <CrowdfundingReviewPanel />}
        {activeTab === 'funding' && <FundingValidationPanel />}
        {activeTab === 'milestones' && <MilestoneReviewPanel />}
      </div>
    </div>
  );
}
