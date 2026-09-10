import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getMe, logout as apiLogout } from "@/lib/admin-api";

export type AuthUser = {
  email: string;
  full_name: string;
  user_type?: "System User" | "Website User"; // ← add user_type
};

type MeUser = { email: string; name: string };

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  hydrated: boolean;
  fetchSession: () => Promise<AuthUser | null>;
  setUser: (u: AuthUser | null) => void;
  setHydrated: (v: boolean) => void;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      loading: false,
      hydrated: false,

      fetchSession: async () => {
        const me = await getMe();
        if (me) {
          set({ user: { email: me.email, full_name: me.name, user_type: me.user_type } });
        }
        return me ? { email: me.email, full_name: me.name, user_type: me.user_type } : null;
      },

      setUser: (u) => set({ user: u }),

      setHydrated: (v) => set({ hydrated: v }),

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
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);
