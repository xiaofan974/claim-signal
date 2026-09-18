# ClaimSignal

ClaimSignal is an AI-powered early-warning system for insurance claims operations. It helps claims teams identify open claims at risk of escalating into complaints, understand why the risk is increasing, and review a preventative action before it is scheduled.

## Product

ClaimSignal answers: “Which claims need attention today, why, and what should we do next?”

## Problem

Claims systems often react after customer friction has already become a complaint.

## Hypothesis

Operational precursors to complaints may be detectable earlier.

## Product bet

Identify deteriorating claim journeys and recommend a preventative intervention while keeping the final decision with a claims professional.

## Architecture

```text
React
  ↓
Service layer
  ↓
Supabase

claims
claim_events
interventions
```

V1 uses structured mock AI analysis stored in Supabase and renders it into an explainable review workflow. A future implementation could replace that source with an AI analysis service while keeping the same structured output and human approval boundary.

## Prototype security model

This demo uses synthetic claim data and anonymous Supabase access to remove authentication friction from the portfolio experience. A production implementation would require authenticated users, organization-level access controls, least-privilege RLS policies, audit logging and appropriate handling of regulated customer information.

The current access model is not production-ready.