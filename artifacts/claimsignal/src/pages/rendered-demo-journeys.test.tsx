import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Route, Router } from 'wouter';
import type { Claim, ClaimEvent, Intervention, LiveClaimAnalysisResponse } from '../lib/claimsignal-types';

Object.assign(globalThis, { React });
const { default: Dashboard } = await import('./dashboard');
const { default: ClaimDetail } = await import('./claim-detail');

function makeClaim(claimId: string, overrides: Partial<Claim>): Claim {
  return {
    id: claimId, claim_id: claimId, customer_name: 'Demo customer', claim_type: 'Motor',
    lodgement_date: '2026-08-25', current_status: 'Open', assigned_handler: 'Amelia Tan',
    claim_amount_sgd: 12000, days_open: 24, days_since_last_update: 4,
    customer_contact_count: 3, missed_callback_count: 0, missed_sla_count: 0,
    documents_outstanding: 0, assessment_pending: false, sentiment: null,
    latest_customer_message: null, previous_risk_score: null, risk_score: null,
    risk_level: null, main_signal: null, predicted_issue: null,
    recommended_action: null, context_note: null, mock_ai_analysis: null,
    intervention_status: null, created_at: null, updated_at: null, ...overrides,
  };
}

function makeEvent(claimId: string, title: string, detail: string, riskDelta: number | null = null): ClaimEvent {
  return {
    id: `${claimId}-${title}`, claim_id: claimId, event_date: '2026-09-18',
    event_type: 'operational', event_title: title, event_detail: detail,
    risk_delta: riskDelta, created_at: null,
  };
}

function makeIntervention(claimId: string): Intervention {
  return {
    id: `${claimId}-intervention`, claim_id: claimId, action_type: 'customer_contact',
    recommended_action: 'Call customer today', owner: 'Amelia Tan', urgency: 'today',
    due_date: '2026-09-18', reason: 'Prevent a complaint before escalation.',
    customer_message: 'I will call with an update today.', status: 'recommended',
    approved_at: null, created_at: null, updated_at: null,
  };
}

function renderDashboard(claims: Claim[], interventions: Intervention[]) {
  const client = new QueryClient();
  client.setQueryData(['claims', { search: '', risk: 'all', claimType: 'all' }], claims);
  client.setQueryData(['claim-types'], ['Home', 'Motor', 'Travel']);
  client.setQueryData(['interventions', 'recommended'], interventions);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Router ssrPath="/"><Dashboard /></Router>
    </QueryClientProvider>,
  );
}

function renderClaim(claim: Claim, events: ClaimEvent[], interventions: Intervention[] = [], liveAnalysis: LiveClaimAnalysisResponse | null = null) {
  const client = new QueryClient();
  client.setQueryData(['claims', claim.claim_id], claim);
  client.setQueryData(['claim-events', claim.claim_id], events);
  client.setQueryData(['interventions', 'all'], interventions);
  client.setQueryData(['live-claim-analysis', claim.claim_id], liveAnalysis);
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <Router ssrPath={`/claims/${claim.claim_id}`}>
        <Route path="/claims/:claimId"><ClaimDetail /></Route>
      </Router>
    </QueryClientProvider>,
  );
}

test('rendered dashboard shows actionable KPI labels and live recommended count', () => {
  const html = renderDashboard([
    makeClaim('CLM-1847', { risk_level: 'high', previous_risk_score: 42, risk_score: 78 }),
    makeClaim('CLM-0914', { risk_level: 'medium', previous_risk_score: 45, risk_score: 61 }),
    makeClaim('CLM-2205', { risk_level: 'low', previous_risk_score: 65, risk_score: 32 }),
  ], [makeIntervention('CLM-1847'), makeIntervention('CLM-0914')]);
  assert.match(html, /High-risk claims/);
  assert.match(html, /Claims with rising risk/);
  assert.match(html, /Interventions recommended/);
  assert.match(html, />2<\/span><span[^>]*>to review/);
});

