import { useAuthStore } from "../stores/auth-store";
import type { ApiErrorPayload, AuthTokenResponse } from "../types/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.trim() ?? "";

export class ApiError extends Error {
  status: number;
  key?: string;
  detail?: string;

  constructor(status: number, payload?: ApiErrorPayload) {
    super(payload?.message ?? "Yeu cau that bai.");
    this.name = "ApiError";
    this.status = status;
    this.key = payload?.key;
    this.detail = payload?.detail;
  }
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  auth?: boolean;
  body?: unknown;
}

let refreshPromise: Promise<AuthTokenResponse | null> | null = null;

export function resolveApiUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!API_BASE_URL) {
    return path;
  }

  return new URL(path, API_BASE_URL).toString();
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as T;
  }

  return (await response.text()) as T;
}

async function refreshAccessToken(): Promise<AuthTokenResponse | null> {
  const session = useAuthStore.getState().session;
  if (!session?.tokens.refreshToken) {
    useAuthStore.getState().clearSession();
    return null;
  }

  if (!refreshPromise) {
    refreshPromise = fetch(resolveApiUrl("/api/auth/refresh"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refreshToken: session.tokens.refreshToken,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          useAuthStore.getState().clearSession();
          return null;
        }

        const tokens = (await response.json()) as AuthTokenResponse;
        useAuthStore.getState().updateTokens(tokens);

        return tokens;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { auth = true, body, headers, ...rest } = options;
  const session = useAuthStore.getState().session;
  const requestHeaders = new Headers(headers);

  if (body !== undefined) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (auth && session?.tokens.accessToken) {
    requestHeaders.set("Authorization", `Bearer ${session.tokens.accessToken}`);
  }

  const response = await fetch(resolveApiUrl(path), {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && auth) {
    const nextTokens = await refreshAccessToken();
    if (nextTokens) {
      return apiRequest<T>(path, options);
    }
  }

  if (!response.ok) {
    const payload = await parseResponse<ApiErrorPayload>(response).catch(() => undefined);
    throw new ApiError(response.status, payload);
  }

  return parseResponse<T>(response);
}
