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
  evidenceSignals?: Array<{
    signal: string;
    severity: string;
    evidence: string;
    tone: 'positive' | 'warning' | 'danger';
  }>;
  actionTitle?: string;
  actionDetail?: string;
  humanReviewCopy?: string;
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
  const requestedHold = /(requested hold|asked (?:for )?(?:the claim )?to (?:remain on hold|pause)|asked to pause|customer-requested hold)/.test(source);
  const reaffirmedDelay = /(no urgency|until return|until returning|back next week|returning from travel)/.test(source);
  const delta = (claim.risk_score ?? 0) - (claim.previous_risk_score ?? 0);
  const noCustomerContact = (claim.customer_contact_count ?? 0) === 0;

  if (delta < 0 && (acceptedDelay || requestedHold || reaffirmedDelay)) {
    const holdEvent = events.find((event) => /(requested hold|asked to pause|remain on hold|travelling.*pause)/i.test(`${event.event_title} ${event.event_detail}`));
    const reaffirmedEvent = events.find((event) => /(no urgency|until return|back next week)/i.test(`${event.event_title} ${event.event_detail}`));
    const evidenceSignals: JourneyLearning['evidenceSignals'] = [];
    if ((claim.days_since_last_update ?? 0) > 0) {
      const days = claim.days_since_last_update;
      evidenceSignals.push({
        signal: 'Long inactivity',
        severity: 'Context-dependent',
        evidence: `${days} ${days === 1 ? 'day' : 'days'} since the last operational update.`,
        tone: 'positive',
      });
    }
    if (holdEvent?.event_detail) {
      evidenceSignals.push({
        signal: 'Customer-requested hold',
        severity: 'Mitigating context',
        evidence: holdEvent.event_detail,
        tone: 'positive',
      });
    }
    if (reaffirmedEvent?.event_detail) {
      evidenceSignals.push({
        signal: 'Delay reaffirmed',
        severity: 'Mitigating context',
        evidence: reaffirmedEvent.event_detail,
        tone: 'positive',
      });
    }
    return {
      tone: 'positive' as const,
      title: 'Delay is expected and customer-approved',
      detail: 'The operational timeline shows inactivity, but the customer explicitly accepted the delay until returning from travel. In this context, inactivity is not currently a strong escalation signal.',
      changeTitle: 'Customer context reduced apparent risk',
      changeDetail: 'The claim remains delayed, but the customer explicitly requested the pause while travelling.',
      assessmentSummary: 'The claim appears delayed, but the customer explicitly requested and accepted the pause while travelling. That context reduces the significance of inactivity as an escalation signal.',
      evidenceSignals,
      actionTitle: 'No immediate intervention recommended',
      actionDetail: 'Continue monitoring and resume processing on the agreed return date.',
      humanReviewCopy: 'This is decision support. A claims professional remains responsible for deciding whether the current context still justifies the lower-risk assessment.',
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