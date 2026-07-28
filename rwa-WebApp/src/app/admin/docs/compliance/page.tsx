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

export default function ComplianceFrameworkPage() {
  return (
    <div className="max-w-8xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-gold-500/20 rounded-lg">
            <Scale className="w-6 h-6 text-gold-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-ink">Compliance Framework</h1>
            <p className="text-ink-muted">Regulatory requirements and compliance procedures</p>
          </div>
        </div>
      </div>

      {/* Regulatory Overview */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">1. Regulatory Framework</h2>
        
        <div className="bg-surface border border-border rounded-lg p-6 mb-4">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-gold" />
            Global Standards
          </h3>
          <ul className="space-y-3 text-sm text-ink-muted">
            <li className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink">FATF Recommendations</strong>
                <p className="text-ink-muted">Anti-money laundering and counter-terrorist financing standards</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink">GDPR (EU)</strong>
                <p className="text-ink-muted">Data protection and privacy for EU residents</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-ink">Securities Regulations</strong>
                <p className="text-ink-muted">Compliance with applicable securities laws per jurisdiction</p>
              </div>
            </li>
          </ul>
        </div>
      </section>

      {/* Regional Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">2. Regional Requirements</h2>
        
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
            <div key={i} className="bg-surface border border-border rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-ink flex items-center gap-2">
                  <span className="text-2xl">{item.flag}</span>
                  {item.region}
                </h3>
                <span className={`text-xs px-2 py-1 rounded ${
                  item.status === 'Compliant' 
                    ? 'bg-success/10 text-success' 
                    : item.status === 'Partial (Accredited only)'
                    ? 'bg-warning/10 text-warning'
                    : 'bg-gold-500/20 text-gold-400'
                }`}>
                  {item.status}
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="text-ink-faint mb-1">Regulations</h4>
                  <ul className="text-ink-muted space-y-1">
                    {item.regulations.map((r, j) => (
                      <li key={j}>• {r}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-ink-faint mb-1">Requirements</h4>
                  <ul className="text-ink-muted space-y-1">
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
        <h2 className="text-2xl font-semibold text-gold mb-4">3. Restricted Jurisdictions</h2>
        
        <div className="bg-danger/10 border border-danger/30 rounded-lg p-6">
          <h3 className="font-semibold text-danger mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            Prohibited Jurisdictions
          </h3>
          <p className="text-sm text-ink-muted mb-4">
            Users from these jurisdictions are <strong>completely blocked</strong> from using the platform:
          </p>
          <div className="flex flex-wrap gap-2">
            {['North Korea', 'Iran', 'Cuba', 'Syria', 'Crimea', 'Russia (partial)', 'Belarus'].map((country, i) => (
              <span key={i} className="px-3 py-1 bg-danger/10 text-danger rounded-full text-sm">
                {country}
              </span>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-danger/30">
            <h4 className="font-medium text-warning mb-2">Enhanced Due Diligence Required</h4>
            <p className="text-sm text-ink-muted mb-2">
              Users from these jurisdictions require additional verification:
            </p>
            <div className="flex flex-wrap gap-2">
              {['Pakistan', 'Myanmar', 'Yemen', 'Haiti', 'South Sudan'].map((country, i) => (
                <span key={i} className="px-3 py-1 bg-warning/10 text-warning rounded-full text-sm">
                  {country}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* KYC Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">4. KYC/AML Requirements</h2>
        
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-gold" />
            Verification Tiers
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-ink-muted">Tier</th>
                  <th className="text-left py-2 px-3 text-ink-muted">Documents Required</th>
                  <th className="text-left py-2 px-3 text-ink-muted">Checks Performed</th>
                  <th className="text-right py-2 px-3 text-ink-muted">Limit</th>
                </tr>
              </thead>
              <tbody className="text-ink-muted">
                <tr className="border-b border-border/50">
                  <td className="py-3 px-3 text-orange-400">Bronze</td>
                  <td className="py-3 px-3">Email only</td>
                  <td className="py-3 px-3">Email verification, IP check</td>
                  <td className="text-right py-3 px-3">$1,000</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-3 text-ink-muted">Silver</td>
                  <td className="py-3 px-3">ID, Proof of Address</td>
                  <td className="py-3 px-3">Document verification, Sanctions, PEP</td>
                  <td className="text-right py-3 px-3">$10,000</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-3 px-3 text-warning">Gold</td>
                  <td className="py-3 px-3">ID, Address, Source of Funds</td>
                  <td className="py-3 px-3">All Silver + Enhanced due diligence</td>
                  <td className="text-right py-3 px-3">$100,000</td>
                </tr>
                <tr>
                  <td className="py-3 px-3 text-gold">Diamond</td>
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
        <h2 className="text-2xl font-semibold text-gold mb-4">5. Transaction Monitoring</h2>
        
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="font-semibold text-ink mb-4">Red Flags - Automatic Alerts</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-danger mb-2">Transaction Patterns</h4>
              <ul className="text-sm text-ink-muted space-y-1">
                <li>• Multiple transactions just below thresholds</li>
                <li>• Rapid succession of transactions</li>
                <li>• Unusual transaction volumes</li>
                <li>• Round number transactions</li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-medium text-danger mb-2">User Behavior</h4>
              <ul className="text-sm text-ink-muted space-y-1">
                <li>• Multiple accounts from same IP</li>
                <li>• VPN/Proxy usage patterns</li>
                <li>• Inconsistent geographic activity</li>
                <li>• Frequent KYC document changes</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <p className="text-sm text-warning">
              <strong>Action Required:</strong> All flagged transactions must be reviewed within 24 hours. 
              Suspicious Activity Reports (SARs) must be filed per local regulations.
            </p>
          </div>
        </div>
      </section>

      {/* Record Keeping */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">6. Record Keeping Requirements</h2>
        
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                <th className="text-left py-3 px-4 text-ink-muted">Record Type</th>
                <th className="text-left py-3 px-4 text-ink-muted">Retention Period</th>
                <th className="text-left py-3 px-4 text-ink-muted">Storage</th>
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">KYC Documents</td>
                <td className="py-3 px-4">7 years after relationship ends</td>
                <td className="py-3 px-4">Encrypted, access-controlled</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">Transaction Records</td>
                <td className="py-3 px-4">7 years</td>
                <td className="py-3 px-4">Database + blockchain</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">SAR/STR Filings</td>
                <td className="py-3 px-4">7 years</td>
                <td className="py-3 px-4">Secure, restricted access</td>
              </tr>
              <tr className="border-b border-border/50">
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
        <h2 className="text-2xl font-semibold text-gold mb-4">7. Audit & Reporting</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-3">Internal Audits</h3>
            <ul className="text-sm text-ink-muted space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Quarterly compliance review
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Monthly transaction sampling
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Annual KYC file review
              </li>
            </ul>
          </div>
          
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-3">External Audits</h3>
            <ul className="text-sm text-ink-muted space-y-2">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Annual financial audit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Bi-annual AML program audit
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Smart contract audits (per deployment)
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-gold-500/10 border border-gold-500/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-gold-400 mb-4 flex items-center gap-2">
          <Scale className="w-5 h-5" />
          Compliance Contacts
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-ink">Compliance Officer</h3>
            <p className="text-ink-muted">{CONTACT.compliance}</p>
          </div>
          <div>
            <h3 className="font-medium text-ink">Data Protection Officer</h3>
            <p className="text-ink-muted">{CONTACT.privacy}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