test('rendered CLM-1847 journey shows risk change, operational evidence, structured AI, and intervention controls', () => {
  const claim = makeClaim('CLM-1847', {
    customer_name: 'Sarah Lim', previous_risk_score: 42, risk_score: 78, risk_level: 'high',
    mock_ai_analysis: {
      summary: 'Repeated missed callbacks and an overdue assessment create escalation risk.',
      signals: [{ signal: 'Missed callbacks', severity: 'high', evidence: 'Two promised callbacks were not completed.' }],
      recommended_action: { action: 'Call customer today', urgency: 'today', owner: 'Amelia Tan', reason: 'Prevent escalation.' },
      draft_customer_message: 'I will call with an update today.',
    },
  });
  const html = renderClaim(
    claim,
    [makeEvent('CLM-1847', 'Assessment overdue', 'External assessment remains pending.', 36)],
    [makeIntervention('CLM-1847')],
  );
  assert.match(html, /Current risk/);
  assert.match(html, /78 high/);
  assert.match(html, /Previous risk/);
  assert.match(html, />42</);
  assert.match(html, /Direction/);
  assert.match(html, /Increased/);
  assert.match(html, /Latest operational event/);
  assert.match(html, /Assessment overdue/);
  assert.match(html, /External assessment remains pending/);
  assert.match(html, /AI assessment based on the claim event record and current operational signals/);
  assert.match(html, /Demo assessment/);
  assert.doesNotMatch(html, /mock_ai_analysis/);
  assert.match(html, /Missed callbacks/);
  assert.match(html, /Two promised callbacks were not completed/);
  assert.match(html, /Prevent escalation/);
  assert.match(html, /Editable draft customer message/);
  assert.match(html, /Approve intervention/);
  assert.match(html, /Dismiss/);
});

test('rendered CLM-0914 journey explains pre-complaint operational delay', () => {
  const html = renderClaim(
    makeClaim('CLM-0914', {
      customer_name: 'James Tan', previous_risk_score: 39, risk_score: 61,
      risk_level: 'medium', customer_contact_count: 0, context_note: 'Customer has not complained.',
      mock_ai_analysis: {
        summary: 'The customer has not complained, but the claim is stalled and a service milestone has been missed.',
        signals: [
          { signal: 'Missed milestone', severity: 'high', evidence: 'The assessor milestone is overdue.' },
          { signal: 'No recent update', severity: 'medium', evidence: 'Six days since the last meaningful update.' },
        ],
        recommended_action: null,
        draft_customer_message: null,
      },
    }),
    [makeEvent('CLM-0914', 'Inspection delayed', 'Inspection booking is overdue.')],
  );
  assert.match(html, /61 medium/);
  assert.match(html, />39</);
  assert.match(html, /Customer contacts/);
  assert.match(html, /No contact yet/);
  assert.match(html, /Risk emerging before customer escalation/);
  assert.match(html, /Operational delay detected before customer escalation/);
  assert.match(html, /early-warning condition, not evidence that the customer has complained/);
  assert.match(html, /opportunity for proactive intervention before the customer needs to chase/);
  assert.match(html, /Prototype signal contribution/);
});

