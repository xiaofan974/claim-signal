import type { Intervention } from '@/lib/claimsignal-types';

export type DecisionInput = {
  id: string;
  claimId: string;
  status: 'scheduled' | 'dismissed';
  customerMessage?: string;
};

export type DecisionDependencies = {
  updateIntervention: (
    id: string,
    body: Partial<Pick<Intervention, 'status' | 'approved_at' | 'customer_message'>>,
  ) => Promise<unknown>;
  updateClaimInterventionStatus: (claimId: string, status: 'scheduled' | 'dismissed') => Promise<unknown>;
  now: () => string;
};

export async function saveInterventionDecision(
  { id, claimId, status, customerMessage }: DecisionInput,
  dependencies: DecisionDependencies,
) {
  await dependencies.updateIntervention(id, {
    status,
    ...(status === 'scheduled' ? { approved_at: dependencies.now() } : {}),
    ...(status === 'scheduled' && customerMessage !== undefined ? { customer_message: customerMessage } : {}),
  });
  await dependencies.updateClaimInterventionStatus(claimId, status);
}

export function invalidateInterventionCaches(
  invalidate: (options: { queryKey: string[] }) => unknown,
  claimId: string,
) {
  invalidate({ queryKey: ['interventions'] });
  invalidate({ queryKey: ['claims'] });
  invalidate({ queryKey: ['claim', claimId] });
}