import { claimAnalysisSchema, type Claim, type ClaimAnalysis } from '@/lib/claimsignal-types';

const fallbackAnalysis = (claim: Pick<Claim, 'main_signal' | 'predicted_issue' | 'recommended_action'>): ClaimAnalysis => ({
  predicted_issue: claim.predicted_issue ?? null,
  summary: claim.main_signal
    ? `${claim.main_signal} warrants a timely review before customer frustration becomes explicit.`
    : 'The claim has patterns that warrant a timely review.',
  signals: [
    {
      signal: claim.main_signal ?? 'Recent claim activity',
      severity: 'medium',
      evidence: claim.predicted_issue ?? 'The current claim record contains a change that merits human review.',
    },
  ],
  recommended_action: claim.recommended_action
    ? {
        action: claim.recommended_action,
        urgency: 'this_week',
        owner: 'Claims team',
        reason: 'Review the claim context and agree a clear next step with the customer.',
      }
    : null,
  draft_customer_message: null,
});

export function parseClaimAnalysis(
  raw: unknown,
  claim: Pick<Claim, 'main_signal' | 'predicted_issue' | 'recommended_action'>,
): ClaimAnalysis {
  const candidate = typeof raw === 'string'
    ? (() => {
        try {
          return JSON.parse(raw) as unknown;
        } catch {
          return null;
        }
      })()
    : raw;
  const parsed = claimAnalysisSchema.safeParse(candidate);
  return parsed.success ? parsed.data : fallbackAnalysis(claim);
}