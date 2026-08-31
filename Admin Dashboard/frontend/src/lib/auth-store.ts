import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMe, logout as apiLogout } from "@/lib/api";

type AuthUser = {
  email: string;
  full_name: string;
};

type MeUser = { email: string; name: string };

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  fetchSession: () => Promise<AuthUser | null>;
  setUser: (u: AuthUser | null) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,

      fetchSession: async () => {
        const me = await getMe();
        if (me) set({ user: { email: me.email, full_name: me.name } });
        return me ? { email: me.email, full_name: me.name } : null;
      },

      setUser: (u) => set({ user: u }),

      logout: async () => {
        try {
          await apiLogout();
        } catch {
          // session already gone server-side
        }
        set({ user: null });
      },
    }),
    {
      name: "aether.auth.v1",
      partialize: (s) => ({ user: s.user }),
    },
  ),
);