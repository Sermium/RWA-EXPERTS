-- database/schema.sql
-- RWA Platform Complete Database Schema
-- Generated: 2026-03-28
-- Compatible with PostgreSQL 14+

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ADMIN & AUDIT TABLES
-- ============================================================================

CREATE TABLE admin_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_address TEXT NOT NULL,
  target_address TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  admin_address TEXT NOT NULL,
  target_id TEXT,
  target_type TEXT,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  role TEXT NOT NULL,
  promoted_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- BLOG
-- ============================================================================

CREATE TABLE blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(255) UNIQUE NOT NULL,
  title VARCHAR(500) NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  category VARCHAR(100),
  cover_image_url TEXT,
  author_name VARCHAR(255) DEFAULT 'RWA Experts Team',
  author_avatar_url TEXT,
  read_time VARCHAR(50),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured BOOLEAN DEFAULT false,
  meta_title VARCHAR(255),
  meta_description TEXT,
  tags TEXT[],
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_blog_posts_status ON blog_posts(status);
CREATE INDEX idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX idx_blog_posts_published_at ON blog_posts(published_at DESC);

-- ============================================================================
-- COUNTRIES
-- ============================================================================

CREATE TABLE countries (
  code INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  alpha2 TEXT,
  alpha3 TEXT,
  is_restricted BOOLEAN DEFAULT false
);

-- ============================================================================
-- CROWDFUNDING
-- ============================================================================

CREATE TABLE crowdfunding_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  project_name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  website TEXT,
  company_name TEXT,
  registration_number TEXT,
  jurisdiction TEXT,
  funding_goal NUMERIC NOT NULL,
  local_currency TEXT DEFAULT 'USD',
  exchange_rate NUMERIC DEFAULT 1,
  investor_share_percentage NUMERIC,
  projected_roi NUMERIC,
  roi_timeline_months INTEGER DEFAULT 12,
  revenue_model TEXT,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  total_supply BIGINT,
  token_price NUMERIC,
  investor_tokens BIGINT,
  platform_fee_tokens BIGINT,
  platform_fee NUMERIC,
  milestones JSONB DEFAULT '[]',
  logo_url TEXT,
  banner_url TEXT,
  images JSONB DEFAULT '[]',
  pitch_deck_url TEXT,
  video_url TEXT,
  legal_documents JSONB DEFAULT '[]',
  terms_accepted BOOLEAN DEFAULT false,
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payment_intent_id TEXT,
  payment_amount NUMERIC,
  paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'draft',
  rejection_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  deployed_chain_id INTEGER,
  project_nft_id BIGINT,
  escrow_vault_address TEXT,
  security_token_address TEXT,
  compliance_address TEXT,
  deployed_at TIMESTAMPTZ,
  deployment_tx_hash TEXT,
  activation_tx_hash TEXT,
  activated_at TIMESTAMPTZ,
  deadline_days INTEGER DEFAULT 30,
  raise_end_date TIMESTAMPTZ,
  funded_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_crowdfunding_wallet ON crowdfunding_applications(wallet_address);
CREATE INDEX idx_crowdfunding_status ON crowdfunding_applications(status);

-- ============================================================================
-- DOCUMENTS
-- ============================================================================

CREATE TABLE document_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID,
  accessed_by TEXT NOT NULL,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- EMAIL
-- ============================================================================

CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_template TEXT NOT NULL DEFAULT '',
  variables JSONB DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- EXCHANGE
-- ============================================================================

CREATE TABLE exchange_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(50) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  available_balance NUMERIC DEFAULT 0,
  locked_balance NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, token_address)
);

