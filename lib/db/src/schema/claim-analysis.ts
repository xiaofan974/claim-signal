import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const claimAnalysisCacheTable = pgTable("claim_analysis_cache", {
  claimId: text("claim_id").primaryKey(),
  response: jsonb("response").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
});

export const claimAnalysisLocksTable = pgTable("claim_analysis_locks", {
  claimId: text("claim_id").primaryKey(),
  ownerToken: text("owner_token").notNull(),
  leaseUntil: timestamp("lease_until", { withTimezone: true }).notNull(),
});

export const claimAnalysisRateLimitsTable = pgTable(
  "claim_analysis_rate_limits",
  {
    clientKey: text("client_key").primaryKey(),
    count: integer("count").notNull(),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
);