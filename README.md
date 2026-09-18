# ClaimSignal

**Know which claims are going wrong before your customers have to tell you.**

AI-native claims early warning · Context-aware reasoning · Human-in-the-loop

ClaimSignal is a portfolio prototype exploring whether claims teams can identify emerging operational risk before customer dissatisfaction becomes explicit.

> Synthetic insurance claims data. Prototype risk rules. Not a production claims-risk model.

## The problem

Claims operations often detect dissatisfaction only after a customer complains, escalates, or repeatedly asks for an update. By then, the underlying delay or communication failure has already damaged the customer experience.

ClaimSignal explores an earlier intervention point: operational signals such as stalled milestones, missed updates, repeated contacts, and accepted delays that can reveal a deteriorating claim before dissatisfaction becomes explicit.

## Product hypothesis

If claims teams can combine deterministic operational risk with concise, context-aware AI reasoning, they can:

- identify claims that need attention sooner;
- understand which events are driving concern;
- distinguish genuine deterioration from explainable delay; and
- review a preventative action while a human still controls the decision.

The prototype separates risk calculation from AI interpretation. Risk scores remain authoritative inputs from deterministic rules; AI explains the claim context and recommends what an operator should review next.

## Three demo scenarios

### Sarah — clear deterioration

- Risk rises from **42 → 78**
- Current level: **High**
- Operational evidence indicates a deteriorating journey
- ClaimSignal surfaces the risk change, supporting signals, and a proposed intervention for review

### James — intervene before a complaint

- Risk rises from **39 → 61**
- Current level: **Medium**
- Customer contacts: **0**
- The claim is operationally delayed even though the customer has not complained
- ClaimSignal identifies an opportunity for proactive follow-up before James needs to chase

### Mei — context reduces concern

- Risk falls from **65 → 32**
- Current level: **Low**
- The customer has explained that the delay is acceptable
- AI returns `reduces_concern` context adjustments that explain why inactivity should not be treated as deterioration
- No immediate intervention is recommended

Together, these scenarios test three different product judgments: obvious deterioration, pre-complaint operational risk, and mitigating context.

## Product design principle

**Use AI to explain context, not to invent risk.**

ClaimSignal treats structured claim data and deterministic risk rules as authoritative. The AI layer can summarize evidence, identify signals, describe context adjustments, recommend a next step, and draft an optional customer message. It cannot overwrite the underlying risk result.

This keeps the interface explainable: operators can compare the score change, claim events, contextual reasoning, and recommendation without treating a language model as the source of truth.

## Human-in-the-loop by design

AI recommendations are decision support, not automated claim actions.

- **AI cannot modify `risk_score` or `risk_level`.**
- A claims professional must approve an intervention before it is scheduled.
- ClaimSignal does not automatically contact the customer.
- Dismissed and approved recommendations remain part of the intervention workflow.
- The final operational decision stays with the human reviewer.

## Architecture

The current live-analysis path is:

```text
React frontend
    ↓
Application API server
    ↓
Supabase Edge Function
    ↓
OpenAI structured output
    ↓
Zod validation
    ↓
AI Assessment UI
```

The browser sends only the claim identifier to the application API. The API server invokes the deployed Edge Function, which re-fetches authoritative claim and event data before requesting structured analysis. The returned payload is validated before it reaches the assessment interface.

This boundary keeps privileged AI and service credentials out of public browser code.

## Resilience and fallback

ClaimSignal is designed to remain useful when live analysis is unavailable:

```text
Live AI
    ↓ unavailable or invalid
mock_ai_analysis
    ↓ unavailable or invalid
deterministic claim-record assessment
```

The UI first uses validated live analysis. If the live request times out, fails, or returns malformed output, it falls back to the claim's stored `mock_ai_analysis`. If neither AI source is usable, the frontend builds a deterministic assessment from the authoritative claim record.

Fallback analysis preserves the existing risk values rather than attempting to reproduce or replace the risk model.

## Structured AI output

Live analysis is constrained to a structured response that can include:

