import type { Claim } from '@/lib/claimsignal-types';

/**
 * Transparent prototype contributors. These are available for explanation and
 * debugging only; seeded risk_score values remain unchanged for demo consistency.
 */
export const PROTOTYPE_RISK_RULES = {
  missedSla: 20,
  staleClaim: 15,
  repeatedContacts: 15,
  missedCallback: 10,
  assessmentOverdue: 10,
  negativeSentiment: 10,
  blockingDocuments: 10,
} as const;

export function calculatePrototypeRisk(claim: Claim): number {
  let score = 0;
  if ((claim.missed_sla_count ?? 0) > 0) score += PROTOTYPE_RISK_RULES.missedSla;
  if ((claim.days_since_last_update ?? 0) > 7) score += PROTOTYPE_RISK_RULES.staleClaim;
  if ((claim.customer_contact_count ?? 0) > 2) score += PROTOTYPE_RISK_RULES.repeatedContacts;
  if ((claim.missed_callback_count ?? 0) > 0) score += PROTOTYPE_RISK_RULES.missedCallback;
  if (claim.assessment_pending) score += PROTOTYPE_RISK_RULES.assessmentOverdue;
  if (['negative', 'deteriorating', 'frustrated'].includes((claim.sentiment ?? '').toLowerCase())) score += PROTOTYPE_RISK_RULES.negativeSentiment;
  if ((claim.documents_outstanding ?? 0) > 0) score += PROTOTYPE_RISK_RULES.blockingDocuments;
  return Math.min(100, score);
}