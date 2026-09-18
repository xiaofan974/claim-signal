import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listInterventions, updateIntervention } from '@/services/interventions';

export function useInterventions(status = 'all') {
  return useQuery({ queryKey: ['interventions', status], queryFn: () => listInterventions(status), staleTime: 30000 });
}

export function useUpdateIntervention() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'scheduled' | 'dismissed' }) =>
      updateIntervention(id, { status, ...(status === 'scheduled' ? { approved_at: new Date().toISOString() } : {}) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['interventions'] }),
  });
}