// src/app/docs/tokenomics/page.tsx
import { 
  DollarSign, 
  PieChart, 
  TrendingUp, 
  Users, 
  Building2,
  Coins,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { CONTACT, SOCIAL, LINKS, mailto, COMPANY } from '@/config/contacts';

export const metadata = {
  title: `Tokenomics | ${COMPANY.name}`,
  description: `Fee structure, revenue model, and token economics for ${COMPANY.name}`,
};

export default function TokenomicsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Tokenomics</h1>
        <p className="text-xl text-gray-400">
          Understanding our fee structure, revenue model, and the economics of tokenized assets.
        </p>
      </div>

      {/* Overview Stats */}
      <section className="mb-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Base Fee', value: '$750', icon: DollarSign },
            { label: 'Platform Fee', value: '2.5%', icon: PieChart },
            { label: 'Min Investment', value: '$100', icon: Coins },
            { label: 'Cost Savings', value: '66×', icon: TrendingUp },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
              <stat.icon className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Fee Structure */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Fee Structure</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden mb-6">
          <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-white">Creator Fees (Asset Owners)</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">Fee Type</th>
                  <th className="text-right py-3 px-4 text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-400">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Base Tokenization</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">$750</td>
                  <td className="py-3 px-4 text-gray-400">Core smart contract deployment</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Escrow Module</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">+$250</td>
                  <td className="py-3 px-4 text-gray-400">Milestone-based fund protection</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Dividend Module</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">+$200</td>
                  <td className="py-3 px-4 text-gray-400">Automated profit distribution</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Platform Fee</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">2.5%</td>
                  <td className="py-3 px-4 text-gray-400">Of total funds raised</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Gas Fees</td>
                  <td className="text-right py-3 px-4 text-gray-400">Variable</td>
                  <td className="py-3 px-4 text-gray-400">Blockchain transaction costs (~$0.01-$5)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="bg-gray-900 px-4 py-3 border-b border-gray-700">
            <h3 className="font-semibold text-white">Investor Fees</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400">Fee Type</th>
                  <th className="text-right py-3 px-4 text-gray-400">Amount</th>
                  <th className="text-left py-3 px-4 text-gray-400">Description</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Bronze KYC</td>
                  <td className="text-right py-3 px-4 text-green-400 font-semibold">$2</td>
                  <td className="py-3 px-4 text-gray-400">Email verification ($20,000 limit)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Silver KYC</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">$5</td>
                  <td className="py-3 px-4 text-gray-400">ID verification ($200,000 limit)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Gold KYC</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">$10</td>
                  <td className="py-3 px-4 text-gray-400">Liveness verification ($2,000,000 limit)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Platinium KYC</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">$20</td>
                  <td className="py-3 px-4 text-gray-400">Corporate verification (Unlimited)</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Investment Fee</td>
                  <td className="text-right py-3 px-4 text-green-400 font-semibold">0%</td>
                  <td className="py-3 px-4 text-gray-400">No platform fee on investments</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Gas Fees</td>
                  <td className="text-right py-3 px-4 text-gray-400">Variable</td>
                  <td className="py-3 px-4 text-gray-400">~$0.01-$5 per transaction</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Trading Fee </td>
                  <td className="text-right py-3 px-4 text-gray-400">0.1-0.2%</td>
                  <td className="py-3 px-4 text-gray-400">Secondary market (Q4 2026)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Dividend Fee </td>
                  <td className="text-right py-3 px-4 text-gray-400">1%</td>
                  <td className="py-3 px-4 text-gray-400">Platform fee on distribution</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Fee Packages */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Tokenization Packages</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          {/* Basic Package */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-white">Basic</h3>
              <div className="text-3xl font-bold text-white mt-2">$750</div>
              <div className="text-sm text-gray-400">One-time fee</div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                'Security token deployment',
                'Compliance module',
                'KYC-gated transfers',
                'IPFS document storage',
                'Admin dashboard access',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="text-center text-sm text-gray-500">
              Best for: Simple fundraising
            </div>
          </div>

          {/* Standard Package */}
          <div className="bg-gradient-to-b from-cyan-900/20 to-gray-800 border border-cyan-500/30 rounded-xl p-6 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-cyan-500 text-white text-xs font-semibold rounded-full">
              POPULAR
            </div>
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-white">Standard</h3>
              <div className="text-3xl font-bold text-cyan-400 mt-2">$1,000</div>
              <div className="text-sm text-gray-400">One-time fee</div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                'Everything in Basic',
                'Escrow vault (+$250)',
                'Milestone-based releases',
                'Investor protection',
                'Dispute resolution',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="text-center text-sm text-gray-500">
              Best for: Real estate & development
            </div>
          </div>

          {/* Premium Package */}
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-white">Premium</h3>
              <div className="text-3xl font-bold text-white mt-2">$1,200</div>
              <div className="text-sm text-gray-400">One-time fee</div>
            </div>
            <ul className="space-y-3 mb-6">
              {[
                'Everything in Standard',
                'Dividend distributor (+$200)',
                'Automated profit sharing',
                'Multi-currency support',
                'Priority support',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>
            <div className="text-center text-sm text-gray-500">
              Best for: Income-generating assets
            </div>
          </div>
        </div>
      </section>

      {/* Example Calculations */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Example Calculations</h2>
        
        <div className="space-y-6">
          {/* Example 1: Real Estate */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Building2 className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Real Estate Project</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Project Details</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-400">Asset Value:</span>
                    <span className="text-white">$1,000,000</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Funding Goal:</span>
                    <span className="text-white">$500,000 (50%)</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Token Supply:</span>
                    <span className="text-white">1000,000 tokens</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Token Price:</span>
                    <span className="text-white">$1.00 each</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Package:</span>
                    <span className="text-cyan-400">Standard (with Dividend)</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Fee Breakdown</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-400">Tokenization Fee:</span>
                    <span className="text-white">$950</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Platform Fee (2.5%) in Currency:</span>
                    <span className="text-white">$15,000</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">In Tokens:</span>
                    <span className="text-white">1% Supply</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Est. Gas Fees:</span>
                    <span className="text-white">~$50</span>
                  </li>
                  <li className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span className="text-gray-400">Total Fees:</span>
                    <span className="text-yellow-400 font-semibold">$16,000</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Creator Receives:</span>
                    <span className="text-green-400 font-semibold">$484,000</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Example 2: Investor */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Investor Example (ROI:10%)</h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Investment Details</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-400">Investment Amount:</span>
                    <span className="text-white">$10,000</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Tokens Received:</span>
                    <span className="text-white">10,000 tokens</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Ownership:</span>
                    <span className="text-white">2% of project</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">KYC Tier Required:</span>
                    <span className="text-cyan-400">Silver ($5)</span>
                  </li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Potential Returns (10% Annual)</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-gray-400">Annual Dividend:</span>
                    <span className="text-green-400">$990/year</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">5-Year Return:</span>
                    <span className="text-green-400">$4,950</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-gray-400">Appreciation (est. 3%/yr):</span>
                    <span className="text-green-400">+$1,593</span>
                  </li>
                  <li className="flex justify-between border-t border-gray-700 pt-2 mt-2">
                    <span className="text-gray-400">Total 5-Year Value:</span>
                    <span className="text-green-400 font-semibold">$16,543</span>
                  </li>
                </ul>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-xs text-yellow-400">
                <strong>Note:</strong> Returns are illustrative only. Actual returns depend on project 
                performance and are not guaranteed. See Risk Disclosures for more information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Competitive Comparison */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Competitive Comparison</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="text-left py-3 px-4 text-gray-400">Platform</th>
                  <th className="text-right py-3 px-4 text-gray-400">Setup Fee</th>
                  <th className="text-right py-3 px-4 text-gray-400">Platform Fee</th>
                  <th className="text-left py-3 px-4 text-gray-400">Focus</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50 bg-cyan-500/5">
                  <td className="py-3 px-4 font-medium text-cyan-400">RWA Experts</td>
                  <td className="text-right py-3 px-4 text-cyan-400 font-semibold">$750-$1,200</td>
                  <td className="text-right py-3 px-4">2.5%</td>
                  <td className="py-3 px-4">Multi-asset, Africa focus</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Securitize</td>
                  <td className="text-right py-3 px-4">$50,000+</td>
                  <td className="text-right py-3 px-4">1-2%</td>
                  <td className="py-3 px-4">Institutional, US focus</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Polymath</td>
                  <td className="text-right py-3 px-4">$25,000+</td>
                  <td className="text-right py-3 px-4">2-3%</td>
                  <td className="py-3 px-4">Enterprise securities</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">RealT</td>
                  <td className="text-right py-3 px-4">N/A (curated)</td>
                  <td className="text-right py-3 px-4">~10%</td>
                  <td className="py-3 px-4">US real estate only</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-white">Traditional IPO</td>
                  <td className="text-right py-3 px-4">$500,000+</td>
                  <td className="text-right py-3 px-4">5-7%</td>
                  <td className="py-3 px-4">Public companies</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
            <TrendingUp className="w-5 h-5" />
            66× Lower Entry Cost
          </div>
          <p className="text-sm text-gray-300">
            RWA Experts offers enterprise-grade tokenization at a fraction of the cost, 
            making it accessible to projects that would otherwise be priced out of the market.
          </p>
        </div>
      </section>

      {/* Revenue Model */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Platform Revenue Model</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Revenue Streams</h3>
            <ul className="space-y-4">
              {[
                { label: 'Tokenization Fees', value: '$750-$1,200/project', percent: '15%' },
                { label: 'Platform Fees', value: '2.5% of funds raised', percent: '60%' },
                { label: 'KYC Fees', value: '$2-$20/user', percent: '10%' },
                { label: 'Platform Fees (Operational)', value: '0.1-1%', percent: '15%' },
              ].map((item, i) => (
                <li key={i} className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium">{item.label}</div>
                    <div className="text-sm text-gray-400">{item.value}</div>
                  </div>
                  <div className="text-cyan-400 font-semibold">{item.percent}</div>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Revenue Allocation</h3>
            <ul className="space-y-4">
              {[
                { label: 'Operations', value: 'Team, infrastructure, support', percent: '50%', color: 'bg-blue-500' },
                { label: 'Development', value: 'Product, security, audits', percent: '10%', color: 'bg-purple-500' },
                { label: 'Marketing', value: 'Growth, partnerships', percent: '10%', color: 'bg-green-500' },
                { label: 'Reserve', value: 'Treasury, Dividends', percent: '30%', color: 'bg-yellow-500' },
              ].map((item, i) => (
                <li key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-white font-medium">{item.label}</div>
                    <div className="text-gray-400">{item.percent}</div>
                  </div>
                  <div className="text-xs text-gray-500 mb-2">{item.value}</div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${item.color}`} style={{ width: item.percent }} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Projections */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Revenue Projections</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 bg-gray-900">
                  <th className="text-left py-3 px-4 text-gray-400">Metric</th>
                  <th className="text-right py-3 px-4 text-gray-400">Year 1</th>
                  <th className="text-right py-3 px-4 text-gray-400">Year 2</th>
                  <th className="text-right py-3 px-4 text-gray-400">Year 3</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Projects Tokenized</td>
                  <td className="text-right py-3 px-4">50</td>
                  <td className="text-right py-3 px-4">200</td>
                  <td className="text-right py-3 px-4">500</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Total Value Tokenized</td>
                  <td className="text-right py-3 px-4">$25M</td>
                  <td className="text-right py-3 px-4">$150M</td>
                  <td className="text-right py-3 px-4">$500M</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Verified Users</td>
                  <td className="text-right py-3 px-4">10,000</td>
                  <td className="text-right py-3 px-4">50,000</td>
                  <td className="text-right py-3 px-4">150,000</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Tokenization Revenue</td>
                  <td className="text-right py-3 px-4">$50,000</td>
                  <td className="text-right py-3 px-4">$200,000</td>
                  <td className="text-right py-3 px-4">$500,000</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-4 font-medium text-white">Platform Fee Revenue</td>
                  <td className="text-right py-3 px-4">$1.25M</td>
                  <td className="text-right py-3 px-4">$7.5M</td>
                  <td className="text-right py-3 px-4">$25M</td>
                </tr>
                <tr className="bg-cyan-500/10">
                  <td className="py-3 px-4 font-semibold text-cyan-400">Total Revenue</td>
                  <td className="text-right py-3 px-4 font-semibold text-cyan-400">$1.3M</td>
                  <td className="text-right py-3 px-4 font-semibold text-cyan-400">$7.7M</td>
                  <td className="text-right py-3 px-4 font-semibold text-cyan-400">$25.5M</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-4">
          * Projections are estimates based on market analysis and growth assumptions. 
          Actual results may vary significantly.
        </p>
      </section>

      {/* Token Utility (Future) */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Platform Token (Future)</h2>
        
        <div className="bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Coins className="w-8 h-8 text-purple-400" />
            <div>
              <h3 className="text-lg font-semibold text-white">$RWA Token (Planned)</h3>
              <p className="text-sm text-gray-400">Platform governance and utility token</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mt-6 mb-3">
            <div>
              <h4 className="font-medium text-white mb-3">Utility</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  Fee discounts (up to 50%)
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  Governance voting rights
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  Priority access to new projects
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  Staking rewards
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-purple-400" />
                  Dividends distribution
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-white mb-3">Distribution (Planned)</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex justify-between">
                  <span>Community & Ecosystem</span>
                  <span className="text-purple-400">15%</span>
                </li>
                <li className="flex justify-between">
                  <span>Team & Advisors</span>
                  <span className="text-purple-400">30%</span>
                </li>
                <li className="flex justify-between">
                  <span>Treasury</span>
                  <span className="text-purple-400">20%</span>
                </li>
                <li className="flex justify-between">
                  <span>Investors</span>
                  <span className="text-purple-400">25%</span>
                </li>
                <li className="flex justify-between">
                  <span>Liquidity</span>
                  <span className="text-purple-400">10%</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-3 bg-gray-900/50 rounded-lg">
            <p className="text-xs text-gray-400">
              <strong>Note:</strong> Platform token is planned for future release. 
              Details are subject to change based on regulatory requirements and market conditions.
            </p>
          </div>
        </div>
      </section>

      {/* Summary */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Summary</h2>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="text-2xl font-bold text-cyan-400">$750</div>
            <div className="text-sm text-gray-400">Starting tokenization</div>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="text-2xl font-bold text-green-400">2.5%</div>
            <div className="text-sm text-gray-400">Platform fee on raises</div>
          </div>
          <div className="p-4 bg-gray-900/50 rounded-lg">
            <div className="text-2xl font-bold text-purple-400">0%</div>
            <div className="text-sm text-gray-400">Fee to invest</div>
          </div>
        </div>
        <p className="text-gray-400 text-sm mt-6 text-center">
          Questions about fees? Contact us at{' '}
          <a href="mailto:{CONTACT.support}" className="text-cyan-400 hover:underline">
            {CONTACT.support}
          </a>
        </p>
      </section>
    </div>
  );
}
