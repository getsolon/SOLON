"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  api,
  setAccessToken,
  getAccessToken,
  clearAuth,
  ApiError,
} from "./api";

interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  avatar_url: string | null;
  role: string;
  provider: string | null;
  created_at: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const profile = await api<User>("/api/profile");
      setUser(profile);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAuth();
      }
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const logout = useCallback(async () => {
    try {
      await api("/api/auth/logout", { method: "DELETE" });
    } catch {
      // Ignore errors on logout
    }
    clearAuth();
    setUser(null);
    window.location.href = "/login";
  }, []);

  const refresh = useCallback(async () => {
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function handleOAuthCallback(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (token) {
    setAccessToken(token);
    return token;
  }
  return null;
}
