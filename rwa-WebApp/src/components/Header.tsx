// src/components/Header.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { ConnectButton } from './ConnectButton';
import { useAccount } from 'wagmi';
import { useKYC, getTierInfo, KYCTier } from '@/contexts/KYCContext';
import { useAdmin } from '@/hooks/useAdmin';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Menu, X, LayoutDashboard, Clock, XCircle, AlertTriangle, Lock, Link2, Star, ArrowRight, type LucideIcon } from 'lucide-react';
import { ChainSelectorModal } from './ui/ChainSelectorModal';

// Role check helpers
const INVESTOR_TIERS: KYCTier[] = ['Bronze', 'Silver', 'Gold', 'Diamond'];
const OWNER_TIERS: KYCTier[] = ['Gold', 'Diamond'];
const REFERRER_TIERS: KYCTier[] = ['Gold', 'Diamond'];

function canInvest(tier: KYCTier): boolean {
  return INVESTOR_TIERS.includes(tier);
}

function canOwn(tier: KYCTier): boolean {
  return OWNER_TIERS.includes(tier);
}

function canRefer(tier: KYCTier): boolean {
  return REFERRER_TIERS.includes(tier);
}

// KYC Badge Component
function KYCBadge() {
  const { 
    tier, 
    status, 
    tierInfo, 
    isLoading, 
    isVerified,
    investmentLimit,
    remainingLimit,
    usedLimit,
    formatLimit,
    kycData 
  } = useKYC();
  
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-raised rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-border-strong rounded-full" />
        <div className="w-16 h-4 bg-border-strong rounded" />
      </div>
    );
  }

  const isPending = ['Pending', 'AutoVerifying', 'ManualReview'].includes(status);
  const isRejected = status === 'Rejected';
  const isExpired = status === 'Expired' || kycData?.isExpired;
  const isApproved = status === 'Approved';
  const isDiamond = tier === 'Diamond';

  const displayLimit = (value: number) => {
    if (isDiamond || !isFinite(value)) return '∞';
    return formatLimit(value);
  };

  const getStatusStyle = () => {
    if (isPending) return 'bg-warning-muted border-warning/40 text-warning';
    if (isRejected) return 'bg-danger-muted border-danger/40 text-danger';
    if (isExpired) return 'bg-warning-muted border-warning/40 text-warning';
    if (isApproved && tier !== 'None') {
      return `${tierInfo.bgColor} ${tierInfo.borderColor} ${tierInfo.color}`;
    }
    return 'bg-surface-raised border-border-strong text-ink-muted';
  };

  const getStatusIcon = (): LucideIcon => {
    if (isPending) return Clock;
    if (isRejected) return XCircle;
    if (isExpired) return AlertTriangle;
    if (isApproved && tier !== 'None') return tierInfo.icon;
    return Lock;
  };

  const getStatusLabel = () => {
    if (isPending) return 'Pending';
    if (isRejected) return 'Rejected';
    if (isExpired) return 'Expired';
    if (isApproved && tier !== 'None') return tierInfo.label;
    return 'Verify';
  };

  const StatusIcon = getStatusIcon();
  const NextTierIcon = getTierInfo(getNextTier(tier)).icon;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 ${getStatusStyle()}`}
      >
        <StatusIcon className="w-4 h-4" />
        <span className="text-sm font-medium hidden sm:inline">{getStatusLabel()}</span>
        {isApproved && tier !== 'None' && (
          <span className="text-xs opacity-70 hidden md:inline">
            {displayLimit(remainingLimit)}
          </span>
        )}
        <ChevronDown className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-surface border border-border rounded-lg shadow-panel z-50 overflow-hidden">
          <div className={`px-4 py-3 ${tierInfo.bgColor} border-b border-border`}>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-6 h-6 ${tierInfo.color}`} />
              <div>
                <div className={`font-semibold ${tierInfo.color}`}>
                  {isApproved ? `${tierInfo.label} Tier` : getStatusLabel()}
                </div>
                <div className="text-xs text-ink-muted">
                  {isApproved ? 'KYC Verified' : 'Identity Verification'}
                </div>
              </div>
            </div>
          </div>

          {/* Role badges */}
          {isApproved && tier !== 'None' && (
            <div className="px-4 py-2 border-b border-border">
              <div className="flex flex-wrap gap-2">
                {canInvest(tier) && (
                  <span className="px-2 py-0.5 text-xs bg-success/10 text-success rounded-full">
                    Investor
                  </span>
                )}
                {canOwn(tier) && (
                  <span className="px-2 py-0.5 text-xs bg-gold/10 text-gold rounded-full">
                    Owner
                  </span>
                )}
                {canRefer(tier) && (
                  <span className="px-2 py-0.5 text-xs bg-ink-muted/10 text-ink-muted rounded-full">
                    Referrer
                  </span>
                )}
              </div>
            </div>
          )}

          {isApproved && tier !== 'None' && (
            <div className="px-4 py-3 border-b border-border">
              <div className="text-xs text-ink-faint mb-2">Investment Limits</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Tier Limit</span>
                  <span className="text-ink">
                    {isDiamond ? (
                      <span className="text-gold-light">∞ Unlimited</span>
                    ) : (
                      formatLimit(investmentLimit)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Used</span>
                  <span className="text-ink-muted">{formatLimit(usedLimit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-ink-muted">Remaining</span>
                  <span className="text-success font-medium">
                    {isDiamond ? (
                      <span className="text-gold-light">∞ Unlimited</span>
                    ) : (
                      formatLimit(remainingLimit)
                    )}
                  </span>
                </div>
                {!isDiamond && investmentLimit > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-surface-raised rounded-full overflow-hidden">
                      <div
                        className={`h-full ${tierInfo.color.replace('text-', 'bg-')} transition-all`}
                        style={{
                          width: `${Math.min(100, (usedLimit / investmentLimit) * 100)}%`
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isApproved && tier !== 'Diamond' && tier !== 'None' && (
            <div className="px-4 py-3 border-b border-border">
              <div className="text-xs text-ink-faint mb-2">Upgrade Available</div>
              <div className="flex items-center gap-2 text-sm">
                <tierInfo.icon className={`w-4 h-4 ${tierInfo.color}`} />
                <ArrowRight className="w-3.5 h-3.5 text-ink-faint" />
                <NextTierIcon className={`w-4 h-4 ${getTierInfo(getNextTier(tier)).color}`} />
                <span className="text-ink-muted">
                  {getTierInfo(getNextTier(tier)).label}
                </span>
              </div>
            </div>
          )}

          <div className="p-3">
            <Link
              href="/kyc"
              className="block w-full px-4 py-2 text-center text-sm font-medium bg-gold hover:bg-gold-light text-surface-sunken rounded-lg transition-colors"
              onClick={() => setShowDropdown(false)}
            >
              {isApproved ? 'Manage KYC' : isPending ? 'View Status' : 'Start Verification'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function getNextTier(current: KYCTier): KYCTier {
  const tiers: KYCTier[] = ['None', 'Bronze', 'Silver', 'Gold', 'Diamond'];
  const currentIndex = tiers.indexOf(current);
  return tiers[Math.min(currentIndex + 1, tiers.length - 1)];
}

// Dropdown Menu Component with proper hover and click handling
function DropdownMenu({ label, items, isActive }: { label: string; items: { href: string; label: string; description?: string }[]; isActive?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside - only when open
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    
    // Add listener on next tick to avoid catching the opening click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className={`flex items-center gap-1 py-2 transition-colors duration-200 ${isActive ? 'text-ink' : 'text-ink-muted hover:text-ink'}`}
        onClick={() => setIsOpen(prev => !prev)}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50 animate-fade-up">
          <div className="w-56 bg-surface-raised border border-border rounded-lg shadow-panel overflow-hidden">
            {items.map(item => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-3 text-ink-muted hover:text-ink hover:bg-surface-overlay transition-colors duration-150"
                onClick={() => setIsOpen(false)}
              >
                <div className="font-medium">{item.label}</div>
                {item.description && <div className="text-xs text-ink-faint mt-0.5">{item.description}</div>}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile Menu Item with dropdown support
function MobileDropdown({ 
  label, 
  items,
  onItemClick
}: { 
  label: string; 
  items: { href: string; label: string; description?: string }[];
  onItemClick: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div>
      <button
        type="button"
        className="flex items-center justify-between w-full py-2 text-ink-muted hover:text-ink transition-colors duration-200"
        onClick={handleToggle}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 mt-1 space-y-1 border-l border-border">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block px-2 py-2 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-overlay transition-colors duration-150"
              onClick={onItemClick}
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { isConnected, address } = useAccount();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chainModalOpen, setChainModalOpen] = useState(false);
  
  const wasConnectedRef = useRef(false);
  const hasRedirectedRef = useRef(false);
  
  const { tier, status, isVerified, isLoading } = useKYC();
  const { isAdmin, isSuperAdmin } = useAdmin();

  const hasKYC = status === 'Approved' && tier !== 'None';
  const isInvestor = canInvest(tier);
  const isOwner = canOwn(tier);
  const showDashboard = isConnected && hasKYC && isInvestor;

  useEffect(() => {
    const noRedirectPaths = [
      '/dashboard',
      '/admin',
      '/kyc',
      '/project/',
      '/projects/',
      '/crowdfunding/',
      '/tokenize',
      '/tokenization/',
      '/exchange',
      '/raise',
      '/governance',
      '/about',
      '/docs',
      '/legal',
      '/support',
      '/contact',
      '/careers',
    ];
    
    const shouldSkipRedirect = noRedirectPaths.some(path => pathname.startsWith(path));
    const justConnected = !wasConnectedRef.current && isConnected && address;
    
    if (justConnected && !shouldSkipRedirect && !hasRedirectedRef.current) {
      hasRedirectedRef.current = true;
      setTimeout(() => {
        router.push('/dashboard');
      }, 100);
    }
    
    wasConnectedRef.current = isConnected;
    
    if (!isConnected) {
      hasRedirectedRef.current = false;
    }
  }, [isConnected, address, pathname, router]);

  const isAboutSection = pathname.startsWith('/about') || pathname === '/about/contact';
  const isLetsStartSection = pathname.startsWith('/tokenize') || pathname.startsWith('/crowdfunding') || pathname.startsWith('/trade');
  const isPlatformSection = pathname === '/exchange' || pathname === '/projects' || pathname.startsWith('/project/') || pathname === '/create' || pathname === '/kyc' || pathname === '/raise';
  const isDocsSection = pathname.startsWith('/docs') || pathname.startsWith('/legal');
  const isDashboardSection = pathname.startsWith('/dashboard');

  const aboutItems = [
    { href: '/about/company', label: 'Company', description: 'Our mission and vision' },
    { href: '/about/team', label: 'Team', description: 'Meet our experts' },
    { href: '/about/rwa-tokenization', label: 'What is RWA Tokenization?', description: 'Learn about asset tokenization' },
    { href: '/about/blog', label: 'Blog', description: 'News and insights' },
    { href: '/about/contact', label: 'Contact', description: 'Get in touch with us' },
  ];

  const letsStartItems = [
    { href: '/tokenize', label: 'Tokenize Assets', description: 'Create & manage digital assets' },
    { href: '/crowdfunding', label: 'Raise Funds', description: 'Launch a crowdfunding campaign' },
    { href: '/trade', label: 'Trade', description: 'B2B trade platform (Coming soon)' },
  ];

  const platformItems = [
    { href: '/raise', label: 'Invest in Qwilon', description: 'Join our fundraising rounds' },
    { href: '/exchange', label: 'Exchange', description: 'Trade tokenized assets' },
    { href: '/projects', label: 'CrowdFunding', description: 'Browse all raising projects' },
    { href: '/crowdfunding/create', label: 'Create Raise', description: 'Launch your raise' },
    { href: '/kyc', label: 'Identity (KYC)', description: 'Verify your identity' },
  ];

  const docsItems = [
    { href: '/docs', label: 'Documentation', description: 'Platform guides & resources' },
    { href: '/docs/faq', label: 'FAQ', description: 'Frequently asked questions' },
    { href: '/docs/whitepaper', label: 'White Paper', description: 'Technical documentation' },
    { href: '/docs/tokenomics', label: 'Tokenomics', description: 'Fees & revenue model' },
    { href: '/docs/creator-guide', label: 'Creator Guide', description: 'How to tokenize assets' },
    { href: '/docs/investor-guide', label: 'Investor Guide', description: 'How to invest' },
    { href: '/docs/api-reference', label: 'API Reference', description: 'Developer documentation' },
  ];

  const legalItems = [
    { href: '/legal/terms', label: 'Terms of Service', description: 'Platform terms' },
    { href: '/legal/privacy', label: 'Privacy Policy', description: 'Data protection' },
    { href: '/legal/kyc-aml', label: 'KYC/AML Policy', description: 'Compliance procedures' },
    { href: '/legal/risk-disclosures', label: 'Risk Disclosures', description: 'Investment risks' },
  ];

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <header className="bg-surface-sunken/95 backdrop-blur border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="Qwilon"
                width={40}
                height={40}
                className="object-contain"
              />
              <span className="text-2xl font-display font-medium hidden sm:inline text-gradient-gold">Qwilon</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <DropdownMenu label="About" items={aboutItems} isActive={isAboutSection} />
              <DropdownMenu label="Let's Start" items={letsStartItems} isActive={isLetsStartSection} />
              <DropdownMenu label="Platform" items={platformItems} isActive={isPlatformSection} />
              <DropdownMenu label="Docs" items={docsItems} isActive={isDocsSection} />

              {showDashboard && (
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-1.5 py-2 transition-colors duration-200 ${
                    isDashboardSection ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                  {isOwner && (
                    <span className="text-xs px-1.5 py-0.5 bg-gold/15 text-gold rounded-full">Pro</span>
                  )}
                </Link>
              )}

              {isAdmin && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1 transition-colors duration-200 ${
                    pathname.startsWith('/admin') ? 'text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Admin
                  {isSuperAdmin && <Star className="w-3 h-3 text-gold fill-gold" />}
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {isConnected && <KYCBadge />}
              <ConnectButton />
              <button
                type="button"
                className="md:hidden p-2 text-ink-muted hover:text-ink transition-colors duration-200"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-border animate-fade-up">
              <nav className="space-y-2">
                <MobileDropdown label="About" items={aboutItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Let's Start" items={letsStartItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Platform" items={platformItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Docs" items={docsItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Legal" items={legalItems} onItemClick={() => setMobileMenuOpen(false)} />

                {showDashboard && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 py-2 text-ink-muted hover:text-ink transition-colors duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                    {isOwner && (
                      <span className="text-xs px-1.5 py-0.5 bg-gold/15 text-gold rounded-full">Pro</span>
                    )}
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); setChainModalOpen(true); }}
                  className="flex items-center gap-2 w-full py-2 text-ink-muted hover:text-ink transition-colors duration-200"
                >
                  <Link2 className="w-4 h-4" />
                  Switch Network
                </button>

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-2 py-2 text-ink-muted hover:text-ink transition-colors duration-200"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                    {isSuperAdmin && (
                      <span className="flex items-center gap-1 text-xs text-gold">
                        <Star className="w-3 h-3 fill-gold" /> Super
                      </span>
                    )}
                  </Link>
                )}
              </nav>
            </div>
          )}
        </div>
      </header>

      <ChainSelectorModal isOpen={chainModalOpen} onClose={() => setChainModalOpen(false)} />
    </>
  );
}
