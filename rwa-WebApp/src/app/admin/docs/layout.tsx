// src/app/admin/docs/layout.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAdmin } from '@/hooks/useAdmin';
import { useAccount } from 'wagmi';
import { 
  Book, 
  Shield, 
  AlertTriangle, 
  Scale,
  Plug,
  Rocket,
  ChevronRight,
  Home,
  Lock,
  ArrowLeft
} from 'lucide-react';

const adminDocsNavigation = [
  { name: 'Admin Guide', href: '/admin/docs', icon: Book },
  { name: 'Security Procedures', href: '/admin/docs/security', icon: Shield },
  { name: 'Incident Response', href: '/admin/docs/incident-response', icon: AlertTriangle },
  { name: 'Compliance Framework', href: '/admin/docs/compliance', icon: Scale },
  { name: 'Integration Guide', href: '/admin/docs/integration', icon: Plug },
  { name: 'Deployment Guide', href: '/admin/docs/deployment', icon: Rocket },
];

export default function AdminDocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { isAdmin, loading } = useAdmin();

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Access denied
  if (!isConnected || !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">
            You don't have permission to access admin documentation. 
            Please connect with an admin wallet.
          </p>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Admin
          </Link>
        </div>
      </div>
    );
  }

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
            <Link href="/admin" className="text-gray-400 hover:text-white">
              Admin
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
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-5 h-5 text-red-400" />
              <h2 className="text-lg font-bold text-white">Admin Docs</h2>
            </div>
            <p className="text-sm text-gray-400">Internal documentation</p>
          </div>
          
          <nav className="space-y-2">
            {adminDocsNavigation.map((item) => {
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

          {/* Back to Admin Dashboard */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <Link 
              href="/admin" 
              className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>

          {/* Confidentiality Notice */}
          <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-xs text-red-400">
              <strong>Confidential:</strong> This documentation is for authorized personnel only. 
              Do not share externally.
            </p>
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