test('rendered CLM-2205 journey explains accepted delay and falling risk', () => {
  const html = renderClaim(
    makeClaim('CLM-2205', {
      customer_name: 'Mei Chen', previous_risk_score: 65, risk_score: 32,
      risk_level: 'low', days_since_last_update: 9,
      latest_customer_message: 'I’m still overseas, so no rush until I’m back next week.',
      mock_ai_analysis: {
        summary: 'The claim appears delayed.',
        signals: [{ signal: 'Long inactivity', severity: 'low', evidence: 'Nine days since the last operational update.' }],
        recommended_action: null,
        draft_customer_message: null,
      },
    }),
    [
      makeEvent('CLM-2205', 'Customer requested hold', 'Customer advised they were travelling and asked to pause processing.', -18),
      makeEvent('CLM-2205', 'Delay reaffirmed', 'Customer confirmed there was no urgency until return.', -15),
    ],
  );
  assert.match(html, /32 low/);
  assert.match(html, />65</);
  assert.match(html, /Decreased/);
  assert.match(html, /Customer context reduced apparent risk/);
  assert.match(html, /Delay is expected and customer-approved/);
  assert.match(html, /context reduces the significance of inactivity as an escalation signal/);
  assert.match(html, /Customer-requested hold/);
  assert.match(html, /Mitigating context/);
  assert.match(html, /No immediate intervention recommended/);
  assert.match(html, /Continue monitoring and resume processing on the agreed return date/);
  assert.match(html, /Resume claim processing on agreed date/);
  assert.match(html, /claims professional remains responsible/);
  assert.doesNotMatch(html, /No open recommendation is associated/);
});

test('live AI renders separately validated context without changing risk or intervention controls', () => {
  const claim = makeClaim('CLM-1847', {
    customer_name: 'Sarah Lim',
    previous_risk_score: 42,
    risk_score: 78,
    risk_level: 'high',
    customer_contact_count: 4,
    mock_ai_analysis: {
      summary: 'Demo fallback.',
      signals: [],
      recommended_action: null,
      draft_customer_message: null,
    },
  });
  const liveAnalysis: LiveClaimAnalysisResponse = {
    source: 'live_ai',
    claim_id: 'CLM-1847',
    analysis: {
      predicted_issue: 'Customer escalation',
      summary: 'Repeated contacts, missed callbacks, and a stalled assessment increase concern.',
      signals: [{ signal: 'Missed callbacks', severity: 'high', evidence: 'Two callbacks were missed.' }],
      context_adjustments: [{
        factor: 'Assessment inactivity',
        effect: 'increases_concern',
        evidence: 'The assessment remains stalled.',
      }],
      recommended_action: {
        action: 'Call customer today',
        urgency: 'today',
        owner: 'Amelia Tan',
        reason: 'Prevent escalation.',
      },
      draft_customer_message: 'We will call today.',
    },
  };

  const html = renderClaim(
    claim,
    [makeEvent('CLM-1847', 'Assessment overdue', 'External assessment remains pending.', 36)],
    [makeIntervention('CLM-1847')],
    liveAnalysis,
  );

  assert.match(html, /Live AI assessment/);
  assert.match(html, /Repeated contacts, missed callbacks, and a stalled assessment increase concern/);
  assert.match(html, /Context adjustments/);
  assert.match(html, /Increases concern/);
  assert.match(html, /78 high/);
  assert.match(html, />42</);
  assert.match(html, /Approve intervention/);
  assert.match(html, /Dismiss/);
});

test('live AI can render Mei Chen mitigating context without changing the risk decrease', () => {
  const claim = makeClaim('CLM-2205', {
    customer_name: 'Mei Chen',
    previous_risk_score: 65,
    risk_score: 32,
    risk_level: 'low',
    latest_customer_message: 'No rush until I return.',
  });
  const html = renderClaim(claim, [], [], {
    source: 'live_ai',
    claim_id: 'CLM-2205',
    analysis: {
      predicted_issue: null,
      summary: 'The customer-requested hold reduces current escalation concern.',
      signals: [{ signal: 'Inactivity', severity: 'low', evidence: 'The claim remains paused.' }],
      context_adjustments: [{
        factor: 'Customer-requested delay',
        effect: 'reduces_concern',
        evidence: 'The customer accepted the delay while travelling.',
      }],
      recommended_action: null,
      draft_customer_message: null,
    },
  });

  assert.match(html, /Live AI assessment/);
  assert.match(html, /Reduces concern/);
  assert.match(html, /32 low/);
  assert.match(html, />65</);
  assert.match(html, /Decreased/);
});