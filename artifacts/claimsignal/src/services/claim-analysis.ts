import { claimAnalysisSchema, type Claim, type ClaimAnalysis } from '@/lib/claimsignal-types';

export function parseClaimAnalysis(
  raw: unknown,
): ClaimAnalysis | null {
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
  return parsed.success ? parsed.data : null;
}

export function buildDeterministicClaimAnalysis(claim: Claim): ClaimAnalysis {
  const signal = claim.main_signal?.trim() || 'Current claim conditions';
  const issue = claim.predicted_issue?.trim() || null;
  const action = claim.recommended_action?.trim();
  const severity = claim.risk_level === 'high' ? 'high' : claim.risk_level === 'medium' ? 'medium' : 'low';

  return {
    predicted_issue: issue,
    summary: issue
      ? `${issue}. This deterministic assessment reflects the current claim record and should be reviewed alongside the timeline.`
      : `The current claim record highlights ${signal.toLowerCase()}. Review the operational timeline before deciding whether to act.`,
    signals: [{ signal, severity, evidence: claim.context_note?.trim() || signal }],
    context_adjustments: [],
    recommended_action: action ? {
      action,
      urgency: severity === 'high' ? 'today' : severity === 'medium' ? '24_hours' : 'this_week',
      owner: claim.assigned_handler || 'Claims team',
      reason: `Review the current ${signal.toLowerCase()} signal before taking action.`,
    } : null,
    draft_customer_message: null,
  };
}