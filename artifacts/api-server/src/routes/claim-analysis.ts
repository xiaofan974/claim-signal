import { randomUUID } from "node:crypto";
import {
  Router,
  type IRouter,
  type Request,
  type Response,
} from "express";
import { pool } from "@workspace/db";
import { AnalyzeClaimBody, AnalyzeClaimResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const EDGE_FUNCTION_TIMEOUT_MS = 12_000;
const ANALYSIS_CACHE_TTL_MS = 60_000;
const ANALYSIS_LOCK_LEASE_MS = EDGE_FUNCTION_TIMEOUT_MS + 3_000;
const ANALYSIS_WAIT_TIMEOUT_MS = ANALYSIS_LOCK_LEASE_MS + 3_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_CACHED_ANALYSES = 1_000;
const STORE_POLL_INTERVAL_MS = 100;

type AnalyzeClaimResponseData = ReturnType<typeof AnalyzeClaimResponse.parse>;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

class ClaimAnalysisError extends Error {
  constructor(
    message: string,
    readonly kind: "upstream" | "invalid" | "timeout" | "request",
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "ClaimAnalysisError";
  }
}

class SharedStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SharedStoreError";
  }
}

function getClientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

async function consumeRateLimit(clientKey: string): Promise<RateLimitEntry> {
  try {
    await pool.query(
      "DELETE FROM claim_analysis_rate_limits WHERE reset_at <= NOW()",
    );
    const result = await pool.query<{
      count: number;
      reset_at: Date;
    }>(
      `
        INSERT INTO claim_analysis_rate_limits (client_key, count, reset_at)
        VALUES ($1, 1, NOW() + ($2 * INTERVAL '1 millisecond'))
        ON CONFLICT (client_key) DO UPDATE
        SET
          count = CASE
            WHEN claim_analysis_rate_limits.reset_at <= NOW() THEN 1
            ELSE claim_analysis_rate_limits.count + 1
          END,
          reset_at = CASE
            WHEN claim_analysis_rate_limits.reset_at <= NOW()
              THEN NOW() + ($2 * INTERVAL '1 millisecond')
            ELSE claim_analysis_rate_limits.reset_at
          END
        RETURNING count, reset_at
      `,
      [clientKey, RATE_LIMIT_WINDOW_MS],
    );
    const row = result.rows[0];
    if (!row) {
      throw new Error("The shared rate-limit store returned no row.");
    }
    return { count: row.count, resetAt: row.reset_at.getTime() };
  } catch (error) {
    throw new SharedStoreError("The shared rate-limit store is unavailable.", {
      cause: error,
    });
  }
}

async function getCachedAnalysis(
  claimId: string,
): Promise<AnalyzeClaimResponseData | null> {
  try {
    const result = await pool.query<{ response: unknown }>(
      `
        SELECT response
        FROM claim_analysis_cache
        WHERE claim_id = $1 AND expires_at > NOW()
      `,
      [claimId],
    );
    const row = result.rows[0];
    if (!row) {
      return null;
    }

    const parsed = AnalyzeClaimResponse.strict().safeParse(row.response);
    if (parsed.success) {
      return parsed.data;
    }

    await pool.query(
      "DELETE FROM claim_analysis_cache WHERE claim_id = $1",
      [claimId],
    );
    return null;
  } catch (error) {
    throw new SharedStoreError("The shared analysis cache is unavailable.", {
      cause: error,
    });
  }
}

async function cacheAnalysis(
  claimId: string,
  data: AnalyzeClaimResponseData,
): Promise<void> {
  try {
    await pool.query(
      `
        INSERT INTO claim_analysis_cache
          (claim_id, response, expires_at, updated_at)
        VALUES
          ($1, $2::jsonb,
           NOW() + ($3 * INTERVAL '1 millisecond'), NOW())
        ON CONFLICT (claim_id) DO UPDATE
        SET
          response = EXCLUDED.response,
          expires_at = EXCLUDED.expires_at,
          updated_at = EXCLUDED.updated_at
      `,
      [claimId, JSON.stringify(data), ANALYSIS_CACHE_TTL_MS],
    );
    await pool.query(
      `
        DELETE FROM claim_analysis_cache
        WHERE claim_id IN (
          SELECT claim_id
          FROM claim_analysis_cache
          ORDER BY updated_at DESC
          OFFSET $1
        )
      `,
      [MAX_CACHED_ANALYSES],
    );
  } catch (error) {
    throw new SharedStoreError("The shared analysis cache is unavailable.", {
      cause: error,
    });
  }
}

