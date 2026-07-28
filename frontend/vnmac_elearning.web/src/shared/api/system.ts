import { apiRequest, resolveApiUrl } from "./client";
import type { SystemSettingsResponse } from "../types/api";

export function getPublicSystemSettings() {
  return apiRequest<SystemSettingsResponse>("/api/system/settings", { auth: false });
}

export function resolveSystemAssetUrl(url?: string | null) {
  return url ? resolveApiUrl(url) : "";
}
