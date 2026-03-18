// src/app/admin/docs/incident-response/page.tsx
import { 
  AlertTriangle, 
  Phone, 
  Clock, 
  Users,
  FileText,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  Zap
} from 'lucide-react';
import { CONTACT, SOCIAL, LINKS, mailto, COMPANY } from '@/config/contacts';
export const metadata = {
  title: `Incident Response | ${COMPANY.name} Admin`,
  description: 'Incident response procedures and escalation paths',
};

export default function IncidentResponsePage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-500/20 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Incident Response</h1>
            <p className="text-gray-400">Procedures for handling security and operational incidents</p>
          </div>
        </div>
      </div>

      {/* Emergency Contacts - Top of page for quick access */}
      <section className="mb-10">
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-400 mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Emergency Contacts (24/7)
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-white">Security Lead</h3>
              <p className="text-cyan-400 font-mono">{CONTACT.securityphone}</p>
              <p className="text-xs text-gray-500">{CONTACT.security}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-white">CTO</h3>
              <p className="text-cyan-400 font-mono">{CONTACT.ctophone}</p>
              <p className="text-xs text-gray-500">{CONTACT.cto}</p>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-white">CEO</h3>
              <p className="text-cyan-400 font-mono">{CONTACT.ceophone}</p>
              <p className="text-xs text-gray-500">{CONTACT.ceo}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Incident Categories */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">1. Incident Categories</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 bg-gray-900">
                <th className="text-left py-3 px-4 text-gray-400">Category</th>
                <th className="text-left py-3 px-4 text-gray-400">Examples</th>
                <th className="text-left py-3 px-4 text-gray-400">Initial Response</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="text-red-400 font-medium">Security</span>
                </td>
                <td className="py-3 px-4">Breach, exploit, unauthorized access</td>
                <td className="py-3 px-4">Immediate containment</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="text-orange-400 font-medium">Technical</span>
                </td>
                <td className="py-3 px-4">Outage, data loss, smart contract bug</td>
                <td className="py-3 px-4">Assess impact, notify users</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="text-yellow-400 font-medium">Financial</span>
                </td>
                <td className="py-3 px-4">Fund loss, payment failure, fraud</td>
                <td className="py-3 px-4">Freeze affected accounts</td>
              </tr>
              <tr className="border-b border-gray-700/50">
                <td className="py-3 px-4">
                  <span className="text-blue-400 font-medium">Compliance</span>
                </td>
                <td className="py-3 px-4">Regulatory inquiry, data breach, AML alert</td>
                <td className="py-3 px-4">Legal notification</td>
              </tr>
              <tr>
                <td className="py-3 px-4">
                  <span className="text-purple-400 font-medium">Reputational</span>
                </td>
                <td className="py-3 px-4">PR crisis, social media attack</td>
                <td className="py-3 px-4">Communications team</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Severity Levels */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">2. Severity Levels</h2>
        
        <div className="space-y-4">
          {[
            {
              level: 'P1 - Critical',
              color: 'red',
              response: 'Immediate (< 15 min)',
              examples: 'Active breach, funds at risk, complete outage',
              actions: ['All hands on deck', 'CEO/CTO notified', 'War room activated']
            },
            {
              level: 'P2 - High',
              color: 'orange',
              response: '< 1 hour',
              examples: 'Partial outage, security vulnerability, significant bug',
              actions: ['On-call team engaged', 'Management notified', 'User communication prepared']
            },
            {
              level: 'P3 - Medium',
              color: 'yellow',
              response: '< 4 hours',
              examples: 'Non-critical bug, minor service degradation',
              actions: ['Assigned to engineer', 'Tracked in system', 'Regular updates']
            },
            {
              level: 'P4 - Low',
              color: 'green',
              response: '< 24 hours',
              examples: 'Minor issue, feature request, cosmetic bug',
              actions: ['Logged for review', 'Scheduled fix', 'No escalation needed']
            },
          ].map((item, i) => (
            <div key={i} className={`bg-gray-800 border border-${item.color}-500/30 rounded-lg p-5`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className={`font-semibold text-${item.color}-400`}>{item.level}</h3>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {item.response}
                </span>
              </div>
              <p className="text-sm text-gray-400 mb-3">
                <strong>Examples:</strong> {item.examples}
              </p>
              <div className="flex flex-wrap gap-2">
                {item.actions.map((action, j) => (
                  <span key={j} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                    {action}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Response Team */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">3. Incident Response Team</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                role: 'Incident Commander',
                who: 'CTO or Security Lead',
                responsibilities: ['Overall coordination', 'Decision authority', 'External communication approval']
              },
              {
                role: 'Technical Lead',
                who: 'Senior Engineer',
                responsibilities: ['Technical investigation', 'Implement fixes', 'System recovery']
              },
              {
                role: 'Communications Lead',
                who: 'Head of Marketing',
                responsibilities: ['User notifications', 'Status page updates', 'Media response']
              },
              {
                role: 'Legal/Compliance',
                who: 'Legal Counsel',
                responsibilities: ['Regulatory notifications', 'Evidence preservation', 'Legal guidance']
              },
            ].map((member, i) => (
              <div key={i} className="bg-gray-900/50 rounded-lg p-4">
                <h3 className="font-semibold text-white">{member.role}</h3>
                <p className="text-sm text-cyan-400 mb-2">{member.who}</p>
                <ul className="text-xs text-gray-400 space-y-1">
                  {member.responsibilities.map((r, j) => (
                    <li key={j}>• {r}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Response Phases */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">4. Response Phases</h2>
        
        <div className="space-y-4">
          {[
            {
              phase: 'Detection',
              time: '0-30 min',
              icon: Activity,
              steps: [
                'Alert received (monitoring, user report, team discovery)',
                'Initial assessment of scope and severity',
                'Incident Commander identified and notified',
                'Incident ticket created with all known details'
              ]
            },
            {
              phase: 'Containment',
              time: '30 min - 2 hours',
              icon: Shield,
              steps: [
                'Stop the bleeding - prevent further damage',
                'Isolate affected systems if necessary',
                'Preserve evidence for investigation',
                'Initial user communication if needed'
              ]
            },
            {
              phase: 'Eradication',
              time: '2-24 hours',
              icon: Zap,
              steps: [
                'Identify root cause',
                'Remove threat/fix vulnerability',
                'Patch affected systems',
                'Verify fix effectiveness'
              ]
            },
            {
              phase: 'Recovery',
              time: '24-72 hours',
              icon: CheckCircle,
              steps: [
                'Restore normal operations',
                'Monitor for recurrence',
                'Gradual return to full service',
                'User notification of resolution'
              ]
            },
            {
              phase: 'Post-Incident',
              time: '1-2 weeks',
              icon: FileText,
              steps: [
                'Complete incident report within 48 hours',
                'Conduct post-mortem meeting',
                'Identify improvement actions',
                'Update procedures and training'
              ]
            },
          ].map((item, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-cyan-500/20 rounded-lg">
                  <item.icon className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.phase}</h3>
                  <p className="text-xs text-gray-500">{item.time}</p>
                </div>
              </div>
              <ol className="space-y-2 text-sm text-gray-300 list-decimal list-inside">
                {item.steps.map((step, j) => (
                  <li key={j}>{step}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </section>

      {/* P1 Checklist */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">5. P1 Critical Incident Checklist</h2>
        
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
          <h3 className="font-semibold text-red-400 mb-4">Immediate Actions (First 15 Minutes)</h3>
          
          <div className="space-y-3">
            {[
              'Alert Security Lead and CTO immediately',
              'Open incident channel (Slack #incident-[date])',
              'Assess: Is there active data loss or fund risk?',
              'If funds at risk: Pause affected contracts if possible',
              'If data breach: Isolate affected systems',
              'Begin incident log with timestamps',
              'Assign roles: Commander, Tech Lead, Comms',
              'Prepare initial status page update (do not publish yet)',
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-400 text-xs font-bold">{i + 1}</span>
                </div>
                <span className="text-gray-300 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Communication Templates */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">6. Communication Templates</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">Internal Alert Template</h3>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300">
              <p><span className="text-red-400">🚨 INCIDENT ALERT - [P1/P2/P3/P4]</span></p>
              <p className="mt-2"><strong>Summary:</strong> [Brief description]</p>
              <p><strong>Impact:</strong> [Users/systems affected]</p>
              <p><strong>Status:</strong> [Investigating/Contained/Resolved]</p>
              <p><strong>Commander:</strong> [Name]</p>
              <p><strong>Channel:</strong> #incident-[date]</p>
              <p className="mt-2"><strong>Next Update:</strong> [Time]</p>
            </div>
          </div>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="font-semibold text-white mb-3">User Notice Template</h3>
            <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm text-gray-300">
              <p><strong>Subject:</strong> Service Update - [Date]</p>
              <p className="mt-2">We are currently investigating an issue affecting [service/feature].</p>
              <p className="mt-2"><strong>Impact:</strong> [What users may experience]</p>
              <p><strong>Workaround:</strong> [If available]</p>
              <p className="mt-2">We are working to resolve this as quickly as possible and will provide updates.</p>
              <p className="mt-2">For questions: {CONTACT.support}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Post-Incident */}
      <section className="mb-10">
        <h2 className="text-2xl font-semibold text-cyan-400 mb-4">7. Post-Incident Requirements</h2>
        
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Within 48 Hours</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Initial incident report</li>
                <li>• Timeline of events</li>
                <li>• Root cause identified</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Within 1 Week</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Post-mortem meeting</li>
                <li>• Full incident report</li>
                <li>• Action items assigned</li>
              </ul>
            </div>
            <div className="bg-gray-900/50 rounded-lg p-4">
              <h3 className="font-medium text-white mb-2">Within 1 Month</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Action items completed</li>
                <li>• Procedures updated</li>
                <li>• Training if needed</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Reference */}
      <section className="bg-gray-800 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Quick Reference</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-cyan-400 mb-2">Key Channels</h3>
            <ul className="text-gray-400 space-y-1">
              <li>• Slack: #security-alerts</li>
              <li>• Slack: #incident-response</li>
              <li>• Status Page: status.rwaexperts.com</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-cyan-400 mb-2">Key Documents</h3>
            <ul className="text-gray-400 space-y-1">
              <li>• Incident Report Template</li>
              <li>• Contact List (Confidential)</li>
              <li>• Runbook Library</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
