// src/app/kyc/privacy/page.tsx
import { GDPRDataManagement } from "../GDPRDataManagement";

export const metadata = {
  title: "Data Privacy | RWA Platform",
  description: "Manage your personal data and exercise your GDPR rights",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-900"><main className="py-8">
        <GDPRDataManagement />
      </main>
    </div>
  );
}

