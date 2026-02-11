"use client";

import { useState, useCallback } from "react";
import { useAuth } from "./useAuth";
import { api, ApiError } from "@/lib/api";

interface ApiState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export function useApi<T>() {
  const { getToken } = useAuth();
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (apiCall: (token: string) => Promise<T>): Promise<T | null> => {
      setState({ data: null, isLoading: true, error: null });

      try {
        const token = await getToken();
        const data = await apiCall(token);
        setState({ data, isLoading: false, error: null });
        return data;
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.detail
            : "An unexpected error occurred";
        setState({ data: null, isLoading: false, error: message });
        return null;
      }
    },
    [getToken]
  );

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Convenience hooks for common API operations
export function useOrganizations() {
  const { getToken } = useAuth();
  const [state, setState] = useState<ApiState<unknown>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(
    async (params?: Record<string, string>) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const token = await getToken();
        const data = await api.getOrganizations(token, params);
        setState({ data, isLoading: false, error: null });
        return data;
      } catch (error) {
        const message =
          error instanceof ApiError ? error.detail : "Failed to fetch organizations";
        setState({ data: null, isLoading: false, error: message });
        return null;
      }
    },
    [getToken]
  );

  return { ...state, fetch };
}

export function useContacts() {
  const { getToken } = useAuth();
  const [state, setState] = useState<ApiState<unknown>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(
    async (params?: Record<string, string>) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const token = await getToken();
        const data = await api.getContacts(token, params);
        setState({ data, isLoading: false, error: null });
        return data;
      } catch (error) {
        const message =
          error instanceof ApiError ? error.detail : "Failed to fetch contacts";
        setState({ data: null, isLoading: false, error: message });
        return null;
      }
    },
    [getToken]
  );

  return { ...state, fetch };
}

export function useActivities() {
  const { getToken } = useAuth();
  const [state, setState] = useState<ApiState<unknown>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(
    async (params?: Record<string, string>) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const token = await getToken();
        const data = await api.getActivities(token, params);
        setState({ data, isLoading: false, error: null });
        return data;
      } catch (error) {
        const message =
          error instanceof ApiError ? error.detail : "Failed to fetch activities";
        setState({ data: null, isLoading: false, error: message });
        return null;
      }
    },
    [getToken]
  );

  return { ...state, fetch };
}

export function useTagSets() {
  const { getToken } = useAuth();
  const [state, setState] = useState<ApiState<unknown>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const fetch = useCallback(
    async (includeInactive = false) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));
      try {
        const token = await getToken();
        const data = await api.getTagSets(token, includeInactive);
        setState({ data, isLoading: false, error: null });
        return data;
      } catch (error) {
        const message =
          error instanceof ApiError ? error.detail : "Failed to fetch tag sets";
        setState({ data: null, isLoading: false, error: message });
        return null;
      }
    },
    [getToken]
  );

  return { ...state, fetch };
}
