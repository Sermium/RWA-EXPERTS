import { createClient } from '@supabase/supabase-js';

// Server-side client (with service role key for full access)
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Client-side client (with anon key)
export function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// KYC Data types
export interface KYCData {
  wallet_address: string;
  email?: string;
  full_name?: string;
  date_of_birth?: string;
  country_code?: number;
  submitted_at?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TokenAllocation {
  id: string;
  created_at: string;
  updated_at: string;
  round_id: string;
  round_name: string;
  type: 'purchase' | 'referral_bonus' | 'platform_bonus';
  wallet_address: string;
  tokens_amount: number;
  tokens_usd_value: number;
  token_price_usd: number;
  investment_id: string | null;
  referral_code: string | null;
  referred_wallet: string | null;
  status: 'pending' | 'confirmed' | 'distributed' | 'cancelled';
  distribution_tx_hash: string | null;
  distributed_at: string | null;
  chain_id: number | null;
  payment_method: string | null;
  notes: string | null;
}

export interface FundraisingInvestment {
  id: string;
  created_at: string;
  updated_at: string;
  round_id: string;
  wallet_address: string;
  investment_amount_usd: number;
  token_price_usd: number;
  tokens_purchased: number;
  bonus_tokens: number;
  total_tokens: number;
  bonus_recipient: string;
  bonus_type: 'referral' | 'platform';
  referral_code: string | null;
  referrer_address: string | null;
  payment_method: string;
  payment_token: string | null;
  chain_id: number | null;
  status: 'pending' | 'confirmed' | 'failed' | 'cancelled';
  payment_confirmed_at: string | null;
  stripe_payment_intent_id: string | null;
  tx_hash: string | null;
}

export interface ReferralCode {
  id: string;
  created_at: string;
  updated_at: string;
  code: string;
  wallet_address: string;
  is_active: boolean;
  total_referrals: number;
  total_investment_amount: number;
  total_bonus_tokens: number;
}

// Helper functions
export async function saveKYCEmail(walletAddress: string, email: string): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const normalized = walletAddress.toLowerCase();

    const { error } = await supabase
      .from('kyc_data')
      .upsert({
        wallet_address: normalized,
        email,
        submitted_at: Date.now(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'wallet_address',
      });

    if (error) {
      console.error('Supabase save error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save KYC email:', err);
    return false;
  }
}

export async function getKYCEmail(walletAddress: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAdmin();
    const normalized = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('kyc_data')
      .select('email')
      .eq('wallet_address', normalized)
      .single();

    if (error || !data) {
      return null;
    }
    return data.email;
  } catch (err) {
    console.error('Failed to get KYC email:', err);
    return null;
  }
}

export async function saveKYCData(data: {
  walletAddress: string;
  email?: string;
  fullName?: string;
  dateOfBirth?: string;
  countryCode?: number;
}): Promise<boolean> {
  try {
    const supabase = getSupabaseAdmin();
    const normalized = data.walletAddress.toLowerCase();

    const { error } = await supabase
      .from('kyc_data')
      .upsert({
        wallet_address: normalized,
        email: data.email,
        full_name: data.fullName,
        date_of_birth: data.dateOfBirth,
        country_code: data.countryCode,
        submitted_at: Date.now(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'wallet_address',
      });

    if (error) {
      console.error('Supabase save error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to save KYC data:', err);
    return false;
  }
}



export async function getKYCData(walletAddress: string): Promise<KYCData | null> {
  try {
    const supabase = getSupabaseAdmin();
    const normalized = walletAddress.toLowerCase();

    const { data, error } = await supabase
      .from('kyc_data')
      .select('*')
      .eq('wallet_address', normalized)
      .single();

    if (error || !data) {
      return null;
    }
    return data;
  } catch (err) {
    console.error('Failed to get KYC data:', err);
    return null;
  }
}