CREATE TABLE exchange_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  chain_id INTEGER NOT NULL DEFAULT 43113,
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exchange_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_name TEXT,
  owner_address TEXT NOT NULL,
  chain_id INTEGER,
  trading_pair TEXT DEFAULT 'USDC',
  initial_price TEXT,
  min_order_size TEXT DEFAULT '1',
  max_order_size TEXT DEFAULT '1000000',
  status TEXT DEFAULT 'active',
  project_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exchange_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pair_id UUID,
  wallet_address VARCHAR(255) NOT NULL,
  order_type VARCHAR(20) NOT NULL,
  side VARCHAR(10) NOT NULL,
  price NUMERIC,
  quantity NUMERIC NOT NULL,
  filled_quantity NUMERIC DEFAULT 0,
  remaining_quantity NUMERIC NOT NULL,
  status VARCHAR(20) DEFAULT 'open',
  tx_hash VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exchange_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  pair_symbol TEXT NOT NULL,
  side TEXT NOT NULL,
  base_token TEXT NOT NULL,
  quote_token TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  fee NUMERIC DEFAULT 0,
  mexc_order_id TEXT,
  status TEXT DEFAULT 'completed',
  chain_id INTEGER NOT NULL DEFAULT 43113,
  pair_id UUID,
  buy_order_id UUID,
  sell_order_id UUID,
  buyer_address VARCHAR(255),
  seller_address VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exchange_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL,
  token_symbol VARCHAR(50) NOT NULL,
  token_address VARCHAR(255) NOT NULL,
  tx_type VARCHAR(20) NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE exchange_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  status TEXT DEFAULT 'pending',
  chain_id INTEGER NOT NULL DEFAULT 43113,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- FUNDING
-- ============================================================================

CREATE TABLE funding_validations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER NOT NULL,
  project_id BIGINT NOT NULL,
  total_raised_crypto NUMERIC DEFAULT 0,
  total_raised_offchain NUMERIC DEFAULT 0,
  total_raised NUMERIC NOT NULL,
  platform_fee_amount NUMERIC,
  platform_fee_collected BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  validated_by TEXT,
  validated_at TIMESTAMPTZ,
  validation_notes TEXT,
  offchain_conversion_tx TEXT,
  tokens_minted_tx TEXT,
  tokens_minted_amount NUMERIC,
  exchange_listed BOOLEAN DEFAULT false,
  listing_tx_hash TEXT,
  trading_pair TEXT,
  listed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INVESTMENTS
-- ============================================================================

CREATE TABLE investments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  chain_id INTEGER NOT NULL,
  investor_address TEXT NOT NULL,
  investor_email TEXT,
  amount_usd NUMERIC NOT NULL,
  amount_tokens NUMERIC,
  payment_method TEXT NOT NULL DEFAULT 'crypto',
  payment_intent_id TEXT,
  payment_reference TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_investments_project ON investments(project_id);
CREATE INDEX idx_investments_investor ON investments(investor_address);

-- ============================================================================
-- KYC
-- ============================================================================

CREATE TABLE kyc_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_hash TEXT NOT NULL,
  wallet_address TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  date_of_birth TEXT,
  country_code INTEGER NOT NULL,
  requested_level INTEGER NOT NULL DEFAULT 1,
  current_level INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  verification_score INTEGER,
  documents JSONB DEFAULT '{}',
  rejection_reason TEXT,
  rejection_reason_text TEXT,
  notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  rejected_by TEXT,
  rejected_at TIMESTAMPTZ,
  tx_hash TEXT,
  linked_wallets TEXT[] DEFAULT '{}'
);

CREATE INDEX idx_kyc_applications_wallet ON kyc_applications(wallet_hash);
CREATE INDEX idx_kyc_applications_status ON kyc_applications(status);

CREATE TABLE kyc_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID,
  wallet_hash TEXT,
  actor_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  action TEXT NOT NULL,
  details_hash TEXT,
  ip_hash TEXT,
  chain_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kyc_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL,
  consent_type TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  consent_text_hash TEXT NOT NULL,
  wallet_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  given_at TIMESTAMPTZ DEFAULT now(),
  withdrawn_at TIMESTAMPTZ,
  withdrawal_signature TEXT
);

