'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ProjectMilestone } from '@/types/project';
import { getCurrencyByCode, formatCurrencyAmount } from '@/types/currency';

interface StepMilestonesProps {
  data: {
    milestones: ProjectMilestone[];
    amountToRaise: number;
    amountToRaiseLocal: number;
    localCurrency: string;
    projectName: string;
    category: string;
  };
  updateData: (updates: { milestones: ProjectMilestone[] }) => void;
  onNext: () => void;
  onBack: () => void;
}

// Preset templates for all asset types
const MILESTONE_TEMPLATES: Record<string, Array<{
  title: string;
  description: string;
  percentage: number;
  deliverables: string[];
}>> = {
  'Real Estate': [
    { title: 'Land Acquisition & Permits', description: 'Purchase land, secure building permits and environmental clearances', percentage: 25, deliverables: ['Land deed / title transfer', 'Building permits', 'Environmental clearance certificate', 'Zoning approval'] },
    { title: 'Foundation & Structure', description: 'Complete foundation work and main structural construction', percentage: 30, deliverables: ['Foundation completion certificate', 'Structural inspection report', 'Progress photos', 'Engineering sign-off'] },
    { title: 'Construction & Utilities', description: 'Building construction, utilities installation, and interior work', percentage: 30, deliverables: ['Construction progress report', 'Utilities connection certificates', 'Electrical/plumbing inspections', 'Interior completion photos'] },
    { title: 'Completion & Handover', description: 'Final finishing, inspections, and property handover', percentage: 15, deliverables: ['Occupancy certificate', 'Final inspection report', 'Handover documentation', 'Property registration'] },
  ],
  'Infrastructure': [
    { title: 'Planning & Permits', description: 'Complete engineering plans, secure permits and environmental approvals', percentage: 20, deliverables: ['Engineering feasibility study', 'Environmental impact assessment', 'Government permits', 'Land use agreements'] },
    { title: 'Site Preparation', description: 'Site clearing, access roads, and preliminary construction', percentage: 25, deliverables: ['Site preparation report', 'Access infrastructure documentation', 'Geological survey results', 'Safety compliance certificate'] },
    { title: 'Core Construction', description: 'Main infrastructure construction and equipment installation', percentage: 35, deliverables: ['Construction progress reports', 'Equipment installation records', 'Quality inspection reports', 'Contractor milestone sign-offs'] },
    { title: 'Commissioning & Operations', description: 'Testing, commissioning, and handover to operations', percentage: 20, deliverables: ['Commissioning report', 'Operational readiness certificate', 'Performance test results', 'Operations manual'] },
  ],
  'Art & Collectibles': [
    { title: 'Authentication & Appraisal', description: 'Professional authentication, appraisal, and provenance verification', percentage: 20, deliverables: ['Certificate of authenticity', 'Professional appraisal report', 'Provenance documentation', 'Condition report'] },
    { title: 'Secure Storage & Insurance', description: 'Arrange secure storage facility and comprehensive insurance', percentage: 25, deliverables: ['Storage facility agreement', 'Insurance certificate', 'Security audit report', 'Climate control documentation'] },
    { title: 'Marketing & Exhibition', description: 'Marketing campaign and exhibition arrangements', percentage: 25, deliverables: ['Marketing materials', 'Exhibition agreements', 'Press coverage documentation', 'Investor updates'] },
    { title: 'Sale or Fractionalization', description: 'Execute sale strategy or complete tokenization process', percentage: 30, deliverables: ['Sale agreement or token distribution', 'Final valuation report', 'Investor distribution records', 'Transaction documentation'] },
  ],
  'Business Equity': [
    { title: 'Due Diligence & Valuation', description: 'Complete financial audit, legal review, and business valuation', percentage: 15, deliverables: ['Audited financial statements', 'Legal due diligence report', 'Business valuation report', 'Cap table verification'] },
    { title: 'Legal Structure & Agreements', description: 'Establish legal framework and shareholder agreements', percentage: 20, deliverables: ['Shareholder agreement', 'Investment terms documentation', 'Corporate governance documents', 'Regulatory compliance certificates'] },
    { title: 'Capital Deployment', description: 'Deploy raised capital according to business plan', percentage: 40, deliverables: ['Capital deployment reports', 'Quarterly financial updates', 'KPI achievement reports', 'Board meeting minutes'] },
    { title: 'Growth & Returns', description: 'Execute growth strategy and distribute returns', percentage: 25, deliverables: ['Annual report', 'Dividend/distribution records', 'Business performance metrics', 'Investor return statements'] },
  ],
  'Revenue Based': [
    { title: 'Revenue Verification', description: 'Audit and verify existing revenue streams', percentage: 15, deliverables: ['Revenue audit report', 'Contract verification', 'Historical revenue documentation', 'Customer/client verification'] },
    { title: 'Legal & Payment Structure', description: 'Establish payment distribution mechanisms and legal framework', percentage: 20, deliverables: ['Revenue sharing agreement', 'Payment distribution smart contract', 'Legal opinion letter', 'Bank/payment setup'] },
    { title: 'Revenue Collection Period 1', description: 'First revenue collection and distribution period', percentage: 30, deliverables: ['Revenue collection report', 'Distribution records', 'Performance vs projection report', 'Investor statements'] },
    { title: 'Revenue Collection Period 2', description: 'Ongoing revenue collection and final distributions', percentage: 35, deliverables: ['Cumulative revenue report', 'Final distribution records', 'ROI achievement report', 'Project completion summary'] },
  ],
  'Commodities': [
    { title: 'Sourcing & Verification', description: 'Source commodities and verify quality/authenticity', percentage: 25, deliverables: ['Purchase agreements', 'Quality certification', 'Origin documentation', 'Quantity verification report'] },
    { title: 'Storage & Custody', description: 'Secure storage and establish custody arrangements', percentage: 25, deliverables: ['Storage facility agreement', 'Custody certificate', 'Insurance documentation', 'Audit trail setup'] },
    { title: 'Holding Period', description: 'Monitor storage conditions and market conditions', percentage: 20, deliverables: ['Storage condition reports', 'Market analysis updates', 'Inventory audits', 'Investor updates'] },
    { title: 'Sale & Distribution', description: 'Execute sale strategy and distribute proceeds', percentage: 30, deliverables: ['Sale agreement', 'Delivery documentation', 'Proceeds distribution records', 'Final investor statements'] },
  ],
  'Vehicles & Equipment': [
    { title: 'Acquisition & Inspection', description: 'Purchase assets and complete thorough inspection', percentage: 30, deliverables: ['Purchase agreement', 'Title/registration transfer', 'Professional inspection report', 'Condition documentation with photos'] },
    { title: 'Insurance & Deployment', description: 'Secure insurance and deploy assets for revenue generation', percentage: 25, deliverables: ['Insurance certificate', 'Deployment/lease agreement', 'Operator agreements', 'Revenue projection update'] },
    { title: 'Operations & Maintenance', description: 'Ongoing operations, maintenance, and revenue collection', percentage: 25, deliverables: ['Maintenance records', 'Revenue collection reports', 'Utilization metrics', 'Quarterly investor updates'] },
    { title: 'Exit or Refinance', description: 'Execute exit strategy or refinance for continued operations', percentage: 20, deliverables: ['Asset valuation report', 'Sale or refinance documentation', 'Final distribution records', 'Project closure report'] },
  ],
  'Intellectual Property': [
    { title: 'IP Verification & Valuation', description: 'Verify IP ownership and complete professional valuation', percentage: 20, deliverables: ['IP registration certificates', 'Ownership verification', 'Professional IP valuation', 'Freedom to operate opinion'] },
    { title: 'Protection & Licensing Strategy', description: 'Strengthen IP protection and develop licensing strategy', percentage: 25, deliverables: ['Updated IP filings', 'Licensing strategy document', 'Potential licensee pipeline', 'Legal protection assessment'] },
    { title: 'Commercialization', description: 'Execute licensing deals or commercialization activities', percentage: 35, deliverables: ['Licensing agreements', 'Revenue reports', 'Market penetration metrics', 'Commercialization progress report'] },
    { title: 'Returns Distribution', description: 'Collect royalties and distribute returns to investors', percentage: 20, deliverables: ['Royalty collection records', 'Distribution statements', 'IP portfolio status report', 'Investor return summary'] },
  ],
  'Other': [
    { title: 'Project Initiation', description: 'Complete project setup, verification, and planning', percentage: 20, deliverables: ['Project plan', 'Asset verification', 'Legal framework', 'Risk assessment'] },
    { title: 'Implementation Phase 1', description: 'Execute first phase of project plan', percentage: 30, deliverables: ['Phase 1 completion report', 'Progress documentation', 'Financial update', 'Milestone achievement proof'] },
    { title: 'Implementation Phase 2', description: 'Execute second phase and main project activities', percentage: 30, deliverables: ['Phase 2 completion report', 'Deliverables documentation', 'Performance metrics', 'Investor update'] },
    { title: 'Completion & Returns', description: 'Project completion and distribution of returns', percentage: 20, deliverables: ['Final project report', 'Return calculation', 'Distribution records', 'Project closure documentation'] },
  ],
};

