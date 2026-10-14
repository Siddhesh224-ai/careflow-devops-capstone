const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"
).replace(/\/$/, "");
export const AUTH_TOKEN_KEY = "careflow_access_token";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fields?: unknown,
  ) {
    super(message);
  }
}

export function getAuthToken(): string | null {
  try {
    return typeof window === "undefined"
      ? null
      : window.sessionStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  try {
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted browser contexts.
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const token = getAuthToken();
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(
      0,
      "Unable to reach CareFlow. Check that the API is running.",
    );
  }
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: "The request could not be completed." }));
    const message =
      typeof body.detail === "string"
        ? body.detail
        : "Please review the form and try again.";
    if (response.status === 401 && !path.endsWith("/auth/login")) {
      window.dispatchEvent(new Event("careflow:unauthorized"));
    }
    throw new ApiError(response.status, message, body.detail);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function queryString(
  values: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(
    ([key, value]) =>
      value !== undefined && value !== "" && params.set(key, String(value)),
  );
  return params.toString();
}
