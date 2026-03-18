// src/app/docs/investor-guide/page.tsx
import { 
  Wallet, 
  Search, 
  ShieldCheck, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  DollarSign
} from 'lucide-react';
import { COMPANY, CONTACT } from '@/config/contacts';

export const metadata = {
  title: `Investor Guide | ${COMPANY.name}`,
  description: 'Learn how to invest in tokenized real-world assets',
};

export default function InvestorGuidePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Investor Guide</h1>
        <p className="text-xl text-gray-400">
          Discover, evaluate, and invest in tokenized real-world assets.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Overview</h2>
        <p className="text-gray-300 mb-6">
          {COMPANY.name} gives you access to investment opportunities in real estate, commodities, 
          company equity, and collectibles—starting from just $100. This guide explains how to 
          get started and make informed investment decisions.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Min Investment', value: '$100' },
            { label: 'Asset Types', value: '4+' },
            { label: 'KYC Tiers', value: '3' },
            { label: 'Settlement', value: '~12 sec' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-sm text-gray-400">{stat.label}</div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Getting Started */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">1. Getting Started</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Wallet className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Connect Your Wallet</h3>
            </div>
            <p className="text-gray-400 mb-4">
              You'll need a Web3 wallet to invest and hold your tokens.
            </p>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                MetaMask (browser extension or mobile)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                WalletConnect-compatible wallets
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Hardware wallets (Ledger, Trezor) recommended for large holdings
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShieldCheck className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Complete KYC Verification</h3>
            </div>
            <p className="text-gray-400 mb-4">
              Your KYC tier determines your maximum investment limit.
            </p>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-400">Tier</th>
                    <th className="text-left py-3 px-4 text-gray-400">Requirements</th>
                    <th className="text-right py-3 px-4 text-gray-400">Limit</th>
                    <th className="text-right py-3 px-4 text-gray-400">Fee</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-700/50">
                    <td className="py-3 px-4 font-medium text-orange-400">Bronze</td>
                    <td className="py-3 px-4">Email + wallet connection</td>
                    <td className="text-right py-3 px-4">$1,000</td>
                    <td className="text-right py-3 px-4">Free</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-3 px-4 font-medium text-gray-300">Silver</td>
                    <td className="py-3 px-4">ID + liveness check</td>
                    <td className="text-right py-3 px-4">$10,000</td>
                    <td className="text-right py-3 px-4">$10</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-yellow-400">Gold</td>
                    <td className="py-3 px-4">Enhanced + source of funds</td>
                    <td className="text-right py-3 px-4">Unlimited</td>
                    <td className="text-right py-3 px-4">$25</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Finding Projects */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">2. Finding Projects</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Search className="w-6 h-6 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Browse & Filter</h3>
          </div>
          <p className="text-gray-400 mb-4">
            Use our project explorer to find opportunities that match your investment criteria.
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-white mb-2">Filter by:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Asset type (real estate, commodities, etc.)</li>
                <li>• Location / Region</li>
                <li>• Funding status</li>
                <li>• Minimum investment</li>
                <li>• Expected returns</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-white mb-2">Sort by:</h4>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Newest listings</li>
                <li>• Funding progress</li>
                <li>• Closing soon</li>
                <li>• Highest rated</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Due Diligence */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">3. Due Diligence</h2>
        
        <p className="text-gray-300 mb-6">
          Before investing, thoroughly research each project. Here's what to check:
        </p>

        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Asset Verification</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Verify ownership documentation on IPFS
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Review third-party appraisal or valuation
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Check legal structure and jurisdiction
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Research the asset's market and location
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Creator Background</h3>
            <ul className="space-y-2 text-gray-400 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Review creator's KYC verification level
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Check track record (previous projects, if any)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Research company background
              </li>
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-green-400 mb-3">Green Flags</h4>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✓ Complete documentation</li>
                <li>✓ Third-party appraisal</li>
                <li>✓ Escrow protection enabled</li>
                <li>✓ Clear use of funds</li>
                <li>✓ Experienced creator</li>
              </ul>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-red-400 mb-3">Red Flags</h4>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>✗ Missing or vague documents</li>
                <li>✗ Unrealistic returns promised</li>
                <li>✗ No escrow protection</li>
                <li>✗ Anonymous creator</li>
                <li>✗ Pressure to invest quickly</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Making an Investment */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">4. Making an Investment</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <ol className="space-y-6">
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Select Project</h3>
                <p className="text-gray-400 text-sm">Choose a project and click "Invest"</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Enter Amount</h3>
                <p className="text-gray-400 text-sm">Specify how much to invest (min $100, max based on KYC tier)</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Review Terms</h3>
                <p className="text-gray-400 text-sm">Read investment terms, fees, and risk disclosures</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-cyan-400 font-bold text-sm">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Confirm Transaction</h3>
                <p className="text-gray-400 text-sm">Approve the transaction in your wallet (pays in stablecoin + gas)</p>
              </div>
            </li>
            <li className="flex items-start gap-4">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-white">Receive Tokens</h3>
                <p className="text-gray-400 text-sm">Tokens appear in your wallet within ~12 seconds</p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Returns & Risks */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">5. Returns & Risks</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <TrendingUp className="w-8 h-8 text-green-400 mb-4" />
            <h3 className="font-semibold text-white mb-3">Types of Returns</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li>
                <strong className="text-white">Income:</strong> Regular dividends from rental income, profit sharing
              </li>
              <li>
                <strong className="text-white">Appreciation:</strong> Token value increases with asset value
              </li>
              <li>
                <strong className="text-white">Hybrid:</strong> Combination of income and appreciation
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <AlertTriangle className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="font-semibold text-white mb-3">Key Risks</h3>
            <ul className="space-y-3 text-gray-400 text-sm">
              <li>
                <strong className="text-white">Market Risk:</strong> Asset values can decrease
              </li>
              <li>
                <strong className="text-white">Liquidity Risk:</strong> May not be able to sell quickly
              </li>
              <li>
                <strong className="text-white">Project Risk:</strong> Creator may fail to deliver
              </li>
              <li>
                <strong className="text-white">Regulatory Risk:</strong> Laws may change
              </li>
            </ul>
          </div>
        </div>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-6">
          <h3 className="font-semibold text-orange-400 mb-3">Important Notice</h3>
          <p className="text-gray-300 text-sm">
            Tokenized assets are speculative investments. Only invest what you can afford to lose. 
            Past performance does not guarantee future results. Read our full 
            <a href="/legal/risk-disclosures" className="text-cyan-400 hover:underline ml-1">Risk Disclosures</a>.
          </p>
        </div>
      </section>

      {/* Fees */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">6. Fees for Investors</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/50">
                <th className="text-left py-3 px-4 text-gray-400">Fee</th>
                <th className="text-right py-3 px-4 text-gray-400">Amount</th>
                <th className="text-left py-3 px-4 text-gray-400">Notes</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Bronze KYC</td>
                <td className="text-right py-3 px-4">Free</td>
                <td className="py-3 px-4 text-gray-500">Email only</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Silver KYC</td>
                <td className="text-right py-3 px-4">$10</td>
                <td className="py-3 px-4 text-gray-500">One-time</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Gold KYC</td>
                <td className="text-right py-3 px-4">$25</td>
                <td className="py-3 px-4 text-gray-500">One-time</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Investment Fee</td>
                <td className="text-right py-3 px-4">0%</td>
                <td className="py-3 px-4 text-gray-500">No platform fee on investments</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Gas Fees</td>
                <td className="text-right py-3 px-4">Variable</td>
                <td className="py-3 px-4 text-gray-500">Typically $0.01-$1</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Trading Fee (future)</td>
                <td className="text-right py-3 px-4">0.1-0.2%</td>
                <td className="py-3 px-4 text-gray-500">When secondary market launches</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Support */}
      <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Need Help?</h2>
        <p className="text-gray-400 mb-6">
          Our community and support team are here to help you invest with confidence.
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div>
            <h3 className="font-semibold text-white">Discord</h3>
            <p className="text-cyan-400 text-sm">#investor-support</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Email</h3>
            <p className="text-cyan-400 text-sm">{CONTACT.support}</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">FAQ</h3>
            <a href="/docs/faq" className="text-cyan-400 text-sm hover:underline">View common questions</a>
          </div>
        </div>
      </section>
    </div>
  );
}
