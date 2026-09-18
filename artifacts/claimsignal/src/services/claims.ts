import { supabase } from '@/lib/supabase';
import type { Claim, ClaimEvent, ClaimFilters } from '@/lib/claimsignal-types';

const select = '*';

export async function listClaims(filters: ClaimFilters = {}) {
  const params = new URLSearchParams({ select, order: 'risk_score.desc,updated_at.desc' });
  if (filters.risk && filters.risk !== 'all') params.set('risk_level', `eq.${filters.risk}`);
  if (filters.status && filters.status !== 'all') params.set('current_status', `eq.${filters.status}`);
  if (filters.search) params.set('or', `(claim_id.ilike.*${filters.search}*,customer_name.ilike.*${filters.search}*)`);
  return supabase.list<Claim>('claims', `?${params.toString()}`);
}

export function getClaim(claimId: string) {
  const params = new URLSearchParams({ select, claim_id: `eq.${claimId}`, limit: '1' });
  return supabase.one<Claim>('claims', `?${params.toString()}`);
}

export function listClaimEvents(claimId: string) {
  const params = new URLSearchParams({ select: '*', claim_id: `eq.${claimId}`, order: 'event_date.asc,created_at.asc' });
  return supabase.list<ClaimEvent>('claim_events', `?${params.toString()}`);
}