import { createContext, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { clearAuthToken, getAuthToken, setAuthToken } from "../../lib/api-client";
import type { AuthUser } from "../../lib/types";
import { authApi } from "./api";

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = () => {
    clearAuthToken();
    setUser(null);
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.addEventListener("careflow:unauthorized", logout);
    return () => window.removeEventListener("careflow:unauthorized", logout);
  }, []);

  const login = async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    setAuthToken(result.access_token);
    setUser(result.user);
    return result.user;
  };

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
