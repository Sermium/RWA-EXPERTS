// rwa-mobile/hooks/useDeals.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsApi } from '../lib/api';

export function useDeals(params?: { status?: string; page?: number }) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => dealsApi.getAll(params).then(res => res.data),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deal', id],
    queryFn: () => dealsApi.getById(id).then(res => res.data),
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => dealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useUpdateDealStage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: string }) => 
      dealsApi.updateStage(id, stage),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deal', id] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}