async function acquireAnalysisLock(
  claimId: string,
  ownerToken: string,
): Promise<boolean> {
  try {
    const result = await pool.query(
      `
        INSERT INTO claim_analysis_locks
          (claim_id, owner_token, lease_until)
        VALUES
          ($1, $2, NOW() + ($3 * INTERVAL '1 millisecond'))
        ON CONFLICT (claim_id) DO UPDATE
        SET
          owner_token = EXCLUDED.owner_token,
          lease_until = EXCLUDED.lease_until
        WHERE claim_analysis_locks.lease_until <= NOW()
        RETURNING claim_id
      `,
      [claimId, ownerToken, ANALYSIS_LOCK_LEASE_MS],
    );
    return result.rows.length > 0;
  } catch (error) {
    throw new SharedStoreError(
      "The shared analysis lock store is unavailable.",
      { cause: error },
    );
  }
}

async function releaseAnalysisLock(
  claimId: string,
  ownerToken: string,
): Promise<void> {
  try {
    await pool.query(
      `
        DELETE FROM claim_analysis_locks
        WHERE claim_id = $1 AND owner_token = $2
      `,
      [claimId, ownerToken],
    );
  } catch (error) {
    throw new SharedStoreError(
      "The shared analysis lock store is unavailable.",
      { cause: error },
    );
  }
}

function waitForStorePoll(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, STORE_POLL_INTERVAL_MS);
  });
}

