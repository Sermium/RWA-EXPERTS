'use client';

import dynamic from 'next/dynamic';

const DashboardClient = dynamic(() => import('./DashboardClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-surface-sunken flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gold"></div>
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardClient />;
}