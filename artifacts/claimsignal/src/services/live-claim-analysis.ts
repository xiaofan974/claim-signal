import { analyzeClaim } from '@workspace/api-client-react';
import {
  liveClaimAnalysisResponseSchema,
  type LiveClaimAnalysisResponse,
} from '@/lib/claimsignal-types';

const DEFAULT_TIMEOUT_MS = 15_000;

export class LiveClaimAnalysisError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LiveClaimAnalysisError';
  }
}

export async function getLiveClaimAnalysis(
  claimId: string,
  options: { timeoutMs?: number } = {},
): Promise<LiveClaimAnalysisResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const payload = await analyzeClaim(
      { claim_id: claimId },
      { signal: controller.signal, responseType: 'json' },
    );
    const parsed = liveClaimAnalysisResponseSchema.safeParse(payload);
    if (!parsed.success || parsed.data.claim_id !== claimId) {
      throw new LiveClaimAnalysisError('Live claim analysis returned invalid data.');
    }
    return parsed.data;
  } catch (error) {
    if (error instanceof LiveClaimAnalysisError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LiveClaimAnalysisError('Live claim analysis timed out.', { cause: error });
    }
    throw new LiveClaimAnalysisError('Live claim analysis failed.', { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}