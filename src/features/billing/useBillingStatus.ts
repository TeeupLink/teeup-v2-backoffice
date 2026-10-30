import { useQuery } from '@tanstack/react-query';
import { billingStatusKey, fetchBillingStatus } from './api';

export function useBillingStatus() {
  return useQuery({ queryKey: billingStatusKey, queryFn: fetchBillingStatus, staleTime: 60_000 });
}
