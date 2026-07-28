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
        <h1 className="text-4xl font-bold text-ink mb-4">Creator Guide</h1>
        <p className="text-xl text-ink-muted">
          Step-by-step guide to tokenize your real-world assets on {COMPANY.name}.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">Overview</h2>
        <p className="text-ink-muted mb-6">
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
            <div key={i} className="bg-surface border border-border rounded-lg p-4 text-center">
              <stat.icon className="w-8 h-8 text-gold mx-auto mb-2" />
              <div className="text-sm text-ink-muted">{stat.label}</div>
              <div className="text-xl font-bold text-ink">{stat.value}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Eligibility */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">1. Eligibility Requirements</h2>
        
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-ink mb-4">You must have:</h3>
          <ul className="space-y-3">
            {[
              'Legal ownership or authorization to tokenize the asset',
              'Asset valued at minimum $100,000',
              'Gold-tier KYC verification completed',
              'Required documentation for your asset type',
              'Web3 wallet (MetaMask or WalletConnect)',
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-ink-muted">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <h3 className="text-lg font-semibold text-ink mb-4">Supported Asset Types</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { type: 'Real Estate', examples: 'Residential, commercial, land, development projects' },
            { type: 'Commodities', examples: 'Gold, silver, agricultural products, energy' },
            { type: 'Company Equity', examples: 'Private shares, revenue shares, convertible notes' },
            { type: 'Art & Collectibles', examples: 'Fine art, luxury items, rare collectibles' },
          ].map((asset, i) => (
            <div key={i} className="bg-surface/50 border border-border rounded-lg p-4">
              <h4 className="font-semibold text-ink">{asset.type}</h4>
              <p className="text-sm text-ink-muted mt-1">{asset.examples}</p>
            </div>
          ))}
        </div>
      </section>

      {/* KYC */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">2. Complete Gold-Tier KYC</h2>
        
        <p className="text-ink-muted mb-6">
          Asset creators must complete Gold-tier verification to ensure compliance and build investor trust.
        </p>

        <div className="bg-gradient-to-r from-warning/10 to-orange-500/10 border border-warning/30 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-warning mb-4">Gold KYC Requirements</h3>
          <ul className="space-y-2 text-ink-muted">
            <li>• Government-issued photo ID (passport or national ID)</li>
            <li>• Proof of address (utility bill or bank statement, {"<"}3 months)</li>
            <li>• Liveness verification (selfie with ID)</li>
            <li>• Source of funds documentation</li>
            <li>• Business registration documents (if applicable)</li>
          </ul>
          <div className="mt-4 pt-4 border-t border-warning/30 flex justify-between text-sm">
            <span className="text-ink-muted">Fee: $25</span>
            <span className="text-ink-muted">Processing: 2-5 business days</span>
          </div>
        </div>
      </section>

      {/* Application Process */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">3. Submit Application</h2>
        
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Step 3.1: Company Information</h3>
            <ul className="space-y-2 text-ink-muted">
              <li>• Legal entity name</li>
              <li>• Contact name, email, phone</li>
              <li>• Company website (optional)</li>
              <li>• Business registration number</li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Step 3.2: Asset Details</h3>
            <ul className="space-y-2 text-ink-muted">
              <li>• Asset type and name</li>
              <li>• Detailed description</li>
              <li>• Estimated value (with supporting documentation)</li>
              <li>• Use case and investment thesis</li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Step 3.3: Required Documents</h3>
            
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              <div className="bg-surface-sunken/50 rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-2">Real Estate</h4>
                <ul className="text-sm text-ink-muted space-y-1">
                  <li>• Title deed / Ownership certificate</li>
                  <li>• Professional appraisal</li>
                  <li>• Property photos</li>
                  <li>• Tax records</li>
                </ul>
              </div>
              <div className="bg-surface-sunken/50 rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-2">Commodities</h4>
                <ul className="text-sm text-ink-muted space-y-1">
                  <li>• Certificate of authenticity</li>
                  <li>• Assay report</li>
                  <li>• Storage agreement</li>
                  <li>• Insurance certificate</li>
                </ul>
              </div>
              <div className="bg-surface-sunken/50 rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-2">Company Equity</h4>
                <ul className="text-sm text-ink-muted space-y-1">
                  <li>• Incorporation documents</li>
                  <li>• Shareholder agreement</li>
                  <li>• Financial statements</li>
                  <li>• Cap table</li>
                </ul>
              </div>
              <div className="bg-surface-sunken/50 rounded-lg p-4">
                <h4 className="font-semibold text-ink mb-2">Art & Collectibles</h4>
                <ul className="text-sm text-ink-muted space-y-1">
                  <li>• Certificate of authenticity</li>
                  <li>• Provenance documentation</li>
                  <li>• Professional appraisal</li>
                  <li>• Condition report</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="text-lg font-semibold text-ink mb-4">Step 3.4: Optional Features</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-4">
                <h4 className="font-semibold text-gold">Escrow Module (+$250)</h4>
                <p className="text-sm text-ink-muted mt-2">
                  Milestone-based fund release protecting investors and ensuring project delivery.
                </p>
              </div>
              <div className="bg-gold-500/10 border border-gold-500/30 rounded-lg p-4">
                <h4 className="font-semibold text-gold-400">Dividend Module (+$200)</h4>
                <p className="text-sm text-ink-muted mt-2">
                  Automated distribution of returns to all token holders.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fees */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">4. Fee Structure</h2>
        
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/50">
                <th className="text-left py-3 px-4 text-ink-muted">Fee Type</th>
                <th className="text-right py-3 px-4 text-ink-muted">Amount</th>
                <th className="text-left py-3 px-4 text-ink-muted">When Paid</th>
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">Gold KYC Verification</td>
                <td className="text-right py-3 px-4">$25</td>
                <td className="py-3 px-4">Before application</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">Base Tokenization</td>
                <td className="text-right py-3 px-4">$750</td>
                <td className="py-3 px-4">On deployment</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">Escrow Module (optional)</td>
                <td className="text-right py-3 px-4">+$250</td>
                <td className="py-3 px-4">On deployment</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">Dividend Module (optional)</td>
                <td className="text-right py-3 px-4">+$200</td>
                <td className="py-3 px-4">On deployment</td>
              </tr>
              <tr className="border-b border-border/50">
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

        <div className="mt-6 bg-success/10 border border-success/30 rounded-lg p-4">
          <h4 className="font-semibold text-success mb-2">Example: $500,000 Raise</h4>
          <p className="text-ink-muted text-sm">
            Tokenization ($750) + Escrow ($250) + Dividend ($200) = <strong>$1,200 upfront</strong><br />
            Platform fee: 5% × $500,000 = <strong>$25,000</strong><br />
            You receive: <strong>$473,800</strong>
          </p>
        </div>
      </section>

      {/* Review Process */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">5. Admin Review Process</h2>
        
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-bold">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Submission Review (Day 1-2)</h3>
              <p className="text-ink-muted text-sm">Team reviews application completeness and documentation quality.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-bold">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Verification (Day 2-3)</h3>
              <p className="text-ink-muted text-sm">Ownership validation, valuation assessment, and compliance checks.</p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gold/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-gold font-bold">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-ink">Decision (Day 3-5)</h3>
              <p className="text-ink-muted text-sm">Approval with on-chain permission, or rejection with detailed feedback.</p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="bg-success/10 border border-success/30 rounded-lg p-4">
            <h4 className="font-semibold text-success flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Approved
            </h4>
            <p className="text-sm text-ink-muted mt-2">
              You'll receive on-chain deployment permission. Proceed to token configuration.
            </p>
          </div>
          <div className="bg-danger/10 border border-danger/30 rounded-lg p-4">
            <h4 className="font-semibold text-danger flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Rejected
            </h4>
            <p className="text-sm text-ink-muted mt-2">
              Review feedback, address issues, and resubmit. No additional fee for resubmission.
            </p>
          </div>
        </div>
      </section>

      {/* Deployment */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">6. Deploy Your Token</h2>
        
        <p className="text-ink-muted mb-6">
          After approval, configure and deploy your security token with one click.
        </p>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="font-semibold text-ink mb-4">Token Configuration</h3>
          <ul className="space-y-3 text-ink-muted">
            <li className="flex items-start gap-3">
              <span className="text-gold">•</span>
              <div>
                <strong>Token Name:</strong> e.g., "Lagos Tower Token"
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold">•</span>
              <div>
                <strong>Token Symbol:</strong> e.g., "LTT" (3-5 characters)
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold">•</span>
              <div>
                <strong>Total Supply:</strong> Number of tokens to create
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold">•</span>
              <div>
                <strong>Token Price:</strong> Price per token in USD/stablecoin
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold">•</span>
              <div>
                <strong>Funding Goal:</strong> Target amount to raise
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold">•</span>
              <div>
                <strong>Milestones:</strong> (If escrow enabled) Define release triggers
              </div>
            </li>
          </ul>
        </div>

        <div className="mt-6 bg-surface border border-border rounded-lg p-6">
          <h3 className="font-semibold text-ink mb-4">Deployment Steps</h3>
          <ol className="space-y-3 text-ink-muted">
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
        <h2 className="text-2xl font-semibold text-gold mb-6">7. Post-Deployment</h2>
        
        <p className="text-ink-muted mb-6">
          Once deployed, your project goes live and KYC-verified investors can begin participating.
        </p>

        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-semibold text-ink mb-2">Funding Phase</h3>
            <ul className="text-ink-muted space-y-2 text-sm">
              <li>• Your project appears on the platform's project listing</li>
              <li>• Investors browse, research, and invest in your tokens</li>
              <li>• Track investments in real-time on your creator dashboard</li>
              <li>• Funds accumulate in escrow (if enabled) or your wallet</li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-semibold text-ink mb-2">Escrow Releases</h3>
            <p className="text-ink-muted text-sm mb-3">
              If you enabled escrow with milestones:
            </p>
            <ul className="text-ink-muted space-y-2 text-sm">
              <li>• Submit proof of milestone completion</li>
              <li>• Admin reviews and approves release</li>
              <li>• Funds transfer to your wallet automatically</li>
              <li>• Investors are notified of progress</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Support */}
      <section className="bg-gradient-to-r from-gold/10 to-gold-light-500/10 border border-gold/20 rounded-xl p-8">
        <h2 className="text-2xl font-semibold text-ink mb-4">Need Help?</h2>
        <p className="text-ink-muted mb-6">
          Our team is here to guide you through the tokenization process.
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div>
            <h3 className="font-semibold text-ink">Discord</h3>
            <p className="text-gold text-sm">{SOCIAL.discord}</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Email</h3>
            <p className="text-gold text-sm">{CONTACT.support}</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Office Hours</h3>
            <p className="text-gold text-sm">Thursdays 2PM UTC</p>
          </div>
        </div>
      </section>
    </div>
  );
}
