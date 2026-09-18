import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { Writable } from "node:stream";
import test from "node:test";
import pino from "pino";
import type { ClaimAnalysisStore } from "./claim-analysis";

process.env.DATABASE_URL ??=
  "postgresql://claim-analysis-tests:claim-analysis-tests@127.0.0.1:1/claim-analysis-tests";
process.env.SUPABASE_URL = "https://supabase.example.test/";
process.env.SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";

const { createApp } = await import("../app");
const httpFetch = globalThis.fetch;

type AnalysisResponse = {
  source: "live_ai";
  claim_id: string;
  analysis: {
    predicted_issue: string | null;
    summary: string;
    signals: Array<{
      signal: string;
      severity: "low" | "medium" | "high";
      evidence: string;
    }>;
    context_adjustments: Array<{
      factor: string;
      effect: "increases_concern" | "reduces_concern" | "neutral";
      evidence: string;
    }>;
    recommended_action: {
      action: string;
      urgency: "today" | "24_hours" | "this_week" | "none";
      owner: string;
      reason: string;
    } | null;
    draft_customer_message: string | null;
  };
};

type CacheEntry = {
  response: unknown;
  expiresAt: number;
};

type LockEntry = {
  ownerToken: string;
  leaseUntil: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

class InMemoryAnalysisStore {
  readonly cache = new Map<string, CacheEntry>();
  readonly locks = new Map<string, LockEntry>();
  readonly rateLimits = new Map<string, RateLimitEntry>();

  async query<T extends object = Record<string, unknown>>(
    queryText: string,
    values: unknown[] = [],
  ): Promise<{ rows: T[] }> {
    const query = queryText.replace(/\s+/g, " ").trim();

    if (query.startsWith("DELETE FROM claim_analysis_rate_limits")) {
      for (const [clientKey, entry] of this.rateLimits) {
        if (entry.resetAt <= Date.now()) {
          this.rateLimits.delete(clientKey);
        }
      }
      return { rows: [] };
    }

    if (query.startsWith("INSERT INTO claim_analysis_rate_limits")) {
      const clientKey = String(values[0]);
      const current = this.rateLimits.get(clientKey);
      const entry =
        current && current.resetAt > Date.now()
          ? { count: current.count + 1, resetAt: current.resetAt }
          : { count: 1, resetAt: Date.now() + 60_000 };
      this.rateLimits.set(clientKey, entry);
      return {
        rows: [{ count: entry.count, reset_at: new Date(entry.resetAt) } as T],
      };
    }

    if (query.startsWith("SELECT response FROM claim_analysis_cache")) {
      const entry = this.cache.get(String(values[0]));
      return entry && entry.expiresAt > Date.now()
        ? { rows: [{ response: entry.response } as T] }
        : { rows: [] };
    }

    if (query === "DELETE FROM claim_analysis_cache WHERE claim_id = $1") {
      this.cache.delete(String(values[0]));
      return { rows: [] };
    }

    if (query.startsWith("INSERT INTO claim_analysis_cache")) {
      this.cache.set(String(values[0]), {
        response: JSON.parse(String(values[1])),
        expiresAt: Date.now() + Number(values[2]),
      });
      return { rows: [] };
    }

    if (query.startsWith("DELETE FROM claim_analysis_cache WHERE claim_id IN")) {
      return { rows: [] };
    }

    if (query.startsWith("INSERT INTO claim_analysis_locks")) {
      const claimId = String(values[0]);
      const current = this.locks.get(claimId);
      if (current && current.leaseUntil > Date.now()) {
        return { rows: [] };
      }
      this.locks.set(claimId, {
        ownerToken: String(values[1]),
        leaseUntil: Date.now() + Number(values[2]),
      });
      return { rows: [{ claim_id: claimId } as T] };
    }

    if (query.startsWith("DELETE FROM claim_analysis_locks")) {
      const claimId = String(values[0]);
      const current = this.locks.get(claimId);
      if (current?.ownerToken === String(values[1])) {
        this.locks.delete(claimId);
      }
      return { rows: [] };
    }

    throw new Error(`Unhandled test query: ${query}`);
  }

  seedCache(claimId: string, response: unknown, expiresAt = Date.now() + 60_000) {
    this.cache.set(claimId, { response, expiresAt });
  }

  expireCache(claimId: string) {
    const entry = this.cache.get(claimId);
    if (entry) {
      entry.expiresAt = Date.now() - 1;
    }
  }
}

function liveAnalysis(claimId: string): AnalysisResponse {
  return {
    source: "live_ai",
    claim_id: claimId,
    analysis: {
      predicted_issue: null,
      summary: "A validated analysis response.",
      signals: [
        {
          signal: "Long inactivity",
          severity: "low",
          evidence: "Nine days since the last update.",
        },
      ],
      context_adjustments: [
        {
          factor: "Customer-requested delay",
          effect: "reduces_concern",
          evidence: "The customer accepted the delay.",
        },
      ],
      recommended_action: {
        action: "Continue monitoring",
        urgency: "this_week",
        owner: "Claims handler",
        reason: "No immediate intervention is needed.",
      },
      draft_customer_message: null,
    },
  };
}

function createLogCapture() {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(String(chunk));
      callback();
    },
  });
  return { lines, logger: pino({ level: "info" }, stream) };
}

