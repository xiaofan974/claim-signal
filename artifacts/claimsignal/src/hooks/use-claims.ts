import { useQuery } from '@tanstack/react-query';
import { getClaim, listClaimEvents, listClaims } from '@/services/claims';
import type { ClaimFilters } from '@/lib/claimsignal-types';

export function normalizeClaimFilters(filters: ClaimFilters = {}): Required<ClaimFilters> {
  return {
    search: filters.search?.trim() ?? '',
    risk: filters.risk?.trim() || 'all',
    claimType: filters.claimType?.trim() || 'all',
  };
}

export function useClaims(filters: ClaimFilters = {}) {
  const normalizedFilters = normalizeClaimFilters(filters);
  return useQuery({
    queryKey: ['claims', normalizedFilters],
    queryFn: () => listClaims(normalizedFilters),
    staleTime: 30000,
  });
}

export function useClaim(claimId: string) {
  return useQuery({ queryKey: ['claims', claimId], queryFn: () => getClaim(claimId), enabled: Boolean(claimId), staleTime: 30000 });
}

export function useClaimEvents(claimId: string) {
  return useQuery({ queryKey: ['claim-events', claimId], queryFn: () => listClaimEvents(claimId), enabled: Boolean(claimId), staleTime: 30000 });
}