"use client";

import { useEffect, useState, useCallback } from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest, isDevMode } from "@/lib/msal-config";
import type { User } from "@/types";
import { api } from "@/lib/api";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export function useAuth() {
  const { instance, accounts, inProgress } = useMsal();
  const msalIsAuthenticated = useIsAuthenticated();
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    error: null,
  });

  // In dev mode, we simulate authentication
  const isAuthenticated = isDevMode || msalIsAuthenticated;

  const getToken = useCallback(async (): Promise<string> => {
    if (isDevMode) {
      return "dev-token";
    }

    if (accounts.length === 0) {
      throw new Error("No accounts found");
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      return response.accessToken;
    } catch (error) {
      // If silent acquisition fails, try popup
      const response = await instance.acquireTokenPopup(loginRequest);
      return response.accessToken;
    }
  }, [instance, accounts]);

  const login = useCallback(async () => {
    if (isDevMode) {
      // In dev mode, just fetch the user
      setState((prev) => ({ ...prev, isLoading: true }));
      try {
        const token = await getToken();
        const user = await api.getCurrentUser(token);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to authenticate in dev mode",
        }));
      }
      return;
    }

    try {
      await instance.loginPopup(loginRequest);
    } catch (error) {
      console.error("Login failed:", error);
    }
  }, [instance, getToken]);

  const logout = useCallback(async () => {
    if (isDevMode) {
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      await instance.logoutPopup();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, [instance]);

  // Fetch user profile when authenticated
  useEffect(() => {
    async function fetchUser() {
      // In dev mode, skip MSAL inProgress check
      if (!isAuthenticated || (!isDevMode && inProgress !== InteractionStatus.None)) {
        return;
      }

      setState((prev) => ({ ...prev, isLoading: true }));

      try {
        const token = await getToken();
        const user = await api.getCurrentUser(token);
        setState({
          user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: "Failed to fetch user profile",
        }));
      }
    }

    fetchUser();
  }, [isAuthenticated, inProgress, getToken]);

  return {
    ...state,
    getToken,
    login,
    logout,
    isDevMode,
  };
}
