import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;
let _serviceClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!_client) _client = createClient(url, key);
  return _client;
}

export function getServiceSupabase(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    // Return a no-op client-like object that always returns empty data
    return {
      from: () => ({
        select: () => ({ data: [], error: null, order: () => ({ data: [], error: null, limit: () => ({ data: [], error: null }) }) }),
        insert: () => ({ data: null, error: null, select: () => ({ data: null, error: null, single: () => ({ data: null, error: null }) }) }),
        upsert: () => ({ data: null, error: null, select: () => ({ data: null, error: null, single: () => ({ data: null, error: null }) }) }),
      }),
    } as unknown as SupabaseClient;
  }
  if (!_serviceClient) _serviceClient = createClient(url, key);
  return _serviceClient;
}

// Legacy export for backward compat
export const supabase = {
  get client() { return getSupabaseClient(); }
};

// Supabase schema SQL (run once in Supabase SQL editor):
//
// CREATE TABLE IF NOT EXISTS skill_providers (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   name TEXT NOT NULL,
//   wallet_address TEXT NOT NULL,
//   manifest_url TEXT NOT NULL UNIQUE,
//   verified BOOLEAN DEFAULT FALSE,
//   skill_count INT DEFAULT 0,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// CREATE TABLE IF NOT EXISTS skill_executions (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   skill_id TEXT NOT NULL,
//   tx_hash TEXT NOT NULL,
//   amount_usdc FLOAT NOT NULL,
//   duration_ms INT NOT NULL,
//   provider_wallet TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// ALTER TABLE skill_executions ENABLE ROW LEVEL SECURITY;
// ALTER TABLE skill_providers ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "Public read executions" ON skill_executions FOR SELECT USING (true);
// CREATE POLICY "Service insert executions" ON skill_executions FOR INSERT WITH CHECK (true);
// CREATE POLICY "Public read providers" ON skill_providers FOR SELECT USING (true);
// CREATE POLICY "Service insert providers" ON skill_providers FOR INSERT WITH CHECK (true);
