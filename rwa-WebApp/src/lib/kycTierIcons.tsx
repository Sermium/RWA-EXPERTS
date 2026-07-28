import { Circle, Medal, Award, Trophy, Gem, type LucideIcon } from 'lucide-react';

export type KYCTierName = 'None' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond';

// Canonical tier -> icon mapping, matching src/contexts/KYCContext.tsx's getTierInfo().
// All tier displays across the app (badges, forms, admin panels) should use this
// instead of defining their own emoji or icon set.
export const TIER_ICON: Record<KYCTierName, LucideIcon> = {
  None: Circle,
  Bronze: Medal,
  Silver: Award,
  Gold: Trophy,
  Diamond: Gem,
};

export const TIER_ICON_CLASS: Record<KYCTierName, string> = {
  None: 'text-ink-faint',
  Bronze: 'text-gold-dark',
  Silver: 'text-ink-muted',
  Gold: 'text-gold',
  Diamond: 'text-gold-light',
};

export const TIER_BG_CLASS: Record<KYCTierName, string> = {
  None: 'bg-ink-faint/10',
  Bronze: 'bg-gold-dark/10',
  Silver: 'bg-ink-muted/10',
  Gold: 'bg-gold/10',
  Diamond: 'bg-gold-light/10',
};

export const TIER_BORDER_CLASS: Record<KYCTierName, string> = {
  None: 'border-border-strong',
  Bronze: 'border-gold-dark/50',
  Silver: 'border-ink-muted/50',
  Gold: 'border-gold',
  Diamond: 'border-gold-light',
};
