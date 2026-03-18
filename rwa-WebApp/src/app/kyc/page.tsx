// src/app/kyc/page.tsx
import { KYCSubmissionForm } from "./KYCSubmissionForm";

export const metadata = {
  title: "KYC Verification | RWA Platform",
  description: "Complete your KYC verification to unlock investment features",
};

export default function KYCPage() {
  return (
    <div className="min-h-screen bg-gray-900"><main className="py-8">
        <KYCSubmissionForm />
      </main>
    </div>
  );
}

