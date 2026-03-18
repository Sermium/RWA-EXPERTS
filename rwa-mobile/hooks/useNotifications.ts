// hooks/useNotifications.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../lib/api';
import { router } from 'expo-router';

export function useNotifications(params?: { page?: number; unread?: boolean }) {
  return useQuery({
    queryKey: ['notifications', params],
    queryFn: () => notificationsApi.getAll(params).then(res => res.data).catch(() => ({ notifications: [], unreadCount: 0 })),
    refetchInterval: 30000,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useUnreadCount() {
  const { data } = useNotifications({ unread: true });
  return data?.unreadCount || 0;
}