CREATE TABLE kyc_data (
  wallet_address VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255),
  full_name VARCHAR(255),
  date_of_birth DATE,
  country_code INTEGER,
  submitted_at BIGINT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_hash TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT,
  storage_provider TEXT DEFAULT 'supabase',
  storage_id TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE kyc_personal_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL,
  encrypted_full_name JSONB,
  encrypted_date_of_birth JSONB,
  encrypted_nationality JSONB,
  encrypted_address JSONB,
  encrypted_phone JSONB,
  encrypted_documents_hash JSONB,
  id_document_hash TEXT,
  proof_of_address_hash TEXT,
  selfie_hash TEXT,
  encryption_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kyc_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_hash TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  level INTEGER NOT NULL,
  country_code INTEGER NOT NULL,
  expiry BIGINT NOT NULL,
  signature TEXT NOT NULL,
  application_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  used_at TIMESTAMPTZ
);

CREATE TABLE kyc_settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  auto_approval_enabled BOOLEAN DEFAULT false,
  auto_approval_max_level INTEGER DEFAULT 1,
  restricted_countries INTEGER[] DEFAULT ARRAY[408, 364, 760, 192],
  min_verification_score INTEGER DEFAULT 80,
  require_liveness_check BOOLEAN DEFAULT true,
  document_expiry_warning_days INTEGER DEFAULT 30,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  requested_level TEXT,
  current_level TEXT,
  status TEXT DEFAULT 'Pending',
  is_upgrade BOOLEAN DEFAULT false,
  full_name TEXT,
  email TEXT,
  date_of_birth DATE,
  country_code INTEGER,
  document_type TEXT,
  document_number TEXT,
  expiry_date DATE,
  tx_hash TEXT,
  id_document_front_url TEXT,
  id_document_back_url TEXT,
  selfie_url TEXT,
  address_proof_url TEXT,
  accredited_proof_url TEXT,
  id_validation_score NUMERIC,
  id_validation_passed BOOLEAN,
  id_requires_manual_review BOOLEAN DEFAULT false,
  id_extracted_data JSONB,
  id_found_text TEXT,
  id_matches JSONB,
  mrz_detected BOOLEAN,
  mrz_data JSONB,
  face_score NUMERIC,
  liveness_score NUMERIC,
  liveness_passed BOOLEAN,
  tier TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE kyc_tier_limits (
  tier_name VARCHAR(50) PRIMARY KEY,
  tier_level INTEGER NOT NULL,
  investment_limit BIGINT,
  daily_limit BIGINT,
  monthly_limit BIGINT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- LINKED WALLETS
-- ============================================================================

CREATE TABLE linked_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_hash TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  link_code TEXT,
  link_code_expiry TIMESTAMPTZ,
  linked_via_code TEXT
);

CREATE INDEX idx_linked_wallets_hash ON linked_wallets(wallet_hash);

CREATE TABLE wallet_link_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  wallet_hash TEXT NOT NULL,
  source_wallet TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT false,
  used_by TEXT,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TOKENS & LISTINGS
-- ============================================================================

CREATE TABLE listed_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  token_address TEXT NOT NULL,
  chain_id INTEGER NOT NULL,
  decimals INTEGER DEFAULT 18,
  is_active BOOLEAN DEFAULT true,
  is_tradeable BOOLEAN DEFAULT true,
  initial_price NUMERIC,
  current_price NUMERIC,
  logo_url TEXT,
  banner_url TEXT,
  asset_type VARCHAR(50) DEFAULT 'other',
  listed_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE token_holders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  holder_address TEXT NOT NULL,
  balance TEXT NOT NULL,
  is_owner BOOLEAN DEFAULT false,
  chain_id INTEGER,
  last_transaction TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(token_address, holder_address)
);

