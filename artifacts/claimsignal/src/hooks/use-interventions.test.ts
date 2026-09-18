import assert from 'node:assert/strict';
import test from 'node:test';
import { saveInterventionDecision } from '../lib/intervention-decision';

test('approval schedules and timestamps the intervention before updating the claim status', async () => {
  const calls: unknown[] = [];
  await saveInterventionDecision(
    { id: 'intervention-1', claimId: 'CLM-1847', status: 'scheduled', customerMessage: 'Reviewed draft' },
    {
      now: () => '2026-09-18T10:00:00.000Z',
      updateIntervention: async (id, body) => {
        calls.push(['intervention', id, body]);
        return {} as never;
      },
      updateClaimInterventionStatus: async (claimId, status) => {
        calls.push(['claim', claimId, status]);
        return {} as never;
      },
    },
  );
  assert.deepEqual(calls, [
    ['intervention', 'intervention-1', {
      status: 'scheduled',
      approved_at: '2026-09-18T10:00:00.000Z',
      customer_message: 'Reviewed draft',
    }],
    ['claim', 'CLM-1847', 'scheduled'],
  ]);
});