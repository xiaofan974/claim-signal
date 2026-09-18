import assert from 'node:assert/strict';
import test from 'node:test';
import type { Claim } from '../lib/claimsignal-types';
import { buildDeterministicClaimAnalysis, parseClaimAnalysis } from './claim-analysis';

function claim(overrides: Partial<Claim> = {}): Claim {
  return {
    id: 'CLM-TEST',
    claim_id: 'CLM-TEST',
    customer_name: 'Test customer',
    claim_type: 'Motor',
    lodgement_date: null,
    current_status: 'Open',
    assigned_handler: 'Claims handler',
    claim_amount_sgd: null,
    days_open: 2,
    days_since_last_update: 1,
    customer_contact_count: 0,
    missed_callback_count: 0,
    missed_sla_count: 0,
    documents_outstanding: 0,
    assessment_pending: false,
    sentiment: null,
    latest_customer_message: null,
    previous_risk_score: 39,
    risk_score: 61,
    risk_level: 'medium',
    main_signal: 'Assessment delay',
    predicted_issue: 'Delayed progression',
    recommended_action: 'Confirm assessment date',
    context_note: 'Assessment milestone is overdue.',
    mock_ai_analysis: null,
    intervention_status: null,
    created_at: null,
    updated_at: null,
    ...overrides,
  };
}

test('uses structured mock analysis when live AI is unavailable', () => {
  const parsed = parseClaimAnalysis({
    summary: 'Structured demo assessment.',
    signals: [{ signal: 'Delay', severity: 'medium', evidence: 'One milestone is overdue.' }],
    recommended_action: null,
    draft_customer_message: null,
  });

  assert.equal(parsed?.summary, 'Structured demo assessment.');
  assert.deepEqual(parsed?.context_adjustments, []);
});

test('builds a deterministic assessment without copying or changing risk values', () => {
  const sourceClaim = claim();
  const analysis = buildDeterministicClaimAnalysis(sourceClaim);

  assert.equal(analysis.predicted_issue, 'Delayed progression');
  assert.equal(analysis.signals[0]?.signal, 'Assessment delay');
  assert.equal(analysis.recommended_action?.action, 'Confirm assessment date');
  assert.equal('risk_score' in analysis, false);
  assert.equal(sourceClaim.risk_score, 61);
  assert.equal(sourceClaim.previous_risk_score, 39);
});