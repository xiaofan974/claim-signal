import { z } from 'zod';

export type RiskLevel = 'high' | 'medium' | 'low' | string;
export type InterventionStatus = 'recommended' | 'scheduled' | 'dismissed' | 'completed' | string;

export interface Claim {
  id: string;
  claim_id: string;
  customer_name: string;
  claim_type: string;
  lodgement_date: string | null;
  current_status: string;
  assigned_handler: string;
  claim_amount_sgd: number | null;
  days_open: number | null;
  days_since_last_update: number | null;
  customer_contact_count: number | null;
  missed_callback_count: number | null;
  missed_sla_count: number | null;
  documents_outstanding: number | null;
  assessment_pending: boolean | null;
  sentiment: string | null;
  latest_customer_message: string | null;
  previous_risk_score: number | null;
  risk_score: number | null;
  risk_level: RiskLevel | null;
  main_signal: string | null;
  predicted_issue: string | null;
  recommended_action: string | null;
  context_note: string | null;
  mock_ai_analysis: unknown;
  intervention_status: InterventionStatus | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClaimEvent {
  id: string;
  claim_id: string;
  event_date: string | null;
  event_type: string;
  event_title: string;
  event_detail: string | null;
  risk_delta: number | null;
  created_at: string | null;
}

export interface Intervention {
  id: string;
  claim_id: string;
  action_type: string;
  recommended_action: string;
  owner: string;
  urgency: string;
  due_date: string | null;
  reason: string | null;
  customer_message: string | null;
  status: InterventionStatus;
  approved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  claim?: Pick<Claim, 'claim_id' | 'customer_name' | 'claim_type' | 'risk_level' | 'risk_score'>;
}

export const claimAnalysisSchema = z.object({
  predicted_issue: z.string().nullable().optional(),
  summary: z.string(),
  signals: z.array(z.object({
    signal: z.string(),
    severity: z.enum(['low', 'medium', 'high']),
    evidence: z.string(),
  })).default([]),
  recommended_action: z.object({
    action: z.string(),
    urgency: z.enum(['today', '24_hours', 'this_week']),
    owner: z.string(),
    reason: z.string(),
  }).nullable().optional(),
  draft_customer_message: z.string().nullable().optional(),
});

export type ClaimAnalysis = z.infer<typeof claimAnalysisSchema>;

export interface ClaimFilters {
  risk?: string;
  claimType?: string;
  search?: string;
}