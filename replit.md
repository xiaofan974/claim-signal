# ClaimSignal

AI-powered early warning and human-reviewed intervention planning for insurance claims operations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm --filter @workspace/claimsignal run dev` — run the ClaimSignal web app through its managed workflow
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required app env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- ClaimSignal data: existing external Supabase tables (`claims`, `claim_events`, `interventions`)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/claimsignal/src/pages/` — dashboard, claim detail, interventions, and product explanation
- `artifacts/claimsignal/src/services/` — Supabase data access, defensive AI parsing, and prototype risk rules
- `artifacts/claimsignal/src/hooks/` — React Query queries and intervention mutations
- `artifacts/claimsignal/src/index.css` — application theme and motion

## Architecture decisions

- Existing Supabase seed data is the demo source of truth; the prototype risk calculator never overwrites curated scores.
- Live AI analysis is generated through the application API server and a Supabase Edge Function, using structured OpenAI output and Zod validation. If live analysis is unavailable or invalid, the application falls back to stored `mock_ai_analysis`, then to a deterministic claim-record assessment. The AI layer cannot modify risk scores or risk levels.
- Scheduling or dismissing an intervention updates both its audit record and the claim summary; no communication is sent.
- Live claim-analysis protection uses PostgreSQL as its shared store so it remains consistent when API instances are scaled horizontally:
  - Validated analysis responses are cached in `claim_analysis_cache` for 60 seconds.
  - `claim_analysis_locks` uses a 15-second lease and polling so concurrent instances share one upstream request; an abandoned lease can be taken over.
  - `claim_analysis_rate_limits` stores one counter per client key and resets after 60 seconds.
  - Shared-store failures fail closed with HTTP 503 rather than falling back to process-local state and bypassing protection. Upstream failures retain their normal 502/504 responses.
  - The tables are part of the Drizzle schema and must be applied with the normal database push/publish flow.

## Product

- Prioritized attention queue with claim/risk/type filters
- Risk-change explanation and claim event timeline
- Human-reviewed preventative intervention scheduling and dismissal
- Transparent prototype methodology and proposed production metrics

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Supabase table access is intentionally anonymous for this synthetic portfolio prototype and is not production-ready.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
