// src/app/admin/docs/integration/page.tsx
import { 
  Plug, 
  Code, 
  Webhook, 
  Key,
  CheckCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { CONTACT, SOCIAL, LINKS, mailto, COMPANY } from '@/config/contacts';

export const metadata = {
  title: `Integration Guide | ${COMPANY.name} Admin`,
  description: 'Technical integration guide for partners and developers',
};

export default function IntegrationGuidePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Plug className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Integration Guide</h1>
            <p className="text-gray-400">Technical guide for platform integrations</p>
          </div>
        </div>
      </div>

      {/* Integration Options */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Integration Options</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: 'Referral Links',
              difficulty: 'Easy',
              time: '5 minutes',
              desc: 'Simple URL-based referral tracking'
            },
            {
              title: 'API Integration',
              difficulty: 'Medium',
              time: '1-2 days',
              desc: 'Full API access for custom integrations'
            },
            {
              title: 'White Label',
              difficulty: 'Advanced',
              time: '2-4 weeks',
              desc: 'Fully branded platform deployment'
            },
          ].map((option, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="font-semibold text-white mb-2">{option.title}</h3>
              <div className="flex items-center gap-2 text-xs mb-3">
                <span className={`px-2 py-0.5 rounded ${
                  option.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                  option.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {option.difficulty}
                </span>
                <span className="text-gray-500">{option.time}</span>
              </div>
              <p className="text-sm text-gray-400">{option.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Referral Integration */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. Referral Integration</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">URL Structure</h3>
          
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm mb-4">
            <code className="text-cyan-400">
              https://rwaexperts.com/?ref=YOUR_PARTNER_CODE
            </code>
          </div>
          
          <h4 className="font-medium text-white mb-2">Tracking Parameters</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Parameter</th>
                  <th className="text-left py-2 px-3 text-gray-400">Description</th>
                  <th className="text-left py-2 px-3 text-gray-400">Example</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 font-mono text-cyan-400">ref</td>
                  <td className="py-2 px-3">Partner referral code</td>
                  <td className="py-2 px-3 font-mono">PARTNER123</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 font-mono text-cyan-400">utm_source</td>
                  <td className="py-2 px-3">Traffic source</td>
                  <td className="py-2 px-3 font-mono">partner_website</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-mono text-cyan-400">utm_campaign</td>
                  <td className="py-2 px-3">Campaign identifier</td>
                  <td className="py-2 px-3 font-mono">spring_promo</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* API Integration */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. API Integration</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Key className="w-5 h-5 text-cyan-400" />
              Authentication
            </h3>
            
            <p className="text-sm text-gray-300 mb-4">
              All API requests require authentication headers:
            </p>
            
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm mb-4 overflow-x-auto">
              <pre className="text-gray-300">
{`x-wallet-address: 0xYourWalletAddress
x-api-key: your-api-key-here
Content-Type: application/json`}
              </pre>
            </div>
            
            <p className="text-sm text-yellow-400">
              ⚠️ Contact {CONTACT.partners} to obtain API credentials.
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Key Endpoints</h3>
            
            <div className="space-y-3">
              {[
                { method: 'GET', path: '/api/projects/list', desc: 'List all projects' },
                { method: 'GET', path: '/api/projects/[id]', desc: 'Get project details' },
                { method: 'GET', path: '/api/kyc/status/[address]', desc: 'Check KYC status' },
                { method: 'POST', path: '/api/tokenization/apply', desc: 'Submit application' },
              ].map((endpoint, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg">
                  <span className={`px-2 py-1 rounded text-xs font-mono ${
                    endpoint.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                  }`}>
                    {endpoint.method}
                  </span>
                  <code className="text-cyan-400 font-mono text-sm">{endpoint.path}</code>
                  <span className="text-gray-500 text-sm ml-auto">{endpoint.desc}</span>
                </div>
              ))}
            </div>
            
            <p className="text-sm text-gray-400 mt-4">
              Full API documentation: <a href="/docs/api-reference" className="text-cyan-400 hover:underline">/docs/api-reference</a>
            </p>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h3 className="font-semibold text-white mb-4">Rate Limits</h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-2 px-3 text-gray-400">Tier</th>
                    <th className="text-right py-2 px-3 text-gray-400">Requests/min</th>
                    <th className="text-left py-2 px-3 text-gray-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300">
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2 px-3">Standard</td>
                    <td className="text-right py-2 px-3">100</td>
                    <td className="py-2 px-3">Default for all partners</td>
                  </tr>
                  <tr className="border-b border-gray-700/50">
                    <td className="py-2 px-3">Partner</td>
                    <td className="text-right py-2 px-3">500</td>
                    <td className="py-2 px-3">Approved integrations</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Enterprise</td>
                    <td className="text-right py-2 px-3">Custom</td>
                    <td className="py-2 px-3">Contact for enterprise needs</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Webhooks */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. Webhooks</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-cyan-400" />
            Available Events
          </h3>
          
          <div className="space-y-3">
            {[
              { event: 'kyc.approved', desc: 'User KYC verification approved' },
              { event: 'kyc.rejected', desc: 'User KYC verification rejected' },
              { event: 'project.created', desc: 'New project tokenized' },
              { event: 'project.funded', desc: 'Project reached funding goal' },
              { event: 'investment.made', desc: 'New investment in a project' },
              { event: 'dividend.distributed', desc: 'Dividend payment processed' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg">
                <code className="text-cyan-400 font-mono text-sm">{item.event}</code>
                <span className="text-gray-400 text-sm">{item.desc}</span>
              </div>
            ))}
          </div>
          
          <h4 className="font-medium text-white mt-6 mb-3">Webhook Payload Example</h4>
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
            <pre className="text-gray-300">
{`{
  "event": "investment.made",
  "timestamp": "2026-03-11T10:30:00Z",
  "data": {
    "project_id": "uuid-string",
    "investor_address": "0x...",
    "amount": 1000,
    "tokens_received": 1000,
    "transaction_hash": "0x..."
  },
  "signature": "webhook-signature-for-verification"
}`}
            </pre>
          </div>
        </div>
      </section>

      {/* White Label */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. White Label Deployment</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">Included</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Custom branding & domain
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Dedicated smart contracts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Admin dashboard access
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  KYC integration support
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  Technical onboarding
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">Pricing</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li><strong>Setup Fee:</strong> $25,000</li>
                <li><strong>Monthly:</strong> $2,500/month</li>
                <li><strong>Revenue Share:</strong> Negotiable</li>
                <li><strong>Timeline:</strong> 2-4 weeks</li>
              </ul>
              <p className="text-sm text-gray-500 mt-4">
                Contact: {CONTACT.partners}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testing */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Testing Environment</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">Testnet Access</h3>
          
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">Base URL:</span>
              <code className="text-cyan-400 ml-2">https://testnet.rwaexperts.com/api</code>
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">Network:</span>
              <code className="text-cyan-400 ml-2">Cronos Testnet</code>
            </div>
            <div className="p-3 bg-gray-900/50 rounded-lg">
              <span className="text-gray-400">Faucet:</span>
              <code className="text-cyan-400 ml-2">https://cronos.org/faucet</code>
            </div>
          </div>
          
          <p className="text-sm text-yellow-400 mt-4">
            ⚠️ Testnet data is reset weekly. Do not use for production.
          </p>
        </div>
      </section>

      {/* Support */}
      <section className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
          <Plug className="w-5 h-5" />
          Integration Support
        </h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-white">Technical Support</h3>
            <p className="text-gray-400">{CONTACT.api}</p>
            <p className="text-gray-500">Response: 24 hours</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Partnership Inquiries</h3>
            <p className="text-gray-400">{CONTACT.partners}</p>
            <p className="text-gray-500">Response: 48 hours</p>
          </div>
        </div>
      </section>
    </div>
  );
}
