// src/app/legal/risk-disclosures/page.tsx
import { AlertTriangle } from 'lucide-react';
import { CONTACT, SOCIAL, LINKS, mailto, COMPANY } from '@/config/contacts';
export const metadata = {
  title: `Risk Disclosures | ${COMPANY.name}`,
  description: 'Investment risk disclosures for tokenized real-world assets',
};

export default function RiskDisclosuresPage() {
  return (
    <article className="max-w-4xl prose prose-invert prose-cyan">
      <div className="mb-8 not-prose">
        <h1 className="text-4xl font-bold text-white mb-2">Risk Disclosures</h1>
        <p className="text-gray-400">Last Updated: March 2026</p>
      </div>

      {/* Important Warning Box */}
      <div className="not-prose mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-8 h-8 text-red-400 flex-shrink-0" />
          <div>
            <h2 className="text-xl font-bold text-red-400 mb-2">Important Warning</h2>
            <p className="text-gray-300">
              Tokenized real-world assets are speculative investments. You may lose some or all 
              of your invested capital. Only invest money you can afford to lose. Past performance 
              does not guarantee future results.
            </p>
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2>1. General Investment Risks</h2>
        <ul>
          <li><strong>Loss of Capital:</strong> The value of your investment can decrease. You may receive back less than you invested, or nothing at all.</li>
          <li><strong>No Guaranteed Returns:</strong> Projected returns are estimates only. Actual returns may be significantly lower or negative.</li>
          <li><strong>Illiquidity:</strong> Tokens may be difficult or impossible to sell. There may be no secondary market.</li>
          <li><strong>Long-Term Commitment:</strong> Your capital may be locked for extended periods. Early exit may not be possible.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>2. Asset-Specific Risks</h2>
        
        <h3>2.1 Real Estate</h3>
        <ul>
          <li>Property values can decline due to market conditions</li>
          <li>Vacancy risk – properties may not generate rental income</li>
          <li>Maintenance and repair costs may exceed projections</li>
          <li>Location-specific risks (crime, economic decline, natural disasters)</li>
          <li>Zoning and regulatory changes may affect value</li>
          <li>Environmental issues (contamination, flood zones)</li>
        </ul>

        <h3>2.2 Commodities</h3>
        <ul>
          <li>Commodity prices are highly volatile</li>
          <li>Storage and insurance costs reduce returns</li>
          <li>Quality disputes may affect value</li>
          <li>Delivery and logistics failures</li>
          <li>Weather and natural events affect supply</li>
        </ul>

        <h3>2.3 Company Equity</h3>
        <ul>
          <li>Business failure – companies may become insolvent</li>
          <li>Dilution – additional share issuance reduces your percentage</li>
          <li>Management risk – poor decisions affect company value</li>
          <li>Competition may erode market position</li>
          <li>Regulatory changes may impact operations</li>
        </ul>

        <h3>2.4 Art & Collectibles</h3>
        <ul>
          <li>Valuation is subjective and volatile</li>
          <li>Authenticity disputes may arise</li>
          <li>Physical condition can deteriorate</li>
          <li>Changing tastes affect market demand</li>
          <li>Specialized storage requirements</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>3. Project-Specific Risks</h2>
        
        <h3>3.1 Creator Risks</h3>
        <ul>
          <li>Inexperienced or incompetent management</li>
          <li>Fraud or misrepresentation</li>
          <li>Mismanagement of funds</li>
          <li>Project abandonment</li>
          <li>Conflicts of interest</li>
        </ul>

        <h3>3.2 Execution Risks</h3>
        <ul>
          <li>Delays in project completion</li>
          <li>Cost overruns exceeding budget</li>
          <li>Scope changes affecting returns</li>
          <li>Quality issues with deliverables</li>
          <li>Third-party contractor failures</li>
        </ul>

        <h3>3.3 Documentation Risks</h3>
        <ul>
          <li>Information may be inaccurate or incomplete</li>
          <li>Projections may be overly optimistic</li>
          <li>Important facts may be omitted</li>
          <li>Documentation may become outdated</li>
          <li>Information may be unverifiable</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>4. Technology Risks</h2>
        
        <h3>4.1 Smart Contract Risks</h3>
        <ul>
          <li>Bugs or vulnerabilities in code may lead to loss of funds</li>
          <li>Exploits may allow unauthorized access or manipulation</li>
          <li>Smart contracts are immutable – errors cannot always be fixed</li>
          <li>Third-party dependencies (oracles, libraries) may fail</li>
          <li>Upgrade mechanisms may introduce new vulnerabilities</li>
        </ul>

        <h3>4.2 Blockchain Risks</h3>
        <ul>
          <li>Network congestion may delay transactions</li>
          <li>High gas fees during peak usage</li>
          <li>Hard forks may create compatibility issues</li>
          <li>Consensus mechanism failures</li>
          <li>51% attacks (though unlikely on major chains)</li>
        </ul>

        <h3>4.3 Wallet Risks</h3>
        <ul>
          <li>Loss of private keys means permanent loss of tokens</li>
          <li>Theft through hacking or phishing</li>
          <li>User error in transactions (wrong address, wrong amount)</li>
          <li>Wallet software vulnerabilities</li>
          <li>Incompatibility with future standards</li>
        </ul>

        <h3>4.4 Platform Risks</h3>
        <ul>
          <li>Platform downtime or unavailability</li>
          <li>Data loss or corruption</li>
          <li>Security breaches</li>
          <li>Platform may discontinue operations</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>5. Regulatory Risks</h2>
        <ul>
          <li><strong>Legal Uncertainty:</strong> Laws governing tokenized securities are evolving and may change</li>
          <li><strong>Jurisdictional Issues:</strong> Different countries have different rules; compliance in one may not mean compliance in another</li>
          <li><strong>Securities Classification:</strong> Tokens may be classified as securities, triggering additional restrictions</li>
          <li><strong>Tax Treatment:</strong> Tax laws may change; you are responsible for your own tax compliance</li>
          <li><strong>Enforcement Actions:</strong> Regulators may take action against the platform or specific projects</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>6. Market Risks</h2>
        <ul>
          <li><strong>Volatility:</strong> Token prices can fluctuate dramatically in short periods</li>
          <li><strong>Correlation:</strong> Tokenized assets may correlate with broader crypto or traditional markets</li>
          <li><strong>Liquidity:</strong> Limited trading volume means you may not be able to sell at your desired price</li>
          <li><strong>Price Discovery:</strong> Without active markets, fair value may be difficult to determine</li>
          <li><strong>Market Manipulation:</strong> Low-liquidity markets are susceptible to manipulation</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>7. Counterparty Risks</h2>
        <ul>
          <li><strong>Platform Failure:</strong> {COMPANY.name} may cease operations</li>
          <li><strong>KYC Provider Failure:</strong> Third-party verification services may fail</li>
          <li><strong>Custodian Risk:</strong> Entities holding physical assets may fail or commit fraud</li>
          <li><strong>Auditor Limitations:</strong> Audits may not detect all issues</li>
          <li><strong>Legal Counsel:</strong> Legal opinions may be incorrect or become outdated</li>
          <li><strong>Service Providers:</strong> Any third party in the chain may fail</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>8. Economic Risks</h2>
        
        <h3>8.1 Macroeconomic Factors</h3>
        <ul>
          <li>Recession may reduce asset values and demand</li>
          <li>Inflation may erode real returns</li>
          <li>Interest rate changes affect asset valuations</li>
          <li>Currency fluctuations affect cross-border investments</li>
        </ul>

        <h3>8.2 Regional Risks (Africa Focus)</h3>
        <ul>
          <li>Political instability in target markets</li>
          <li>Currency volatility and capital controls</li>
          <li>Infrastructure challenges</li>
          <li>Legal system uncertainties</li>
          <li>Economic policy changes</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>9. Operational Risks</h2>
        
        <h3>9.1 Escrow Risks</h3>
        <ul>
          <li>Disputes over milestone completion</li>
          <li>Delays in fund release</li>
          <li>Smart contract escrow failures</li>
        </ul>

        <h3>9.2 Dividend Risks</h3>
        <ul>
          <li>Returns may be lower than projected</li>
          <li>Distributions may be suspended</li>
          <li>Technical issues may delay payments</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>10. Tax Risks</h2>
        <ul>
          <li>Tax treatment of tokenized assets is uncertain in many jurisdictions</li>
          <li>You may owe income tax on returns received</li>
          <li>Capital gains tax may apply on token sales</li>
          <li>VAT or stamp duty may apply in some jurisdictions</li>
          <li>Withholding taxes may reduce returns</li>
          <li>Tax laws may change retroactively</li>
        </ul>
        <p>
          <strong>You are solely responsible for determining and paying your taxes. 
          Consult a qualified tax professional.</strong>
        </p>
      </section>

      <section className="mb-8">
        <h2>11. Fraud Risks</h2>
        <p>Despite our due diligence, fraud may occur:</p>
        <ul>
          <li>Creators may misrepresent asset details</li>
          <li>Documents may be forged</li>
          <li>Valuations may be inflated</li>
          <li>Ownership claims may be false</li>
          <li>Projects may be designed to defraud investors</li>
        </ul>
        <p>
          <strong>Always conduct your own research. If something seems too good to be true, 
          it probably is.</strong>
        </p>
      </section>

      <section className="mb-8">
        <h2>12. Force Majeure</h2>
        <p>Events beyond anyone's control may affect your investment:</p>
        <ul>
          <li>Natural disasters (earthquakes, floods, fires)</li>
          <li>Pandemics</li>
          <li>Wars and civil unrest</li>
          <li>Government actions (expropriation, sanctions)</li>
          <li>Infrastructure failures (power, internet)</li>
        </ul>
        <p>No compensation may be available for losses due to force majeure events.</p>
      </section>

      <section className="mb-8">
        <h2>13. Risk Mitigation Suggestions</h2>
        <p>While risks cannot be eliminated, you can reduce exposure by:</p>
        <ul>
          <li><strong>Diversify:</strong> Don't put all your investment in one project or asset type</li>
          <li><strong>Research:</strong> Thoroughly investigate every project before investing</li>
          <li><strong>Limit Exposure:</strong> Only invest what you can afford to lose completely</li>
          <li><strong>Understand:</strong> Don't invest in things you don't understand</li>
          <li><strong>Monitor:</strong> Regularly review your investments and project updates</li>
          <li><strong>Secure:</strong> Use hardware wallets and strong security practices</li>
          <li><strong>Consult:</strong> Seek professional financial, legal, and tax advice</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>14. No Advice Disclaimer</h2>
        <p>
          {COMPANY.name} does not provide investment, legal, or tax advice. All information 
          on the platform is for informational purposes only. You should consult qualified 
          professionals before making investment decisions.
        </p>
      </section>

      <section className="mb-8">
        <h2>15. Acknowledgment</h2>
        <p>
          By using the {COMPANY.name} platform and investing in tokenized assets, you acknowledge 
          that you have read, understood, and accept all risks described in this document. You 
          confirm that you are making investment decisions based on your own judgment and research.
        </p>
      </section>

      <section className="mb-8">
        <h2>16. Contact</h2>
        <p>
          <strong>Risk Questions:</strong> {CONTACT.support}<br />
          <strong>Report Concerns:</strong> {CONTACT.compliance}
        </p>
      </section>
    </article>
  );
}