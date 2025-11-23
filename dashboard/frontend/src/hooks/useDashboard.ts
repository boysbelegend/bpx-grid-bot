/**
 * Dashboard Hook
 * Main hook for accessing dashboard state
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import api from '../api/client';
import { wsClient } from '../api/websocket';
import type { DashboardState } from '../types';

export function useDashboard() {
  const queryClient = useQueryClient();
  const [wsConnected, setWsConnected] = useState(false);
  const [dashboardState, setDashboardState] = useState<Partial<DashboardState>>({});

  // Fetch initial state
  const { data: stateData, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard', 'state'],
    queryFn: async () => {
      const response = await api.getState();
      return response.data.data as DashboardState;
    },
    refetchInterval: 10000, // Fallback polling every 10s
  });

  // WebSocket connection
  useEffect(() => {
    wsClient.connect();

    const handleConnect = () => {
      console.log('Connected to WebSocket');
      setWsConnected(true);
    };

    const handleDisconnect = () => {
      console.log('Disconnected from WebSocket');
      setWsConnected(false);
    };

    const handleUpdate = (data: Partial<DashboardState>) => {
      // Merge WebSocket updates with current state
      setDashboardState((prev) => ({ ...prev, ...data }));

      // Update React Query cache
      queryClient.setQueryData(['dashboard', 'state'], (old: DashboardState | undefined) => {
        if (!old) return data;
        return { ...old, ...data };
      });
    };

    const handleError = (error: any) => {
      console.error('WebSocket error:', error);
    };

    wsClient.on('connect', handleConnect);
    wsClient.on('disconnect', handleDisconnect);
    wsClient.on('update', handleUpdate);
    wsClient.on('error', handleError);

    return () => {
      wsClient.off('connect', handleConnect);
      wsClient.off('disconnect', handleDisconnect);
      wsClient.off('update', handleUpdate);
      wsClient.off('error', handleError);
      wsClient.disconnect();
    };
  }, [queryClient]);

  // Merge fetched data with WebSocket updates
  const state = { ...stateData, ...dashboardState };

  return {
    state,
    isLoading,
    error,
    refetch,
    wsConnected,
  };
}

export function useEngineControl() {
  const queryClient = useQueryClient();

  const startMutation = useMutation({
    mutationFn: ({ strategyPath, dryRun }: { strategyPath: string; dryRun: boolean }) =>
      api.start(strategyPath, dryRun),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'state'] });
    },
  });

  const stopMutation = useMutation({
    mutationFn: (force: boolean = false) => api.stop(force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'state'] });
    },
  });

  const pauseMutation = useMutation({
    mutationFn: () => api.pause(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'state'] });
    },
  });

  const resumeMutation = useMutation({
    mutationFn: () => api.resume(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'state'] });
    },
  });

  return {
    start: startMutation.mutate,
    stop: stopMutation.mutate,
    pause: pauseMutation.mutate,
    resume: resumeMutation.mutate,
    isStarting: startMutation.isPending,
    isStopping: stopMutation.isPending,
    isPausing: pauseMutation.isPending,
    isResuming: resumeMutation.isPending,
  };
}

export function useStrategies() {
  return useQuery({
    queryKey: ['strategies'],
    queryFn: async () => {
      const response = await api.getStrategies();
      return response.data.data || [];
    },
  });
}
