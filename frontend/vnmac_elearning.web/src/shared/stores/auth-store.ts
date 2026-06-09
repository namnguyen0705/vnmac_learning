import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession, AuthTokenResponse, User } from "../types/api";

const STORAGE_KEY = "vnmac_elearning.session";

interface AuthStoreState {
  session: AuthSession | null;
  hasHydrated: boolean;
  isInitializing: boolean;
  setSession: (session: AuthSession | null) => void;
  clearSession: () => void;
  updateTokens: (tokens: AuthTokenResponse) => void;
  syncUser: (user: User) => void;
  setHasHydrated: (value: boolean) => void;
  setInitializing: (value: boolean) => void;
}

export const useAuthStore = create<AuthStoreState>()(
  persist(
    (set) => ({
      session: null,
      hasHydrated: false,
      isInitializing: true,
      setSession: (session) => set({ session }),
      clearSession: () => set({ session: null }),
      updateTokens: (tokens) =>
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                tokens,
              }
            : null,
        })),
      syncUser: (user) =>
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                user,
              }
            : null,
        })),
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setInitializing: (value) => set({ isInitializing: value }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        state?.setInitializing(Boolean(state?.session));
      },
    },
  ),
);
