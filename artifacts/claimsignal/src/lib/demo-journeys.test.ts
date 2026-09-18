import assert from 'node:assert/strict';
import test from 'node:test';
import type { Claim, ClaimEvent } from './claimsignal-types';
import { DASHBOARD_KPI_LABELS, getDashboardStats, getJourneyLearning, getRecommendedInterventionCount, INTERVENTION_CONTROL_LABELS } from './demo-journeys';
import { parseClaimAnalysis } from '../services/claim-analysis';
import { invalidateInterventionCaches } from './intervention-decision';

function claim(claimId: string, overrides: Partial<Claim>): Claim {
  return {
    id: claimId, claim_id: claimId, customer_name: '', claim_type: 'Motor',
    lodgement_date: null, current_status: 'Open', assigned_handler: 'Handler',
    claim_amount_sgd: null, days_open: 1, days_since_last_update: 1,
    customer_contact_count: 0, missed_callback_count: 0, missed_sla_count: 0,
    documents_outstanding: 0, assessment_pending: false, sentiment: null,
    latest_customer_message: null, previous_risk_score: null, risk_score: null,
    risk_level: null, main_signal: null, predicted_issue: null,
    recommended_action: null, context_note: null, mock_ai_analysis: null,
    intervention_status: null, created_at: null, updated_at: null, ...overrides,
  };
}

function event(claimId: string, title: string, detail: string): ClaimEvent {
  return { id: `${claimId}-event`, claim_id: claimId, event_date: '2026-09-18', event_type: 'operational', event_title: title, event_detail: detail, risk_delta: null, created_at: null };
}

test('dashboard keeps actionable KPI labels and counts live recommendations separately', () => {
  const claims = [
    claim('CLM-1847', { risk_level: 'high', previous_risk_score: 42, risk_score: 78, missed_callback_count: 2 }),
    claim('CLM-0914', { risk_level: 'medium', previous_risk_score: 45, risk_score: 61 }),
    claim('CLM-2205', { risk_level: 'low', previous_risk_score: 65, risk_score: 32 }),
  ];
  assert.deepEqual(DASHBOARD_KPI_LABELS, {
    atRisk: 'High-risk claims',
    rising: 'Claims with rising risk',
    interventions: 'Interventions recommended',
  });
  assert.deepEqual(getDashboardStats(claims), { atRisk: 1, rising: 2, callbacks: 2 });
  const recommendedInterventions = [{ status: 'recommended' }, { status: 'recommended' }];
  assert.equal(getRecommendedInterventionCount(recommendedInterventions as never), 2);
});

test('CLM-1847 preserves the 42 to 78 journey, operational evidence, and structured AI signals', () => {
  const primary = claim('CLM-1847', {
    previous_risk_score: 42,
    risk_score: 78,
    risk_level: 'high',
    mock_ai_analysis: {
      summary: 'Repeated missed callbacks and an overdue assessment create escalation risk.',
      signals: [{ signal: 'Missed callbacks', severity: 'high', evidence: 'Two promised callbacks were not completed.' }],
      recommended_action: { action: 'Call customer today', urgency: 'today', owner: 'Claims handler', reason: 'Prevent escalation.' },
      draft_customer_message: 'We will call you today.',
    },
  });
  const operationalEvent = event(primary.claim_id, 'Assessment overdue', 'The external assessment remains pending.');
  const analysis = parseClaimAnalysis(primary.mock_ai_analysis);
  assert.equal(primary.previous_risk_score, 42);
  assert.equal(primary.risk_score, 78);
  assert.equal(operationalEvent.event_type, 'operational');
  assert.match(operationalEvent.event_detail ?? '', /pending/);
  assert.equal(analysis?.signals[0]?.signal, 'Missed callbacks');
  assert.equal(analysis?.recommended_action?.action, 'Call customer today');
  assert.ok(analysis?.draft_customer_message);
  assert.deepEqual(INTERVENTION_CONTROL_LABELS, {
    prevent: 'Prevent escalation',
    approve: 'Approve intervention',
    dismiss: 'Dismiss',
  });
});

test('CLM-0914 identifies operational delay before a complaint', () => {
  const learning = getJourneyLearning(
    claim('CLM-0914', { previous_risk_score: 39, risk_score: 61, risk_level: 'medium', customer_contact_count: 0, context_note: 'Customer has not complained.' }),
    [event('CLM-0914', 'Inspection delayed', 'Inspection booking is overdue.')],
  );
  assert.equal(learning?.tone, 'warning');
  assert.equal(learning?.title, 'Operational delay detected before customer escalation');
  assert.equal(learning?.changeTitle, 'Risk emerging before customer escalation');
  assert.match(learning?.changeDetail ?? '', /has not contacted the insurer/);
  assert.match(learning?.assessmentSummary ?? '', /opportunity for proactive intervention/);
  assert.match(learning?.interventionReason ?? '', /prevent the customer from needing to chase/);
  assert.match(learning?.detail ?? '', /early-warning condition/);
});

test('CLM-2205 identifies accepted delay and falling risk', () => {
  const learning = getJourneyLearning(
    claim('CLM-2205', { previous_risk_score: 65, risk_score: 32, risk_level: 'low', days_since_last_update: 9, latest_customer_message: 'I’m still overseas, so no rush until I’m back next week.' }),
    [
      event('CLM-2205', 'Customer requested hold', 'Customer advised they were travelling and asked to pause processing.'),
      event('CLM-2205', 'Delay reaffirmed', 'Customer confirmed there was no urgency until return.'),
    ],
  );
  assert.equal(learning?.tone, 'positive');
  assert.equal(learning?.title, 'Delay is expected and customer-approved');
  assert.equal(learning?.changeTitle, 'Customer context reduced apparent risk');
  assert.match(learning?.detail ?? '', /not currently a strong escalation signal/);
  assert.match(learning?.assessmentSummary ?? '', /reduces the significance of inactivity/);
  assert.deepEqual(learning?.evidenceSignals?.map((signal) => signal.signal), ['Long inactivity', 'Customer-requested hold', 'Delay reaffirmed']);
  assert.equal(learning?.actionTitle, 'No immediate intervention recommended');
  assert.match(learning?.humanReviewCopy ?? '', /claims professional remains responsible/);
});

test('intervention decisions invalidate intervention, claim-list, and claim-detail caches', () => {
  const invalidated: string[][] = [];
  invalidateInterventionCaches(({ queryKey }) => invalidated.push(queryKey), 'CLM-1847');
  assert.deepEqual(invalidated, [['interventions'], ['claims'], ['claim', 'CLM-1847']]);
});