// src/app/docs/page.tsx
import Link from 'next/link';
import { 
  Book, 
  FileText, 
  HelpCircle, 
  Users, 
  Code,
  Shield,
  ArrowRight 
} from 'lucide-react';
import { COMPANY } from '@/config/contacts';

export const metadata = {
  title: `Documentation | ${COMPANY.name}`,
  description: `Learn how to tokenize real-world assets with ${COMPANY.name}`,
};

const sections = [
  {
    title: 'FAQ',
    description: 'Quick answers to common questions about tokenization, fees, and how the platform works.',
    href: '/docs/faq',
    icon: HelpCircle,
  },
  {
    title: 'White Paper',
    description: 'Deep dive into our technology, architecture, and vision for democratizing asset ownership.',
    href: '/docs/whitepaper',
    icon: FileText,
  },
  {
    title: 'Creator Guide',
    description: 'Step-by-step guide for asset owners to tokenize real estate, commodities, equity, and more.',
    href: '/docs/creator-guide',
    icon: Users,
  },
  {
    title: 'Investor Guide',
    description: 'Learn how to discover, evaluate, and invest in tokenized real-world assets.',
    href: '/docs/investor-guide',
    icon: Users,
  },
  {
    title: 'API Reference',
    description: `Technical documentation for integrating with ${COMPANY.name} APIs.`,
    href: '/docs/api-reference',
    icon: Code,
  },
];

const legalDocs = [
  { title: 'Terms of Service', href: '/legal/terms' },
  { title: 'Privacy Policy', href: '/legal/privacy' },
  { title: 'KYC/AML Policy', href: '/legal/kyc-aml' },
  { title: 'Risk Disclosures', href: '/legal/risk-disclosures' },
];

export default function DocsPage() {
  return (
    <div className="max-w-4xl">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Documentation</h1>
        <p className="text-xl text-gray-400">
          Everything you need to know about tokenizing and investing in real-world assets.
        </p>
      </div>

      {/* Main documentation sections */}
      <div className="grid gap-6 mb-12">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.title}
              href={section.href}
              className="group bg-gray-800 border border-gray-700 rounded-xl p-6 hover:border-cyan-500/50 transition-colors"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-cyan-500/10 rounded-lg">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                    {section.title}
                    <ArrowRight className="w-5 h-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </h2>
                  <p className="text-gray-400 mt-2">{section.description}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Legal documents */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-6 h-6 text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">Legal Documents</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {legalDocs.map((doc) => (
            <Link
              key={doc.title}
              href={doc.href}
              className="text-gray-300 hover:text-cyan-400 transition-colors"
            >
              {doc.title} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
