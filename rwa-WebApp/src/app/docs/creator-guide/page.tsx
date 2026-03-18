// src/app/docs/creator-guide/page.tsx
import { 
  CheckCircle, 
  FileText, 
  Upload, 
  Wallet, 
  Clock,
  DollarSign,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { SOCIAL, COMPANY, CONTACT } from '@/config/contacts';

export const metadata = {
  title: `Creator Guide | ${COMPANY.name}`,
  description: 'Step-by-step guide to tokenize your real-world assets',
};

export default function CreatorGuidePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Creator Guide</h1>
        <p className="text-xl text-gray-400">
          Step-by-step guide to tokenize your real-world assets on {COMPANY.name}.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">Overview</h2>
        <p className="text-gray-300 mb-6">
          {COMPANY.name} enables you to tokenize real-world assets and raise capital from a global 
          investor base. This guide walks you through every step from application to funding.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Clock, label: 'Review Time', value: '3-5 days' },
            { icon: DollarSign, label: 'Base Fee', value: '$750' },
            { icon: Shield, label: 'Min Asset', value: '$100,000' },
            { icon: Wallet, label: 'Min Investment', value: '$100' },
          ].map((stat, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
              <stat.icon className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-sm text-gray-400">{stat.label}</div>
              <div className="text-xl font-bold text-white">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Eligibility */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">1. Eligibility Requirements</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">You must have:</h3>
          <ul className="space-y-3">
            {[
              'Legal ownership or authorization to tokenize the asset',
              'Asset valued at minimum $100,000',
              'Gold-tier KYC verification completed',
              'Required documentation for your asset type',
              'Web3 wallet (MetaMask or WalletConnect)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-300">
                <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <h3 className="text-lg font-semibold text-white mb-4">Supported Asset Types</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { type: 'Real Estate', examples: 'Residential, commercial, land, development projects' },
            { type: 'Commodities', examples: 'Gold, silver, agricultural products, energy' },
            { type: 'Company Equity', examples: 'Private shares, revenue shares, convertible notes' },
            { type: 'Art & Collectibles', examples: 'Fine art, luxury items, rare collectibles' },
          ].map((asset, i) => (
            <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <h4 className="font-semibold text-white">{asset.type}</h4>
              <p className="text-sm text-gray-400 mt-1">{asset.examples}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KYC */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">2. Complete Gold-Tier KYC</h2>
        
        <p className="text-gray-300 mb-6">
          Asset creators must complete Gold-tier verification to ensure compliance and build investor trust.
        </p>

        <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-yellow-400 mb-4">Gold KYC Requirements</h3>
          <ul className="space-y-2 text-gray-300">
            <li>• Government-issued photo ID (passport or national ID)</li>
            <li>• Proof of address (utility bill or bank statement, {"<"}3 months)</li>
            <li>• Liveness verification (selfie with ID)</li>
            <li>• Source of funds documentation</li>
            <li>• Business registration documents (if applicable)</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-yellow-500/30 flex justify-between text-sm">
            <span className="text-gray-400">Fee: $25</span>
            <span className="text-gray-400">Processing: 2-5 business days</span>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">3. Submit Application</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Step 3.1: Company Information</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Legal entity name</li>
              <li>• Contact name, email, phone</li>
              <li>• Company website (optional)</li>
              <li>• Business registration number</li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Step 3.2: Asset Details</h3>
            <ul className="space-y-2 text-gray-300">
              <li>• Asset type and name</li>
              <li>• Detailed description</li>
              <li>• Estimated value (with supporting documentation)</li>
              <li>• Use case and investment thesis</li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Step 3.3: Required Documents</h3>
            
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Real Estate</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Title deed / Ownership certificate</li>
                  <li>• Professional appraisal</li>
                  <li>• Property photos</li>
                  <li>• Tax records</li>
                </ul>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Commodities</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Certificate of authenticity</li>
                  <li>• Assay report</li>
                  <li>• Storage agreement</li>
                  <li>• Insurance certificate</li>
                </ul>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Company Equity</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Incorporation documents</li>
                  <li>• Shareholder agreement</li>
                  <li>• Financial statements</li>
                  <li>• Cap table</li>
                </ul>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-4">
                <h4 className="font-semibold text-white mb-2">Art & Collectibles</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li>• Certificate of authenticity</li>
                  <li>• Provenance documentation</li>
                  <li>• Professional appraisal</li>
                  <li>• Condition report</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Step 3.4: Optional Features</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-cyan-400">Escrow Module (+$250)</h4>
                <p className="text-sm text-gray-400 mt-2">
                  Milestone-based fund release protecting investors and ensuring project delivery.
                </p>
              </div>
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-purple-400">Dividend Module (+$200)</h4>
                <p className="text-sm text-gray-400 mt-2">
                  Automated distribution of returns to all token holders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fees */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">4. Fee Structure</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900/50">
                <th className="text-left py-3 px-4 text-gray-400">Fee Type</th>
                <th className="text-right py-3 px-4 text-gray-400">Amount</th>
                <th className="text-left py-3 px-4 text-gray-400">When Paid</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Gold KYC Verification</td>
                <td className="text-right py-3 px-4">$25</td>
                <td className="py-3 px-4">Before application</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Base Tokenization</td>
                <td className="text-right py-3 px-4">$750</td>
                <td className="py-3 px-4">On deployment</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Escrow Module (optional)</td>
                <td className="text-right py-3 px-4">+$250</td>
                <td className="py-3 px-4">On deployment</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Dividend Module (optional)</td>
                <td className="text-right py-3 px-4">+$200</td>
                <td className="py-3 px-4">On deployment</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Platform Fee</td>
                <td className="text-right py-3 px-4">5% of funds raised</td>
                <td className="py-3 px-4">Deducted from investments</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Gas Fees</td>
                <td className="text-right py-3 px-4">Variable</td>
                <td className="py-3 px-4">On blockchain transactions</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <h4 className="font-semibold text-green-400 mb-2">Example: $500,000 Raise</h4>
          <p className="text-gray-300 text-sm">
            Tokenization ($750) + Escrow ($250) + Dividend ($200) = <strong>$1,200 upfront</strong><br />
            Platform fee: 5% × $500,000 = <strong>$25,000</strong><br />
            You receive: <strong>$473,800</strong>
          </p>
        </div>
      </section>

      {/* Review Process */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">5. Admin Review Process</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-cyan-400 font-bold">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Submission Review (Day 1-2)</h3>
              <p className="text-gray-400 text-sm">Team reviews application completeness and documentation quality.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-cyan-400 font-bold">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Verification (Day 2-3)</h3>
              <p className="text-gray-400 text-sm">Ownership validation, valuation assessment, and compliance checks.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-cyan-400 font-bold">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-white">Decision (Day 3-5)</h3>
              <p className="text-gray-400 text-sm">Approval with on-chain permission, or rejection with detailed feedback.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-green-400 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Approved
            </h4>
            <p className="text-sm text-gray-400 mt-2">
              You'll receive on-chain deployment permission. Proceed to token configuration.
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <h4 className="font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Rejected
            </h4>
            <p className="text-sm text-gray-400 mt-2">
              Review feedback, address issues, and resubmit. No additional fee for resubmission.
            </p>
          </div>
        </div>
      </section>

      {/* Deployment */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">6. Deploy Your Token</h2>
        
        <p className="text-gray-300 mb-6">
          After approval, configure and deploy your security token with one click.
        </p>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">Token Configuration</h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">•</span>
              <div>
                <strong>Token Name:</strong> e.g., "Lagos Tower Token"
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">•</span>
              <div>
                <strong>Token Symbol:</strong> e.g., "LTT" (3-5 characters)
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">•</span>
              <div>
                <strong>Total Supply:</strong> Number of tokens to create
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">•</span>
              <div>
                <strong>Token Price:</strong> Price per token in USD/stablecoin
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">•</span>
              <div>
                <strong>Funding Goal:</strong> Target amount to raise
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-cyan-400">•</span>
              <div>
                <strong>Milestones:</strong> (If escrow enabled) Define release triggers
              </div>
            </li>
          </ul>
        </div>

        <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">Deployment Steps</h3>
          <ol className="space-y-3 text-gray-300">
            <li>1. Review and confirm token configuration</li>
            <li>2. Approve tokenization fee transaction in your wallet</li>
            <li>3. Confirm deployment transaction (pays gas fee)</li>
            <li>4. Wait for blockchain confirmation (~12 seconds)</li>
            <li>5. Receive your contract addresses</li>
          </ol>
        </div>
      </section>

      {/* Post-Deployment */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-6">7. Post-Deployment</h2>
        
        <p className="text-gray-300 mb-6">
          Once deployed, your project goes live and KYC-verified investors can begin participating.
        </p>

        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-2">Funding Phase</h3>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li>• Your project appears on the platform's project listing</li>
              <li>• Investors browse, research, and invest in your tokens</li>
              <li>• Track investments in real-time on your creator dashboard</li>
              <li>• Funds accumulate in escrow (if enabled) or your wallet</li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-2">Escrow Releases</h3>
            <p className="text-gray-400 text-sm mb-3">
              If you enabled escrow with milestones:
            </p>
            <ul className="text-gray-400 space-y-2 text-sm">
              <li>• Submit proof of milestone completion</li>
              <li>• Admin reviews and approves release</li>
              <li>• Funds transfer to your wallet automatically</li>
              <li>• Investors are notified of progress</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-8">
        <h2 className="text-2xl font-semibold text-white mb-4">Need Help?</h2>
        <p className="text-gray-400 mb-6">
          Our team is here to guide you through the tokenization process.
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div>
            <h3 className="font-semibold text-white">Discord</h3>
            <p className="text-cyan-400 text-sm">{SOCIAL.discord}</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Email</h3>
            <p className="text-cyan-400 text-sm">{CONTACT.support}</p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Office Hours</h3>
            <p className="text-cyan-400 text-sm">Thursdays 2PM UTC</p>
          </div>
        </div>
      </section>
    </div>
  );
}