CREATE TABLE token_price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address VARCHAR(255) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  open_price NUMERIC NOT NULL,
  high_price NUMERIC NOT NULL,
  low_price NUMERIC NOT NULL,
  close_price NUMERIC NOT NULL,
  volume NUMERIC DEFAULT 0,
  trade_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_token_price_history ON token_price_history(token_address, timestamp);

-- ============================================================================
-- MEXC TRADES
-- ============================================================================

CREATE TABLE mexc_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  side VARCHAR(10) NOT NULL,
  quantity NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  mexc_order_id VARCHAR(255),
  platform_revenue NUMERIC DEFAULT 0,
  markup_revenue NUMERIC DEFAULT 0,
  fee_revenue NUMERIC DEFAULT 0,
  status VARCHAR(20) DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- MILESTONES
-- ============================================================================

CREATE TABLE milestone_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id BIGINT NOT NULL,
  milestone_index INTEGER NOT NULL,
  owner_address TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  documents TEXT[] DEFAULT '{}',
  links TEXT[] DEFAULT '{}',
  kpis_achieved JSONB DEFAULT '[]',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  chain_id INTEGER,
  release_tx_hash TEXT,
  released_at TIMESTAMPTZ,
  released_amount NUMERIC,
  submission_count INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  deal_id UUID,
  deal_reference VARCHAR(100),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  data JSONB DEFAULT '{}',
  priority VARCHAR(20) DEFAULT 'medium',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications(user_address);
CREATE INDEX idx_notifications_read ON notifications(user_address, read);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(255) NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT true,
  email_address VARCHAR(255),
  notify_deal_created BOOLEAN DEFAULT true,
  notify_deal_updated BOOLEAN DEFAULT true,
  notify_stage_changed BOOLEAN DEFAULT true,
  notify_document_uploaded BOOLEAN DEFAULT true,
  notify_document_verified BOOLEAN DEFAULT true,
  notify_milestone_completed BOOLEAN DEFAULT true,
  notify_payment_received BOOLEAN DEFAULT true,
  notify_payment_released BOOLEAN DEFAULT true,
  notify_message_received BOOLEAN DEFAULT true,
  notify_dispute_filed BOOLEAN DEFAULT true,
  notify_dispute_resolved BOOLEAN DEFAULT true,
  notify_kyc_updates BOOLEAN DEFAULT true,
  email_frequency VARCHAR(20) DEFAULT 'instant',
  preferences JSONB DEFAULT '[]',
  global_settings JSONB DEFAULT '{"timezone": "UTC", "emailDigest": "realtime", "soundEnabled": true}',
  contact_info JSONB DEFAULT '{"email": "", "phone": ""}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID,
  channel VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  provider_response JSONB,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'unknown',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, token)
);

CREATE TABLE reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- OFFCHAIN PAYMENTS
-- ============================================================================

CREATE TABLE offchain_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chain_id INTEGER NOT NULL,
  project_id BIGINT NOT NULL,
  investor_address TEXT NOT NULL,
  investor_email TEXT,
  amount_usd NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  payment_intent_id TEXT,
  payment_reference TEXT,
  status TEXT DEFAULT 'pending',
  converted_at TIMESTAMPTZ,
  converted_by TEXT,
  conversion_tx_hash TEXT,
  token_amount NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PLATFORM
-- ============================================================================

CREATE TABLE platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fee_type TEXT NOT NULL,
  fee_amount NUMERIC NOT NULL,
  fee_currency TEXT DEFAULT 'USDC',
  fee_percentage NUMERIC,
  is_active BOOLEAN DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform_revenue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID,
  revenue_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  token_symbol TEXT NOT NULL,
  chain_id INTEGER NOT NULL DEFAULT 43113,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(100) NOT NULL UNIQUE,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- PROJECTS
-- ============================================================================

CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID,
  owner_address TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  logo_url TEXT,
  banner_url TEXT,
  logo_ipfs TEXT,
  banner_ipfs TEXT,
  token_address TEXT,
  nft_address TEXT,
  escrow_address TEXT,
  chain_id INTEGER NOT NULL,
  total_supply NUMERIC,
  price_per_token NUMERIC,
  funding_goal NUMERIC,
  funding_deadline TIMESTAMPTZ,
  amount_raised NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'active',
  is_featured BOOLEAN DEFAULT false,
  metadata_uri TEXT,
  deployment_tx_hash TEXT,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_projects_owner ON projects(owner_address);
CREATE INDEX idx_projects_status ON projects(status);

-- ============================================================================
-- SECURITY ORDERS & TRADES
-- ============================================================================

CREATE TABLE security_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  listing_id UUID,
  wallet_address TEXT NOT NULL,
  side TEXT NOT NULL,
  order_type TEXT NOT NULL,
  price TEXT,
  amount TEXT NOT NULL,
  filled_amount TEXT DEFAULT '0',
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_security_orders_token ON security_orders(token_address);
CREATE INDEX idx_security_orders_wallet ON security_orders(wallet_address);

CREATE TABLE security_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_address TEXT NOT NULL,
  buy_order_id UUID,
  sell_order_id UUID,
  buyer_address TEXT NOT NULL,
  seller_address TEXT NOT NULL,
  price TEXT NOT NULL,
  amount TEXT NOT NULL,
  total TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TOKEN CREATION
-- ============================================================================

CREATE TABLE token_creation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  user_address TEXT NOT NULL,
  token_name TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  token_supply BIGINT NOT NULL,
  token_decimals INTEGER DEFAULT 18,
  create_nft BOOLEAN DEFAULT false,
  nft_name TEXT,
  nft_description TEXT,
  nft_image_url TEXT,
  nft_metadata JSONB,
  create_escrow BOOLEAN DEFAULT false,
  escrow_release_conditions JSONB,
  logo_url TEXT,
  banner_url TEXT,
  website_url TEXT,
  social_links JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  deployment_tx_hash TEXT,
  token_address TEXT,
  nft_token_id BIGINT,
  escrow_address TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TOKENIZATION
-- ============================================================================

CREATE TABLE tokenization_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  asset_type TEXT NOT NULL,
  asset_description TEXT NOT NULL,
  asset_location TEXT,
  asset_country TEXT NOT NULL,
  estimated_value NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  valuation_source TEXT,
  desired_token_supply BIGINT,
  token_price_estimate NUMERIC,
  fundraising_goal NUMERIC,
  token_type TEXT NOT NULL,
  token_name TEXT,
  token_symbol TEXT,
  token_supply NUMERIC,
  needs_escrow BOOLEAN DEFAULT false,
  needs_dividends BOOLEAN DEFAULT false,
  ownership_proof_type TEXT,
  legal_entity_name TEXT,
  legal_entity_type TEXT,
  legal_jurisdiction TEXT,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  contact_telegram TEXT,
  website TEXT,
  use_case TEXT,
  documents JSONB DEFAULT '[]',
  status TEXT DEFAULT 'pending',
  admin_notes TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  rejected_at TIMESTAMPTZ,
  fee_amount NUMERIC,
  fee_currency TEXT DEFAULT 'USDC',
  fee_tx_hash TEXT,
  fee_paid_at TIMESTAMPTZ,
  original_fee_paid NUMERIC,
  additional_fee_required NUMERIC,
  total_fee_paid NUMERIC,
  additional_payment_tx_hash TEXT,
  additional_payment_at TIMESTAMPTZ,
  payment_tx_hash VARCHAR(255),
  payment_token VARCHAR(50),
  payment_confirmed_at TIMESTAMP,
  project_id BIGINT,
  token_address TEXT,
  nft_token_id BIGINT,
  nft_address TEXT,
  escrow_address TEXT,
  deployment_tx_hash TEXT,
  metadata_uri TEXT,
  deployed_at TIMESTAMPTZ,
  listed_at TIMESTAMPTZ,
  chain_id INTEGER DEFAULT 80002,
  project_type TEXT DEFAULT 'tokenize',
  milestones JSONB DEFAULT '[]',
  investor_share_percent NUMERIC,
  projected_roi NUMERIC,
  roi_timeline_months INTEGER,
  deadline_days INTEGER DEFAULT 90,
  min_investment NUMERIC DEFAULT 100,
  max_investment NUMERIC,
  submission_count INTEGER DEFAULT 1,
  resubmitted_at TIMESTAMPTZ,
  logo_url TEXT,
  logo_ipfs TEXT,
  banner_url TEXT,
  banner_ipfs TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tokenization_user ON tokenization_applications(user_address);
