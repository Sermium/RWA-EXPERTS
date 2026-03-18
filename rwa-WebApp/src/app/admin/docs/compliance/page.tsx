// src/app/admin/docs/compliance/page.tsx
import { 
  Scale, 
  Globe, 
  FileCheck, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  MapPin,
  Shield,
  Users,
  Building2
} from 'lucide-react';
import { CONTACT, SOCIAL, LINKS, mailto, COMPANY } from '@/config/contacts';
export const metadata = {
  title: `Compliance Framework | ${COMPANY.name} Admin`,
  description: 'Regulatory compliance framework and procedures',
};

export default function ComplianceFrameworkPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-500/20 rounded-lg">
            <Scale className="w-6 h-6 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Compliance Framework</h1>
            <p className="text-gray-400">Regulatory requirements and compliance procedures</p>
          </div>
        </div>
      </div>

      {/* Regulatory Overview */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Regulatory Framework</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-4">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            Global Standards
          </h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">FATF Recommendations</strong>
                <p className="text-gray-400">Anti-money laundering and counter-terrorist financing standards</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">GDPR (EU)</strong>
                <p className="text-gray-400">Data protection and privacy for EU residents</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white">Securities Regulations</strong>
                <p className="text-gray-400">Compliance with applicable securities laws per jurisdiction</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Regional Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. Regional Requirements</h2>
        
        <div className="space-y-4">
          {[
            {
              region: 'European Union',
              flag: '🇪🇺',
              regulations: ['MiCA (Markets in Crypto-Assets)', 'AMLD5/6', 'GDPR'],
              requirements: ['Licensed or registered entity', 'KYC/AML procedures', 'Data protection officer'],
              status: 'Compliant'
            },
            {
              region: 'United Kingdom',
              flag: '🇬🇧',
              regulations: ['FCA Registration', 'UK GDPR', 'Money Laundering Regulations 2017'],
              requirements: ['FCA registration for crypto assets', 'UK representative', 'AML controls'],
              status: 'Compliant'
            },
            {
              region: 'United States',
              flag: '🇺🇸',
              regulations: ['SEC (Reg D)', 'FinCEN', 'State regulations'],
              requirements: ['Accredited investor verification', 'SAR filing', 'State-by-state compliance'],
              status: 'Partial (Accredited only)'
            },
            {
              region: 'Nigeria',
              flag: '🇳🇬',
              regulations: ['SEC Nigeria', 'NDPR', 'Money Laundering Act'],
              requirements: ['SEC sandbox/registration', 'Data protection compliance', 'AML program'],
              status: 'In Progress'
            },
            {
              region: 'Kenya',
              flag: '🇰🇪',
              regulations: ['CMA', 'Data Protection Act', 'POCAMLA'],
              requirements: ['CMA authorization', 'Data commissioner registration', 'AML controls'],
              status: 'In Progress'
            },
            {
              region: 'South Africa',
              flag: '🇿🇦',
              regulations: ['FSCA', 'POPIA', 'FICA'],
              requirements: ['FSCA license', 'Information officer', 'FIC registration'],
              status: 'In Progress'
            },
          ].map((item, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <span className="text-2xl">{item.flag}</span>
                  {item.region}
                </h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.status === 'Compliant' 
                    ? 'bg-green-500/20 text-green-400' 
                    : item.status === 'Partial (Accredited only)'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {item.status}
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-gray-500 mb-1">Regulations</h4>
                  <ul className="text-gray-300 space-y-1">
                    {item.regulations.map((r, j) => (
                      <li key={j}>• {r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-gray-500 mb-1">Requirements</h4>
                  <ul className="text-gray-300 space-y-1">
                    {item.requirements.map((r, j) => (
                      <li key={j}>• {r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Restricted Jurisdictions */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. Restricted Jurisdictions</h2>
        
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Prohibited Jurisdictions
          </h3>
          <p className="text-sm text-gray-300 mb-4">
            Users from these jurisdictions are <strong>completely blocked</strong> from using the platform:
          </p>
          <div className="flex flex-wrap gap-2">
            {['North Korea', 'Iran', 'Cuba', 'Syria', 'Crimea', 'Russia (partial)', 'Belarus'].map((country, i) => (
              <span key={i} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm">
                {country}
              </span>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-red-500/30">
            <h4 className="font-medium text-yellow-400 mb-2">Enhanced Due Diligence Required</h4>
            <p className="text-sm text-gray-400 mb-2">
              Users from these jurisdictions require additional verification:
            </p>
            <div className="flex flex-wrap gap-2">
              {['Pakistan', 'Myanmar', 'Yemen', 'Haiti', 'South Sudan'].map((country, i) => (
                <span key={i} className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                  {country}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* KYC Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. KYC/AML Requirements</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            Verification Tiers
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Tier</th>
                  <th className="text-left py-2 px-3 text-gray-400">Documents Required</th>
                  <th className="text-left py-2 px-3 text-gray-400">Checks Performed</th>
                  <th className="text-right py-2 px-3 text-gray-400">Limit</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-3 text-orange-400">Bronze</td>
                  <td className="py-3 px-3">Email only</td>
                  <td className="py-3 px-3">Email verification, IP check</td>
                  <td className="text-right py-3 px-3">$1,000</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-3 text-gray-300">Silver</td>
                  <td className="py-3 px-3">ID, Proof of Address</td>
                  <td className="py-3 px-3">Document verification, Sanctions, PEP</td>
                  <td className="text-right py-3 px-3">$10,000</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-3 px-3 text-yellow-400">Gold</td>
                  <td className="py-3 px-3">ID, Address, Source of Funds</td>
                  <td className="py-3 px-3">All Silver + Enhanced due diligence</td>
                  <td className="text-right py-3 px-3">$100,000</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 text-cyan-400">Diamond</td>
                  <td className="py-3 px-3">All Gold + Business docs</td>
                  <td className="py-3 px-3">Manual review, Institutional verification</td>
                  <td className="text-right py-3 px-3">Unlimited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Transaction Monitoring */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. Transaction Monitoring</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">Red Flags - Automatic Alerts</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">Transaction Patterns</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Multiple transactions just below thresholds</li>
                <li>• Rapid succession of transactions</li>
                <li>• Unusual transaction volumes</li>
                <li>• Round number transactions</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-red-400 mb-2">User Behavior</h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Multiple accounts from same IP</li>
                <li>• VPN/Proxy usage patterns</li>
                <li>• Inconsistent geographic activity</li>
                <li>• Frequent KYC document changes</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              <strong>Action Required:</strong> All flagged transactions must be reviewed within 24 hours. 
              Suspicious Activity Reports (SARs) must be filed per local regulations.
            </p>
          </div>
        </div>
      </section>

      {/* Record Keeping */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Record Keeping Requirements</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900">
                <th className="text-left py-3 px-4 text-gray-400">Record Type</th>
                <th className="text-left py-3 px-4 text-gray-400">Retention Period</th>
                <th className="text-left py-3 px-4 text-gray-400">Storage</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">KYC Documents</td>
                <td className="py-3 px-4">7 years after relationship ends</td>
                <td className="py-3 px-4">Encrypted, access-controlled</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Transaction Records</td>
                <td className="py-3 px-4">7 years</td>
                <td className="py-3 px-4">Database + blockchain</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">SAR/STR Filings</td>
                <td className="py-3 px-4">7 years</td>
                <td className="py-3 px-4">Secure, restricted access</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">Communication Logs</td>
                <td className="py-3 px-4">5 years</td>
                <td className="py-3 px-4">Archived, searchable</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Training Records</td>
                <td className="py-3 px-4">5 years</td>
                <td className="py-3 px-4">HR system</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Audit Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">7. Audit & Reporting</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">Internal Audits</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Quarterly compliance review
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Monthly transaction sampling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Annual KYC file review
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">External Audits</h3>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Annual financial audit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Bi-annual AML program audit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Smart contract audits (per deployment)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-purple-400 mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5" />
          Compliance Contacts
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-white">Compliance Officer</h3>
            <p className="text-gray-400">{CONTACT.compliance}</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Data Protection Officer</h3>
            <p className="text-gray-400">{CONTACT.privacy}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
