// src/app/admin/layout.tsx
import { AdminSessionGate } from '@/components/admin/AdminSessionGate';

// Every admin page needs a signed admin session before its API calls work.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminSessionGate>{children}</AdminSessionGate>;
}
