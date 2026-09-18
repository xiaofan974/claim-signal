import { supabase } from '@/lib/supabase';
import type { Intervention } from '@/lib/claimsignal-types';

export async function listInterventions(status = 'all') {
  const params = new URLSearchParams({ select: '*,claim:claims(claim_id,customer_name,claim_type,risk_level,risk_score)', order: 'created_at.desc' });
  if (status !== 'all') params.set('status', `eq.${status}`);
  return supabase.list<Intervention>('interventions', `?${params.toString()}`);
}

export function updateIntervention(id: string, body: Partial<Pick<Intervention, 'status' | 'approved_at'>>) {
  return supabase.update<Intervention>('interventions', `?id=eq.${encodeURIComponent(id)}`, body);
}