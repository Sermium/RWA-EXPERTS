// src/components/Footer.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { 
  Twitter, 
  Linkedin, 
  Github, 
  Mail, 
  MapPin,
  Send,
  MessageCircle
} from 'lucide-react';
import { CONTACT, SOCIAL, LINKS, mailto } from '@/config/contacts';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [email, setEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const platformLinks = [
    { href: '/crowdfunding', label: 'Crowdfunding' },
    { href: '/tokenize', label: 'Tokenize Assets' },
    { href: '/exchange', label: 'Exchange' },
    { href: '/trade', label: 'Trade Platform' },
    { href: '/projects', label: 'Browse Projects' },
    { href: '/kyc', label: 'Identity (KYC)' },
  ];

  const companyLinks = [
    { href: '/about/company', label: 'About Us' },
    { href: '/about/team', label: 'Our Team' },
    { href: '/about/rwa-tokenization', label: 'What is RWA?' },
    { href: '/contact', label: 'Contact' },
  ];

  // Updated to match actual documentation pages
  const docsLinks = [
    { href: '/docs', label: 'Documentation' },
    { href: '/docs/faq', label: 'FAQ' },
    { href: '/docs/whitepaper', label: 'White Paper' },
    { href: '/docs/tokenomics', label: 'Tokenomics' },  // Add this
    { href: '/docs/creator-guide', label: 'Creator Guide' },
    { href: '/docs/investor-guide', label: 'Investor Guide' },
    { href: '/docs/api-reference', label: 'API Reference' },
  ];

  // Updated to match actual legal pages
  const legalLinks = [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/kyc-aml', label: 'KYC/AML Policy' },
    { href: '/legal/risk-disclosures', label: 'Risk Disclosures' },
  ];

  const socialLinks = [
    { href: SOCIAL.twitter, icon: <Twitter className="w-5 h-5" />, label: 'Twitter' },
    { href: SOCIAL.linkedin, icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn' },
    { href: SOCIAL.github, icon: <Github className="w-5 h-5" />, label: 'GitHub' },
    { href: SOCIAL.discord, icon: <MessageCircle className="w-5 h-5" />, label: 'Discord' },
  ];

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setSubscribeStatus('loading');
    
    // Simulate API call - replace with actual newsletter subscription
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSubscribeStatus('success');
      setEmail('');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    } catch {
      setSubscribeStatus('error');
      setTimeout(() => setSubscribeStatus('idle'), 3000);
    }
  };

  return (
    <footer className="bg-surface-sunken border-t border-border">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">

          {/* Brand Section - Takes 2 columns */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <Image
                src="/logo.png"
                alt="Qwilon"
                width={44}
                height={44}
                className="object-contain"
              />
              <span className="text-2xl font-display font-medium hidden sm:inline text-gradient-gold">Qwilon</span>
            </Link>
            <p className="text-ink-muted text-sm mb-6 max-w-sm">
              Democratizing access to real-world asset investments through blockchain technology.
              Tokenize, trade, and manage assets with full compliance and transparency.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm text-ink-muted">
              <a
                href={`mailto:${CONTACT.general}`}
                className="flex items-center gap-2 hover:text-ink transition-colors duration-200"
              >
                <Mail className="w-4 h-4" />
                {CONTACT.general}
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>Global Operations</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex items-center gap-3 mt-6">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-surface-raised rounded-lg text-ink-muted hover:text-gold hover:bg-surface-overlay transition-all duration-200"
                  aria-label={social.label}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-ink font-semibold mb-4">Platform</h3>
            <ul className="space-y-2">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-muted hover:text-ink text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-ink font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-muted hover:text-ink text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Documentation Links */}
          <div>
            <h3 className="text-ink font-semibold mb-4">Documentation</h3>
            <ul className="space-y-2">
              {docsLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-muted hover:text-ink text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-ink font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-ink-muted hover:text-ink text-sm transition-colors duration-200"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Newsletter Section */}
      <div className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-ink font-semibold mb-1">Stay Updated</h3>
              <p className="text-ink-muted text-sm">Subscribe to our newsletter for the latest updates and insights.</p>
            </div>
            <form onSubmit={handleSubscribe} className="flex gap-2 w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="px-4 py-2 bg-surface-raised border border-border rounded-lg text-ink placeholder-ink-faint focus:border-gold focus:outline-none w-full md:w-64 transition-colors duration-200"
                disabled={subscribeStatus === 'loading'}
              />
              <button
                type="submit"
                disabled={subscribeStatus === 'loading'}
                className={`px-6 py-2 font-medium rounded-lg transition-colors duration-200 whitespace-nowrap flex items-center gap-2 ${
                  subscribeStatus === 'success'
                    ? 'bg-success text-surface-sunken'
                    : subscribeStatus === 'error'
                    ? 'bg-danger text-surface-sunken'
                    : 'bg-gold hover:bg-gold-light text-surface-sunken'
                }`}
              >
                {subscribeStatus === 'loading' ? (
                  <>
                    <span className="w-4 h-4 border-2 border-surface-sunken/30 border-t-surface-sunken rounded-full animate-spin" />
                    Subscribing...
                  </>
                ) : subscribeStatus === 'success' ? (
                  'Subscribed!'
                ) : subscribeStatus === 'error' ? (
                  'Error'
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Subscribe
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-border bg-surface-sunken">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Copyright */}
            <div className="text-ink-faint text-sm text-center md:text-left">
              © {currentYear} Qwilon (V: 0.7). All rights reserved.
            </div>

            {/* Quick Legal Links */}
            <div className="flex items-center gap-4 text-sm">
              <Link href="/legal/terms" className="text-ink-faint hover:text-ink-muted transition-colors duration-200">
                Terms
              </Link>
              <span className="text-border-strong">•</span>
              <Link href="/legal/privacy" className="text-ink-faint hover:text-ink-muted transition-colors duration-200">
                Privacy
              </Link>
              <span className="text-border-strong">•</span>
              <Link href="/legal/risk-disclosures" className="text-ink-faint hover:text-ink-muted transition-colors duration-200">
                Risks
              </Link>
            </div>
          </div>

          {/* Additional Legal Disclaimers */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="grid md:grid-cols-3 gap-4 text-xs text-ink-faint">
              <div>
                <strong className="text-ink-muted">Risk Warning:</strong> Investing in tokenized assets involves
                significant risk. You may lose some or all of your investment. Only invest what you can afford to lose.
              </div>
              <div>
                <strong className="text-ink-muted">Not Financial Advice:</strong> Information provided on this platform
                is for informational purposes only and does not constitute investment, legal, or tax advice.
              </div>
              <div>
                <strong className="text-ink-muted">Regulatory Compliance:</strong> Services may not be available in
                all jurisdictions. Users are responsible for compliance with local laws and regulations.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
