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

export type JourneyLearning = {
  tone: 'warning' | 'positive';
  title: string;
  detail: string;
  changeTitle?: string;
  changeDetail?: string;
  assessmentSummary?: string;
  interventionReason?: string;
  draftCustomerMessage?: string;
};

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

export function getJourneyLearning(claim: Claim, events: ClaimEvent[]): JourneyLearning | null {
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
  const noCustomerContact = (claim.customer_contact_count ?? 0) === 0;

  if (delta < 0 && acceptedDelay) {
    return {
      tone: 'positive' as const,
      title: 'Customer context lowers the apparent risk',
      detail: 'The recorded customer response explicitly accepts the delay, so the lower score reflects context rather than operational progress alone.',
    };
  }
  if (delta > 0 && operationalDelay && !negativeSentiment && noCustomerContact) {
    return {
      tone: 'warning' as const,
      title: 'Operational delay detected before customer escalation',
      detail: 'The claim has missed an operational milestone and has had no meaningful update for six days, even though the customer has not contacted the insurer. This is an early-warning condition, not evidence that the customer has complained.',
      changeTitle: 'Risk emerging before customer escalation',
      changeDetail: 'The customer has not contacted the insurer, but the claim is already showing operational delay signals.',
      assessmentSummary: 'The customer has not complained, but the claim is stalled and a service milestone has been missed. The combination of inactivity and an overdue assessment creates an opportunity for proactive intervention before the customer needs to chase.',
      interventionReason: 'The assessment milestone is overdue. Proactive follow-up now may prevent the customer from needing to chase for an update.',
      draftCustomerMessage: 'Hi James, a quick update on your home claim: we are still waiting for the external assessment and have escalated the follow-up today. We will update you again once the appointment is confirmed.',
    };
  }
  if (operationalDelay && !negativeSentiment) {
    return {
      tone: 'warning' as const,
      title: 'Operational delay detected before customer escalation',
      detail: 'The claim has operational delay signals without recorded negative sentiment. This is an early-warning condition, not evidence that the customer has complained.',
    };
  }
  return null;
}