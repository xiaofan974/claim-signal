import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import React from 'react';
import { JSDOM } from 'jsdom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';
import type { Claim, Intervention } from '../lib/claimsignal-types';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
Object.assign(globalThis, {
  React,
  window: dom.window,
  document: dom.window.document,
  location: dom.window.location,
  history: dom.window.history,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  Event: dom.window.Event,
  MouseEvent: dom.window.MouseEvent,
  MutationObserver: dom.window.MutationObserver,
  getComputedStyle: dom.window.getComputedStyle,
  addEventListener: dom.window.addEventListener.bind(dom.window),
  removeEventListener: dom.window.removeEventListener.bind(dom.window),
  dispatchEvent: dom.window.dispatchEvent.bind(dom.window),
  IS_REACT_ACT_ENVIRONMENT: true,
});

const { cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react');
const { default: Dashboard } = await import('./dashboard');

afterEach(() => cleanup());

function makeClaim(claimId: string, customerName: string, handler: string, riskLevel: string, claimType: string): Claim {
  return {
    id: claimId,
    claim_id: claimId,
    customer_name: customerName,
    claim_type: claimType,
    lodgement_date: '2026-08-25',
    current_status: 'Open',
    assigned_handler: handler,
    claim_amount_sgd: 12000,
    days_open: 24,
    days_since_last_update: 4,
    customer_contact_count: 1,
    missed_callback_count: 0,
    missed_sla_count: 0,
    documents_outstanding: 0,
    assessment_pending: false,
    sentiment: null,
    latest_customer_message: null,
    previous_risk_score: riskLevel === 'high' ? 42 : 39,
    risk_score: riskLevel === 'high' ? 78 : 61,
    risk_level: riskLevel,
    main_signal: 'Operational delay',
    predicted_issue: null,
    recommended_action: null,
    context_note: null,
    mock_ai_analysis: null,
    intervention_status: null,
    created_at: null,
    updated_at: null,
  };
}

const sarah = makeClaim('CLM-1847', 'Sarah Lim', 'Amelia Tan', 'high', 'Motor');
const james = makeClaim('CLM-0914', 'James Tan', 'Daniel Koh', 'medium', 'Home');
const leila = makeClaim('CLM-2327', 'Leila Hassan', 'Amelia Tan', 'high', 'Home');
const allClaims = [sarah, james, leila];

type Filters = { search: string; risk: string; claimType: string };

function seedClaims(client: QueryClient, filters: Filters, claims: Claim[]) {
  client.setQueryData(['claims', filters], claims);
}

function renderDashboard(seed: (client: QueryClient) => void) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  seedClaims(client, { search: '', risk: 'all', claimType: 'all' }, allClaims);
  client.setQueryData<string[]>(['claim-types'], ['Home', 'Motor']);
  client.setQueryData<Intervention[]>(['interventions', 'recommended'], []);
  seed(client);
  render(
    <QueryClientProvider client={client}>
      <Router ssrPath="/"><Dashboard /></Router>
    </QueryClientProvider>,
  );
  return client;
}

async function expectQueue(count: number, included: string[], excluded: string[] = []) {
  await waitFor(() => assert.equal(screen.getByTestId('queue-count').textContent, String(count)));
  for (const name of included) assert.ok(screen.getByText(name));
  for (const name of excluded) assert.equal(screen.queryByText(name), null);
}

test('claim ID, customer, and handler searches reach the matching queue state', async () => {
  renderDashboard((client) => {
    seedClaims(client, { search: 'CLM-1847', risk: 'all', claimType: 'all' }, [sarah]);
    seedClaims(client, { search: 'James Tan', risk: 'all', claimType: 'all' }, [james]);
    seedClaims(client, { search: 'Amelia Tan', risk: 'all', claimType: 'all' }, [sarah, leila]);
  });

  const search = screen.getByTestId('input-search-claims');
  fireEvent.change(search, { target: { value: 'CLM-1847' } });
  await expectQueue(1, ['Sarah Lim'], ['James Tan', 'Leila Hassan']);

  fireEvent.change(search, { target: { value: 'James Tan' } });
  await expectQueue(1, ['James Tan'], ['Sarah Lim', 'Leila Hassan']);

  fireEvent.change(search, { target: { value: 'Amelia Tan' } });
  await expectQueue(2, ['Sarah Lim', 'Leila Hassan'], ['James Tan']);
});

test('risk and claim-type selections update visible rows and queue count', async () => {
  renderDashboard((client) => {
    seedClaims(client, { search: '', risk: 'high', claimType: 'all' }, [sarah, leila]);
    seedClaims(client, { search: '', risk: 'high', claimType: 'Motor' }, [sarah]);
  });

  fireEvent.change(screen.getByTestId('select-filter-risk'), { target: { value: 'high' } });
  await expectQueue(2, ['Sarah Lim', 'Leila Hassan'], ['James Tan']);

  fireEvent.change(screen.getByTestId('select-filter-claim-type'), { target: { value: 'Motor' } });
  await expectQueue(1, ['Sarah Lim'], ['James Tan', 'Leila Hassan']);
});

test('a claim type introduced by the data source is available and filters the queue', async () => {
  const cyber = makeClaim('CLM-3010', 'Priya Nair', 'Daniel Koh', 'medium', 'Cyber');
  renderDashboard((client) => {
    client.setQueryData<string[]>(['claim-types'], ['Cyber', 'Home', 'Motor']);
    seedClaims(client, { search: '', risk: 'all', claimType: 'Cyber' }, [cyber]);
  });

  const claimType = screen.getByTestId('select-filter-claim-type') as HTMLSelectElement;
  assert.ok([...claimType.options].some((option) => option.value === 'Cyber'));
  fireEvent.change(claimType, { target: { value: 'Cyber' } });
  await expectQueue(1, ['Priya Nair'], ['Sarah Lim', 'James Tan', 'Leila Hassan']);
});

test('clearing an empty result restores the original queue', async () => {
  renderDashboard((client) => {
    seedClaims(client, { search: 'missing claim', risk: 'all', claimType: 'all' }, []);
  });

  fireEvent.change(screen.getByTestId('input-search-claims'), { target: { value: 'missing claim' } });
  await waitFor(() => assert.ok(screen.getByText('No claims match these filters')));
  assert.equal(screen.getByTestId('queue-count').textContent, '0');

  fireEvent.click(screen.getByTestId('button-clear-filters'));
  await expectQueue(3, ['Sarah Lim', 'James Tan', 'Leila Hassan']);
});