CREATE INDEX idx_tokenization_status ON tokenization_applications(status);

CREATE TABLE tokenization_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_hash TEXT,
  file_size BIGINT,
  mime_type TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  verified BOOLEAN DEFAULT false,
  verified_by TEXT,
  verified_at TIMESTAMPTZ
);

-- ============================================================================
-- TRADE (B2B)
-- ============================================================================

CREATE TABLE trade_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  buyer_wallet VARCHAR(255) NOT NULL,
  buyer_company VARCHAR(255) NOT NULL,
  buyer_country VARCHAR(100) NOT NULL,
  buyer_registration_number VARCHAR(100),
  buyer_address TEXT,
  buyer_contact_name VARCHAR(255),
  buyer_contact_email VARCHAR(255),
  buyer_contact_phone VARCHAR(50),
  buyer_kyc_status VARCHAR(50) DEFAULT 'pending',
  seller_wallet VARCHAR(255) NOT NULL,
  seller_company VARCHAR(255) NOT NULL,
  seller_country VARCHAR(100) NOT NULL,
  seller_registration_number VARCHAR(100),
  seller_address TEXT,
  seller_contact_name VARCHAR(255),
  seller_contact_email VARCHAR(255),
  seller_contact_phone VARCHAR(50),
  seller_kyc_status VARCHAR(50) DEFAULT 'pending',
  product_name VARCHAR(255) NOT NULL,
  product_category VARCHAR(100) NOT NULL,
  product_description TEXT,
  product_hs_code VARCHAR(20),
  product_quantity NUMERIC NOT NULL,
  product_unit VARCHAR(50) NOT NULL,
  product_unit_price NUMERIC NOT NULL,
  product_currency VARCHAR(10) NOT NULL DEFAULT 'USDC',
  product_total_value NUMERIC NOT NULL,
  product_specifications TEXT,
  incoterm VARCHAR(10) NOT NULL,
  origin_country VARCHAR(100) NOT NULL,
  origin_port VARCHAR(255),
  destination_country VARCHAR(100) NOT NULL,
  destination_port VARCHAR(255),
  delivery_date DATE,
  payment_terms TEXT,
  inspection_required BOOLEAN DEFAULT true,
  insurance_required BOOLEAN DEFAULT true,
  escrow_contract VARCHAR(255),
  escrow_deal_index BIGINT,
  escrow_deposited NUMERIC DEFAULT 0,
  escrow_released NUMERIC DEFAULT 0,
  escrow_refunded NUMERIC DEFAULT 0,
  stage VARCHAR(50) NOT NULL DEFAULT 'draft',
  dispute_reason TEXT,
  dispute_filed_at TIMESTAMPTZ,
  dispute_resolved_at TIMESTAMPTZ,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT
);

CREATE INDEX idx_trade_deals_buyer ON trade_deals(buyer_wallet);
CREATE INDEX idx_trade_deals_seller ON trade_deals(seller_wallet);
CREATE INDEX idx_trade_deals_stage ON trade_deals(stage);

