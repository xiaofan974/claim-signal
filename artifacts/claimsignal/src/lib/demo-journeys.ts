import type { Claim, ClaimEvent, Intervention } from '@/lib/claimsignal-types';

export const DASHBOARD_KPI_LABELS = {
  atRisk: 'High-risk claims',
  rising: 'Claims with rising risk',
  interventions: 'Interventions recommended',
} as const;

export const INTERVENTION_CONTROL_LABELS = {
  prevent: 'Prevent escalation',
  approve: 'Approve intervention',
  dismiss: 'Dismiss',
} as const;

export function getRecommendedInterventionCount(interventions?: Intervention[]) {
  return interventions?.length ?? 0;
}

export function getDashboardStats(claims: Claim[]) {
  return {
    atRisk: claims.filter((claim) => ['high', 'critical'].includes((claim.risk_level ?? '').toLowerCase())).length,
    rising: claims.filter((claim) => (claim.risk_score ?? 0) > (claim.previous_risk_score ?? 0)).length,
    callbacks: claims.reduce((sum, claim) => sum + (claim.missed_callback_count ?? 0), 0),
  };
}

export function getJourneyLearning(claim: Claim, events: ClaimEvent[]) {
  const source = [
    claim.main_signal,
    claim.predicted_issue,
    claim.context_note,
    claim.latest_customer_message,
    claim.sentiment,
    ...events.flatMap((event) => [event.event_title, event.event_detail]),
  ].filter(Boolean).join(' ').toLowerCase();
  const operationalDelay = /(delay|overdue|pending|await|inactive|callback|assessment|document|inspection)/.test(source);
  const explicitlyNoComplaint = /(no customer complaint|no complaint|has not complained|not complained)/.test(source);
  const negativeSentiment = (!explicitlyNoComplaint && /(complaint|complain|unhappy|frustrat|angry|escalat|negative)/.test(source))
    || ['negative', 'deteriorating', 'frustrated'].includes((claim.sentiment ?? '').toLowerCase());
  const acceptedDelay = /(accepted|accepts|understands|understood|okay with|ok with|agreed to wait|comfortable waiting)/.test(source);
  const delta = (claim.risk_score ?? 0) - (claim.previous_risk_score ?? 0);

  if (delta < 0 && acceptedDelay) {
    return {
      tone: 'positive' as const,
      title: 'Customer context lowers the apparent risk',
      detail: 'The recorded customer response explicitly accepts the delay, so the lower score reflects context rather than operational progress alone.',
    };
  }
  if (operationalDelay && !negativeSentiment) {
    return {
      tone: 'warning' as const,
      title: 'Operational delay is visible before negative sentiment',
      detail: 'The claim has delay-related signals even though the record does not show an explicit complaint. This is an early-warning condition, not evidence that the customer has complained.',
    };
  }
  return null;
}