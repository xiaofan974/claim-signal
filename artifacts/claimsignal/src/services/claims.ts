import { supabase } from '@/lib/supabase';
import type { Claim, ClaimEvent, ClaimFilters } from '@/lib/claimsignal-types';

const select = '*';
const claimTypesQuery = '?select=claim_type&order=claim_type.asc';

export function normalizeClaimTypes(rows: Array<Pick<Claim, 'claim_type'>>) {
  return [...new Set(rows.map((row) => row.claim_type?.trim()).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b));
}

export function buildClaimsQuery(filters: ClaimFilters = {}) {
  const params = new URLSearchParams({ select, order: 'risk_score.desc,updated_at.desc' });
  const risk = filters.risk?.trim();
  const claimType = filters.claimType?.trim();
  const search = filters.search?.trim();

  if (risk && risk !== 'all') params.set('risk_level', `eq.${risk}`);
  if (claimType && claimType !== 'all') params.set('claim_type', `eq.${claimType}`);
  if (search) params.set('or', `(claim_id.ilike.*${search}*,customer_name.ilike.*${search}*,assigned_handler.ilike.*${search}*)`);

  return `?${params.toString()}`;
}

export async function listClaims(filters: ClaimFilters = {}) {
  return supabase.list<Claim>('claims', buildClaimsQuery(filters));
}

export async function listClaimTypes() {
  const rows = await supabase.list<Array<Pick<Claim, 'claim_type'>>[number]>('claims', claimTypesQuery);
  return normalizeClaimTypes(rows);
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