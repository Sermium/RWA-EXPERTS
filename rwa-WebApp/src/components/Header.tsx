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
import { ChevronDown, Menu, X, LayoutDashboard } from 'lucide-react';
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
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg animate-pulse">
        <div className="w-4 h-4 bg-gray-600 rounded-full" />
        <div className="w-16 h-4 bg-gray-600 rounded" />
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
    if (isPending) return 'bg-yellow-900/30 border-yellow-600 text-yellow-400';
    if (isRejected) return 'bg-red-900/30 border-red-600 text-red-400';
    if (isExpired) return 'bg-orange-900/30 border-orange-600 text-orange-400';
    if (isApproved && tier !== 'None') {
      return `${tierInfo.bgColor} ${tierInfo.borderColor} ${tierInfo.color}`;
    }
    return 'bg-gray-800 border-gray-600 text-gray-400';
  };

  const getStatusIcon = () => {
    if (isPending) return '⏳';
    if (isRejected) return '❌';
    if (isExpired) return '⚠️';
    if (isApproved && tier !== 'None') return tierInfo.icon;
    return '🔒';
  };

  const getStatusLabel = () => {
    if (isPending) return 'Pending';
    if (isRejected) return 'Rejected';
    if (isExpired) return 'Expired';
    if (isApproved && tier !== 'None') return tierInfo.label;
    return 'Verify';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all hover:opacity-80 ${getStatusStyle()}`}
      >
        <span className="text-sm">{getStatusIcon()}</span>
        <span className="text-sm font-medium hidden sm:inline">{getStatusLabel()}</span>
        {isApproved && tier !== 'None' && (
          <span className="text-xs opacity-70 hidden md:inline">
            {displayLimit(remainingLimit)}
          </span>
        )}
        <svg
          className={`w-3 h-3 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
          <div className={`px-4 py-3 ${tierInfo.bgColor} border-b border-gray-700`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getStatusIcon()}</span>
              <div>
                <div className={`font-semibold ${tierInfo.color}`}>
                  {isApproved ? `${tierInfo.label} Tier` : getStatusLabel()}
                </div>
                <div className="text-xs text-gray-400">
                  {isApproved ? 'KYC Verified' : 'Identity Verification'}
                </div>
              </div>
            </div>
          </div>

          {/* Role badges */}
          {isApproved && tier !== 'None' && (
            <div className="px-4 py-2 border-b border-gray-700">
              <div className="flex flex-wrap gap-2">
                {canInvest(tier) && (
                  <span className="px-2 py-0.5 text-xs bg-green-900/30 text-green-400 rounded-full">
                    Investor
                  </span>
                )}
                {canOwn(tier) && (
                  <span className="px-2 py-0.5 text-xs bg-purple-900/30 text-purple-400 rounded-full">
                    Owner
                  </span>
                )}
                {canRefer(tier) && (
                  <span className="px-2 py-0.5 text-xs bg-blue-900/30 text-blue-400 rounded-full">
                    Referrer
                  </span>
                )}
              </div>
            </div>
          )}

          {isApproved && tier !== 'None' && (
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Investment Limits</div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Tier Limit</span>
                  <span className="text-white">
                    {isDiamond ? (
                      <span className="text-cyan-400">∞ Unlimited</span>
                    ) : (
                      formatLimit(investmentLimit)
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Used</span>
                  <span className="text-gray-300">{formatLimit(usedLimit)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Remaining</span>
                  <span className="text-green-400 font-medium">
                    {isDiamond ? (
                      <span className="text-cyan-400">∞ Unlimited</span>
                    ) : (
                      formatLimit(remainingLimit)
                    )}
                  </span>
                </div>
                {!isDiamond && investmentLimit > 0 && (
                  <div className="mt-2">
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
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
            <div className="px-4 py-3 border-b border-gray-700">
              <div className="text-xs text-gray-500 mb-2">Upgrade Available</div>
              <div className="flex items-center gap-2 text-sm">
                <span className={tierInfo.color}>{tierInfo.icon}</span>
                <span className="text-gray-400">→</span>
                <span className={getTierInfo(getNextTier(tier)).color}>
                  {getTierInfo(getNextTier(tier)).icon}
                </span>
                <span className="text-gray-300">
                  {getTierInfo(getNextTier(tier)).label}
                </span>
              </div>
            </div>
          )}

          <div className="p-3">
            <Link
              href="/kyc"
              className="block w-full px-4 py-2 text-center text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
        className={`flex items-center gap-1 py-2 transition-colors ${isActive ? 'text-white' : 'text-gray-300 hover:text-white'}`}
        onClick={() => setIsOpen(prev => !prev)}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 pt-2 z-50">
          <div className="w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
            {items.map(item => (
              <Link 
                key={item.href} 
                href={item.href} 
                className="block px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <div className="font-medium">{item.label}</div>
                {item.description && <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>}
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
        className="flex items-center justify-between w-full py-2 text-gray-300 hover:text-white transition-colors"
        onClick={handleToggle}
      >
        {label}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="pl-4 mt-1 space-y-1 border-l border-gray-700">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block py-2 text-gray-400 hover:text-white transition-colors"
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
    { href: '/raise', label: 'Invest in RWA Experts', description: 'Join our fundraising rounds' },
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
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Image 
                src="/logoRWA.png" 
                alt="RWA Experts" 
                width={50}
                height={50}
                className="object-contain"
              />
              <span className="text-xl font-bold text-white hidden sm:inline">RWA Experts</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <DropdownMenu label="About" items={aboutItems} isActive={isAboutSection} />
              <DropdownMenu label="Let's Start" items={letsStartItems} isActive={isLetsStartSection} />
              <DropdownMenu label="Platform" items={platformItems} isActive={isPlatformSection} />
              <DropdownMenu label="Docs" items={docsItems} isActive={isDocsSection} />
              
              {showDashboard && (
                <Link 
                  href="/dashboard" 
                  className={`flex items-center gap-1.5 py-2 transition-colors ${
                    isDashboardSection ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                  {isOwner && (
                    <span className="text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-400 rounded">Pro</span>
                  )}
                </Link>
              )}
              
              {isAdmin && (
                <Link 
                  href="/admin" 
                  className={`flex items-center gap-1 transition-colors ${
                    pathname.startsWith('/admin') ? 'text-white' : 'text-gray-300 hover:text-white'
                  }`}
                >
                  Admin
                  {isSuperAdmin && <span className="text-yellow-400 text-xs">★</span>}
                </Link>
              )}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3">
              {isConnected && <KYCBadge />}
              <ConnectButton />
              <button
                type="button"
                className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-gray-800">
              <nav className="space-y-2">
                <MobileDropdown label="About" items={aboutItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Let's Start" items={letsStartItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Platform" items={platformItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Docs" items={docsItems} onItemClick={() => setMobileMenuOpen(false)} />
                <MobileDropdown label="Legal" items={legalItems} onItemClick={() => setMobileMenuOpen(false)} />
                
                {showDashboard && (
                  <Link 
                    href="/dashboard" 
                    className="flex items-center gap-2 py-2 text-gray-300 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                    {isOwner && (
                      <span className="text-xs px-1.5 py-0.5 bg-purple-600/30 text-purple-400 rounded">Pro</span>
                    )}
                  </Link>
                )}
                
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); setChainModalOpen(true); }}
                  className="flex items-center gap-2 w-full py-2 text-gray-300 hover:text-white transition-colors"
                >
                  <span>🔗</span>
                  Switch Network
                </button>
                
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="flex items-center gap-2 py-2 text-gray-300 hover:text-white transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Admin
                    {isSuperAdmin && <span className="text-yellow-400 text-xs">★ Super</span>}
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
