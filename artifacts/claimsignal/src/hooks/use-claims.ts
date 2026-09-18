import { useQuery } from '@tanstack/react-query';
import { getClaim, listClaimEvents, listClaims } from '@/services/claims';
import type { ClaimFilters } from '@/lib/claimsignal-types';

export function useClaims(filters: ClaimFilters) {
  return useQuery({ queryKey: ['claims', filters], queryFn: () => listClaims(filters), staleTime: 30000 });
}

export function useClaim(claimId: string) {
  return useQuery({ queryKey: ['claims', claimId], queryFn: () => getClaim(claimId), enabled: Boolean(claimId), staleTime: 30000 });
}

export function useClaimEvents(claimId: string) {
  return useQuery({ queryKey: ['claim-events', claimId], queryFn: () => listClaimEvents(claimId), enabled: Boolean(claimId), staleTime: 30000 });
}