import vnmacLogo from "@/assets/branding/vnmac.png";
import rapportLogo from "@/assets/branding/rapport.png";
import crsLogo from "@/assets/branding/crs.png";
import vietnamFlag from "@/assets/branding/vietnam.png";
import usFlag from "@/assets/branding/us-flag.png";
import { apiRequest, resolveApiUrl } from "./client";
import type { SystemSettingsResponse } from "../types/api";

export function getPublicSystemSettings() {
  return apiRequest<SystemSettingsResponse>("/api/system/settings", { auth: false });
}

// Default brand assets ship with the web app, independently of the API host.
const bundledBrandAssets: Record<string, string> = {
  "/branding/rapport.png": rapportLogo,
  "/branding/vnmac.png": vnmacLogo,
  "/branding/crs.png": crsLogo,
  "/branding/vietnam.png": vietnamFlag,
  "/branding/us-flag.png": usFlag,
};

export function resolveSystemAssetUrl(url?: string | null) {
  if (!url) return "";
  const path = /^https?:\/\//i.test(url) ? new URL(url).pathname : url;
  return bundledBrandAssets[path] ?? resolveApiUrl(url);
}
