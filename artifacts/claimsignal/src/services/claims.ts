import { supabase } from '@/lib/supabase';
import type { Claim, ClaimEvent, ClaimFilters } from '@/lib/claimsignal-types';

const select = '*';

export async function listClaims(filters: ClaimFilters = {}) {
  const params = new URLSearchParams({ select, order: 'risk_score.desc,updated_at.desc' });
  if (filters.risk && filters.risk !== 'all') params.set('risk_level', `eq.${filters.risk}`);
  if (filters.claimType && filters.claimType !== 'all') params.set('claim_type', `eq.${filters.claimType}`);
  if (filters.search) params.set('or', `(claim_id.ilike.*${filters.search}*,customer_name.ilike.*${filters.search}*,assigned_handler.ilike.*${filters.search}*)`);
  return supabase.list<Claim>('claims', `?${params.toString()}`);
}

export function getClaim(claimId: string) {
  const params = new URLSearchParams({ select, claim_id: `eq.${claimId}`, limit: '1' });
  return supabase.one<Claim>('claims', `?${params.toString()}`);
}

export function updateClaimInterventionStatus(claimId: string, status: 'scheduled' | 'dismissed') {
  return supabase.update<Claim[]>('claims', `?claim_id=eq.${encodeURIComponent(claimId)}`, { intervention_status: status });
}

export function listClaimEvents(claimId: string) {
  const params = new URLSearchParams({ select: '*', claim_id: `eq.${claimId}`, order: 'event_date.asc,created_at.asc' });
  return supabase.list<ClaimEvent>('claim_events', `?${params.toString()}`);
}