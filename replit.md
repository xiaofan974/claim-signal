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
- AI analysis is structured mock data for V1, parsed defensively with deterministic evidence-based fallback.
- Scheduling or dismissing an intervention updates both its audit record and the claim summary; no communication is sent.

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
