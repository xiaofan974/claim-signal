import { useQuery } from '@tanstack/react-query';
import { getLiveClaimAnalysis } from '@/services/live-claim-analysis';

export function useLiveClaimAnalysis(claimId: string) {
  return useQuery({
    queryKey: ['live-claim-analysis', claimId],
    queryFn: () => getLiveClaimAnalysis(claimId),
    enabled: Boolean(claimId),
    retry: false,
    staleTime: 300000,
  });
}