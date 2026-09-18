import assert from 'node:assert/strict';
import test from 'node:test';
import { buildClaimsQuery, normalizeClaimTypes } from './claims';

function queryValues(query: string) {
  return new URLSearchParams(query.slice(1));
}

test('builds the expected query inputs for search, risk, and claim type', () => {
  const params = queryValues(buildClaimsQuery({
    search: 'CLM-1847',
    risk: 'high',
    claimType: 'Motor',
  }));

  assert.equal(params.get('risk_level'), 'eq.high');
  assert.equal(params.get('claim_type'), 'eq.Motor');
  assert.equal(
    params.get('or'),
    '(claim_id.ilike.*CLM-1847*,customer_name.ilike.*CLM-1847*,assigned_handler.ilike.*CLM-1847*)',
  );
});

test('treats blank and cleared filters as the unfiltered queue', () => {
  const blank = queryValues(buildClaimsQuery({
    search: '   ',
    risk: 'all',
    claimType: 'all',
  }));
  const cleared = queryValues(buildClaimsQuery());

  assert.equal(blank.get('risk_level'), null);
  assert.equal(blank.get('claim_type'), null);
  assert.equal(blank.get('or'), null);
  assert.equal(blank.toString(), cleared.toString());
});

test('searches claim ID, customer name, and assigned handler together', () => {
  const params = queryValues(buildClaimsQuery({ search: 'Amelia Tan' }));
  const search = params.get('or') ?? '';

  assert.match(search, /claim_id\.ilike\.\*Amelia Tan\*/);
  assert.match(search, /customer_name\.ilike\.\*Amelia Tan\*/);
  assert.match(search, /assigned_handler\.ilike\.\*Amelia Tan\*/);
});

test('claim type options are derived, trimmed, deduplicated, and sorted from claim data', () => {
  assert.deepEqual(normalizeClaimTypes([
    { claim_type: 'Travel' },
    { claim_type: ' Motor ' },
    { claim_type: 'Cyber' },
    { claim_type: 'Motor' },
    { claim_type: '' },
  ]), ['Cyber', 'Motor', 'Travel']);
});