export default function StepMilestones({ data, updateData, onNext, onBack }: StepMilestonesProps) {
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);
  const [newDeliverable, setNewDeliverable] = useState<{ [key: string]: string }>({});
  const [hasAutoLoaded, setHasAutoLoaded] = useState(false);
  
  const currency = getCurrencyByCode(data.localCurrency);
  const totalPercentage = data.milestones.reduce((sum, m) => sum + m.percentageOfFunds, 0);
  const isValid = totalPercentage === 100 && data.milestones.length >= 2;

  // Calculate amounts for a milestone
  const calculateAmounts = (percentage: number) => ({
    usd: (data.amountToRaise * percentage) / 100,
    local: (data.amountToRaiseLocal * percentage) / 100,
  });

  // Apply a preset template
  const applyTemplate = (templateName: string) => {
    const template = MILESTONE_TEMPLATES[templateName] || MILESTONE_TEMPLATES['Other'];
    const milestones: ProjectMilestone[] = template.map((t, index) => {
      const amounts = calculateAmounts(t.percentage);
      // Calculate target date (spread evenly over next 12 months)
      const monthsFromNow = Math.ceil((index + 1) * (12 / template.length));
      const targetDate = new Date();
      targetDate.setMonth(targetDate.getMonth() + monthsFromNow);
      
      return {
        id: uuidv4(),
        title: t.title,
        description: t.description,
        percentageOfFunds: t.percentage,
        targetDate: targetDate.toISOString().split('T')[0],
        deliverables: [...t.deliverables],
        amountUSD: amounts.usd,
        amountLocal: amounts.local,
      };
    });
    updateData({ milestones });
  };

  // Auto-load suggested template on mount if no milestones exist
  useEffect(() => {
    if (!hasAutoLoaded && data.milestones.length === 0 && data.category && data.amountToRaise > 0) {
      applyTemplate(data.category);
      setHasAutoLoaded(true);
    }
  }, [data.category, data.milestones.length, data.amountToRaise, hasAutoLoaded]);

  // Get the appropriate template for the project category
  const getTemplateForCategory = (category: string) => {
    return MILESTONE_TEMPLATES[category] || MILESTONE_TEMPLATES['Other'];
  };

  // Add a new milestone
  const addMilestone = () => {
    const remainingPercentage = Math.max(0, 100 - totalPercentage);
    const newMilestone: ProjectMilestone = {
      id: uuidv4(),
      title: `Milestone ${data.milestones.length + 1}`,
      description: '',
      percentageOfFunds: remainingPercentage,
      targetDate: '',
      deliverables: [],
      amountUSD: calculateAmounts(remainingPercentage).usd,
      amountLocal: calculateAmounts(remainingPercentage).local,
    };
    updateData({ milestones: [...data.milestones, newMilestone] });
    setExpandedMilestone(newMilestone.id);
  };

  // Remove a milestone
  const removeMilestone = (id: string) => {
    updateData({ milestones: data.milestones.filter(m => m.id !== id) });
    if (expandedMilestone === id) {
      setExpandedMilestone(null);
    }
  };

  // Update a milestone
  const updateMilestone = (id: string, updates: Partial<ProjectMilestone>) => {
    updateData({
      milestones: data.milestones.map(m => {
        if (m.id !== id) return m;
        const updated = { ...m, ...updates };
        if (updates.percentageOfFunds !== undefined) {
          const amounts = calculateAmounts(updates.percentageOfFunds);
          updated.amountUSD = amounts.usd;
          updated.amountLocal = amounts.local;
        }
        return updated;
      }),
    });
  };

  // Add deliverable to milestone
  const addDeliverable = (milestoneId: string) => {
    const text = newDeliverable[milestoneId]?.trim();
    if (!text) return;
    
    const milestone = data.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      updateMilestone(milestoneId, {
        deliverables: [...milestone.deliverables, text],
      });
      setNewDeliverable({ ...newDeliverable, [milestoneId]: '' });
    }
  };

  // Remove deliverable from milestone
  const removeDeliverable = (milestoneId: string, index: number) => {
    const milestone = data.milestones.find(m => m.id === milestoneId);
    if (milestone) {
      updateMilestone(milestoneId, {
        deliverables: milestone.deliverables.filter((_, i) => i !== index),
      });
    }
  };

  // Apply the suggested template for current category
  const applySuggestedTemplate = () => {
    applyTemplate(data.category || 'Other');
  };

  // Distribute percentages evenly
  const distributeEvenly = () => {
    if (data.milestones.length === 0) return;
    const evenPercentage = Math.floor(100 / data.milestones.length);
    const remainder = 100 - (evenPercentage * data.milestones.length);
    
    updateData({
      milestones: data.milestones.map((m, index) => {
        const percentage = index === data.milestones.length - 1 
          ? evenPercentage + remainder 
          : evenPercentage;
        const amounts = calculateAmounts(percentage);
        return {
          ...m,
          percentageOfFunds: percentage,
          amountUSD: amounts.usd,
          amountLocal: amounts.local,
        };
      }),
    });
  };

  // Get category-specific tips
  const getCategoryTips = () => {
    const tips: Record<string, string[]> = {
      'Real Estate': [
        'Include inspection reports at each construction phase',
        'Document all permits and regulatory approvals',
        'Provide regular photo/video updates of progress',
      ],
      'Infrastructure': [
        'Environmental compliance is critical at each stage',
        'Include safety certifications and audits',
        'Document government/regulatory approvals',
      ],
      'Art & Collectibles': [
        'Authentication should be from recognized authorities',
        'Include detailed condition reports',
        'Document secure storage and climate control',
      ],
      'Business Equity': [
        'Quarterly financial reports build trust',
        'Document board decisions and governance',
        'Track KPIs against projections',
      ],
      'Revenue Based': [
        'Provide transparent revenue tracking',
        'Document payment distribution mechanisms',
        'Include third-party revenue audits',
      ],
      'Commodities': [
        'Quality certifications are essential',
        'Document storage conditions regularly',
        'Include independent quantity audits',
      ],
      'Vehicles & Equipment': [
        'Regular maintenance records are crucial',
        'Document utilization and revenue metrics',
        'Include insurance and compliance certificates',
      ],
      'Intellectual Property': [
        'Keep IP registrations current',
        'Document licensing agreements clearly',
        'Track royalty collections transparently',
      ],
    };
    return tips[data.category] || [
      'Clear deliverables build investor confidence',
      'Regular updates keep investors engaged',
      'Document everything for transparency',
    ];
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gold-500/10 to-gold-light-500/10 rounded-xl p-6 border border-gold-500/20">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold text-white mb-2">Project Milestones</h3>
            <p className="text-gray-400">
              Define the milestones for your <span className="text-gold-400 font-medium">{data.category || 'project'}</span>. 
              Funds will be released progressively as each milestone is approved by investors.
            </p>
          </div>
          {data.category && (
            <span className="px-3 py-1 bg-gold-500/20 text-gold-400 text-sm rounded-full">
              {data.category}
            </span>
          )}
        </div>

        {/* Auto-loaded notification */}
        {hasAutoLoaded && data.milestones.length > 0 && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-green-400">
              We've pre-loaded a suggested milestone template for <strong>{data.category}</strong> projects. 
              Feel free to customize it to match your specific needs.
            </p>
          </div>
        )}
        
        {/* Funding Summary */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Total Funding</div>
            <div className="text-lg font-bold text-white">${data.amountToRaise.toLocaleString()}</div>
            {data.localCurrency !== 'USD' && (
              <div className="text-xs text-gray-500">
                {formatCurrencyAmount(data.amountToRaiseLocal, data.localCurrency)}
              </div>
            )}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Milestones</div>
            <div className="text-lg font-bold text-white">{data.milestones.length}</div>
            <div className="text-xs text-gray-500">Minimum 2 required</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Allocated</div>
            <div className={`text-lg font-bold ${totalPercentage === 100 ? 'text-green-400' : totalPercentage > 100 ? 'text-red-400' : 'text-yellow-400'}`}>
              {totalPercentage}%
            </div>
            <div className="text-xs text-gray-500">{100 - totalPercentage}% remaining</div>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <div className="text-xs text-gray-400">Status</div>
            <div className={`text-lg font-bold ${isValid ? 'text-green-400' : 'text-yellow-400'}`}>
              {isValid ? 'Ready' : 'Incomplete'}
            </div>
          </div>
        </div>
      </div>

      {/* Category-specific tips */}
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-amber-400 font-medium mb-2">Tips for {data.category || 'Your Project'} Milestones</p>
            <ul className="text-sm text-amber-400/80 space-y-1">
              {getCategoryTips().map((tip, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="w-1 h-1 bg-amber-400 rounded-full" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm text-gray-400 mb-2">Change Template</label>
          <div className="flex gap-2">
            <select
              onChange={(e) => e.target.value && applyTemplate(e.target.value)}
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-white"
              value=""
            >
              <option value="">Select a different template...</option>
              {Object.keys(MILESTONE_TEMPLATES).map(key => (
                <option key={key} value={key}>
                  {key} {key === data.category ? '(Current)' : ''}
                </option>
              ))}
            </select>
            {data.milestones.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Reset to suggested template? This will replace all current milestones.')) {
                    applySuggestedTemplate();
                  }
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors whitespace-nowrap"
                title={`Reset to ${data.category} template`}
              >
                Reset
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-end gap-2">
          <button
            onClick={addMilestone}
            className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Milestone
          </button>
          
          {data.milestones.length >= 2 && (
            <button
              onClick={distributeEvenly}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Distribute Evenly
            </button>
          )}
        </div>
      </div>

      {/* Milestones List */}
      <div className="space-y-4">
        {data.milestones.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-dashed border-gray-600">
            <svg className="w-12 h-12 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <p className="text-gray-400 mb-4">Loading milestones...</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={applySuggestedTemplate}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Load {data.category || 'Suggested'} Template
              </button>
              <button
                onClick={addMilestone}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Create Custom
              </button>
            </div>
          </div>
        ) : (
          data.milestones.map((milestone, index) => {
            const isExpanded = expandedMilestone === milestone.id;
            const amounts = calculateAmounts(milestone.percentageOfFunds);
            
            return (
              <div
                key={milestone.id}
                className={`bg-gray-800 rounded-xl border transition-all ${
                  isExpanded ? 'border-gold-500' : 'border-gray-700'
                }`}
              >
                {/* Milestone Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer"
                  onClick={() => setExpandedMilestone(isExpanded ? null : milestone.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gold-500/20 rounded-full flex items-center justify-center">
                      <span className="text-gold-400 font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-white">{milestone.title || 'Untitled Milestone'}</h4>
                      <div className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="text-green-400 font-medium">{milestone.percentageOfFunds}%</span>
                        <span>•</span>
                        <span>${amounts.usd.toLocaleString()}</span>
                        {data.localCurrency !== 'USD' && (
                          <>
                            <span>•</span>
                            <span>{formatCurrencyAmount(amounts.local, data.localCurrency)}</span>
                          </>
                        )}
                        {milestone.targetDate && (
                          <>
                            <span>•</span>
                            <span>{new Date(milestone.targetDate).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{milestone.deliverables.length} deliverables</span>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Title */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Title</label>
                        <input
                          type="text"
                          value={milestone.title}
                          onChange={(e) => updateMilestone(milestone.id, { title: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                          placeholder="Milestone title"
                        />
                      </div>
                      
                      {/* Target Date */}
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Target Date</label>
                        <input
                          type="date"
                          value={milestone.targetDate}
                          onChange={(e) => updateMilestone(milestone.id, { targetDate: e.target.value })}
                          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                    
                    {/* Description */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-1">Description</label>
                      <textarea
                        value={milestone.description}
                        onChange={(e) => updateMilestone(milestone.id, { description: e.target.value })}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white resize-none"
                        rows={2}
                        placeholder="Describe what will be achieved in this milestone..."
                      />
                    </div>
                    
                    {/* Percentage & Amount */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Percentage of Funds</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={milestone.percentageOfFunds}
                            onChange={(e) => updateMilestone(milestone.id, { 
                              percentageOfFunds: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) 
                            })}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pr-8 text-white"
                            min="1"
                            max="100"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">%</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-gray-400 mb-1">Amount (USD)</label>
                        <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-green-400 font-medium">
                          ${amounts.usd.toLocaleString()}
                        </div>
                      </div>
                      {data.localCurrency !== 'USD' && (
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Amount ({data.localCurrency})</label>
                          <div className="bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-gold-400 font-medium">
                            {formatCurrencyAmount(amounts.local, data.localCurrency)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deliverables */}
                    <div>
                      <label className="block text-sm text-gray-400 mb-2">
                        Deliverables 
                        <span className="text-gray-500 ml-2">(Proof of milestone completion)</span>
                      </label>
                      <div className="space-y-2">
                        {milestone.deliverables.map((deliverable, dIndex) => (
                          <div key={dIndex} className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2">
                            <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className="flex-1 text-gray-300">{deliverable}</span>
                            <button
                              onClick={() => removeDeliverable(milestone.id, dIndex)}
                              className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newDeliverable[milestone.id] || ''}
                            onChange={(e) => setNewDeliverable({ ...newDeliverable, [milestone.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && addDeliverable(milestone.id)}
                            className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-400"
                            placeholder="Add a deliverable (e.g., inspection report, certificate, documentation)..."
                          />
                          <button
                            onClick={() => addDeliverable(milestone.id)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => removeMilestone(milestone.id)}
                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Remove Milestone
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Progress Bar Visualization */}
      {data.milestones.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4">
          <div className="text-sm text-gray-400 mb-3">Funds Distribution</div>
          <div className="h-8 bg-gray-700 rounded-lg overflow-hidden flex">
            {data.milestones.map((milestone, index) => {
              const colors = [
                'bg-gold-500',
                'bg-green-500',
                'bg-gold-500',
                'bg-amber-500',
                'bg-pink-500',
                'bg-cyan-500',
              ];
              return (
                <div
                  key={milestone.id}
                  className={`${colors[index % colors.length]} flex items-center justify-center text-xs font-medium text-white transition-all`}
                  style={{ width: `${milestone.percentageOfFunds}%` }}
                  title={`${milestone.title}: ${milestone.percentageOfFunds}%`}
                >
                  {milestone.percentageOfFunds >= 10 && `${milestone.percentageOfFunds}%`}
                </div>
              );
            })}
            {totalPercentage < 100 && (
              <div 
                className="bg-gray-600 flex items-center justify-center text-xs text-gray-400"
                style={{ width: `${100 - totalPercentage}%` }}
              >
                {100 - totalPercentage >= 10 && `${100 - totalPercentage}%`}
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {data.milestones.map((milestone, index) => {
              const colors = [
                'bg-gold-500',
                'bg-green-500',
                'bg-gold-500',
                'bg-amber-500',
                'bg-pink-500',
                'bg-cyan-500',
              ];
              return (
                <div key={milestone.id} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className={`w-3 h-3 rounded ${colors[index % colors.length]}`} />
                  <span>{milestone.title || `Milestone ${index + 1}`}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Validation Message */}
      {data.milestones.length > 0 && !isValid && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-yellow-400 font-medium">Please fix the following:</p>
            <ul className="text-sm text-yellow-400/80 mt-1 list-disc list-inside">
              {data.milestones.length < 2 && <li>At least 2 milestones are required</li>}
              {totalPercentage !== 100 && (
                <li>
                  Total percentage must equal 100% (currently {totalPercentage}%, 
                  {totalPercentage < 100 ? ` need ${100 - totalPercentage}% more` : ` remove ${totalPercentage - 100}%`})
                </li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4">
        <button
          onClick={onBack}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className={`px-8 py-3 rounded-lg font-semibold transition-all ${
            isValid
              ? 'bg-gold-600 hover:bg-gold-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue to Media & Legal
        </button>
      </div>
    </div>
  );
}
