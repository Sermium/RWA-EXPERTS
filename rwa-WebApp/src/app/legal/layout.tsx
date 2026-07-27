// src/app/legal/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  Shield, 
  Lock, 
  AlertTriangle,
  ChevronRight,
  Home
} from 'lucide-react';

const legalNavigation = [
  { name: 'Terms of Service', href: '/legal/terms', icon: FileText },
  { name: 'Privacy Policy', href: '/legal/privacy', icon: Lock },
  { name: 'KYC/AML Policy', href: '/legal/kyc-aml', icon: Shield },
  { name: 'Risk Disclosures', href: '/legal/risk-disclosures', icon: AlertTriangle },
];

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-surface-sunken">
      {/* Top navigation breadcrumb */}
      <div className="bg-surface border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/" className="text-ink-muted hover:text-ink flex items-center gap-1">
              <Home className="w-4 h-4" />
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-ink-faint" />
            <span className="text-gold">Legal</span>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-surface/50 border-r border-border p-6 hidden lg:block">
          <div className="mb-8">
            <h2 className="text-lg font-display font-bold text-ink">Legal Documents</h2>
            <p className="text-sm text-ink-muted mt-1">Policies and disclosures</p>
          </div>
          
          <nav className="space-y-2">
            {legalNavigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-gold/20 text-gold border border-gold/30'
                      : 'text-ink-muted hover:bg-surface-overlay/50 hover:text-ink'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Back to docs */}
          <div className="mt-8 pt-8 border-t border-border">
            <Link
              href="/docs"
              className="text-ink-muted hover:text-gold text-sm"
            >
              ← Back to Documentation
            </Link>
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
