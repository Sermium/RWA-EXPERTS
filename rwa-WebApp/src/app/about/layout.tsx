'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Coins } from 'lucide-react';

const aboutTabs = [
  { id: 'company', label: 'Our Company', href: '/about/company', icon: Building2 },
  { id: 'team', label: 'Our Team', href: '/about/team', icon: Users },
  { id: 'rwa-tokenization', label: 'What is RWA Tokenization?', href: '/about/rwa-tokenization', icon: Coins },
];

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-gradient-to-b from-surface-sunken via-surface-sunken to-black text-ink">{/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-900/20 to-gold-light-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl font-display font-medium mb-4 text-ink">
              About Us
            </h1>
            <p className="text-xl text-ink-muted">
              Democratizing access to real-world asset investments through blockchain technology
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap justify-center gap-3 -mt-4 mb-8">
          {aboutTabs.map((tab) => {
            const isActive = pathname === tab.href;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all text-sm md:text-base ${
                  isActive
                    ? 'bg-gold text-surface-sunken shadow-gold'
                    : 'bg-surface/50 text-ink-muted hover:bg-surface-overlay/50 hover:text-ink'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">
                  {tab.id === 'rwa-tokenization' ? 'RWA' : tab.label.split(' ')[1]}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Content */}
        <div className="pb-16">
          {children}
        </div>
      </div>
    </main>
  );
}

