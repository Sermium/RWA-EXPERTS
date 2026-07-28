// src/app/docs/api-reference/page.tsx
import { CONTACT, SOCIAL, COMPANY, LINKS } from '@/config/contacts';
import { Code, Lock, Clock, AlertCircle } from 'lucide-react';

export const metadata = {
  title: `API Reference | ${COMPANY.name}`,
  description: `API documentation for ${COMPANY.name} integration`,
};

export default function ApiReferencePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-ink mb-4">API Reference</h1>
        <p className="text-xl text-ink-muted">
          Technical documentation for integrating with {COMPANY.name} APIs.
        </p>
      </div>

      {/* Overview */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">Overview</h2>
        
        <div className="bg-surface border border-border rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-ink mb-4">Base URL</h3>
          <code className="bg-surface-sunken px-3 py-2 rounded text-gold block">
            {LINKS.api}
          </code>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <Lock className="w-6 h-6 text-gold mb-2" />
            <h4 className="font-semibold text-ink">Authentication</h4>
            <p className="text-sm text-ink-muted mt-1">Wallet signature + API key</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <Code className="w-6 h-6 text-gold mb-2" />
            <h4 className="font-semibold text-ink">Format</h4>
            <p className="text-sm text-ink-muted mt-1">JSON request/response</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <Clock className="w-6 h-6 text-gold mb-2" />
            <h4 className="font-semibold text-ink">Rate Limit</h4>
            <p className="text-sm text-ink-muted mt-1">100 requests/minute</p>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">Authentication</h2>
        
        <p className="text-ink-muted mb-4">
          All authenticated endpoints require two headers:
        </p>

        <div className="bg-surface-sunken rounded-lg p-4 mb-6 overflow-x-auto">
          <pre className="text-sm text-ink-muted">
{`x-wallet-address: 0xYourWalletAddress
x-api-key: your-api-key (for partner integrations)`}
          </pre>
        </div>

        <div className="bg-warning/10 border border-warning/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-warning">API Keys</h4>
              <p className="text-sm text-ink-muted mt-1">
                API keys are required for partner integrations. Contact us at 
                {CONTACT.partners} to request access.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tokenization Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">Tokenization Endpoints</h2>
        
        {/* POST /api/tokenization/apply */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-success/20 text-success text-xs font-mono rounded">POST</span>
            <code className="text-ink">/api/tokenization/apply</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Submit a new tokenization application.</p>
            
            <h4 className="font-semibold text-ink mb-2">Request Body</h4>
            <div className="bg-surface-sunken rounded-lg p-4 mb-4 overflow-x-auto">
              <pre className="text-sm text-ink-muted">
{`{
  "legal_entity_name": "ABC Properties Ltd",
  "contact_name": "John Doe",
  "contact_email": "john@abc.com",
  "contact_phone": "+234123456789",
  "website": "https://abc-properties.com",
  "asset_type": "real_estate",
  "asset_name": "Lagos Tower",
  "asset_description": "20-story commercial building...",
  "estimated_value": 5000000,
  "use_case": "Raise capital for renovation...",
  "needs_escrow": true,
  "needs_dividends": true,
  "documents": [
    {
      "name": "title_deed.pdf",
      "url": "ipfs://Qm...",
      "type": "title_deed"
    }
  ]
}`}
              </pre>
            </div>

            <h4 className="font-semibold text-ink mb-2">Response (201 Created)</h4>
            <div className="bg-surface-sunken rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-ink-muted">
{`{
  "success": true,
  "data": {
    "id": "uuid-string",
    "status": "pending",
    "fee": 1200,
    "created_at": "2026-03-11T10:00:00Z"
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* GET /api/tokenization/[id] */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-gold-500/20 text-gold-400 text-xs font-mono rounded">GET</span>
            <code className="text-ink">/api/tokenization/[id]</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Get details of a specific application.</p>
            
            <h4 className="font-semibold text-ink mb-2">Response (200 OK)</h4>
            <div className="bg-surface-sunken rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-ink-muted">
{`{
  "id": "uuid-string",
  "user_address": "0x...",
  "status": "approved",
  "legal_entity_name": "ABC Properties Ltd",
  "asset_type": "real_estate",
  "asset_name": "Lagos Tower",
  "estimated_value": 5000000,
  "fee": 1200,
  "documents": [...],
  "admin_notes": "Approved for deployment",
  "token_address": "0x...",
  "created_at": "2026-03-11T10:00:00Z",
  "updated_at": "2026-03-12T14:30:00Z"
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* PUT /api/tokenization/[id]/resubmit */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-warning/20 text-warning text-xs font-mono rounded">PUT</span>
            <code className="text-ink">/api/tokenization/[id]/resubmit</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Resubmit a rejected application with updated information.</p>
            <p className="text-sm text-ink-faint">Only applications with status "rejected" can be resubmitted.</p>
          </div>
        </div>
      </section>

      {/* Projects Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">Projects Endpoints</h2>
        
        {/* GET /api/projects/list */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-gold-500/20 text-gold-400 text-xs font-mono rounded">GET</span>
            <code className="text-ink">/api/projects/list</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Get list of all deployed projects.</p>
            
            <h4 className="font-semibold text-ink mb-2">Query Parameters</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-ink-muted">Parameter</th>
                    <th className="text-left py-2 px-3 text-ink-muted">Type</th>
                    <th className="text-left py-2 px-3 text-ink-muted">Description</th>
                  </tr>
                </thead>
                <tbody className="text-ink-muted">
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-gold">asset_type</td>
                    <td className="py-2 px-3">string</td>
                    <td className="py-2 px-3">Filter by asset type</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-gold">status</td>
                    <td className="py-2 px-3">string</td>
                    <td className="py-2 px-3">funding, funded, closed</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-3 font-mono text-gold">limit</td>
                    <td className="py-2 px-3">number</td>
                    <td className="py-2 px-3">Results per page (default: 20)</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-mono text-gold">offset</td>
                    <td className="py-2 px-3">number</td>
                    <td className="py-2 px-3">Pagination offset</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <h4 className="font-semibold text-ink mb-2">Response (200 OK)</h4>
            <div className="bg-surface-sunken rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-ink-muted">
{`{
  "success": true,
  "data": {
    "projects": [
      {
        "id": "uuid",
        "name": "Lagos Tower",
        "asset_type": "real_estate",
        "token_address": "0x...",
        "funding_goal": 500000,
        "funding_raised": 250000,
        "token_price": 1.00,
        "investors_count": 150,
        "status": "funding"
      }
    ],
    "total": 45,
    "limit": 20,
    "offset": 0
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* GET /api/projects/[id] */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-gold-500/20 text-gold-400 text-xs font-mono rounded">GET</span>
            <code className="text-ink">/api/projects/[id]</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Get detailed information about a specific project.</p>
          </div>
        </div>
      </section>

      {/* KYC Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">KYC Endpoints</h2>
        
        {/* GET /api/kyc/status/[address] */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-gold-500/20 text-gold-400 text-xs font-mono rounded">GET</span>
            <code className="text-ink">/api/kyc/status/[address]</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Get KYC status and limits for a wallet address.</p>
            
            <h4 className="font-semibold text-ink mb-2">Response (200 OK)</h4>
            <div className="bg-surface-sunken rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-ink-muted">
{`{
  "success": true,
  "data": {
    "address": "0x...",
    "tier": "silver",
    "status": "verified",
    "investment_limit": 10000,
    "total_invested": 2500,
    "remaining_limit": 7500,
    "verified_at": "2026-03-01T10:00:00Z"
  }
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* POST /api/kyc/initiate */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-success/20 text-success text-xs font-mono rounded">POST</span>
            <code className="text-ink">/api/kyc/initiate</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Start KYC verification process for a tier upgrade.</p>
            
            <h4 className="font-semibold text-ink mb-2">Request Body</h4>
            <div className="bg-surface-sunken rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-ink-muted">
{`{
  "tier": "silver",
  "email": "user@example.com"
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* IPFS Endpoints */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">IPFS Endpoints</h2>
        
        {/* POST /api/ipfs/upload */}
        <div className="bg-surface border border-border rounded-lg mb-6 overflow-hidden">
          <div className="bg-surface-sunken px-4 py-3 border-b border-border flex items-center gap-3">
            <span className="px-2 py-1 bg-success/20 text-success text-xs font-mono rounded">POST</span>
            <code className="text-ink">/api/ipfs/upload</code>
          </div>
          <div className="p-4">
            <p className="text-ink-muted mb-4">Upload a file to IPFS.</p>
            
            <h4 className="font-semibold text-ink mb-2">Request</h4>
            <p className="text-sm text-ink-muted mb-4">
              Content-Type: <code className="text-gold">multipart/form-data</code>
            </p>
            <ul className="text-sm text-ink-muted space-y-1 mb-4">
              <li>• Field name: <code className="text-gold">file</code></li>
              <li>• Max size: 50MB</li>
              <li>• Allowed types: PDF, PNG, JPG, JPEG</li>
            </ul>

            <h4 className="font-semibold text-ink mb-2">Response (200 OK)</h4>
            <div className="bg-surface-sunken rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-ink-muted">
{`{
  "success": true,
  "data": {
    "ipfsHash": "QmXyz...",
    "ipfsUrl": "ipfs://QmXyz...",
    "gatewayUrl": "https://gateway.pinata.cloud/ipfs/QmXyz...",
    "size": 1024000,
    "type": "application/pdf"
  }
}`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Error Codes */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">Error Codes</h2>
        
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                <th className="text-left py-3 px-4 text-ink-muted">Code</th>
                <th className="text-left py-3 px-4 text-ink-muted">Message</th>
                <th className="text-left py-3 px-4 text-ink-muted">Description</th>
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-mono">400</td>
                <td className="py-3 px-4">Bad Request</td>
                <td className="py-3 px-4">Invalid request body or parameters</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-mono">401</td>
                <td className="py-3 px-4">Unauthorized</td>
                <td className="py-3 px-4">Missing or invalid authentication</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-mono">403</td>
                <td className="py-3 px-4">Forbidden</td>
                <td className="py-3 px-4">Insufficient permissions (e.g., KYC tier)</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-mono">404</td>
                <td className="py-3 px-4">Not Found</td>
                <td className="py-3 px-4">Resource does not exist</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4 font-mono">429</td>
                <td className="py-3 px-4">Too Many Requests</td>
                <td className="py-3 px-4">Rate limit exceeded</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-mono">500</td>
                <td className="py-3 px-4">Internal Error</td>
                <td className="py-3 px-4">Server error - contact support</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-surface-sunken rounded-lg p-4">
          <h4 className="font-semibold text-ink mb-2">Error Response Format</h4>
          <pre className="text-sm text-ink-muted">
{`{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid asset_type",
    "details": "asset_type must be one of: real_estate, commodities, equity, art"
  }
}`}
          </pre>
        </div>
      </section>

      {/* Rate Limits */}
      <section className="mb-12">
        <h2 className="text-2xl font-semibold text-gold mb-6">Rate Limits</h2>
        
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-sunken">
                <th className="text-left py-3 px-4 text-ink-muted">Tier</th>
                <th className="text-left py-3 px-4 text-ink-muted">Limit</th>
                <th className="text-left py-3 px-4 text-ink-muted">Window</th>
              </tr>
            </thead>
            <tbody className="text-ink-muted">
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">Standard</td>
                <td className="py-3 px-4">100 requests</td>
                <td className="py-3 px-4">1 minute</td>
              </tr>
              <tr className="border-b border-border/50">
                <td className="py-3 px-4">Partner</td>
                <td className="py-3 px-4">500 requests</td>
                <td className="py-3 px-4">1 minute</td>
              </tr>
              <tr>
                <td className="py-3 px-4">Enterprise</td>
                <td className="py-3 px-4">Custom</td>
                <td className="py-3 px-4">Contact us</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-ink-muted mt-4">
          Rate limit headers are included in all responses:
        </p>
        <div className="bg-surface-sunken rounded-lg p-4 mt-2">
          <pre className="text-sm text-ink-muted">
{`X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1709971200`}
          </pre>
        </div>
      </section>

      {/* Support */}
      <section className="bg-gradient-to-r from-gold/10 to-gold-light-500/10 border border-gold/20 rounded-xl p-8">
        <h2 className="text-2xl font-semibold text-ink mb-4">API Support</h2>
        <p className="text-ink-muted mb-6">
          Need help with integration? Our developer team is here to assist.
        </p>
        <div className="grid md:grid-cols-3 gap-4 text-center">
          <div>
            <h3 className="font-semibold text-ink">Discord</h3>
            <p className="text-gold text-sm">{SOCIAL.discord}</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Email</h3>
            <p className="text-gold text-sm">{CONTACT.api}</p>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Partners</h3>
            <p className="text-gold text-sm">{CONTACT.partners}</p>
          </div>
        </div>
      </section>
    </div>
  );
}