// src/app/legal/kyc-aml/page.tsx
import { CONTACT, SOCIAL, LINKS, mailto, COMPANY } from '@/config/contacts';
export const metadata = {
  title: `KYC/AML Policy | ${COMPANY.name}`,
  description: 'Know Your Customer and Anti-Money Laundering Policy',
};

export default function KycAmlPage() {
  return (
    <article className="max-w-4xl prose prose-invert prose-cyan">
      <div className="mb-8 not-prose">
        <h1 className="text-4xl font-bold text-white mb-2">KYC/AML Policy</h1>
        <p className="text-gray-400">Last Updated: March 2026</p>
      </div>

      <section className="mb-8">
        <h2>1. Purpose</h2>
        <p>
          This policy outlines {COMPANY.name}'s Know Your Customer (KYC) and Anti-Money 
          Laundering (AML) procedures designed to prevent our platform from being used 
          for money laundering, terrorist financing, or other financial crimes.
        </p>
      </section>

      <section className="mb-8">
        <h2>2. Regulatory Framework</h2>
        <p>Our KYC/AML program complies with:</p>
        <ul>
          <li>Financial Action Task Force (FATF) Recommendations</li>
          <li>EU Anti-Money Laundering Directives (AMLD5/6)</li>
          <li>UK Money Laundering Regulations 2017</li>
          <li>US Bank Secrecy Act / FinCEN requirements</li>
          <li>Nigeria Money Laundering (Prevention and Prohibition) Act</li>
          <li>Kenya Proceeds of Crime and Anti-Money Laundering Act</li>
          <li>South Africa Financial Intelligence Centre Act</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>3. Risk-Based Approach</h2>
        <p>
          We assess risk based on customer type, transaction patterns, geography, and 
          product usage. Higher-risk situations receive enhanced due diligence.
        </p>
        <div className="not-prose my-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-gray-400">Risk Level</th>
                <th className="text-left py-2 px-4 text-gray-400">Indicators</th>
                <th className="text-left py-2 px-4 text-gray-400">Measures</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4 text-green-400">Low</td>
                <td className="py-2 px-4">Small transactions, low-risk countries</td>
                <td className="py-2 px-4">Standard verification</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4 text-yellow-400">Medium</td>
                <td className="py-2 px-4">Moderate amounts, some risk factors</td>
                <td className="py-2 px-4">Enhanced monitoring</td>
              </tr>
              <tr>
                <td className="py-2 px-4 text-red-400">High</td>
                <td className="py-2 px-4">PEPs, high-risk countries, large amounts</td>
                <td className="py-2 px-4">Enhanced due diligence, senior approval</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2>4. Verification Tiers</h2>
        
        <h3>4.1 Bronze (Basic)</h3>
        <ul>
          <li>Email verification</li>
          <li>Terms acceptance</li>
          <li>Wallet connection</li>
          <li><strong>Limit:</strong> $1,000 total investment</li>
        </ul>

        <h3>4.2 Silver (Standard)</h3>
        <ul>
          <li>Government-issued photo ID</li>
          <li>Proof of address (utility bill or bank statement, less than 3 months old)</li>
          <li>Liveness verification (selfie with ID)</li>
          <li>Sanctions screening</li>
          <li><strong>Limit:</strong> $10,000 total investment</li>
          <li><strong>Fee:</strong> $10</li>
        </ul>

        <h3>4.3 Gold (Enhanced)</h3>
        <ul>
          <li>All Silver requirements plus:</li>
          <li>Source of funds documentation</li>
          <li>Additional supporting documents</li>
          <li>Manual compliance review</li>
          <li><strong>Limit:</strong> Unlimited (subject to project caps)</li>
          <li><strong>Fee:</strong> $25</li>
          <li><strong>Required for:</strong> All asset creators</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>5. Required Documents</h2>
        
        <h3>5.1 Individuals</h3>
        <ul>
          <li>Valid passport OR national ID card</li>
          <li>Proof of address: utility bill, bank statement, government letter (less than 3 months)</li>
          <li>Live selfie holding ID</li>
          <li>Source of funds declaration (Gold tier)</li>
        </ul>

        <h3>5.2 Business Entities</h3>
        <ul>
          <li>Certificate of incorporation</li>
          <li>Articles of association / bylaws</li>
          <li>Register of shareholders and directors</li>
          <li>ID verification for all directors and shareholders owning more than 25%</li>
          <li>Proof of business address</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>6. Beneficial Ownership</h2>
        <p>
          We identify any individual who owns more than 25% or exercises significant control over 
          business entities. Each beneficial owner undergoes individual verification.
        </p>
      </section>

      <section className="mb-8">
        <h2>7. Politically Exposed Persons (PEPs)</h2>
        <p>PEPs include:</p>
        <ul>
          <li>Heads of state, government ministers, parliamentarians</li>
          <li>Senior judiciary and military officials</li>
          <li>Senior executives of state-owned enterprises</li>
          <li>Immediate family members and close associates of the above</li>
        </ul>
        <p>
          PEPs undergo enhanced due diligence including source of wealth verification, 
          senior management approval, and ongoing monitoring.
        </p>
      </section>

      <section className="mb-8">
        <h2>8. Sanctions Compliance</h2>
        <p>All users are screened against:</p>
        <ul>
          <li>UN Security Council Sanctions List</li>
          <li>US OFAC SDN List</li>
          <li>EU Consolidated Sanctions List</li>
          <li>UK HM Treasury Sanctions List</li>
          <li>Relevant local sanctions lists</li>
        </ul>

        <h3>8.1 Prohibited Jurisdictions</h3>
        <p>
          We do not provide services to residents of: North Korea, Iran, Cuba, Syria, Crimea, 
          or any FATF-blacklisted jurisdiction.
        </p>
      </section>

      <section className="mb-8">
        <h2>9. Transaction Monitoring</h2>
        <p>Our systems monitor for:</p>
        <ul>
          <li>Unusual transaction volume or velocity</li>
          <li>Patterns inconsistent with stated purpose</li>
          <li>Transactions involving high-risk jurisdictions</li>
          <li>Structuring (breaking transactions to avoid thresholds)</li>
          <li>Sudden changes in user behavior</li>
        </ul>
        <p>Flagged transactions undergo manual review.</p>
      </section>

      <section className="mb-8">
        <h2>10. Suspicious Activity Reporting</h2>
        <p>When suspicious activity is detected:</p>
        <ol>
          <li>Transaction is flagged for review</li>
          <li>Compliance team investigates (24-48 hours)</li>
          <li>Decision to file Suspicious Activity Report (SAR) (48-72 hours)</li>
          <li>SAR filed with relevant authority per local law</li>
        </ol>
        <p>
          <strong>Important:</strong> We are prohibited from informing users ("tipping off") 
          that a SAR has been filed.
        </p>
      </section>

      <section className="mb-8">
        <h2>11. Record Keeping</h2>
        <p>We retain the following records:</p>
        <ul>
          <li>KYC documents: 7 years after relationship ends</li>
          <li>Transaction records: 7 years</li>
          <li>SAR and investigation files: 7 years</li>
          <li>Training records: 5 years</li>
        </ul>
        <p>
          Records are encrypted, access-controlled, and backed up per our Security Procedures.
        </p>
      </section>

      <section className="mb-8">
        <h2>12. Staff Training</h2>
        <ul>
          <li><strong>All Staff:</strong> Annual AML basics training</li>
          <li><strong>Front-line:</strong> Bi-annual customer due diligence training</li>
          <li><strong>Compliance Team:</strong> Quarterly regulatory updates</li>
          <li><strong>Senior Management:</strong> Annual AML risk management</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>13. Customer Responsibilities</h2>
        <p>By using our platform, you agree to:</p>
        <ul>
          <li>Provide accurate and complete information</li>
          <li>Update information when it changes</li>
          <li>Not use the platform for illegal purposes</li>
          <li>Cooperate with verification requests</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>14. Consequences of Non-Compliance</h2>
        <ul>
          <li><strong>False information:</strong> Account termination, potential legal action</li>
          <li><strong>Failed verification:</strong> Access denied or restricted</li>
          <li><strong>Suspicious activity:</strong> Account freeze, SAR filing</li>
          <li><strong>Sanctions match:</strong> Immediate account block</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>15. Red Flags</h2>
        
        <h3>15.1 Identity Red Flags</h3>
        <ul>
          <li>Reluctance to provide required information</li>
          <li>Inconsistent or conflicting documentation</li>
          <li>Documents that appear altered or forged</li>
          <li>Use of multiple identities</li>
        </ul>

        <h3>15.2 Transaction Red Flags</h3>
        <ul>
          <li>Round-number transactions without clear purpose</li>
          <li>Transactions just below reporting thresholds</li>
          <li>Rapid movement of funds after deposit</li>
          <li>Transactions inconsistent with stated income</li>
        </ul>

        <h3>15.3 Geographic Red Flags</h3>
        <ul>
          <li>Connections to high-risk or sanctioned jurisdictions</li>
          <li>Use of VPNs to mask location</li>
          <li>Frequent access from different countries</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>16. Cooperation with Authorities</h2>
        <p>We cooperate with law enforcement by:</p>
        <ul>
          <li>Responding to valid legal requests</li>
          <li>Filing required regulatory reports</li>
          <li>Providing testimony when legally required</li>
        </ul>
        <p>We do not voluntarily share data without legal basis.</p>
      </section>

      <section className="mb-8">
        <h2>17. Policy Review</h2>
        <p>This policy is reviewed:</p>
        <ul>
          <li>At least annually</li>
          <li>When regulations change</li>
          <li>After significant incidents</li>
          <li>When business model changes</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>18. Contact</h2>
        <p>
          <strong>Compliance Questions:</strong> {CONTACT.compliance}<br />
          <strong>Report Suspicious Activity:</strong> {CONTACT.security}
        </p>
      </section>
    </article>
  );
}