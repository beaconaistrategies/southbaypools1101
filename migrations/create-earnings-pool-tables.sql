-- Earnings Pool Migration
-- Run this in Supabase SQL Editor

-- Create the earnings pool status enum
CREATE TYPE earnings_pool_status AS ENUM ('setup', 'open', 'locked', 'live', 'completed');

-- Earnings Pools - pool instances for tiered golf earnings contests
CREATE TABLE earnings_pools (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  operator_id VARCHAR REFERENCES operators(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug VARCHAR(100),
  tournament_name TEXT NOT NULL,
  tournament_dg_id VARCHAR,
  season INTEGER NOT NULL,
  entry_fee TEXT,
  max_entries_per_email INTEGER NOT NULL DEFAULT 1,
  status earnings_pool_status NOT NULL DEFAULT 'setup',
  notes TEXT,
  purse_total_cents INTEGER,
  payout_structure JSONB,
  rankings_cache JSONB,
  rankings_cache_updated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX earnings_pools_operator_slug_unique ON earnings_pools(operator_id, slug);

-- Earnings Pool Golfers - golfers with tier assignments
CREATE TABLE earnings_pool_golfers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pool_id VARCHAR NOT NULL REFERENCES earnings_pools(id) ON DELETE CASCADE,
  dg_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  country TEXT,
  tier INTEGER NOT NULL,
  dg_rank INTEGER,
  owgr_rank INTEGER,
  current_position TEXT,
  current_earnings_cents INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX earnings_pool_golfers_pool_idx ON earnings_pool_golfers(pool_id);
CREATE UNIQUE INDEX earnings_pool_golfers_pool_dg_unique ON earnings_pool_golfers(pool_id, dg_id);
CREATE INDEX earnings_pool_golfers_tier_idx ON earnings_pool_golfers(pool_id, tier);

-- Earnings Pool Entries - entries with 4 picks (one per tier)
CREATE TABLE earnings_pool_entries (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  pool_id VARCHAR NOT NULL REFERENCES earnings_pools(id) ON DELETE CASCADE,
  entry_name TEXT NOT NULL,
  email TEXT NOT NULL,
  tier1_golfer_id VARCHAR NOT NULL REFERENCES earnings_pool_golfers(id),
  tier2_golfer_id VARCHAR NOT NULL REFERENCES earnings_pool_golfers(id),
  tier3_golfer_id VARCHAR NOT NULL REFERENCES earnings_pool_golfers(id),
  tier4_golfer_id VARCHAR NOT NULL REFERENCES earnings_pool_golfers(id),
  total_earnings_cents INTEGER NOT NULL DEFAULT 0,
  current_rank INTEGER,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX earnings_pool_entries_pool_idx ON earnings_pool_entries(pool_id);
CREATE INDEX earnings_pool_entries_email_idx ON earnings_pool_entries(email);
CREATE INDEX earnings_pool_entries_rank_idx ON earnings_pool_entries(pool_id, current_rank);
