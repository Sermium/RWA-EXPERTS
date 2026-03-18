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

export const metadata = {
  title: `Security Procedures | ${COMPANY.name} Admin`,
  description: 'Security protocols and procedures for administrators',
};

export default function SecurityProceduresPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Security Procedures</h1>
            <p className="text-gray-400">Internal security protocols and guidelines</p>
          </div>
        </div>
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">
            <strong>CONFIDENTIAL:</strong> This document contains sensitive security information. 
            Unauthorized disclosure may result in termination and legal action.
          </p>
        </div>
      </div>

      {/* Security Principles */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Security Principles</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { title: 'Defense in Depth', desc: 'Multiple layers of security controls', icon: Shield },
            { title: 'Least Privilege', desc: 'Minimum access necessary for role', icon: Lock },
            { title: 'Zero Trust', desc: 'Verify every request, trust nothing', icon: Eye },
            { title: 'Fail Secure', desc: 'Default to secure state on failure', icon: AlertTriangle },
          ].map((item, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <item.icon className="w-5 h-5 text-cyan-400" />
                <h3 className="font-semibold text-white">{item.title}</h3>
              </div>
              <p className="text-sm text-gray-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Access Control Levels */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. Access Control Levels</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900">
                <th className="text-left py-3 px-4 text-gray-400">Level</th>
                <th className="text-left py-3 px-4 text-gray-400">Access</th>
                <th className="text-left py-3 px-4 text-gray-400">Requirements</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4 font-medium text-green-400">L1 - Public</td>
                <td className="py-3 px-4">Public website, documentation</td>
                <td className="py-3 px-4">None</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4 font-medium text-blue-400">L2 - User</td>
                <td className="py-3 px-4">Platform features, own data</td>
                <td className="py-3 px-4">Wallet connection, KYC</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4 font-medium text-yellow-400">L3 - Admin</td>
                <td className="py-3 px-4">Application review, user data</td>
                <td className="py-3 px-4">Admin role, 2FA, hardware wallet</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4 font-medium text-orange-400">L4 - Super Admin</td>
                <td className="py-3 px-4">Admin management, settings</td>
                <td className="py-3 px-4">Super admin role, approval process</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4 font-medium text-red-400">L5 - Infrastructure</td>
                <td className="py-3 px-4">Servers, databases, deployments</td>
                <td className="py-3 px-4">DevOps team, VPN, MFA</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium text-purple-400">L6 - Critical</td>
                <td className="py-3 px-4">Smart contracts, treasury</td>
                <td className="py-3 px-4">Multi-sig, time-lock, CEO approval</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Authentication Requirements */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. Authentication Requirements</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              Password Policy
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Minimum 16 characters
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Mix of uppercase, lowercase, numbers, symbols
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No dictionary words or personal information
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Rotate every 90 days
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No password reuse (last 12 passwords)
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-cyan-400" />
              Multi-Factor Authentication (MFA)
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-green-400 mb-2">Required For</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Admin dashboard access</li>
                  <li>• Database access</li>
                  <li>• Cloud provider console</li>
                  <li>• Code repositories</li>
                  <li>• Communication platforms</li>
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-cyan-400 mb-2">Approved Methods</h4>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Hardware security keys (preferred)</li>
                  <li>• Authenticator apps (TOTP)</li>
                  <li>• Biometric verification</li>
                  <li className="text-red-400">• SMS (NOT approved)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              Wallet Security
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Hardware wallet required for admin functions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Seed phrase stored offline in secure location
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Never share seed phrase or private keys
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Verify all transactions before signing
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Maximum 0.5 ETH in hot wallet for gas
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Data Security */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. Data Security</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5 mb-4">
          <h3 className="font-semibold text-white mb-4">Data Classification</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Classification</th>
                  <th className="text-left py-2 px-3 text-gray-400">Examples</th>
                  <th className="text-left py-2 px-3 text-gray-400">Handling</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-green-400">Public</td>
                  <td className="py-2 px-3">Marketing content, public docs</td>
                  <td className="py-2 px-3">No restrictions</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-blue-400">Internal</td>
                  <td className="py-2 px-3">Internal policies, procedures</td>
                  <td className="py-2 px-3">Employee access only</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-yellow-400">Confidential</td>
                  <td className="py-2 px-3">User PII, business data</td>
                  <td className="py-2 px-3">Encrypted, access logged</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-red-400">Restricted</td>
                  <td className="py-2 px-3">Private keys, KYC docs, credentials</td>
                  <td className="py-2 px-3">Encrypted, need-to-know, audited</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Encryption Standards
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><strong className="text-white">In Transit:</strong> TLS 1.3 minimum</li>
            <li><strong className="text-white">At Rest:</strong> AES-256 encryption</li>
            <li><strong className="text-white">Backups:</strong> Encrypted with separate keys</li>
            <li><strong className="text-white">KYC Data:</strong> Per-user encryption keys</li>
          </ul>
        </div>
      </section>

      {/* Infrastructure Security */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. Infrastructure Security</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-400" />
              Network Security
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• DDoS protection (Cloudflare)</li>
              <li>• Web Application Firewall (WAF)</li>
              <li>• Rate limiting on all endpoints</li>
              <li>• VPC isolation for databases</li>
              <li>• VPN required for internal access</li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Server Hardening
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
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
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Physical & Remote Security</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">Remote Work Requirements</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                VPN connection required for all admin work
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Full-disk encryption on all devices
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Screen lock after 5 minutes of inactivity
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                No admin work on shared/public computers
              </li>
            </ul>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5">
            <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
              <Wifi className="w-5 h-5" />
              Public WiFi Warning
            </h3>
            <p className="text-sm text-gray-300">
              <strong>NEVER</strong> perform admin functions on public WiFi networks, even with VPN. 
              Use mobile hotspot or wait until on a secure network.
            </p>
          </div>
        </div>
      </section>

      {/* Vulnerability Management */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">7. Vulnerability Management</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
          <h3 className="font-semibold text-white mb-4">Response Timelines (CVSS)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Severity</th>
                  <th className="text-left py-2 px-3 text-gray-400">CVSS Score</th>
                  <th className="text-left py-2 px-3 text-gray-400">Fix Deadline</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-red-400 font-medium">Critical</td>
                  <td className="py-2 px-3">9.0 - 10.0</td>
                  <td className="py-2 px-3">24 hours</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-orange-400 font-medium">High</td>
                  <td className="py-2 px-3">7.0 - 8.9</td>
                  <td className="py-2 px-3">7 days</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-yellow-400 font-medium">Medium</td>
                  <td className="py-2 px-3">4.0 - 6.9</td>
                  <td className="py-2 px-3">30 days</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-green-400 font-medium">Low</td>
                  <td className="py-2 px-3">0.1 - 3.9</td>
                  <td className="py-2 px-3">90 days</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Security Contacts */}
      <section className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
          <FileWarning className="w-5 h-5" />
          Report Security Issues
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-white">Internal (Employees)</h3>
            <p className="text-gray-400">{CONTACT.security}</p>
            <p className="text-gray-400">Slack: #security-alerts</p>
          </div>
          <div>
            <h3 className="font-medium text-white">External (Bug Bounty)</h3>
            <p className="text-gray-400">{CONTACT.support}</p>
            <p className="text-gray-400">Rewards: $50 - $25,000</p>
          </div>
        </div>
      </section>
    </div>
  );
}