// src/app/admin/docs/deployment/page.tsx
import { 
  Rocket, 
  Server, 
  Database, 
  Globe,
  CheckCircle,
  AlertTriangle,
  Terminal,
  GitBranch,
  Shield,
  Clock,
  RefreshCw,
  HardDrive,
  Activity
} from 'lucide-react';
import { COMPANY } from '@/config/contacts';

export const metadata = {
  title: `Deployment Guide | ${COMPANY.name} Admin`,
  description: 'Deployment procedures and infrastructure documentation',
};

export default function DeploymentGuidePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-500/20 rounded-lg">
            <Rocket className="w-6 h-6 text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Deployment Guide</h1>
            <p className="text-gray-400">Infrastructure and deployment procedures</p>
          </div>
        </div>
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-sm text-red-400">
            <strong>RESTRICTED:</strong> This document contains sensitive infrastructure information. 
            Access limited to DevOps and senior engineering.
          </p>
        </div>
      </div>

      {/* Architecture Overview */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Architecture Overview</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                Frontend
              </h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• <strong>Framework:</strong> Next.js 15 (App Router)</li>
                <li>• <strong>Hosting:</strong> Vercel</li>
                <li>• <strong>CDN:</strong> Vercel Edge Network</li>
                <li>• <strong>Domain:</strong> rwaexperts.com</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                Backend
              </h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• <strong>Database:</strong> Supabase (PostgreSQL)</li>
                <li>• <strong>Storage:</strong> IPFS (Pinata)</li>
                <li>• <strong>Auth:</strong> Wallet + Supabase</li>
                <li>• <strong>KYC:</strong> Synaps / Jumio</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-700">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-cyan-400" />
              Blockchain
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-cyan-400 font-medium">Primary</h4>
                <p className="text-gray-300">Cronos Mainnet</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-cyan-400 font-medium">Coming Soon</h4>
                <p className="text-gray-300">Polygon, Ethereum</p>
              </div>
              <div className="bg-gray-900/50 rounded-lg p-3">
                <h4 className="text-cyan-400 font-medium">Testnet</h4>
                <p className="text-gray-300">Cronos Testnet</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Environment Setup */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. Environment Variables</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">Required Variables</h3>
          
          <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-gray-300">
{`# App
NEXT_PUBLIC_APP_URL=https://rwaexperts.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx

# Blockchain
NEXT_PUBLIC_CHAIN_ID=25
NEXT_PUBLIC_RPC_URL=https://evm.cronos.org
NEXT_PUBLIC_FACTORY_ADDRESS=0x...

# IPFS
PINATA_API_KEY=xxx
PINATA_SECRET_KEY=xxx

# KYC Provider
SYNAPS_API_KEY=xxx
SYNAPS_SECRET=xxx

# Wallet Connect
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=xxx`}
            </pre>
          </div>
          
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <p className="text-sm text-yellow-400">
              ⚠️ Never commit secrets to version control. Use Vercel Environment Variables or .env.local
            </p>
          </div>
        </div>
      </section>

      {/* Deployment Process */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. Deployment Process</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-cyan-400" />
              Git Workflow
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-mono">develop</span>
                <span className="text-gray-400">→ Development/staging</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs font-mono">staging</span>
                <span className="text-gray-400">→ Pre-production testing</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs font-mono">main</span>
                <span className="text-gray-400">→ Production deployment</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">Pre-Deployment Checklist</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {[
                'All tests passing (npm run test)',
                'Build successful locally (npm run build)',
                'Linting passes (npm run lint)',
                'Environment variables verified',
                'Database migrations prepared',
                'Smart contracts verified (if updated)',
                'Staging environment tested',
                'Code review approved',
                'Changelog updated',
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">Deployment Steps</h3>
            <ol className="space-y-3 text-sm text-gray-300 list-decimal list-inside">
              <li>Create PR from <code className="text-cyan-400">develop</code> → <code className="text-cyan-400">main</code></li>
              <li>Get approval from at least 2 reviewers</li>
              <li>Run final staging tests</li>
              <li>Merge PR (triggers Vercel auto-deploy)</li>
              <li>Monitor deployment in Vercel dashboard</li>
              <li>Verify production site functionality</li>
              <li>Run smoke tests on production</li>
              <li>Notify team of successful deployment</li>
            </ol>
          </div>
        </div>
      </section>

      {/* Smart Contract Deployment */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. Smart Contract Deployment</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            Deployment Commands
          </h3>
          
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Install dependencies</p>
              <code className="text-cyan-400 font-mono text-sm">npm install</code>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Compile contracts</p>
              <code className="text-cyan-400 font-mono text-sm">npx hardhat compile</code>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Run tests</p>
              <code className="text-cyan-400 font-mono text-sm">npx hardhat test</code>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Deploy to testnet</p>
              <code className="text-cyan-400 font-mono text-sm">npx hardhat run scripts/deploy.ts --network cronos_testnet</code>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Deploy to mainnet (requires CTO approval)</p>
              <code className="text-cyan-400 font-mono text-sm">npx hardhat run scripts/deploy.ts --network cronos_mainnet</code>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Verify contract on explorer</p>
              <code className="text-cyan-400 font-mono text-sm">npx hardhat verify --network cronos_mainnet CONTRACT_ADDRESS</code>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">
              <strong>⚠️ CRITICAL:</strong> Mainnet deployments require multi-sig approval and 48-hour timelock. 
              Always test on testnet first. Contract upgrades need security team review.
            </p>
          </div>
        </div>
      </section>

      {/* Database Migrations */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. Database Migrations</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Supabase Migrations
          </h3>
          
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Create new migration</p>
              <code className="text-cyan-400 font-mono text-sm">supabase migration new migration_name</code>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Apply migrations locally</p>
              <code className="text-cyan-400 font-mono text-sm">supabase db reset</code>
            </div>
            
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-xs text-gray-500 mb-2"># Push to production</p>
              <code className="text-cyan-400 font-mono text-sm">supabase db push</code>
            </div>
          </div>
          
          <h4 className="font-medium text-white mt-6 mb-3">Migration Best Practices</h4>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Always backup production database before migrations
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Test migrations on staging environment first
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Use transactions for data modifications
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              Include rollback scripts for critical changes
            </li>
          </ul>
        </div>
      </section>

      {/* Monitoring & Health Checks */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Monitoring & Health Checks</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-green-400" />
              Health Endpoints
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <code className="text-cyan-400">/api/health</code>
                <span className="text-gray-400">App status</span>
              </li>
              <li className="flex justify-between">
                <code className="text-cyan-400">/api/health/db</code>
                <span className="text-gray-400">Database</span>
              </li>
              <li className="flex justify-between">
                <code className="text-cyan-400">/api/health/chain</code>
                <span className="text-gray-400">Blockchain RPC</span>
              </li>
            </ul>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Response Time Targets
            </h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex justify-between">
                <span>API endpoints</span>
                <span className="text-green-400">&lt; 200ms</span>
              </li>
              <li className="flex justify-between">
                <span>Page load (TTFB)</span>
                <span className="text-green-400">&lt; 500ms</span>
              </li>
              <li className="flex justify-between">
                <span>Database queries</span>
                <span className="text-green-400">&lt; 100ms</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-4 bg-gray-800 border border-gray-700 rounded-lg p-5">
          <h3 className="font-semibold text-white mb-3">Monitoring Tools</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-medium">Vercel Analytics</h4>
              <p className="text-gray-400">Performance & errors</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-medium">Supabase Dashboard</h4>
              <p className="text-gray-400">Database metrics</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h4 className="text-cyan-400 font-medium">Status Page</h4>
              <p className="text-gray-400">status.rwaexperts.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Backup & Recovery */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">7. Backup & Recovery</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-cyan-400" />
            Backup Schedule
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Data Type</th>
                  <th className="text-left py-2 px-3 text-gray-400">Frequency</th>
                  <th className="text-left py-2 px-3 text-gray-400">Retention</th>
                  <th className="text-left py-2 px-3 text-gray-400">Location</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3">Database</td>
                  <td className="py-2 px-3">Hourly</td>
                  <td className="py-2 px-3">30 days</td>
                  <td className="py-2 px-3">Multi-region</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3">Documents (IPFS)</td>
                  <td className="py-2 px-3">Real-time</td>
                  <td className="py-2 px-3">Permanent</td>
                  <td className="py-2 px-3">IPFS + Pinata</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3">Configurations</td>
                  <td className="py-2 px-3">On change</td>
                  <td className="py-2 px-3">90 days</td>
                  <td className="py-2 px-3">Git + encrypted backup</td>
                </tr>
                <tr>
                  <td className="py-2 px-3">Logs</td>
                  <td className="py-2 px-3">Streaming</td>
                  <td className="py-2 px-3">90 days</td>
                  <td className="py-2 px-3">Log aggregator</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <h4 className="font-medium text-white mt-6 mb-3">Recovery Time Objectives (RTO)</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h5 className="text-red-400 font-medium">Critical (Auth, Transactions)</h5>
              <p className="text-gray-300">RTO: 1 hour | RPO: 0</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h5 className="text-orange-400 font-medium">High (Database)</h5>
              <p className="text-gray-300">RTO: 4 hours | RPO: 1 hour</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h5 className="text-yellow-400 font-medium">Medium (API)</h5>
              <p className="text-gray-300">RTO: 2 hours | RPO: 0</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <h5 className="text-green-400 font-medium">Low (Admin Dashboard)</h5>
              <p className="text-gray-300">RTO: 8 hours | RPO: 1 hour</p>
            </div>
          </div>
        </div>
      </section>

      {/* Rollback Procedures */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">8. Rollback Procedures</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-cyan-400" />
              Frontend Rollback (Vercel)
            </h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Go to Vercel Dashboard → Deployments</li>
              <li>Find the last known good deployment</li>
              <li>Click "..." menu → "Promote to Production"</li>
              <li>Confirm rollback</li>
              <li>Verify site functionality</li>
              <li>Notify team of rollback</li>
            </ol>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">Database Rollback</h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Identify the point-in-time to restore</li>
              <li>Create backup of current state</li>
              <li>Use Supabase dashboard for point-in-time recovery</li>
              <li>Or run rollback migration script</li>
              <li>Verify data integrity</li>
              <li>Test application functionality</li>
            </ol>
            <div className="mt-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-sm text-yellow-400">
                ⚠️ Database rollbacks may cause data loss. Always consult CTO before proceeding.
              </p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5">
            <h3 className="font-semibold text-red-400 mb-3">Smart Contract Rollback</h3>
            <p className="text-sm text-gray-300 mb-3">
              Smart contracts are immutable. "Rollback" options:
            </p>
            <ul className="space-y-2 text-sm text-gray-300">
              <li>• <strong>Pause:</strong> Call pause() function to halt operations</li>
              <li>• <strong>Upgrade:</strong> Deploy new implementation via proxy pattern</li>
              <li>• <strong>Migrate:</strong> Deploy new contracts and migrate users</li>
            </ul>
            <p className="text-sm text-red-400 mt-3">
              <strong>All contract changes require multi-sig and 48h timelock.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* Emergency Procedures */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">9. Emergency Procedures</h2>
        
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <h3 className="font-semibold text-red-400 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Emergency Contacts
          </h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-medium text-white">On-Call DevOps</h4>
              <p className="text-cyan-400 font-mono">+1-XXX-XXX-XXXX</p>
              <p className="text-xs text-gray-500">24/7 availability</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-medium text-white">CTO</h4>
              <p className="text-cyan-400 font-mono">+1-XXX-XXX-XXXX</p>
              <p className="text-xs text-gray-500">Escalation contact</p>
            </div>
          </div>
          
          <h4 className="font-medium text-white mb-3">Emergency Actions</h4>
          <div className="space-y-3 text-sm">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <span className="text-red-400 font-medium">Site Down:</span>
              <span className="text-gray-300 ml-2">Check Vercel status → Check Supabase → Check DNS</span>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <span className="text-red-400 font-medium">Security Breach:</span>
              <span className="text-gray-300 ml-2">Pause contracts → Isolate systems → Notify security team</span>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-3">
              <span className="text-red-400 font-medium">Fund Risk:</span>
              <span className="text-gray-300 ml-2">Pause contracts immediately → CEO/CTO notification</span>
            </div>
          </div>
        </div>
      </section>

      {/* Useful Links */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Links</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-cyan-400 mb-2">Dashboards</h3>
            <ul className="text-gray-400 space-y-1">
              <li>• Vercel Dashboard</li>
              <li>• Supabase Console</li>
              <li>• Pinata Dashboard</li>
              <li>• Cronoscan</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-cyan-400 mb-2">Documentation</h3>
            <ul className="text-gray-400 space-y-1">
              <li>• Next.js Docs</li>
              <li>• Supabase Docs</li>
              <li>• Wagmi Docs</li>
              <li>• OpenZeppelin Docs</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-cyan-400 mb-2">Internal</h3>
            <ul className="text-gray-400 space-y-1">
              <li>• GitHub Repository</li>
              <li>• Notion Wiki</li>
              <li>• Slack #engineering</li>
              <li>• 1Password Vault</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