async function fetchLiveAnalysis(
  claimId: string,
  config: { url: string; publishableKey: string },
): Promise<AnalyzeClaimResponseData> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    EDGE_FUNCTION_TIMEOUT_MS,
  );

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ claim_id: claimId }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ClaimAnalysisError("Live claim analysis failed.", "upstream");
    }

    const payload: unknown = await response.json();
    const parsed = AnalyzeClaimResponse.strict().safeParse(payload);
    if (!parsed.success || parsed.data.claim_id !== claimId) {
      throw new ClaimAnalysisError(
        "Live claim analysis returned invalid data.",
        "invalid",
      );
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof ClaimAnalysisError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new ClaimAnalysisError(
        "Live claim analysis timed out.",
        "timeout",
        {
          cause: error,
        },
      );
    }
    throw new ClaimAnalysisError("Live claim analysis failed.", "request", {
      cause: error,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function runLiveAnalysis(
  claimId: string,
  config: { url: string; publishableKey: string },
  ownerToken: string,
): Promise<AnalyzeClaimResponseData> {
  try {
    const data = await fetchLiveAnalysis(claimId, config);
    await cacheAnalysis(claimId, data);
    return data;
  } finally {
    await releaseAnalysisLock(claimId, ownerToken);
  }
}

async function getOrStartLiveAnalysis(
  claimId: string,
  config: { url: string; publishableKey: string },
): Promise<{
  promise: Promise<AnalyzeClaimResponseData>;
  shared: boolean;
}> {
  const ownerToken = randomUUID();
  if (await acquireAnalysisLock(claimId, ownerToken)) {
    return {
      promise: runLiveAnalysis(claimId, config, ownerToken),
      shared: false,
    };
  }

  const waitDeadline = Date.now() + ANALYSIS_WAIT_TIMEOUT_MS;
  while (Date.now() < waitDeadline) {
    const cached = await getCachedAnalysis(claimId);
    if (cached) {
      return { promise: Promise.resolve(cached), shared: true };
    }

    if (await acquireAnalysisLock(claimId, ownerToken)) {
      return {
        promise: runLiveAnalysis(claimId, config, ownerToken),
        shared: false,
      };
    }
    await waitForStorePoll();
  }

  throw new SharedStoreError(
    "Timed out waiting for shared claim analysis coordination.",
  );
}

function respondStoreUnavailable(
  req: Request,
  res: Response,
  error: unknown,
): void {
  req.log.error({ err: error }, "Shared claim analysis store unavailable");
  res.status(503).json({
    error: "Live claim analysis is temporarily unavailable.",
  });
}

router.post("/claim-analysis", async (req, res): Promise<void> => {
  const body = AnalyzeClaimBody.strict().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid claim_id is required." });
    return;
  }

  const clientKey = getClientKey(req);
  let rateLimit: RateLimitEntry;
  try {
    rateLimit = await consumeRateLimit(clientKey);
  } catch (error) {
    respondStoreUnavailable(req, res, error);
    return;
  }

  if (rateLimit.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((rateLimit.resetAt - Date.now()) / 1_000),
    );
    req.log.warn(
      { cacheOutcome: "not_checked", rateOutcome: "limited" },
      "Claim analysis request rate limited",
    );
    res.status(429).set("Retry-After", String(retryAfterSeconds)).json({
      error: "Too many live claim analysis requests. Try again shortly.",
    });
    return;
  }

  let cached: AnalyzeClaimResponseData | null;
  try {
    cached = await getCachedAnalysis(body.data.claim_id);
  } catch (error) {
    respondStoreUnavailable(req, res, error);
    return;
  }
  if (cached) {
    req.log.info(
      { cacheOutcome: "hit", rateOutcome: "allowed" },
      "Claim analysis served from cache",
    );
    res.json(cached);
    return;
  }

  const config = edgeFunctionConfig();
  if (!config) {
    req.log.error(
      { cacheOutcome: "miss", rateOutcome: "allowed" },
      "Supabase Edge Function configuration is unavailable",
    );
    res.status(502).json({ error: "Live claim analysis is unavailable." });
    return;
  }

  let analysis: Awaited<ReturnType<typeof getOrStartLiveAnalysis>>;
  try {
    analysis = await getOrStartLiveAnalysis(body.data.claim_id, config);
  } catch (error) {
    respondStoreUnavailable(req, res, error);
    return;
  }
  req.log.info(
    {
      cacheOutcome: analysis.shared ? "in_flight" : "miss",
      rateOutcome: "allowed",
    },
    analysis.shared
      ? "Claim analysis joined in-flight request"
      : "Claim analysis request started",
  );

  try {
    const data = await analysis.promise;
    req.log.info(
      { cacheOutcome: "validated", rateOutcome: "allowed" },
      "Claim analysis completed",
    );
    res.json(data);
  } catch (error) {
    if (error instanceof SharedStoreError) {
      respondStoreUnavailable(req, res, error);
      return;
    }
    if (error instanceof ClaimAnalysisError) {
      if (error.kind === "invalid") {
        req.log.warn(
          { cacheOutcome: "not_cached", rateOutcome: "allowed" },
          "Supabase claim analysis returned an invalid response",
        );
        res.status(502).json({ error: error.message });
        return;
      }
      if (error.kind === "timeout") {
        req.log.warn(
          { cacheOutcome: "not_cached", rateOutcome: "allowed" },
          "Supabase claim analysis timed out",
        );
        res.status(504).json({ error: error.message });
        return;
      }
      req.log.warn(
        { cacheOutcome: "not_cached", rateOutcome: "allowed" },
        "Supabase claim analysis request failed",
      );
      res.status(502).json({ error: error.message });
      return;
    }
    req.log.error(
      { cacheOutcome: "not_cached", rateOutcome: "allowed" },
      "Supabase claim analysis request failed",
    );
    res.status(502).json({ error: "Live claim analysis failed." });
  }
});

function edgeFunctionConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return supabaseUrl && publishableKey
    ? {
        url: `${supabaseUrl.replace(/\/$/, "")}/functions/v1/analyze-claim`,
        publishableKey,
      }
    : null;
}

export default router;