- an assessment summary;
- operational signals and supporting evidence;
- context adjustments such as `increases_concern` or `reduces_concern`;
- a recommended intervention;
- the reasoning behind that recommendation; and
- an optional draft customer message.

Zod validation rejects malformed responses and any output that attempts to include forbidden risk fields. This gives the UI a predictable contract and prevents free-form model output from silently changing application behavior.

## Reliability safeguards

The live-analysis route includes safeguards for both correctness and responsible API use:

- validated responses are cached for a bounded period;
- concurrent requests for the same claim share one upstream analysis request;
- cache and in-flight coordination remain consistent across server instances;
- failed or malformed responses are not treated as valid analysis;
- transient upstream failures can be retried;
- per-client rate limiting returns a controlled response with `Retry-After`;
- logs record operational outcomes without claim content or credentials; and
- frontend validation independently rejects live output that attempts to modify risk.

The ClaimSignal frontend suite has **28 passing tests**, covering the three demo journeys, deterministic fallback, structured-output validation, intervention decisions, filtering, rendered states, and the invariant that AI cannot change risk.

Additional API-server tests cover caching, concurrent request coalescing, malformed output, retries, rate limiting, and safe logging.

## What I deliberately did not build

This is a focused portfolio prototype, not a production claims platform. I deliberately did not build:

- a trained or actuarially validated claims-risk model;
- automated claim decisions or customer contact;
- ingestion from a live insurer policy or claims platform;
- production identity, organization tenancy, or role-based access control;
- handling for real regulated customer information;
- a complete case-management or workflow engine;
- model evaluation, prompt experimentation, or production observability tooling; or
- production-grade governance, compliance, and audit controls.

Keeping these boundaries explicit makes it easier to evaluate the product hypothesis without overstating what the prototype proves.

## What I would test next

The next validation work would focus on whether the product improves real operational decisions:

- Do claims professionals agree with the deterministic risk signals?
- Does the AI explanation help reviewers understand a claim faster?
- Can reviewers reliably distinguish increasing concern from mitigating context?
- Which recommendations are approved, edited, or dismissed, and why?
- Does proactive intervention reduce repeat contact or formal complaints?
- How often does live AI add value beyond deterministic fallback?
- What false-positive rate is acceptable for an operational queue?
- How should the system behave across different claim types, teams, and service standards?
- Can structured outputs remain stable across model and prompt changes?

## Running locally

### Prerequisites

- Node.js
- pnpm
- A PostgreSQL database
- A Supabase project containing the prototype claim data and deployed analysis Edge Function

### Install dependencies

```bash
pnpm install
```

### Configure environment variables

Create a local `.env` file or configure the variables through your environment. Do not commit secret values.

```bash
DATABASE_URL=
SUPABASE_URL=
SUPABASE_PUBLISHABLE_KEY=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

The OpenAI credential belongs in the server-side Supabase Edge Function environment. It must never be exposed through a `VITE_*` variable or committed to this repository.

### Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

### Start the ClaimSignal frontend

In a second terminal:

```bash
pnpm --filter @workspace/claimsignal run dev
```

### Run checks

```bash
pnpm run typecheck
pnpm --filter @workspace/claimsignal run test
pnpm --filter @workspace/api-server run test
pnpm run build
```

## Security notes

- All included claim records are synthetic.
- The risk rules are prototype logic and must not be used for real claim decisions.
- OpenAI keys, database credentials, Supabase service-role keys, and other privileged credentials must remain server-side.
- Only publishable/anonymous Supabase credentials may be used by the browser, protected by appropriate Row Level Security policies.
- The application API accepts a claim identifier and performs privileged orchestration away from the browser.
- Live AI output is schema-validated before display.
- AI cannot set or modify `risk_score` or `risk_level`.
- Human approval is required before an intervention is scheduled.
- A production system would require authenticated users, organization-level authorization, least-privilege policies, audit logging, abuse controls, monitoring, privacy review, and controls appropriate for regulated customer information.
