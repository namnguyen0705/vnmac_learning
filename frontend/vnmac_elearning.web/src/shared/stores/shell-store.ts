import { create } from "zustand";

interface ShellStoreState {
  learnerNavOpen: boolean;
  adminNavOpen: boolean;
  adminNavCollapsed: boolean;
  toggleLearnerNav: () => void;
  toggleAdminNav: () => void;
  toggleAdminNavCollapsed: () => void;
  closeLearnerNav: () => void;
  closeAdminNav: () => void;
}

export const useShellStore = create<ShellStoreState>()((set) => ({
  learnerNavOpen: false,
  adminNavOpen: false,
  adminNavCollapsed: false,
  toggleLearnerNav: () => set((state) => ({ learnerNavOpen: !state.learnerNavOpen })),
  toggleAdminNav: () => set((state) => ({ adminNavOpen: !state.adminNavOpen })),
  toggleAdminNavCollapsed: () => set((state) => ({ adminNavCollapsed: !state.adminNavCollapsed })),
  closeLearnerNav: () => set({ learnerNavOpen: false }),
  closeAdminNav: () => set({ adminNavOpen: false }),
}));
