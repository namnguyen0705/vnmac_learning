import { useEffect, useRef } from "react";
import { getCurrentUser, loginRequest, logoutRequest } from "@/shared/api/auth";
import { useAuthStore } from "@/shared/stores/auth-store";
import type { LoginRequest, LoginResponse } from "@/shared/types/api";

export function AuthBootstrap() {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const session = useAuthStore((state) => state.session);
  const sessionUserId = session?.user.id ?? null;
  const setInitializing = useAuthStore((state) => state.setInitializing);
  const syncUser = useAuthStore((state) => state.syncUser);
  const clearSession = useAuthStore((state) => state.clearSession);
  const bootstrappedUserIdRef = useRef<string | null>(null);
  const pendingBootstrapUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!session || !sessionUserId) {
      bootstrappedUserIdRef.current = null;
      pendingBootstrapUserIdRef.current = null;
      setInitializing(false);
      return;
    }

    if (
      bootstrappedUserIdRef.current === sessionUserId ||
      pendingBootstrapUserIdRef.current === sessionUserId
    ) {
      return;
    }

    pendingBootstrapUserIdRef.current = sessionUserId;
    setInitializing(true);

    getCurrentUser()
      .then((user) => {
        if (useAuthStore.getState().session?.user.id === sessionUserId) {
          syncUser(user);
          bootstrappedUserIdRef.current = sessionUserId;
        }
      })
      .catch(() => {
        if (useAuthStore.getState().session?.user.id === sessionUserId) {
          clearSession();
          bootstrappedUserIdRef.current = null;
        }
      })
      .finally(() => {
        if (pendingBootstrapUserIdRef.current === sessionUserId) {
          pendingBootstrapUserIdRef.current = null;
        }

        const activeSessionUserId = useAuthStore.getState().session?.user.id ?? null;
        if (activeSessionUserId === sessionUserId || activeSessionUserId === null) {
          setInitializing(false);
        }
      });
  }, [clearSession, hasHydrated, sessionUserId, setInitializing, syncUser]);

  return null;
}

export function useAuth() {
  const session = useAuthStore((state) => state.session);
  const userRole = useAuthStore((state) => state.session?.user.role ?? null);
  const isInitializing = useAuthStore((state) => state.isInitializing);
  const setSession = useAuthStore((state) => state.setSession);
  const clearSession = useAuthStore((state) => state.clearSession);
  const setInitializing = useAuthStore((state) => state.setInitializing);

  return {
    session,
    userRole,
    isInitializing,
    login: async (payload: LoginRequest): Promise<LoginResponse> => {
      const response = await loginRequest(payload);
      setSession({
        user: response.user,
        tokens: response.tokens,
      });
      setInitializing(false);
      return response;
    },
    logout: () => {
      const refreshToken = useAuthStore.getState().session?.tokens.refreshToken;
      const finalize = () => {
        clearSession();
        setInitializing(false);
      };

      if (!refreshToken) {
        finalize();
        return;
      }

      logoutRequest({ refreshToken })
        .catch(() => undefined)
        .finally(finalize);
    },
  };
}
