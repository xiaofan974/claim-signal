import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listInterventions, updateIntervention } from '@/services/interventions';
import { updateClaimInterventionStatus } from '@/services/claims';
import {
  invalidateInterventionCaches,
  saveInterventionDecision,
  type DecisionDependencies,
  type DecisionInput,
} from '@/lib/intervention-decision';

const decisionDependencies: DecisionDependencies = {
  updateIntervention,
  updateClaimInterventionStatus,
  now: () => new Date().toISOString(),
};

export function useInterventions(status = 'all') {
  return useQuery({ queryKey: ['interventions', status], queryFn: () => listInterventions(status), staleTime: 30000 });
}

export function useUpdateIntervention() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DecisionInput>({
    mutationFn: async (variables) => {
      await saveInterventionDecision(variables, decisionDependencies);
    },
    onSuccess: (_data, variables) => {
      invalidateInterventionCaches((options) => queryClient.invalidateQueries(options), variables.claimId);
    },
  });
}