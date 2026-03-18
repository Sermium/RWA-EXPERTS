// src/app/admin/docs/page.tsx
import { 
  Shield, 
  Users, 
  FileCheck, 
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Edit,
  Trash2,
  UserPlus,
  Key
} from 'lucide-react';
import { CONTACT, SOCIAL, COMPANY, mailto } from '@/config/contacts';
export const metadata = {
  title: `Admin Guide | ${COMPANY.name}`,
  description: 'Administrative procedures and guidelines',
};

export default function AdminGuidePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Guide</h1>
            <p className="text-gray-400">Administrative procedures and responsibilities</p>
          </div>
        </div>
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            <strong>Confidential:</strong> This document contains internal procedures. 
            Do not share with unauthorized personnel.
          </p>
        </div>
      </div>

      {/* Role Overview */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Admin Roles</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-semibold text-white">Admin</h3>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Review tokenization applications
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Approve/reject applications
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                View user KYC status
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Manage project milestones
              </li>
              <li className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-red-400" />
                Cannot manage other admins
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-yellow-500/30 rounded-lg p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Key className="w-5 h-5 text-yellow-400" />
              </div>
              <h3 className="font-semibold text-white">Super Admin</h3>
              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">★</span>
            </div>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                All Admin permissions
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Add/remove admins
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Promote admins to super admin
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                Access system settings
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                View audit logs
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Application Review */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. Application Review Process</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
          <h3 className="font-semibold text-white mb-4">Review Workflow</h3>
          
          <div className="space-y-4">
            {[
              { step: 1, title: 'New Application Received', desc: 'Application appears in "Pending" queue', icon: Clock, color: 'yellow' },
              { step: 2, title: 'Document Verification', desc: 'Verify all required documents are uploaded and valid', icon: FileCheck, color: 'blue' },
              { step: 3, title: 'Asset Validation', desc: 'Confirm ownership, valuation, and legal structure', icon: Eye, color: 'purple' },
              { step: 4, title: 'Compliance Check', desc: 'Verify KYC status, jurisdiction, and regulatory compliance', icon: Shield, color: 'cyan' },
              { step: 5, title: 'Decision', desc: 'Approve with on-chain permission or reject with feedback', icon: CheckCircle, color: 'green' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className={`w-10 h-10 rounded-full bg-${item.color}-500/20 flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-${item.color}-400 font-bold`}>{item.step}</span>
                </div>
                <div>
                  <h4 className="font-medium text-white">{item.title}</h4>
                  <p className="text-sm text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Checklist */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">Review Checklist</h3>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-3">Documentation</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  Ownership documents present and valid
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  Professional valuation/appraisal attached
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  Legal entity registration confirmed
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  All documents are legible and complete
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-cyan-400 mb-3">Compliance</h4>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  Creator has Gold-tier KYC
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  Not from restricted jurisdiction
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  Asset type is permitted
                </li>
                <li className="flex items-start gap-2">
                  <input type="checkbox" className="mt-1" disabled />
                  Valuation is reasonable
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Application Status */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. Application Statuses</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900">
                <th className="text-left py-3 px-4 text-gray-400">Status</th>
                <th className="text-left py-3 px-4 text-gray-400">Description</th>
                <th className="text-left py-3 px-4 text-gray-400">Actions Available</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs">Pending</span>
                </td>
                <td className="py-3 px-4">New application awaiting review</td>
                <td className="py-3 px-4">Review, Approve, Reject</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">In Review</span>
                </td>
                <td className="py-3 px-4">Currently being reviewed by admin</td>
                <td className="py-3 px-4">Approve, Reject, Request Info</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Approved</span>
                </td>
                <td className="py-3 px-4">Approved for token deployment</td>
                <td className="py-3 px-4">View, Revoke (Super Admin)</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs">Rejected</span>
                </td>
                <td className="py-3 px-4">Application denied with feedback</td>
                <td className="py-3 px-4">View (User can resubmit)</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">Deployed</span>
                </td>
                <td className="py-3 px-4">Token contracts deployed on-chain</td>
                <td className="py-3 px-4">View, Manage Milestones</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Approval Process */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. Approval Process</h2>
        
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-5">
            <h3 className="font-semibold text-green-400 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Approving an Application
            </h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Complete the review checklist above</li>
              <li>Click "Approve" button on the application</li>
              <li>Add approval notes (optional but recommended)</li>
              <li>Confirm the on-chain transaction in your wallet</li>
              <li>This grants the creator permission to deploy tokens</li>
              <li>Creator is notified via email</li>
            </ol>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-5">
            <h3 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
              <XCircle className="w-5 h-5" />
              Rejecting an Application
            </h3>
            <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
              <li>Identify the reason(s) for rejection</li>
              <li>Click "Reject" button on the application</li>
              <li><strong>Required:</strong> Provide detailed feedback for the creator</li>
              <li>Select rejection category (Documentation, Compliance, Valuation, Other)</li>
              <li>Confirm rejection</li>
              <li>Creator can address issues and resubmit</li>
            </ol>
            
            <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
              <h4 className="text-sm font-medium text-white mb-2">Common Rejection Reasons:</h4>
              <ul className="text-xs text-gray-400 space-y-1">
                <li>• Missing or incomplete ownership documentation</li>
                <li>• Valuation not supported by evidence</li>
                <li>• KYC verification incomplete or expired</li>
                <li>• Asset type not currently supported</li>
                <li>• Jurisdiction restrictions</li>
                <li>• Suspicious activity indicators</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* User Management */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. User Management</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">KYC Status Overview</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 px-3 text-gray-400">Tier</th>
                  <th className="text-left py-2 px-3 text-gray-400">Requirements</th>
                  <th className="text-right py-2 px-3 text-gray-400">Limit</th>
                  <th className="text-left py-2 px-3 text-gray-400">Can Create Projects</th>
                </tr>
              </thead>
              <tbody className="text-gray-300">
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-orange-400">🥉 Bronze</td>
                  <td className="py-2 px-3">Email only</td>
                  <td className="text-right py-2 px-3">$1,000</td>
                  <td className="py-2 px-3 text-red-400">No</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-gray-300">🥈 Silver</td>
                  <td className="py-2 px-3">ID + Liveness</td>
                  <td className="text-right py-2 px-3">$10,000</td>
                  <td className="py-2 px-3 text-red-400">No</td>
                </tr>
                <tr className="border-b border-gray-700/50">
                  <td className="py-2 px-3 text-yellow-400">🥇 Gold</td>
                  <td className="py-2 px-3">Enhanced + Source of Funds</td>
                  <td className="text-right py-2 px-3">$100,000</td>
                  <td className="py-2 px-3 text-green-400">Yes</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-cyan-400">💎 Diamond</td>
                  <td className="py-2 px-3">Institutional verification</td>
                  <td className="text-right py-2 px-3">Unlimited</td>
                  <td className="py-2 px-3 text-green-400">Yes</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Admin Management (Super Admin) */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Admin Management (Super Admin Only)</h2>
        
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-yellow-400" />
            <h3 className="font-semibold text-yellow-400">Super Admin Functions</h3>
          </div>
          
          <div className="space-y-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Adding an Admin
              </h4>
              <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                <li>Go to Admin → User Management</li>
                <li>Enter the wallet address of the new admin</li>
                <li>Select role: Admin or Super Admin</li>
                <li>Confirm the transaction</li>
                <li>New admin is immediately active</li>
              </ol>
            </div>

            <div className="bg-gray-900/50 rounded-lg p-4">
              <h4 className="font-medium text-white mb-2 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Removing an Admin
              </h4>
              <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                <li>Go to Admin → User Management</li>
                <li>Find the admin to remove</li>
                <li>Click "Remove" and confirm</li>
                <li>Access is revoked immediately</li>
              </ol>
              <p className="text-xs text-yellow-400 mt-2">
                ⚠️ Cannot remove the last super admin
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">7. Best Practices</h2>
        
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-green-400 mb-3">Do</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Review applications within 3-5 business days
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Provide detailed feedback on rejections
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Document unusual decisions with notes
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Escalate suspicious activity immediately
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                Use hardware wallet for admin functions
              </li>
            </ul>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-red-400 mb-3">Don't</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                Share admin credentials or access
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                Approve without completing checklist
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                Reject without providing reasons
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                Discuss pending applications externally
              </li>
              <li className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                Use admin functions on public WiFi
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Emergency Contacts */}
      <section className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Emergency Contacts
        </h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-white">Security Issues</h3>
            <p className="text-gray-400">{CONTACT.security}</p>
            <p className="text-gray-500">Response: Immediate</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Technical Support</h3>
            <p className="text-gray-400">{CONTACT.support}</p>
            <p className="text-gray-500">Response: 4 hours</p>
          </div>
          <div>
            <h3 className="font-medium text-white">Compliance</h3>
            <p className="text-gray-400">{CONTACT.compliance}</p>
            <p className="text-gray-500">Response: 24 hours</p>
          </div>
        </div>
      </section>
    </div>
  );
}