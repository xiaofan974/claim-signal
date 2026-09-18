import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listInterventions, updateIntervention } from '@/services/interventions';
import { updateClaimInterventionStatus } from '@/services/claims';

export function useInterventions(status = 'all') {
  return useQuery({ queryKey: ['interventions', status], queryFn: () => listInterventions(status), staleTime: 30000 });
}

export function useUpdateIntervention() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, claimId, status, customerMessage }: { id: string; claimId: string; status: 'scheduled' | 'dismissed'; customerMessage?: string }) => {
      await updateIntervention(id, { status, ...(status === 'scheduled' ? { approved_at: new Date().toISOString() } : {}), ...(customerMessage ? { customer_message: customerMessage } : {}) });
      await updateClaimInterventionStatus(claimId, status);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interventions'] });
      queryClient.invalidateQueries({ queryKey: ['claims'] });
      queryClient.invalidateQueries({ queryKey: ['claim', variables.claimId] });
    },
  });
}