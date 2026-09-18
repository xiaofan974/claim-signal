import { Router, type IRouter } from "express";
import { AnalyzeClaimBody, AnalyzeClaimResponse } from "@workspace/api-zod";

const router: IRouter = Router();
const EDGE_FUNCTION_TIMEOUT_MS = 12_000;

function edgeFunctionConfig() {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  return supabaseUrl && publishableKey
    ? { url: `${supabaseUrl.replace(/\/$/, "")}/functions/v1/analyze-claim`, publishableKey }
    : null;
}

router.post("/claim-analysis", async (req, res): Promise<void> => {
  const body = AnalyzeClaimBody.strict().safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "A valid claim_id is required." });
    return;
  }

  const config = edgeFunctionConfig();
  if (!config) {
    req.log.error("Supabase Edge Function configuration is unavailable");
    res.status(502).json({ error: "Live claim analysis is unavailable." });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);

  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body.data),
      signal: controller.signal,
    });

    if (!response.ok) {
      req.log.warn({ edgeStatus: response.status }, "Supabase claim analysis failed");
      res.status(502).json({ error: "Live claim analysis failed." });
      return;
    }

    const payload: unknown = await response.json();
    const parsed = AnalyzeClaimResponse.strict().safeParse(payload);
    if (!parsed.success || parsed.data.claim_id !== body.data.claim_id) {
      req.log.warn(
        { issuePaths: parsed.success ? ["claim_id"] : parsed.error.issues.map((issue) => issue.path.join(".")) },
        "Supabase claim analysis returned an invalid response",
      );
      res.status(502).json({ error: "Live claim analysis returned invalid data." });
      return;
    }

    res.json(parsed.data);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      req.log.warn("Supabase claim analysis timed out");
      res.status(504).json({ error: "Live claim analysis timed out." });
      return;
    }
    req.log.error({ err: error }, "Supabase claim analysis request failed");
    res.status(502).json({ error: "Live claim analysis failed." });
  } finally {
    clearTimeout(timeout);
  }
});

export default router;