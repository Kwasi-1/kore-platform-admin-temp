import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminUser {
  id: string;
  name: string;
  role: string;
}

interface PlatformAuthState {
  token: string | null;
  refreshToken: string | null;
  adminUser: AdminUser | null;
  login: (token: string, refreshToken: string, adminUser: AdminUser) => void;
  logout: () => void;
  setTokens: (token: string, refreshToken?: string | null) => void;
}

export const usePlatformAuthStore = create<PlatformAuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      adminUser: null,
      login: (token, refreshToken, adminUser) =>
        set({ token, refreshToken, adminUser }),
      logout: () =>
        set({ token: null, refreshToken: null, adminUser: null }),
      setTokens: (token, refreshToken) =>
        set((state) => ({
          token,
          refreshToken: refreshToken !== undefined ? refreshToken : state.refreshToken
        })),
    }),
    {
      name: 'platform_auth', // localStorage key
    }
  )
);

