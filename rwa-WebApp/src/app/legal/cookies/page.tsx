// src/app/legal/cookies/page.tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, Cookie } from 'lucide-react';
import { CONTACT, SOCIAL, COMPANY, mailto } from '@/config/contacts';

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-surface-sunken"><main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Back Link */}
        <Link 
          href="/"
          className="inline-flex items-center text-ink-faint hover:text-ink mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-warning/10 rounded-lg">
              <Cookie className="w-8 h-8 text-warning" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-ink">Cookie Policy</h1>
              <p className="text-ink-muted">Last updated: February 18, 2026</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-gray max-w-none">
          <div className="bg-surface/50 border border-border rounded-xl p-6 mb-8">
            <p className="text-ink-muted text-sm">
              This Cookie Policy explains how Qwilon uses cookies and similar tracking technologies 
              when you visit our platform.
            </p>
          </div>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">1. What Are Cookies?</h2>
            <p className="text-ink-muted">
              Cookies are small text files that are stored on your device when you visit a website. 
              They help websites remember your preferences and improve your browsing experience. 
              Cookies can be "persistent" (remain on your device until deleted) or "session" 
              (deleted when you close your browser).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">2. Types of Cookies We Use</h2>
            
            <div className="space-y-6">
              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-medium text-success mb-2">Essential Cookies</h3>
                <p className="text-ink-muted text-sm mb-2">
                  Required for the platform to function. Cannot be disabled.
                </p>
                <ul className="list-disc list-inside text-ink-faint text-sm space-y-1">
                  <li>Session management and authentication</li>
                  <li>Security and fraud prevention</li>
                  <li>Load balancing and performance</li>
                  <li>Wallet connection state</li>
                </ul>
              </div>

              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-medium text-gold-400 mb-2">Functional Cookies</h3>
                <p className="text-ink-muted text-sm mb-2">
                  Enhance your experience by remembering your preferences.
                </p>
                <ul className="list-disc list-inside text-ink-faint text-sm space-y-1">
                  <li>Language preferences</li>
                  <li>Display settings (theme, layout)</li>
                  <li>Recent searches and filters</li>
                  <li>Form data (for convenience)</li>
                </ul>
              </div>

              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-medium text-gold-400 mb-2">Analytics Cookies</h3>
                <p className="text-ink-muted text-sm mb-2">
                  Help us understand how visitors use our platform.
                </p>
                <ul className="list-disc list-inside text-ink-faint text-sm space-y-1">
                  <li>Page views and navigation patterns</li>
                  <li>Time spent on pages</li>
                  <li>Error tracking and debugging</li>
                  <li>Feature usage statistics</li>
                </ul>
              </div>

              <div className="bg-surface rounded-lg p-4">
                <h3 className="text-lg font-medium text-orange-400 mb-2">Marketing Cookies</h3>
                <p className="text-ink-muted text-sm mb-2">
                  Used to deliver relevant advertisements (with your consent).
                </p>
                <ul className="list-disc list-inside text-ink-faint text-sm space-y-1">
                  <li>Ad targeting and personalization</li>
                  <li>Campaign effectiveness measurement</li>
                  <li>Cross-site tracking (limited)</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">3. Specific Cookies We Use</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-ink-muted">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-ink-muted">Cookie Name</th>
                    <th className="text-left py-3 px-4 text-ink-muted">Purpose</th>
                    <th className="text-left py-3 px-4 text-ink-muted">Duration</th>
                    <th className="text-left py-3 px-4 text-ink-muted">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">session_id</td>
                    <td className="py-3 px-4">User session management</td>
                    <td className="py-3 px-4">Session</td>
                    <td className="py-3 px-4 text-success">Essential</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">wallet_connected</td>
                    <td className="py-3 px-4">Wallet connection state</td>
                    <td className="py-3 px-4">7 days</td>
                    <td className="py-3 px-4 text-success">Essential</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">preferences</td>
                    <td className="py-3 px-4">User preferences</td>
                    <td className="py-3 px-4">1 year</td>
                    <td className="py-3 px-4 text-gold-400">Functional</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">_ga</td>
                    <td className="py-3 px-4">Google Analytics</td>
                    <td className="py-3 px-4">2 years</td>
                    <td className="py-3 px-4 text-gold-400">Analytics</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs">cookie_consent</td>
                    <td className="py-3 px-4">Cookie preferences</td>
                    <td className="py-3 px-4">1 year</td>
                    <td className="py-3 px-4 text-success">Essential</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">4. Third-Party Cookies</h2>
            <p className="text-ink-muted mb-4">
              Some cookies are placed by third-party services that appear on our pages:
            </p>
            <ul className="list-disc list-inside text-ink-muted space-y-2 ml-4">
              <li><strong className="text-ink-muted">Google Analytics:</strong> Website analytics and usage statistics</li>
              <li><strong className="text-ink-muted">WalletConnect:</strong> Wallet connection services</li>
              <li><strong className="text-ink-muted">Intercom:</strong> Customer support chat (if enabled)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">5. Managing Cookies</h2>
            <p className="text-ink-muted mb-4">
              You can control and manage cookies in several ways:
            </p>
            
            <h3 className="text-lg font-medium text-ink-muted mt-6 mb-3">Browser Settings</h3>
            <p className="text-ink-muted mb-4">
              Most browsers allow you to refuse or delete cookies. Instructions vary by browser:
            </p>
            <ul className="list-disc list-inside text-ink-muted space-y-1 ml-4">
              <li>Chrome: Settings → Privacy and Security → Cookies</li>
              <li>Firefox: Options → Privacy & Security → Cookies</li>
              <li>Safari: Preferences → Privacy → Cookies</li>
              <li>Edge: Settings → Privacy → Cookies</li>
            </ul>

            <h3 className="text-lg font-medium text-ink-muted mt-6 mb-3">Cookie Consent Tool</h3>
            <p className="text-ink-muted">
              Use our cookie consent banner to manage your preferences when you first visit our site. 
              You can update your preferences at any time through the cookie settings link in the footer.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">6. Impact of Disabling Cookies</h2>
            <p className="text-ink-muted mb-4">
              If you disable cookies, some features may not work properly:
            </p>
            <ul className="list-disc list-inside text-ink-muted space-y-2 ml-4">
              <li>You may need to log in repeatedly</li>
              <li>Preferences may not be saved</li>
              <li>Some interactive features may be unavailable</li>
              <li>Wallet connections may not persist</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">7. Updates to This Policy</h2>
            <p className="text-ink-muted">
              We may update this Cookie Policy periodically. Changes will be posted on this page 
              with an updated revision date. Significant changes may be communicated via email or 
              platform notification.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-xl font-display font-semibold text-ink mb-4">8. Contact Us</h2>
            <p className="text-ink-muted mb-4">
              For questions about our use of cookies:
            </p>
            <div className="bg-surface rounded-lg p-4">
              <p className="text-ink-muted">Email: {CONTACT.privacy}</p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