CREATE TABLE trade_disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID REFERENCES trade_deals(id),
  wallet_address TEXT,
  reason VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  resolution TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trade_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES trade_deals(id),
  type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  storage_path TEXT,
  size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  hash VARCHAR(255),
  uploaded_by VARCHAR(255) NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  verified_by VARCHAR(255),
  verified_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE trade_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(255) NOT NULL UNIQUE,
  company_name VARCHAR(255) NOT NULL,
  company_registration_number VARCHAR(100),
  company_country VARCHAR(100) NOT NULL,
  company_address TEXT,
  company_type VARCHAR(100),
  contact_name VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  beneficial_owners JSONB DEFAULT '[]',
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  verification_level INTEGER DEFAULT 0,
  documents JSONB DEFAULT '[]',
  sanctions_screened_at TIMESTAMPTZ,
  sanctions_status VARCHAR(50),
  pep_screened_at TIMESTAMPTZ,
  pep_status VARCHAR(50),
  reviewed_by VARCHAR(255),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trade_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES trade_deals(id),
  sender_wallet VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  read_by JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trade_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES trade_deals(id),
  order_index INTEGER NOT NULL,
  type VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  payment_percentage NUMERIC NOT NULL,
  payment_amount NUMERIC NOT NULL,
  auto_release BOOLEAN DEFAULT false,
  required_documents TEXT[],
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  document_hash VARCHAR(255),
  completed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  tx_hash VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trade_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES trade_deals(id),
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  actor VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  buyer_id UUID,
  seller_id UUID,
  buyer_company VARCHAR(255),
  seller_company VARCHAR(255),
  asset_type VARCHAR(100),
  asset_id UUID,
  amount NUMERIC NOT NULL,
  currency VARCHAR(10) DEFAULT 'USDC',
  quantity NUMERIC,
  price_per_unit NUMERIC,
  status VARCHAR(50) DEFAULT 'pending',
  escrow_address VARCHAR(255),
  escrow_tx_hash VARCHAR(255),
  release_tx_hash VARCHAR(255),
  funded_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TRADING PAIRS
-- ============================================================================

CREATE TABLE trading_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol VARCHAR(50) NOT NULL UNIQUE,
  base_token VARCHAR(50) NOT NULL,
  quote_token VARCHAR(50) NOT NULL,
  base_token_address VARCHAR(255) NOT NULL,
  quote_token_address VARCHAR(255) NOT NULL,
  base_decimals INTEGER NOT NULL DEFAULT 18,
  quote_decimals INTEGER NOT NULL DEFAULT 6,
  min_order_size NUMERIC NOT NULL DEFAULT 0.0001,
  price_precision INTEGER NOT NULL DEFAULT 6,
  quantity_precision INTEGER NOT NULL DEFAULT 6,
  is_active BOOLEAN DEFAULT true,
  chain_id INTEGER DEFAULT 80002,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- USER
-- ============================================================================

CREATE TABLE user_exchange_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  token_symbol TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  chain_id INTEGER NOT NULL DEFAULT 43113,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(wallet_address, token_symbol, chain_id)
);

CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kyc_level INTEGER NOT NULL DEFAULT 0,
  kyc_status TEXT NOT NULL DEFAULT 'NONE',
  country_code INTEGER,
  kyc_submitted_at TIMESTAMPTZ,
  kyc_approved_at TIMESTAMPTZ,
  kyc_expires_at TIMESTAMPTZ,
  email_hash TEXT,
  encrypted_email JSONB,
  preferred_language TEXT DEFAULT 'en',
  deletion_requested_at TIMESTAMPTZ,
  can_delete_after TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES user_identities(id),
  wallet_hash TEXT NOT NULL,
  wallet_label TEXT DEFAULT 'Main',
  is_primary BOOLEAN DEFAULT false,
  linked_at TIMESTAMPTZ DEFAULT now(),
  link_signature TEXT NOT NULL,
  linked_via TEXT DEFAULT 'direct',
  is_active BOOLEAN DEFAULT true,
  deactivated_at TIMESTAMPTZ
);

