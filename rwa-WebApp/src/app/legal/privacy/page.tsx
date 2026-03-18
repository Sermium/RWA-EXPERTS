import { CONTACT, COMPANY } from "@/config/contacts";

// src/app/legal/privacy/page.tsx
export const metadata = {
  title: `Privacy Policy |  ${COMPANY.name}`,
  description: `Privacy Policy for ${COMPANY.name} platform`,
};

export default function PrivacyPage() {
  return (
    <article className="max-w-4xl prose prose-invert prose-cyan">
      <div className="mb-8 not-prose">
        <h1 className="text-4xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-400">Last Updated: March 2026</p>
      </div>

      <section className="mb-8">
        <h2>1. Introduction</h2>
        <p>
          {COMPANY.name} Ltd ("we," "us," "our") is committed to protecting your privacy. 
          This Privacy Policy explains how we collect, use, share, and protect your personal 
          information when you use our platform.
        </p>
        <p>
          <strong>Data Controller:</strong> {COMPANY.name} Ltd<br />
          <strong>Contact:</strong> {CONTACT.privacy}
        </p>
      </section>

      <section className="mb-8">
        <h2>2. Information We Collect</h2>
        
        <h3>2.1 Information You Provide</h3>
        <ul>
          <li><strong>Identity Data:</strong> Name, date of birth, nationality, government ID</li>
          <li><strong>Contact Data:</strong> Email address, phone number</li>
          <li><strong>Documents:</strong> ID copies, proof of address, selfies for verification</li>
          <li><strong>Financial Data:</strong> Investment amounts, wallet addresses, source of funds</li>
          <li><strong>Business Data:</strong> Company name, registration details (for creators)</li>
        </ul>

        <h3>2.2 Information Collected Automatically</h3>
        <ul>
          <li><strong>Device Data:</strong> IP address, browser type, operating system</li>
          <li><strong>Usage Data:</strong> Pages visited, features used, timestamps</li>
          <li><strong>Wallet Data:</strong> Public wallet address, transaction history (on-chain)</li>
          <li><strong>Cookies:</strong> Session cookies, preference cookies</li>
        </ul>

        <h3>2.3 Information from Third Parties</h3>
        <ul>
          <li>KYC verification results from identity providers</li>
          <li>Blockchain transaction data (publicly available)</li>
          <li>Analytics data (aggregated, anonymized)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>3. How We Use Your Information</h2>
        
        <h3>3.1 Service Delivery</h3>
        <ul>
          <li>Process tokenization applications</li>
          <li>Verify your identity (KYC/AML)</li>
          <li>Execute investments and transactions</li>
          <li>Provide customer support</li>
        </ul>

        <h3>3.2 Legal Compliance</h3>
        <ul>
          <li>Comply with KYC/AML regulations</li>
          <li>Screen against sanctions lists</li>
          <li>Report to authorities as required</li>
          <li>Prevent fraud and financial crime</li>
        </ul>

        <h3>3.3 Platform Improvement</h3>
        <ul>
          <li>Analyze usage patterns</li>
          <li>Fix bugs and improve features</li>
          <li>Develop new products</li>
        </ul>

        <h3>3.4 Communications</h3>
        <ul>
          <li>Send transaction confirmations</li>
          <li>Provide important updates and security alerts</li>
          <li>Marketing communications (with consent)</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>4. Legal Basis for Processing (GDPR)</h2>
        <ul>
          <li><strong>Contract:</strong> Processing necessary to provide our services</li>
          <li><strong>Legal Obligation:</strong> KYC/AML compliance</li>
          <li><strong>Legitimate Interest:</strong> Security, fraud prevention, improvement</li>
          <li><strong>Consent:</strong> Marketing communications</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>5. Information Sharing</h2>
        <p>We share your information with:</p>
        <ul>
          <li><strong>KYC Providers:</strong> Identity verification services (under data processing agreements)</li>
          <li><strong>Cloud Providers:</strong> Infrastructure services (encrypted storage)</li>
          <li><strong>Blockchain Networks:</strong> Transaction data is public by design</li>
          <li><strong>Legal Authorities:</strong> When required by valid legal request</li>
          <li><strong>Professional Advisors:</strong> Legal, audit services (under confidentiality)</li>
        </ul>
        <p>
          <strong>We do not sell your personal data.</strong> We do not share data for 
          unauthorized marketing purposes.
        </p>
      </section>

      <section className="mb-8">
        <h2>6. International Transfers</h2>
        <p>
          Your data may be transferred outside your country. We protect transfers using:
        </p>
        <ul>
          <li>Standard Contractual Clauses (SCCs)</li>
          <li>Adequacy decisions</li>
          <li>Binding Corporate Rules</li>
          <li>Your explicit consent</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>7. Data Retention</h2>
        <div className="not-prose my-4 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-gray-400">Data Type</th>
                <th className="text-left py-2 px-4 text-gray-400">Retention Period</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4">KYC Documents</td>
                <td className="py-2 px-4">7 years after relationship ends</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4">Transaction Records</td>
                <td className="py-2 px-4">7 years</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4">Account Data</td>
                <td className="py-2 px-4">Until deletion + 3 years</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-2 px-4">Marketing Preferences</td>
                <td className="py-2 px-4">Until consent withdrawn</td>
              </tr>
              <tr>
                <td className="py-2 px-4">Analytics Data</td>
                <td className="py-2 px-4">2 years</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2>8. Your Rights</h2>
        <p>Under GDPR and similar laws, you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your data</li>
          <li><strong>Rectification:</strong> Correct inaccurate data</li>
          <li><strong>Erasure:</strong> Request deletion ("right to be forgotten")</li>
          <li><strong>Restriction:</strong> Limit how we process your data</li>
          <li><strong>Portability:</strong> Receive your data in machine-readable format</li>
          <li><strong>Objection:</strong> Object to processing based on legitimate interest</li>
          <li><strong>Withdraw Consent:</strong> Revoke consent for marketing</li>
        </ul>
        <p>
          To exercise your rights, email <strong>{CONTACT.privacy}</strong>. 
          We respond within 30 days and may require identity verification.
        </p>
      </section>

      <section className="mb-8">
        <h2>9. Security</h2>
        <p>We protect your data using:</p>
        <ul>
          <li>TLS 1.3 encryption in transit</li>
          <li>AES-256 encryption at rest</li>
          <li>Strict access controls</li>
          <li>Regular security audits</li>
          <li>Intrusion detection systems</li>
          <li>Staff security training</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>10. Cookies</h2>
        <p>We use:</p>
        <ul>
          <li><strong>Essential Cookies:</strong> Required for Platform operation (cannot be disabled)</li>
          <li><strong>Preference Cookies:</strong> Remember your settings (1 year)</li>
          <li><strong>Analytics Cookies:</strong> Understand usage patterns (2 years)</li>
          <li><strong>Security Cookies:</strong> Fraud prevention (session)</li>
        </ul>
        <p>Manage cookie preferences through your browser settings.</p>
      </section>

      <section className="mb-8">
        <h2>11. Special Notices</h2>
        <h3>11.1 Children</h3>
        <p>
          The Platform is not intended for users under 18. We do not knowingly collect 
          data from minors. If discovered, such data will be deleted.
        </p>

        <h3>11.2 Blockchain Data</h3>
        <p>
          Blockchain transactions are permanent and publicly visible. We cannot delete 
          on-chain data. Your wallet address may be linked to your identity through KYC records.
        </p>

        <h3>11.3 Automated Decisions</h3>
        <p>
          We use automated systems for KYC screening, fraud detection, and risk scoring. 
          You may request human review of automated decisions.
        </p>
      </section>

      <section className="mb-8">
        <h2>12. Policy Updates</h2>
        <p>
          We may update this policy and will notify you of material changes via email 
          and Platform notification. Changes are effective 30 days after posting.
        </p>
      </section>

      <section className="mb-8">
        <h2>13. Contact Us</h2>
        <p>
          <strong>Privacy Questions:</strong> {CONTACT.privacy}<br />
          <strong>Data Protection Officer:</strong> {CONTACT.privacy}
        </p>
        <p>
          If unsatisfied with our response, you may lodge a complaint with your local 
          data protection authority.
        </p>
      </section>

      <section className="mb-8">
        <h2>14. Regional Provisions</h2>
        <ul>
          <li><strong>EEA/UK:</strong> Full GDPR rights apply</li>
          <li><strong>California (CCPA):</strong> Right to know, delete, opt-out of sale (we don't sell data)</li>
          <li><strong>Brazil (LGPD):</strong> Rights similar to GDPR</li>
          <li><strong>Nigeria (NDPR):</strong> Rights per Nigerian regulations</li>
        </ul>
      </section>
    </article>
  );
}
