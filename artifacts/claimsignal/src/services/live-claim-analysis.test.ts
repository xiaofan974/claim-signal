import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { getLiveClaimAnalysis, LiveClaimAnalysisError } from './live-claim-analysis';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function liveResponse() {
  return {
    source: 'live_ai',
    claim_id: 'CLM-2205',
    analysis: {
      predicted_issue: null,
      summary: 'Customer-approved delay reduces the significance of inactivity.',
      signals: [{ signal: 'Long inactivity', severity: 'low', evidence: 'Nine days since the last update.' }],
      context_adjustments: [{
        factor: 'Customer-requested delay',
        effect: 'reduces_concern',
        evidence: 'The customer accepted the delay while travelling.',
      }],
      recommended_action: {
        action: 'No immediate intervention',
        urgency: 'none',
        owner: 'Claims handler',
        reason: 'Continue monitoring.',
      },
      draft_customer_message: null,
    },
  } as const;
}

test('returns strictly validated live AI analysis from the application route', async () => {
  globalThis.fetch = async (input, init) => {
    assert.equal(input, '/api/claim-analysis');
    assert.equal(init?.method, 'POST');
    assert.deepEqual(JSON.parse(String(init?.body)), { claim_id: 'CLM-2205' });
    return new Response(JSON.stringify(liveResponse()), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await getLiveClaimAnalysis('CLM-2205');
  assert.equal(result.source, 'live_ai');
  assert.equal(result.analysis.context_adjustments[0]?.effect, 'reduces_concern');
});

test('converts a live AI timeout into a controlled error', async () => {
  globalThis.fetch = async (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });

  await assert.rejects(
    () => getLiveClaimAnalysis('CLM-1847', { timeoutMs: 5 }),
    (error: unknown) => error instanceof LiveClaimAnalysisError && /timed out/.test(error.message),
  );
});

test('rejects malformed live AI output', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ source: 'live_ai', claim_id: 'CLM-1847', analysis: { summary: 42 } }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(
    () => getLiveClaimAnalysis('CLM-1847'),
    (error: unknown) => error instanceof LiveClaimAnalysisError && /invalid data/.test(error.message),
  );
});

test('rejects live output that attempts to include a risk score', async () => {
  const payload = liveResponse() as ReturnType<typeof liveResponse> & { analysis: ReturnType<typeof liveResponse>['analysis'] & { risk_score?: number } };
  payload.analysis.risk_score = 99;
  globalThis.fetch = async () => new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(
    () => getLiveClaimAnalysis('CLM-2205'),
    (error: unknown) => error instanceof LiveClaimAnalysisError && /invalid data/.test(error.message),
  );
});