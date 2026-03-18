// src/app/docs/whitepaper/page.tsx
import { FileDown } from 'lucide-react';
import { COMPANY } from '@/config/contacts';

export const metadata = {
  title: `White Paper | ${COMPANY.name}`,
  description: `Technical white paper for ${COMPANY.name} - Democratizing Real-World Asset Ownership`,
};

export default function WhitePaperPage() {
  return (
    <article className="max-w-4xl prose prose-invert prose-cyan">
      <div className="mb-12 not-prose">
        <h1 className="text-4xl font-bold text-white mb-4">White Paper</h1>
        <p className="text-xl text-gray-400">
          Democratizing Real-World Asset Ownership Through Blockchain Tokenization
        </p>
        <p className="text-sm text-gray-500 mt-2">Version 1.0 | March 2026</p>
        <a
          href="/assets/whitepaper.pdf"
          className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          <FileDown className="w-5 h-5" />
          Download PDF
        </a>
      </div>

      {/* Abstract */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">Abstract</h2>
        <p>
          {COMPANY.name} is a decentralized platform enabling compliant tokenization of real-world assets, 
          targeting Africa's $6.6 trillion under-utilized asset base and its global diaspora. By reducing 
          tokenization costs by 66× and timelines from months to days, we enable fractional ownership of 
          previously inaccessible assets while maintaining full regulatory compliance.
        </p>
      </section>

      {/* Problem Statement */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">1. Problem Statement</h2>
        
        <h3 className="text-xl text-white mt-6 mb-3">1.1 The Illiquidity Crisis</h3>
        <p>
          Over $300 trillion in global real-world assets remain trapped in illiquid markets. Traditional 
          finance excludes most projects and investors, creating massive untapped value. Asset owners face 
          months-long processes, high fees, and geographic limitations when attempting to raise capital.
        </p>

        <h3 className="text-xl text-white mt-6 mb-3">1.2 Barriers for Asset Owners</h3>
        <ul>
          <li><strong>Access:</strong> Traditional banks reject most alternative financing requests</li>
          <li><strong>Cost:</strong> IPOs and security offerings cost $50,000-$500,000+</li>
          <li><strong>Time:</strong> 6-18 months for traditional capital raising</li>
          <li><strong>Dilution:</strong> Equity requirements from VCs and private equity</li>
          <li><strong>Geography:</strong> Limited to local investor bases</li>
        </ul>

        <h3 className="text-xl text-white mt-6 mb-3">1.3 Barriers for Investors</h3>
        <ul>
          <li><strong>Minimum Investment:</strong> $50,000+ for most private placements</li>
          <li><strong>Accreditation:</strong> Regulatory requirements exclude retail investors</li>
          <li><strong>Liquidity:</strong> Locked capital for 5-10+ years</li>
          <li><strong>Transparency:</strong> Limited visibility into asset performance</li>
          <li><strong>Geography:</strong> Cannot access foreign assets easily</li>
        </ul>
      </section>

      {/* Market Opportunity */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">2. Market Opportunity</h2>
        
        <h3 className="text-xl text-white mt-6 mb-3">2.1 Global Tokenization Market</h3>
        <p>
          Boston Consulting Group projects $16 trillion in tokenized assets by 2030. Current tokenization 
          solutions serve primarily institutional clients with high minimums, leaving a massive underserved 
          middle market.
        </p>

        <div className="not-prose my-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">Asset Class</th>
                <th className="text-right py-3 px-4 text-gray-400">Global Value</th>
                <th className="text-right py-3 px-4 text-gray-400">Tokenization Potential (2030)</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Real Estate</td>
                <td className="text-right py-3 px-4">$326 trillion</td>
                <td className="text-right py-3 px-4">$16 trillion</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Private Equity</td>
                <td className="text-right py-3 px-4">$7.6 trillion</td>
                <td className="text-right py-3 px-4">$1.5 trillion</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Commodities</td>
                <td className="text-right py-3 px-4">$120 billion</td>
                <td className="text-right py-3 px-4">$20 billion</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Art & Collectibles</td>
                <td className="text-right py-3 px-4">$65 billion</td>
                <td className="text-right py-3 px-4">$10 billion</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl text-white mt-6 mb-3">2.2 Africa Opportunity</h3>
        <p>
          Africa represents our primary growth market with unique characteristics:
        </p>
        <ul>
          <li><strong>$6.6 trillion</strong> in natural resources</li>
          <li><strong>1.4 billion people</strong> - youngest population globally</li>
          <li><strong>$100 billion</strong> annual diaspora remittances seeking investment options</li>
          <li><strong>Fastest-growing</strong> mobile money and crypto adoption</li>
          <li><strong>Limited</strong> fractional investment infrastructure</li>
        </ul>
      </section>

      {/* Solution */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">3. Solution</h2>
        
        <p>
          {COMPANY.name} provides enterprise-grade compliance with startup-friendly pricing, reducing 
          tokenization costs by 66× and timelines from months to days.
        </p>

        <h3 className="text-xl text-white mt-6 mb-3">3.1 Core Features</h3>
        <ul>
          <li><strong>Multi-Asset Tokenization:</strong> Real estate, commodities, equity, art</li>
          <li><strong>Integrated KYC/AML:</strong> Tiered verification with investment limits</li>
          <li><strong>Smart Contract Suite:</strong> Security tokens, escrow, compliance, dividends</li>
          <li><strong>IPFS Document Storage:</strong> Immutable, verifiable documentation</li>
          <li><strong>Admin Review Workflow:</strong> Human oversight with on-chain approval</li>
        </ul>

        <h3 className="text-xl text-white mt-6 mb-3">3.2 Process Flow</h3>
        <ol>
          <li><strong>Apply:</strong> Asset owner submits details and documentation</li>
          <li><strong>Review:</strong> Team validates ownership, valuation, and compliance</li>
          <li><strong>Deploy:</strong> One-click smart contract deployment</li>
          <li><strong>Fund:</strong> KYC-verified investors purchase tokens</li>
        </ol>
      </section>

      {/* Technical Architecture */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">4. Technical Architecture</h2>
        
        <h3 className="text-xl text-white mt-6 mb-3">4.1 System Components</h3>
        <ul>
          <li><strong>Frontend:</strong> Next.js 15, React 19, TypeScript, Tailwind CSS</li>
          <li><strong>Wallet Integration:</strong> Wagmi v2, Viem, WalletConnect</li>
          <li><strong>Backend:</strong> Next.js API routes, Supabase PostgreSQL</li>
          <li><strong>Storage:</strong> IPFS via Pinata for immutable documents</li>
          <li><strong>Blockchain:</strong> EVM-compatible (Cronos, Polygon, Ethereum)</li>
        </ul>

        <h3 className="text-xl text-white mt-6 mb-3">4.2 Smart Contract Suite</h3>
        
        <div className="not-prose bg-gray-800 p-4 rounded-lg my-4 font-mono text-sm overflow-x-auto">
          <pre className="text-gray-300">{`RWALaunchpadFactory
├── SecurityToken (ERC-20)
│   ├── KYC-restricted transfers
│   ├── Pausable
│   └── Upgradeable (UUPS)
├── EscrowVault
│   ├── Milestone-based releases
│   └── Multi-signature approval
├── ComplianceModule
│   ├── KYC status verification
│   ├── Investment limit checks
│   └── Jurisdiction restrictions
├── DividendDistributor
│   └── Automated profit sharing
└── RWAProjectNFT (ERC-721)
    └── Project ownership record`}</pre>
        </div>

        <h3 className="text-xl text-white mt-6 mb-3">4.3 Security Measures</h3>
        <ul>
          <li>OpenZeppelin contracts and libraries</li>
          <li>Upgradeable proxy pattern (UUPS)</li>
          <li>Role-based access control</li>
          <li>Reentrancy guards</li>
          <li>External audit (scheduled Q2 2026)</li>
          <li>Bug bounty program (launching Q2 2026)</li>
        </ul>
      </section>

      {/* Compliance Framework */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">5. Compliance Framework</h2>
        
        <h3 className="text-xl text-white mt-6 mb-3">5.1 KYC Tiers</h3>
        <div className="not-prose my-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">Tier</th>
                <th className="text-left py-3 px-4 text-gray-400">Verification</th>
                <th className="text-right py-3 px-4 text-gray-400">Limit</th>
                <th className="text-right py-3 px-4 text-gray-400">Fee</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Bronze</td>
                <td className="py-3 px-4">Email, wallet, ID</td>
                <td className="text-right py-3 px-4">$20,000</td>
                <td className="text-right py-3 px-4">2$ </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Silver</td>
                <td className="py-3 px-4">Photo check</td>
                <td className="text-right py-3 px-4">$200,000</td>
                <td className="text-right py-3 px-4">$5</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Gold</td>
                <td className="py-3 px-4">Liveness</td>
                <td className="text-right py-3 px-4">$2,000,000</td>
                <td className="text-right py-3 px-4">$10</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Platinium</td>
                <td className="py-3 px-4">Proof of institution</td>
                <td className="text-right py-3 px-4">Unlimited</td>
                <td className="text-right py-3 px-4">$20</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl text-white mt-6 mb-3">5.2 On-Chain Compliance</h3>
        <p>
          Every token transfer is validated by the ComplianceModule smart contract, which checks KYC 
          status, investment limits, and jurisdiction restrictions before allowing the transaction. 
          This ensures continuous compliance without manual intervention.
        </p>

        <h3 className="text-xl text-white mt-6 mb-3">5.3 Regulatory Alignment</h3>
        <ul>
          <li><strong>Global:</strong> FATF Recommendations</li>
          <li><strong>EU:</strong> MiCA, GDPR, AMLD5/6</li>
          <li><strong>UK:</strong> FCA regulations, UK GDPR</li>
          <li><strong>US:</strong> Reg D compliance for accredited investors</li>
          <li><strong>Africa:</strong> Nigeria SEC, Kenya CMA, South Africa FSCA</li>
        </ul>
      </section>

      {/* Economics */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">6. Token Economics</h2>
        
        <h3 className="text-xl text-white mt-6 mb-3">6.1 Fee Structure</h3>
        <div className="not-prose my-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">Fee Type</th>
                <th className="text-right py-3 px-4 text-gray-400">Amount</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Base Tokenization</td>
                <td className="text-right py-3 px-4">$750</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Escrow Module</td>
                <td className="text-right py-3 px-4">+$250</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Dividend Module</td>
                <td className="text-right py-3 px-4">+$200</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Platform Fee</td>
                <td className="text-right py-3 px-4">2.5% of funds raised</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Gas Fees</td>
                <td className="text-right py-3 px-4">Variable (typically $0.01-$1)</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h3 className="text-xl text-white mt-6 mb-3">6.2 Example: $1M Real Estate Project</h3>
        <ul>
          <li>Asset Value: $1,000,000</li>
          <li>Funding Goal: $500,000 (50% of asset)</li>
          <li>Token Supply: 500,000 tokens at $1 each</li>
          <li>Tokenization Fee: $1,200 (full package)</li>
          <li>Platform Fee: $25,000 (5% of $500k)</li>
          <li>Creator Receives: $473,800</li>
        </ul>
      </section>

      {/* Roadmap */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">7. Roadmap</h2>
        
        <h3 className="text-xl text-white mt-6 mb-3">Q2 2026 - Launch</h3>
        <ul>
          <li>Security audit completion</li>
          <li>Mainnet deployment (Cronos)</li>
          <li>First 5 pilot projects</li>
          <li>Bug bounty launch</li>
        </ul>

        <h3 className="text-xl text-white mt-6 mb-3">Q3 2026 - Growth</h3>
        <ul>
          <li>15 tokenized projects</li>
          <li>Multi-chain support (Polygon, Ethereum)</li>
          <li>Mobile app release</li>
          <li>Diaspora partnership program</li>
        </ul>

        <h3 className="text-xl text-white mt-6 mb-3">Q4 2026 - Scale</h3>
        <ul>
          <li>50 tokenized projects</li>
          <li>$25M tokenized value</li>
          <li>Secondary marketplace beta</li>
          <li>Break-even target</li>
        </ul>

        <h3 className="text-xl text-white mt-6 mb-3">2027+ - Expansion</h3>
        <ul>
          <li>200+ projects</li>
          <li>Series A funding</li>
          <li>Full DAO governance</li>
          <li>Cross-chain bridges</li>
          <li>Lending and insurance integrations</li>
        </ul>
      </section>

      {/* Conclusion */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-cyan-400 border-b border-gray-700 pb-2">8. Conclusion</h2>
        <p>
          {COMPANY.name} addresses the fundamental problem of asset illiquidity by providing compliant, 
          affordable, and accessible tokenization infrastructure. By focusing on underserved markets—
          particularly Africa and its diaspora—we're building the ownership layer for the next billion investors.
        </p>
        <p>
          Our north star: <strong>$1 billion African assets tokenized by 2028.</strong>
        </p>
      </section>

      {/* References */}
      <section className="text-sm text-gray-500">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">References</h2>
        <ul>
          <li>Boston Consulting Group, "Relevance of on-chain asset tokenization," 2022</li>
          <li>World Bank, "Migration and Development Brief," 2023</li>
          <li>McKinsey & Company, "The rise of tokenized assets," 2023</li>
          <li>Statista, "Global real estate market value," 2024</li>
        </ul>
      </section>
    </article>
  );
}