CREATE INDEX idx_user_wallets_identity ON user_wallets(identity_id);
CREATE INDEX idx_user_wallets_hash ON user_wallets(wallet_hash);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;

$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crowdfunding_applications_updated_at BEFORE UPDATE ON crowdfunding_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exchange_balances_updated_at BEFORE UPDATE ON exchange_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exchange_listings_updated_at BEFORE UPDATE ON exchange_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exchange_orders_updated_at BEFORE UPDATE ON exchange_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_investments_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_applications_updated_at BEFORE UPDATE ON kyc_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_personal_data_updated_at BEFORE UPDATE ON kyc_personal_data FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_submissions_updated_at BEFORE UPDATE ON kyc_submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_kyc_tier_limits_updated_at BEFORE UPDATE ON kyc_tier_limits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_listed_tokens_updated_at BEFORE UPDATE ON listed_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_milestone_proofs_updated_at BEFORE UPDATE ON milestone_proofs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_preferences_updated_at BEFORE UPDATE ON notification_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offchain_payments_updated_at BEFORE UPDATE ON offchain_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_fees_updated_at BEFORE UPDATE ON platform_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_settings_updated_at BEFORE UPDATE ON platform_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_platform_stats_updated_at BEFORE UPDATE ON platform_stats FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_push_tokens_updated_at BEFORE UPDATE ON push_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_security_orders_updated_at BEFORE UPDATE ON security_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_token_creation_queue_updated_at BEFORE UPDATE ON token_creation_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tokenization_applications_updated_at BEFORE UPDATE ON tokenization_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trade_deals_updated_at BEFORE UPDATE ON trade_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trade_disputes_updated_at BEFORE UPDATE ON trade_disputes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trade_kyc_updated_at BEFORE UPDATE ON trade_kyc FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trade_milestones_updated_at BEFORE UPDATE ON trade_milestones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trading_pairs_updated_at BEFORE UPDATE ON trading_pairs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_exchange_balances_updated_at BEFORE UPDATE ON user_exchange_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_identities_updated_at BEFORE UPDATE ON user_identities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- KYC Tier Limits
INSERT INTO kyc_tier_limits (tier_name, tier_level, investment_limit, daily_limit, monthly_limit, description) VALUES
('None', 0, 0, 0, 0, 'No KYC verification'),
('Bronze', 1, 10000, 1000, 5000, 'Basic verification'),
('Silver', 2, 50000, 5000, 25000, 'Enhanced verification'),
('Gold', 3, 500000, 50000, 250000, 'Accredited investor'),
('Diamond', 4, NULL, NULL, NULL, 'Institutional/Unlimited');

-- KYC Settings
INSERT INTO kyc_settings (id, auto_approval_enabled, auto_approval_max_level, restricted_countries, min_verification_score)
VALUES (1, false, 1, ARRAY[408, 364, 760, 192], 80)
ON CONFLICT (id) DO NOTHING;

-- Sample blog posts
INSERT INTO blog_posts (slug, title, excerpt, content, category, read_time, status, featured, published_at) VALUES
(
  'future-of-real-estate-tokenization',
  'The Future of Real Estate Tokenization in 2026',
  'Discover how blockchain technology is revolutionizing property ownership.',
  '## Introduction\n\nReal estate tokenization is transforming how we think about property ownership...',
  'Tokenization',
  '8 min read',
  'published',
  true,
  NOW()
),
(
  'understanding-kyc-requirements',
  'Understanding KYC Requirements for Crypto Investments',
  'A comprehensive guide to KYC verification levels.',
  '## Why KYC Matters\n\nKnow Your Customer (KYC) verification is essential...',
  'Compliance',
  '5 min read',
  'published',
  false,
  NOW() - INTERVAL '5 days'
);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
