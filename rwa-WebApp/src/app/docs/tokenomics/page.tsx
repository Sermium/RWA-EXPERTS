// src/app/docs/tokenomics/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Coins, TrendingUp, Users, Building2, Rocket, Shield, 
  Clock, CheckCircle, DollarSign, PieChart,
  Zap, Lock, Gift, Vote, Percent, ExternalLink
} from 'lucide-react';
import { COMPANY, CONTACT } from '@/config/contacts';
import Link from 'next/link';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, ReferenceLine, ComposedChart,
  Bar, Line, BarChart
} from 'recharts';

export default function TokenomicsPage() {
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);
  
  useEffect(() => {
    setIsAnimated(true);
  }, []);

  // Token Distribution Data
  const tokenDistribution = [
    { name: 'Founding Team', value: 20, tokens: 200_000_000, vesting: 50, color: '#3B82F6', type: 'equity' },
    { name: 'Investors R1', value: 15, tokens: 150_000_000, vesting: 40, color: '#8B5CF6', type: 'equity' },
    { name: 'Company / LP', value: 10, tokens: 100_000_000, vesting: 50, color: '#6366F1', type: 'equity' },
    { name: 'Investors R2', value: 10, tokens: 100_000_000, vesting: 33, color: '#A855F7', type: 'equity' },
    { name: 'Investors R3', value: 10, tokens: 100_000_000, vesting: 25, color: '#D946EF', type: 'equity' },
    { name: 'Foundation', value: 10, tokens: 100_000_000, vesting: 100, color: '#14B8A6', type: 'ecosystem' },
    { name: 'Marketing', value: 10, tokens: 100_000_000, vesting: 67, color: '#F97316', type: 'ecosystem' },
    { name: 'Advisors', value: 5, tokens: 50_000_000, vesting: 50, color: '#EC4899', type: 'equity' },
    { name: 'Hackathon', value: 5, tokens: 50_000_000, vesting: 50, color: '#06B6D4', type: 'ecosystem' },
    { name: 'Community', value: 3, tokens: 30_000_000, vesting: 100, color: '#EAB308', type: 'ecosystem' },
    { name: 'Airdrop', value: 2, tokens: 20_000_000, vesting: 20, color: '#22C55E', type: 'ecosystem' },
  ];

  // Calculate stroke dash arrays for donut chart
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  let cumulativePercent = 0;
  
  const slices = tokenDistribution.map((item, index) => {
    const percent = item.value / 100;
    const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
    const strokeDashoffset = -circumference * cumulativePercent;
    cumulativePercent += percent;
    
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
      index
    };
  });

  // Detailed vesting data
  const detailedVestingData = [
    { month: 0, airdrop: 0, r3: 0, r2: 0, r1: 0, team: 0, advisors: 0, marketing: 0, company: 0, community: 0, foundation: 0, hackathon: 0 },
    { month: 6, airdrop: 0.6, r3: 0, r2: 0, r1: 0, team: 0, advisors: 0, marketing: 0, company: 0, community: 0, foundation: 0, hackathon: 0 },
    { month: 20, airdrop: 2, r3: 5.6, r2: 5.15, r1: 5.25, team: 6, advisors: 1.5, marketing: 3, company: 3, community: 0.6, foundation: 2, hackathon: 2 },
    { month: 25, airdrop: 2, r3: 10, r2: 6.82, r1: 7.125, team: 8, advisors: 2, marketing: 3.73, company: 4, community: 0.75, foundation: 2.5, hackathon: 2.5 },
    { month: 33, airdrop: 2, r3: 10, r2: 10, r1: 10.125, team: 11.2, advisors: 2.8, marketing: 4.93, company: 5.6, community: 0.99, foundation: 3.3, hackathon: 3.3 },
    { month: 40, airdrop: 2, r3: 10, r2: 10, r1: 15, team: 14, advisors: 3.5, marketing: 5.97, company: 7, community: 1.2, foundation: 4, hackathon: 4 },
    { month: 50, airdrop: 2, r3: 10, r2: 10, r1: 15, team: 20, advisors: 5, marketing: 7.46, company: 10, community: 1.5, foundation: 5, hackathon: 5 },
    { month: 67, airdrop: 2, r3: 10, r2: 10, r1: 15, team: 20, advisors: 5, marketing: 10, company: 10, community: 2.01, foundation: 6.7, hackathon: 5 },
    { month: 100, airdrop: 2, r3: 10, r2: 10, r1: 15, team: 20, advisors: 5, marketing: 10, company: 10, community: 3, foundation: 10, hackathon: 5 },
  ];

  // Financial Data
  const financialChartData = [
    { year: 'Y1', revenue: 0.348, costs: 1.061, ebitda: -0.713 },
    { year: 'Y2', revenue: 1.305, costs: 2.150, ebitda: -0.845 },
    { year: 'Y3', revenue: 4.088, costs: 3.140, ebitda: 0.948 },
    { year: 'Y4', revenue: 13.427, costs: 4.776, ebitda: 8.651 },
    { year: 'Y5', revenue: 32.255, costs: 7.596, ebitda: 24.659 },
  ];

  const financialMetrics = [
    { year: 'Year 1', revenue: 348_000, costs: 1_060_750, ebitda: -712_750, margin: -205, cumulative: -712_750, cash: 1_687_250, revenueGrowth: '-', costGrowth: '-', grossMargin: 72 },
    { year: 'Year 2', revenue: 1_305_000, costs: 2_150_000, ebitda: -845_000, margin: -65, cumulative: -1_557_750, cash: 842_250, revenueGrowth: '3.75x', costGrowth: '2.03x', grossMargin: 74 },
    { year: 'Year 3', revenue: 4_087_500, costs: 3_140_000, ebitda: 947_500, margin: 23, cumulative: -610_250, cash: 1_789_750, revenueGrowth: '3.13x', costGrowth: '1.46x', grossMargin: 83 },
    { year: 'Year 4', revenue: 13_426_800, costs: 4_776_000, ebitda: 8_650_800, margin: 64, cumulative: 8_040_550, cash: 10_440_550, revenueGrowth: '3.28x', costGrowth: '1.52x', grossMargin: 91 },
    { year: 'Year 5', revenue: 32_255_000, costs: 7_596_000, ebitda: 24_659_000, margin: 76, cumulative: 32_699_550, cash: 35_099_550, revenueGrowth: '2.40x', costGrowth: '1.59x', grossMargin: 92 },
  ];

  const revenueBreakdownData = [
    { year: 'Y1', crowdfunding: 0.308, tokenization: 0.026, trading: 0.007, kyc: 0.004, other: 0.003 },
    { year: 'Y2', crowdfunding: 1.089, tokenization: 0.106, trading: 0.074, kyc: 0.021, other: 0.015 },
    { year: 'Y3', crowdfunding: 3.184, tokenization: 0.528, trading: 0.362, kyc: 0.070, other: 0.034 },
    { year: 'Y4', crowdfunding: 10.535, tokenization: 1.056, trading: 1.571, kyc: 0.166, other: 0.099 },
    { year: 'Y5', crowdfunding: 25.227, tokenization: 2.020, trading: 5.951, kyc: 0.392, other: 0.235 },
  ];

  const platformMetrics = [
    { year: 'Y1', projects: 40, tvl: 15.15, volume: 16.22, users: 2000 },
    { year: 'Y2', projects: 176, tvl: 112.53, volume: 126.6, users: 10250 },
    { year: 'Y3', projects: 528, tvl: 340.7, volume: 371.13, users: 35000 },
    { year: 'Y4', projects: 1095, tvl: 737.85, volume: 1059.22, users: 83200 },
    { year: 'Y5', projects: 2023, tvl: 1518.17, volume: 2102.53, users: 196000 },
  ];

  const dividendData = [
    { year: 'Y1', ebitda: -712750, dividend: 0, perMillion: 0 },
    { year: 'Y2', ebitda: -845000, dividend: 0, perMillion: 0 },
    { year: 'Y3', ebitda: 947500, dividend: 758000, perMillion: 758 },
    { year: 'Y4', ebitda: 8650800, dividend: 6920640, perMillion: 6921 },
    { year: 'Y5', ebitda: 24659000, dividend: 19727200, perMillion: 19727 },
  ];

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(2)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
    return num.toLocaleString();
  };

  const formatCurrency = (num: number) => {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num.toLocaleString()}`;
  };

  const VestingTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + entry.value, 0);
      return (
        <div className="bg-surface-sunken border border-border rounded-lg p-3 shadow-xl">
          <p className="text-ink font-semibold mb-2">Month {label}</p>
          <p className="text-gold-400 font-bold mb-2">Total: {total.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const FinancialTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-sunken border border-border rounded-lg p-3 shadow-xl">
          <p className="text-ink font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toFixed(2)}M
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-ink">
      {/* Hero Section */}
      <section className="relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-600/20 via-purple-600/20 to-pink-600/20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              <span className="bg-gradient-to-r from-gold-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Tokenomics & Business Plan
              </span>
            </h1>
            <p className="text-lg text-ink-muted max-w-2xl mx-auto">
              Complete financial model, token distribution, and 5-year projections
            </p>
          </div>

          {/* Hero Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 max-w-5xl mx-auto">
            {[
              { value: '$32.3M', label: 'Y5 Revenue', color: 'text-gold-400' },
              { value: '$24.7M', label: 'Y5 EBITDA', color: 'text-success' },
              { value: '$1.5B', label: 'Y5 TVL', color: 'text-gold-400' },
              { value: '$247M', label: 'Y5 Valuation', color: 'text-warning' },
              { value: '80%', label: 'Dividend Payout', color: 'text-pink-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-surface/50 backdrop-blur rounded-xl p-3 text-center border border-border">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-ink-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick Stats Bar */}
      <section className="border-y border-border bg-surface/30 py-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-center">
            {[
              { value: '1B', label: 'Total Supply', color: 'text-ink' },
              { value: '70%', label: 'Equity Holders', color: 'text-gold-400' },
              { value: '30%', label: 'Ecosystem', color: 'text-success' },
              { value: '$500', label: 'Crowdfunding Fee', color: 'text-warning' },
              { value: 'Month 28', label: 'Break-even', color: 'text-gold-400' },
            ].map((stat, i) => (
              <div key={i}>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-ink-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Token Distribution - Modern Donut Chart */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-2">$RWA Token Distribution</h2>
          <p className="text-center text-ink-muted mb-10">Total Supply: 1,000,000,000 RWA</p>
          
          <div className="max-w-6xl mx-auto">
            <div className="bg-gradient-to-br from-gray-800/60 to-gray-900/60 rounded-2xl p-6 md:p-8 border border-border/50 backdrop-blur">
              <div className="flex flex-col lg:flex-row items-center gap-8">
                
                {/* Animated Donut Chart */}
                <div className="relative flex-shrink-0">
                  <svg width="320" height="320" viewBox="0 0 320 320" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="160"
                      cy="160"
                      r={radius}
                      fill="none"
                      stroke="#1f2937"
                      strokeWidth="35"
                    />
                    
                    {/* Animated slices */}
                    {slices.map((slice, index) => (
                      <circle
                        key={index}
                        cx="160"
                        cy="160"
                        r={radius}
                        fill="none"
                        stroke={slice.color}
                        strokeWidth={hoveredSlice === index ? "42" : "35"}
                        strokeDasharray={slice.strokeDasharray}
                        strokeDashoffset={slice.strokeDashoffset}
                        strokeLinecap="butt"
                        className="transition-all duration-300 cursor-pointer"
                        style={{
                          filter: hoveredSlice === index ? `drop-shadow(0 0 10px ${slice.color})` : 'none',
                          opacity: hoveredSlice !== null && hoveredSlice !== index ? 0.5 : 1,
                          transform: isAnimated ? 'none' : `scale(0)`,
                          transformOrigin: 'center',
                          animation: isAnimated ? `fadeInSlice 0.8s ease-out ${index * 0.05}s forwards` : 'none',
                        }}
                        onMouseEnter={() => setHoveredSlice(index)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      />
                    ))}
                    
                    {/* Inner glow effect */}
                    <circle
                      cx="160"
                      cy="160"
                      r="85"
                      fill="url(#innerGlow)"
                    />
                    
                    <defs>
                      <radialGradient id="innerGlow" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#1f2937" />
                        <stop offset="100%" stopColor="#111827" />
                      </radialGradient>
                    </defs>
                  </svg>
                  
                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {hoveredSlice !== null ? (
                      <div className="text-center">
                        <div 
                          className="w-3 h-3 rounded-full mx-auto mb-2"
                          style={{ backgroundColor: tokenDistribution[hoveredSlice].color }}
                        />
                        <p className="text-3xl font-bold" style={{ color: tokenDistribution[hoveredSlice].color }}>
                          {tokenDistribution[hoveredSlice].value}%
                        </p>
                        <p className="text-sm text-ink font-medium">{tokenDistribution[hoveredSlice].name}</p>
                        <p className="text-xs text-ink-muted">{formatNumber(tokenDistribution[hoveredSlice].tokens)}</p>
                        <p className="text-xs text-ink-faint">{tokenDistribution[hoveredSlice].vesting}mo vest</p>
                      </div>
                    ) : (
                      <div className="text-center">
                        <p className="text-4xl font-bold text-ink">1B</p>
                        <p className="text-sm text-ink-muted">RWA Tokens</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Legend - Compact */}
                <div className="flex-1 w-full">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {tokenDistribution.map((item, index) => (
                      <div 
                        key={index}
                        className={`flex items-center gap-2 py-1.5 px-2 rounded-lg cursor-pointer transition-all ${
                          hoveredSlice === index ? 'bg-surface-overlay/50' : 'hover:bg-surface-overlay/30'
                        }`}
                        onMouseEnter={() => setHoveredSlice(index)}
                        onMouseLeave={() => setHoveredSlice(null)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ 
                            backgroundColor: item.color,
                            boxShadow: hoveredSlice === index ? `0 0 8px ${item.color}` : 'none'
                          }}
                        />
                        <span className="text-sm text-ink-muted truncate flex-1">{item.name}</span>
                        <span className="text-sm font-bold" style={{ color: item.color }}>{item.value}%</span>
                      </div>
                    ))}
                  </div>
                  
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
                    <div className="bg-gold-500/10 rounded-lg p-3 border border-gold-500/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-4 h-4 text-gold-400" />
                        <span className="text-sm font-bold text-ink">Equity 70%</span>
                      </div>
                      <p className="text-xs text-ink-muted">700M tokens</p>
                    </div>
                    <div className="bg-success/10 rounded-lg p-3 border border-success/30">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap className="w-4 h-4 text-success" />
                        <span className="text-sm font-bold text-ink">Ecosystem 30%</span>
                      </div>
                      <p className="text-xs text-ink-muted">300M tokens</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vesting Schedule */}
      <section className="py-12 bg-surface/20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Vesting Schedule</h2>
          <p className="text-center text-ink-muted mb-6 text-sm">Token unlock over 100 months</p>
          
          <div className="bg-surface/50 rounded-xl p-4 border border-border max-w-5xl mx-auto">
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={detailedVestingData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                  <defs>
                    {[
                      { id: 'airdrop', color: '#22C55E' },
                      { id: 'r3', color: '#D946EF' },
                      { id: 'r2', color: '#A855F7' },
                      { id: 'r1', color: '#8B5CF6' },
                      { id: 'team', color: '#3B82F6' },
                      { id: 'advisors', color: '#EC4899' },
                      { id: 'marketing', color: '#F97316' },
                      { id: 'company', color: '#6366F1' },
                      { id: 'community', color: '#EAB308' },
                      { id: 'foundation', color: '#14B8A6' },
                      { id: 'hackathon', color: '#06B6D4' },
                    ].map(({ id, color }) => (
                      <linearGradient key={id} id={`color-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.2}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip content={<VestingTooltip />} />
                  <Area type="monotone" dataKey="airdrop" stackId="1" stroke="#22C55E" fill="url(#color-airdrop)" />
                  <Area type="monotone" dataKey="r3" stackId="1" stroke="#D946EF" fill="url(#color-r3)" />
                  <Area type="monotone" dataKey="r2" stackId="1" stroke="#A855F7" fill="url(#color-r2)" />
                  <Area type="monotone" dataKey="r1" stackId="1" stroke="#8B5CF6" fill="url(#color-r1)" />
                  <Area type="monotone" dataKey="team" stackId="1" stroke="#3B82F6" fill="url(#color-team)" />
                  <Area type="monotone" dataKey="advisors" stackId="1" stroke="#EC4899" fill="url(#color-advisors)" />
                  <Area type="monotone" dataKey="marketing" stackId="1" stroke="#F97316" fill="url(#color-marketing)" />
                  <Area type="monotone" dataKey="company" stackId="1" stroke="#6366F1" fill="url(#color-company)" />
                  <Area type="monotone" dataKey="community" stackId="1" stroke="#EAB308" fill="url(#color-community)" />
                  <Area type="monotone" dataKey="foundation" stackId="1" stroke="#14B8A6" fill="url(#color-foundation)" />
                  <Area type="monotone" dataKey="hackathon" stackId="1" stroke="#06B6D4" fill="url(#color-hackathon)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            
            {/* Milestones */}
            <div className="flex flex-wrap justify-center gap-4 mt-4 pt-3 border-t border-border">
              {[
                { month: 0, label: 'TGE', color: 'text-ink-muted' },
                { month: 20, label: 'Airdrop', color: 'text-success' },
                { month: 40, label: 'Investors', color: 'text-gold-400' },
                { month: 50, label: 'Team', color: 'text-gold-400' },
                { month: 100, label: '100%', color: 'text-teal-400' },
              ].map((m, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckCircle className={`w-3 h-3 ${m.color}`} />
                  <span className="text-xs text-ink-muted">M{m.month}</span>
                  <span className={`text-xs font-medium ${m.color}`}>{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Financial Projections */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">5-Year Financial Projections</h2>
          <p className="text-center text-ink-muted mb-6 text-sm">Revenue, costs, and profitability</p>
          
          {/* Break-even */}
          <div className="bg-gradient-to-r from-green-500/10 to-gold-light-500/10 rounded-xl p-4 border border-success/30 max-w-3xl mx-auto mb-8">
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { value: 'Month 28', label: 'Break-even' },
                { value: '$250K/mo', label: 'Revenue' },
                { value: '$50M', label: 'TVL' },
                { value: '500', label: 'Projects' },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-lg font-bold text-ink">{item.value}</p>
                  <p className="text-xs text-ink-muted">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Revenue vs Costs */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-success" />
                Revenue vs Costs
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={financialChartData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <Tooltip content={<FinancialTooltip />} />
                    <Bar dataKey="revenue" fill="#22C55E" name="Revenue" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="costs" fill="#EF4444" name="Costs" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="ebitda" stroke="#3B82F6" strokeWidth={2} name="EBITDA" dot={{ fill: '#3B82F6' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-gold-400" />
                Revenue Sources
              </h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueBreakdownData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <Tooltip content={<FinancialTooltip />} />
                    <Area type="monotone" dataKey="crowdfunding" stackId="1" stroke="#8B5CF6" fill="#8B5CF6" name="Crowdfunding" />
                    <Area type="monotone" dataKey="tokenization" stackId="1" stroke="#3B82F6" fill="#3B82F6" name="Tokenization" />
                    <Area type="monotone" dataKey="trading" stackId="1" stroke="#22C55E" fill="#22C55E" name="Trading" />
                    <Area type="monotone" dataKey="kyc" stackId="1" stroke="#F97316" fill="#F97316" name="KYC" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Financial Table */}
          <div className="bg-surface/50 rounded-xl p-4 border border-border max-w-5xl mx-auto mt-6">
            <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-warning" />
              Financial Metrics
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-ink-muted">Metric</th>
                    {financialMetrics.map((r, i) => (
                      <th key={i} className="text-right py-2 px-2 text-ink-muted">{r.year}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-2 text-ink">Revenue</td>
                    {financialMetrics.map((r, i) => (
                      <td key={i} className="text-right py-2 px-2 text-success font-semibold">{formatCurrency(r.revenue)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-2 text-ink-muted">Growth</td>
                    {financialMetrics.map((r, i) => (
                      <td key={i} className="text-right py-2 px-2 text-gold-400">{r.revenueGrowth}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-2 text-ink-muted">Costs</td>
                    {financialMetrics.map((r, i) => (
                      <td key={i} className="text-right py-2 px-2 text-danger">{formatCurrency(r.costs)}</td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50 bg-surface-overlay/20">
                    <td className="py-2 px-2 text-ink font-semibold">EBITDA</td>
                    {financialMetrics.map((r, i) => (
                      <td key={i} className={`text-right py-2 px-2 font-bold ${r.ebitda >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(r.ebitda)}
                      </td>
                    ))}
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="py-2 px-2 text-ink-muted">Margin</td>
                    {financialMetrics.map((r, i) => (
                      <td key={i} className={`text-right py-2 px-2 ${r.margin >= 0 ? 'text-success' : 'text-danger'}`}>{r.margin}%</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="py-2 px-2 text-ink">Cumulative</td>
                    {financialMetrics.map((r, i) => (
                      <td key={i} className={`text-right py-2 px-2 font-semibold ${r.cumulative >= 0 ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(r.cumulative)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Growth & Dividends */}
      <section className="py-12 bg-surface/20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* TVL & Volume */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gold-400" />
                TVL & Volume
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={platformMetrics} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <Tooltip 
                      formatter={(value) => {
                        const numValue = typeof value === 'number' ? value : 0;
                        return [`$${numValue.toFixed(1)}M`, ''];
                      }} 
                    />
                    <Bar dataKey="tvl" fill="#3B82F6" name="TVL" radius={[3, 3, 0, 0]} />
                    <Line type="monotone" dataKey="volume" stroke="#22C55E" strokeWidth={2} name="Volume" dot={{ fill: '#22C55E' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Dividends */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border">
              <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Gift className="w-4 h-4 text-success" />
                Dividend Pool (80% EBITDA)
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dividendData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="year" stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                    <YAxis stroke="#9CA3AF" tick={{ fill: '#9CA3AF', fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000000).toFixed(0)}M`} />
                    <Tooltip 
                      formatter={(value) => {
                        const numValue = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
                        return [formatCurrency(numValue), ''];
                      }} 
                    />
                    <Bar dataKey="ebitda" fill="#3B82F6" name="EBITDA" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="dividend" fill="#22C55E" name="Dividends" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/30">
                <p className="text-xs text-ink-muted">
                  <span className="text-warning font-semibold">1% holder (10M RWA):</span> ~<span className="text-success font-bold">$197K</span> Y5 dividends
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fee Structure */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-6">Platform Fees</h2>
          
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {/* Crowdfunding */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="w-4 h-4 text-gold-400" />
                <h3 className="font-bold">Crowdfunding</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-ink-muted">Start</span><span className="text-success font-bold">$500</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Success</span><span>2.5%</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Annual</span><span className="text-warning">$1K/yr</span></div>
              </div>
            </div>

            {/* Tokenization */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Coins className="w-4 h-4 text-gold-400" />
                <h3 className="font-bold">Tokenization</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-ink-muted">Base</span><span>$750</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Value</span><span className="text-gold-400">0.1%</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Annual</span><span className="text-warning">$1K/yr</span></div>
              </div>
            </div>

            {/* Investor */}
            <div className="bg-surface/50 rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-success" />
                <h3 className="font-bold">Investor</h3>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-ink-muted">KYC</span><span>$2-$20</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Investment</span><span className="text-success font-bold">0%</span></div>
                <div className="flex justify-between"><span className="text-ink-muted">Trading</span><span>1%</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Fundraising Rounds */}
      <section className="py-12 bg-surface/20">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-2">Fundraising Rounds</h2>
          <p className="text-center text-ink-muted mb-6 text-sm">$2M total for 35% token supply</p>
          
          <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'Pre-Seed', status: 'ACTIVE', allocation: '15%', tokens: '150M', target: '$400K', price: '$0.00267', valuation: '$2.67M', vesting: '40mo', active: true },
              { name: 'Seed', status: 'UPCOMING', allocation: '10%', tokens: '100M', target: '$600K', price: '$0.006', valuation: '$6M', vesting: '33mo', active: false },
              { name: 'Presale', status: 'UPCOMING', allocation: '10%', tokens: '100M', target: '$1M', price: '$0.01', valuation: '$10M', vesting: '25mo', active: false },
            ].map((round, i) => (
              <div key={i} className={`rounded-xl p-4 border relative ${round.active ? 'bg-gold-500/10 border-gold-500/50' : 'bg-surface/50 border-border'}`}>
                <div className={`absolute -top-2 left-3 text-xs font-bold px-2 py-0.5 rounded-full ${round.active ? 'bg-gold-500 text-ink' : 'bg-border-strong text-ink'}`}>
                  {round.status}
                </div>
                <h3 className="font-bold mt-2 mb-3">{round.name}</h3>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><span className="text-ink-muted">Allocation</span><span>{round.allocation} ({round.tokens})</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Target</span><span className="text-success">{round.target}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Price</span><span>{round.price}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Valuation</span><span className="text-gold-400">{round.valuation}</span></div>
                  <div className="flex justify-between"><span className="text-ink-muted">Vesting</span><span>{round.vesting}</span></div>
                </div>
                {round.active && (
                  <Link href="/raise" className="mt-3 block w-full bg-gold-500 hover:bg-gold-600 text-ink text-center py-1.5 rounded-lg text-sm font-bold">
                    Invest Now
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Token Utility */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-6">$RWA Token Utility</h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
            {[
              { icon: Gift, color: 'text-success', title: 'Dividends', desc: '80% EBITDA quarterly' },
              { icon: Vote, color: 'text-gold-400', title: 'Governance', desc: 'Vote on upgrades' },
              { icon: Percent, color: 'text-gold-400', title: 'Fee Discounts', desc: 'Up to 50% off' },
              { icon: Rocket, color: 'text-warning', title: 'Priority', desc: 'Early access' },
              { icon: Lock, color: 'text-teal-400', title: 'Staking', desc: 'Extra rewards' },
              { icon: Shield, color: 'text-pink-400', title: 'Insurance', desc: 'Protection pool' },
            ].map((item, i) => (
              <div key={i} className="bg-surface/50 rounded-xl p-3 border border-border">
                <item.icon className={`w-6 h-6 ${item.color} mb-2`} />
                <h3 className="font-bold text-sm">{item.title}</h3>
                <p className="text-xs text-ink-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-12 bg-surface/20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {[
              { href: '/docs/whitepaper', icon: Shield, color: 'blue', title: 'Whitepaper', desc: 'Technical docs' },
              { href: '/raise', icon: Rocket, color: 'purple', title: 'Invest Now', desc: 'Join Pre-Seed' },
              { href: '/docs/investor-guide', icon: Users, color: 'green', title: 'Investor Guide', desc: 'How to invest' },
            ].map((item, i) => (
              <Link key={i} href={item.href} className={`bg-surface/50 rounded-xl p-4 border border-border hover:border-${item.color}-500 transition-colors group`}>
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                  <h3 className={`font-bold group-hover:text-${item.color}-400`}>{item.title}</h3>
                </div>
                <p className="text-sm text-ink-muted">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-gradient-to-r from-gold-600/20 via-purple-600/20 to-pink-600/20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to Invest?</h2>
          <p className="text-ink-muted mb-6 text-sm">Join our Pre-Seed round</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/raise" className="bg-gradient-to-r from-gold-500 to-gold-light-500 text-ink font-bold py-2 px-6 rounded-lg">
              Invest Now
            </Link>
            <a href={`mailto:${CONTACT.general}`} className="bg-surface text-ink font-bold py-2 px-6 rounded-lg border border-border">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* CSS Animation */}
      <style jsx>{`
        @keyframes fadeInSlice {
          from { opacity: 0; stroke-dashoffset: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}