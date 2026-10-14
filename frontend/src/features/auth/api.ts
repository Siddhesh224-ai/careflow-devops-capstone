import { api } from "../../lib/api-client";
import type { AuthUser, TokenResponse } from "../../lib/types";

export const authApi = {
  login: (username: string, password: string) =>
    api<TokenResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => api<AuthUser>("/auth/me"),
};
