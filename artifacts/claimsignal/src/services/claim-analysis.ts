import { claimAnalysisSchema, type ClaimAnalysis } from '@/lib/claimsignal-types';

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