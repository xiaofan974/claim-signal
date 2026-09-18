import { Router, type IRouter, type Request } from "express";
import { AnalyzeClaimBody, AnalyzeClaimResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const EDGE_FUNCTION_TIMEOUT_MS = 12_000;
const ANALYSIS_CACHE_TTL_MS = 60_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const MAX_RATE_LIMIT_CLIENTS = 10_000;
const MAX_CACHED_ANALYSES = 1_000;

type AnalyzeClaimResponseData = ReturnType<typeof AnalyzeClaimResponse.parse>;

type CacheEntry = {
  data: AnalyzeClaimResponseData;
  expiresAt: number;
};

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

const analysisCache = new Map<string, CacheEntry>();
const inFlightAnalyses = new Map<string, Promise<AnalyzeClaimResponseData>>();
const rateLimitEntries = new Map<string, RateLimitEntry>();

function getClientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function consumeRateLimit(clientKey: string, now = Date.now()): RateLimitEntry {
  const existing = rateLimitEntries.get(clientKey);
  if (!existing || existing.resetAt <= now) {
    const entry = { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS };
    rateLimitEntries.set(clientKey, entry);
    trimRateLimitEntries(now);
    return entry;
  }

  existing.count += 1;
  return existing;
}

function trimRateLimitEntries(now: number): void {
  for (const [key, entry] of rateLimitEntries) {
    if (entry.resetAt <= now) {
      rateLimitEntries.delete(key);
    }
  }

  if (rateLimitEntries.size <= MAX_RATE_LIMIT_CLIENTS) {
    return;
  }

  const oldest = [...rateLimitEntries.entries()]
    .sort(([, left], [, right]) => left.resetAt - right.resetAt)
    .slice(0, rateLimitEntries.size - MAX_RATE_LIMIT_CLIENTS);
  for (const [key] of oldest) {
    rateLimitEntries.delete(key);
  }
}

function getCachedAnalysis(
  claimId: string,
  now = Date.now(),
): AnalyzeClaimResponseData | null {
  const entry = analysisCache.get(claimId);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= now) {
    analysisCache.delete(claimId);
    return null;
  }

  return entry.data;
}

function cacheAnalysis(
  claimId: string,
  data: AnalyzeClaimResponseData,
  now = Date.now(),
): void {
  analysisCache.delete(claimId);
  analysisCache.set(claimId, {
    data,
    expiresAt: now + ANALYSIS_CACHE_TTL_MS,
  });

  while (analysisCache.size > MAX_CACHED_ANALYSES) {
    const oldestClaimId = analysisCache.keys().next().value;
    if (oldestClaimId === undefined) {
      break;
    }
    analysisCache.delete(oldestClaimId);
  }
}

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

function getOrStartLiveAnalysis(
  claimId: string,
  config: { url: string; publishableKey: string },
): { promise: Promise<AnalyzeClaimResponseData>; shared: boolean } {
  const existing = inFlightAnalyses.get(claimId);
  if (existing) {
    return { promise: existing, shared: true };
  }

  const promise = fetchLiveAnalysis(claimId, config)
    .then((data) => {
      cacheAnalysis(claimId, data);
      return data;
    })
    .finally(() => {
      inFlightAnalyses.delete(claimId);
    });

  inFlightAnalyses.set(claimId, promise);
  return { promise, shared: false };
}

router.post("/claim-analysis", async (req, res): Promise<void> => {
  const body = AnalyzeClaimBody.strict().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid claim_id is required." });
    return;
  }

  const clientKey = getClientKey(req);
  const rateLimit = consumeRateLimit(clientKey);
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

  const cached = getCachedAnalysis(body.data.claim_id);
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

  const analysis = getOrStartLiveAnalysis(body.data.claim_id, config);
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

export default router;
