// src/app/docs/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { COMPANY } from '@/config/contacts';
import { 
  Book, 
  FileText, 
  HelpCircle, 
  Users, 
  Code,
  Coins,
  ChevronRight,
  Home
} from 'lucide-react';

const docsNavigation = [
  { name: 'Overview', href: '/docs', icon: Book },
  { name: 'FAQ', href: '/docs/faq', icon: HelpCircle },
  { name: 'White Paper', href: '/docs/whitepaper', icon: FileText },
  { name: 'Tokenomics', href: '/docs/tokenomics', icon: Coins },
  { name: 'Creator Guide', href: '/docs/creator-guide', icon: Users },
  { name: 'Investor Guide', href: '/docs/investor-guide', icon: Users },
  { name: 'API Reference', href: '/docs/api-reference', icon: Code },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top navigation breadcrumb */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-gray-400 hover:text-white flex items-center gap-1">
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-gray-600" />
            <span className="text-cyan-400">Documentation</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-gray-800/50 border-r border-gray-700 p-6 hidden lg:block">
          <div className="mb-8">
            <h2 className="text-lg font-bold text-white">Documentation</h2>
            <p className="text-sm text-gray-400 mt-1">Learn how to use {COMPANY.name}</p>
          </div>
          
          <nav className="space-y-2">
            {docsNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                      : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Legal section link */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Legal</h3>
            <nav className="space-y-2">
              <Link href="/legal/terms" className="block text-gray-300 hover:text-white text-sm px-3 py-1">
                Terms of Service
              </Link>
              <Link href="/legal/privacy" className="block text-gray-300 hover:text-white text-sm px-3 py-1">
                Privacy Policy
              </Link>
              <Link href="/legal/kyc-aml" className="block text-gray-300 hover:text-white text-sm px-3 py-1">
                KYC/AML Policy
              </Link>
              <Link href="/legal/risk-disclosures" className="block text-gray-300 hover:text-white text-sm px-3 py-1">
                Risk Disclosures
              </Link>
            </nav>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