async function startTestServer(store: InMemoryAnalysisStore) {
  const logs = createLogCapture();
  const server = createServer(
    createApp({
      analysisStore: store as unknown as ClaimAnalysisStore,
      logger: logs.logger,
    }),
  );
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");

  return {
    logs,
    server,
    url: `http://127.0.0.1:${address.port}`,
  };
}

async function stopTestServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function postClaim(
  url: string,
  claimId: string,
  client = "198.51.100.10",
) {
  const response = await httpFetch(`${url}/api/claim-analysis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": client,
    },
    body: JSON.stringify({ claim_id: claimId }),
  });
  return {
    response,
    body: (await response.json()) as Record<string, unknown>,
  };
}

test("serves validated cache hits and fetches again after cache expiry", async () => {
  const store = new InMemoryAnalysisStore();
  const claimId = "CLM-CACHE-1";
  const cached = liveAnalysis(claimId);
  store.seedCache(claimId, cached);
  const upstreamCalls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    upstreamCalls.push(String(init?.body));
    return new Response(JSON.stringify(cached), { status: 200 });
  };
  const testServer = await startTestServer(store);

  try {
    const cacheHit = await postClaim(testServer.url, claimId);
    assert.equal(cacheHit.response.status, 200);
    assert.deepEqual(cacheHit.body, cached);
    assert.equal(upstreamCalls.length, 0);

    store.expireCache(claimId);
    const afterExpiry = await postClaim(testServer.url, claimId);
    assert.equal(afterExpiry.response.status, 200);
    assert.deepEqual(afterExpiry.body, cached);
    assert.equal(upstreamCalls.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await stopTestServer(testServer.server);
  }
});

test("shares one upstream request for concurrent requests for the same claim", async () => {
  const store = new InMemoryAnalysisStore();
  const claimId = "CLM-CONCURRENT-1";
  const upstreamResponse = liveAnalysis(claimId);
  let upstreamCalls = 0;
  let upstreamStarted!: () => void;
  const started = new Promise<void>((resolve) => {
    upstreamStarted = resolve;
  });
  let releaseUpstream!: () => void;
  const release = new Promise<void>((resolve) => {
    releaseUpstream = resolve;
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    upstreamStarted();
    await release;
    return new Response(JSON.stringify(upstreamResponse), { status: 200 });
  };
  const testServer = await startTestServer(store);

  try {
    const firstRequest = postClaim(testServer.url, claimId, "198.51.100.11");
    await started;
    const secondRequest = postClaim(testServer.url, claimId, "198.51.100.12");
    releaseUpstream();
    const [first, second] = await Promise.all([firstRequest, secondRequest]);

    assert.equal(first.response.status, 200);
    assert.equal(second.response.status, 200);
    assert.deepEqual(first.body, upstreamResponse);
    assert.deepEqual(second.body, upstreamResponse);
    assert.equal(upstreamCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    await stopTestServer(testServer.server);
  }
});

test("shows upstream failures and retries without caching the failure", async () => {
  const store = new InMemoryAnalysisStore();
  const claimId = "CLM-UPSTREAM-FAILURE";
  let upstreamCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return upstreamCalls === 1
      ? new Response("provider unavailable", { status: 503 })
      : new Response(JSON.stringify(liveAnalysis(claimId)), { status: 200 });
  };
  const testServer = await startTestServer(store);

  try {
    const failure = await postClaim(testServer.url, claimId);
    assert.equal(failure.response.status, 502);
    assert.deepEqual(failure.body, { error: "Live claim analysis failed." });
    assert.equal(store.cache.has(claimId), false);

    const retry = await postClaim(testServer.url, claimId);
    assert.equal(retry.response.status, 200);
    assert.deepEqual(retry.body, liveAnalysis(claimId));
    assert.equal(upstreamCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    await stopTestServer(testServer.server);
  }
});

test("shows malformed upstream responses and retries on the next request", async () => {
  const store = new InMemoryAnalysisStore();
  const claimId = "CLM-MALFORMED";
  let upstreamCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    upstreamCalls += 1;
    return upstreamCalls === 1
      ? new Response(JSON.stringify({ source: "live_ai", claim_id: claimId }), {
          status: 200,
        })
      : new Response(JSON.stringify(liveAnalysis(claimId)), { status: 200 });
  };
  const testServer = await startTestServer(store);

  try {
    const malformed = await postClaim(testServer.url, claimId);
    assert.equal(malformed.response.status, 502);
    assert.deepEqual(malformed.body, {
      error: "Live claim analysis returned invalid data.",
    });
    assert.equal(store.cache.has(claimId), false);

    const retry = await postClaim(testServer.url, claimId);
    assert.equal(retry.response.status, 200);
    assert.deepEqual(retry.body, liveAnalysis(claimId));
    assert.equal(upstreamCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    await stopTestServer(testServer.server);
  }
});

test("rate limits one client with Retry-After while another client remains allowed", async () => {
  const store = new InMemoryAnalysisStore();
  const claimId = "CLM-RATE-LIMIT";
  const upstreamResponse = liveAnalysis(claimId);
  let upstreamCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    upstreamCalls += 1;
    const request = JSON.parse(String(init?.body)) as { claim_id: string };
    return new Response(JSON.stringify(liveAnalysis(request.claim_id)), {
      status: 200,
    });
  };
  const testServer = await startTestServer(store);

  try {
    for (let requestNumber = 0; requestNumber < 20; requestNumber += 1) {
      const allowed = await postClaim(testServer.url, claimId);
      assert.equal(allowed.response.status, 200);
    }

    const limited = await postClaim(testServer.url, claimId);
    assert.equal(limited.response.status, 429);
    assert.match(limited.response.headers.get("Retry-After") ?? "", /^\d+$/);

    const otherClient = await postClaim(
      testServer.url,
      "CLM-RATE-LIMIT-OTHER",
      "198.51.100.20",
    );
    assert.equal(otherClient.response.status, 200);
    assert.equal(upstreamCalls, 2);
  } finally {
    globalThis.fetch = originalFetch;
    await stopTestServer(testServer.server);
  }
});

test("logs cache and rate outcomes without claim content or credentials", async () => {
  const store = new InMemoryAnalysisStore();
  const claimId = "CLM-PRIVATE-CONTENT-9f8b";
  const upstreamResponse = liveAnalysis(claimId);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify(upstreamResponse), { status: 200 });
  const testServer = await startTestServer(store);

  try {
    const result = await postClaim(testServer.url, claimId);
    assert.equal(result.response.status, 200);
    testServer.logs.logger.flush();
    const logs = testServer.logs.lines.join("");
    assert.match(logs, /"cacheOutcome":"validated"/);
    assert.match(logs, /"rateOutcome":"allowed"/);
    assert.doesNotMatch(logs, new RegExp(claimId));
    assert.doesNotMatch(logs, /test-publishable-key/);
    assert.doesNotMatch(logs, /Authorization|Bearer|apikey/i);
  } finally {
    globalThis.fetch = originalFetch;
    await stopTestServer(testServer.server);
  }
});