// src/app/admin/docs/security/page.tsx
import { CONTACT, COMPANY } from '@/config/contacts';
import { 
  Shield, 
  Lock, 
  Key, 
  Eye,
  AlertTriangle,
  CheckCircle,
  Server,
  Database,
  Globe,
  Smartphone,
  Wifi,
  FileWarning
} from 'lucide-react';

export default function SecurityProceduresPage() {
  return (
    <div className="max-w-8xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-danger/20 rounded-lg">
            <Shield className="w-6 h-6 text-danger" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-ink">Security Procedures</h1>
            <p className="text-ink-muted">Internal security protocols and guidelines</p>
          </div>
        </div>
        <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg">
          <p className="text-sm text-danger">
            <strong>CONFIDENTIAL:</strong> This document contains sensitive security information. 
            Unauthorized disclosure may result in termination and legal action.
          </p>
        </div>
      </div>

      {/* Security Principles */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">1. Security Principles</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'Defense in Depth', desc: 'Multiple layers of security controls', icon: Shield },
            { title: 'Least Privilege', desc: 'Minimum access necessary for role', icon: Lock },
            { title: 'Zero Trust', desc: 'Verify every request, trust nothing', icon: Eye },
            { title: 'Fail Secure', desc: 'Default to secure state on failure', icon: AlertTriangle },
          ].map((item, i) => (
            <div key={i} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <item.icon className="w-5 h-5 text-gold" />
                <h3 className="font-semibold text-ink">{item.title}</h3>
              </div>
              <p className="text-sm text-ink-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Access Control Levels */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">2. Access Control Levels</h2>
        
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                <th className="text-left py-3 px-4 text-ink-muted">Level</th>
                <th className="text-left py-3 px-4 text-ink-muted">Access</th>
                <th className="text-left py-3 px-4 text-ink-muted">Requirements</th>
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-medium text-success">L1 - Public</td>
                <td className="py-3 px-4">Public website, documentation</td>
                <td className="py-3 px-4">None</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-medium text-gold-400">L2 - User</td>
                <td className="py-3 px-4">Platform features, own data</td>
                <td className="py-3 px-4">Wallet connection, KYC</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-medium text-warning">L3 - Admin</td>
                <td className="py-3 px-4">Application review, user data</td>
                <td className="py-3 px-4">Admin role, 2FA, hardware wallet</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-medium text-orange-400">L4 - Super Admin</td>
                <td className="py-3 px-4">Admin management, settings</td>
                <td className="py-3 px-4">Super admin role, approval process</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-medium text-danger">L5 - Infrastructure</td>
                <td className="py-3 px-4">Servers, databases, deployments</td>
                <td className="py-3 px-4">DevOps team, VPN, MFA</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-gold-400">L6 - Critical</td>
                <td className="py-3 px-4">Smart contracts, treasury</td>
                <td className="py-3 px-4">Multi-sig, time-lock, CEO approval</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Authentication Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">3. Authentication Requirements</h2>
        
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-gold" />
              Password Policy
            </h3>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Minimum 16 characters
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Mix of uppercase, lowercase, numbers, symbols
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                No dictionary words or personal information
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Rotate every 90 days
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                No password reuse (last 12 passwords)
              </li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-gold" />
              Multi-Factor Authentication (MFA)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-success mb-2">Required For</h4>
                <ul className="text-sm text-ink-muted space-y-1">
                  <li>• Admin dashboard access</li>
                  <li>• Database access</li>
                  <li>• Cloud provider console</li>
                  <li>• Code repositories</li>
                  <li>• Communication platforms</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gold mb-2">Approved Methods</h4>
                <ul className="text-sm text-ink-muted space-y-1">
                  <li>• Hardware security keys (preferred)</li>
                  <li>• Authenticator apps (TOTP)</li>
                  <li>• Biometric verification</li>
                  <li className="text-danger">• SMS (NOT approved)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-gold" />
              Wallet Security
            </h3>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Hardware wallet required for admin functions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Seed phrase stored offline in secure location
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Never share seed phrase or private keys
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Verify all transactions before signing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Maximum 0.5 ETH in hot wallet for gas
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Data Security */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">4. Data Security</h2>
        
        <div className="bg-surface border border-border rounded-lg p-5 mb-4">
          <h3 className="font-semibold text-ink mb-4">Data Classification</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-ink-muted">Classification</th>
                  <th className="text-left py-2 px-3 text-ink-muted">Examples</th>
                  <th className="text-left py-2 px-3 text-ink-muted">Handling</th>
                </tr>
              </thead>
              <tbody className="text-ink-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-success">Public</td>
                  <td className="py-2 px-3">Marketing content, public docs</td>
                  <td className="py-2 px-3">No restrictions</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-gold-400">Internal</td>
                  <td className="py-2 px-3">Internal policies, procedures</td>
                  <td className="py-2 px-3">Employee access only</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-warning">Confidential</td>
                  <td className="py-2 px-3">User PII, business data</td>
                  <td className="py-2 px-3">Encrypted, access logged</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-danger">Restricted</td>
                  <td className="py-2 px-3">Private keys, KYC docs, credentials</td>
                  <td className="py-2 px-3">Encrypted, need-to-know, audited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-gold" />
            Encryption Standards
          </h3>
          <ul className="space-y-2 text-sm text-ink-muted">
            <li><strong className="text-ink">In Transit:</strong> TLS 1.3 minimum</li>
            <li><strong className="text-ink">At Rest:</strong> AES-256 encryption</li>
            <li><strong className="text-ink">Backups:</strong> Encrypted with separate keys</li>
            <li><strong className="text-ink">KYC Data:</strong> Per-user encryption keys</li>
          </ul>
        </div>
      </section>

      {/* Infrastructure Security */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">5. Infrastructure Security</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-gold" />
              Network Security
            </h3>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>• DDoS protection (Cloudflare)</li>
              <li>• Web Application Firewall (WAF)</li>
              <li>• Rate limiting on all endpoints</li>
              <li>• VPC isolation for databases</li>
              <li>• VPN required for internal access</li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-gold" />
              Server Hardening
            </h3>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li>• Minimal installed packages</li>
              <li>• Automatic security updates</li>
              <li>• No root login permitted</li>
              <li>• SSH key authentication only</li>
              <li>• Firewall default-deny policy</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Physical & Remote Security */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">6. Physical & Remote Security</h2>
        
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-5">
            <h3 className="font-semibold text-ink mb-3">Remote Work Requirements</h3>
            <ul className="space-y-2 text-sm text-ink-muted">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                VPN connection required for all admin work
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Full-disk encryption on all devices
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                Screen lock after 5 minutes of inactivity
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-success" />
                No admin work on shared/public computers
              </li>
            </ul>
          </div>

          <div className="bg-danger/10 border border-danger/30 rounded-lg p-5">
            <h3 className="font-semibold text-danger mb-3 flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Public WiFi Warning
            </h3>
            <p className="text-sm text-ink-muted">
              <strong>NEVER</strong> perform admin functions on public WiFi networks, even with VPN. 
              Use mobile hotspot or wait until on a secure network.
            </p>
          </div>
        </div>
      </section>

      {/* Vulnerability Management */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-gold mb-4">7. Vulnerability Management</h2>
        
        <div className="bg-surface border border-border rounded-lg p-5">
          <h3 className="font-semibold text-ink mb-4">Response Timelines (CVSS)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-3 text-ink-muted">Severity</th>
                  <th className="text-left py-2 px-3 text-ink-muted">CVSS Score</th>
                  <th className="text-left py-2 px-3 text-ink-muted">Fix Deadline</th>
                </tr>
              </thead>
              <tbody className="text-ink-muted">
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-danger font-medium">Critical</td>
                  <td className="py-2 px-3">9.0 - 10.0</td>
                  <td className="py-2 px-3">24 hours</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-orange-400 font-medium">High</td>
                  <td className="py-2 px-3">7.0 - 8.9</td>
                  <td className="py-2 px-3">7 days</td>
                </tr>
                <tr className="border-b border-border/50">
                  <td className="py-2 px-3 text-warning font-medium">Medium</td>
                  <td className="py-2 px-3">4.0 - 6.9</td>
                  <td className="py-2 px-3">30 days</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-success font-medium">Low</td>
                  <td className="py-2 px-3">0.1 - 3.9</td>
                  <td className="py-2 px-3">90 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security Contacts */}
      <section className="bg-danger/10 border border-danger/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-danger mb-4 flex items-center gap-2">
          <FileWarning className="w-5 h-5" />
          Report Security Issues
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-ink">Internal (Employees)</h3>
            <p className="text-ink-muted">{CONTACT.security}</p>
            <p className="text-ink-muted">Slack: #security-alerts</p>
          </div>
          <div>
            <h3 className="font-medium text-ink">External (Bug Bounty)</h3>
            <p className="text-ink-muted">{CONTACT.support}</p>
            <p className="text-ink-muted">Rewards: $50 - $25,000</p>
          </div>
        </div>
      </section>
    </div>
  );
}