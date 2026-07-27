// src/app/kyc/link/page.tsx
import { WalletLinking } from "../WalletLinking";

export const metadata = {
  title: "Wallet Linking | RWA Platform",
  description: "Link multiple wallets to share your KYC verification",
};

export default function WalletLinkingPage() {
  return (
    <div className="min-h-screen bg-surface-sunken"><main className="py-8">
        <WalletLinking />
      </main>
    </div>
  );
}

