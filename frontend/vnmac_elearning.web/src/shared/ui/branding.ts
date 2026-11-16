import { useQuery } from "@tanstack/react-query";
import { getPublicSystemSettings, resolveSystemAssetUrl } from "../api/system";
import type { SystemSettingsResponse } from "../types/api";

export const defaultSystemSettings: SystemSettingsResponse = {
  siteTitle: "RAPPORT Project",
  headerTitle: "RAPPORT PROJECT",
  headerSubtitle: "DU AN GIAO DUC NGUY CO BOM MIN VAT NO VA THAY DOI HANH VI XA HOI",
  projectLogoUrl: "/branding/rapport.png",
  loginLogoUrl: "/branding/rapport.png",
  vnmacLogoUrl: "/branding/vnmac.png",
  vietnamFlagUrl: "/branding/vietnam.png",
  usFlagUrl: "/branding/us-flag.png",
  crsLogoUrl: "/branding/crs.png",
  headerBackgroundColor: "#ffffff",
  headerBackgroundImageUrl: "",
  loginBackgroundImageUrl: "",
  certificateTemplateUrl: "",
  certificateTitle: "CHUNG NHAN",
  certificateCourseTitle: "GIAO DUC NGUY CO BOM MIN, VAT NO VA THAY DOI HANH VI XA HOI",
  publicContentJson: "{}",
  homeContentJson: "",
  updatedAt: "",
  updatedByUserId: "",
};

export function useBrandingSettings() {
  const query = useQuery({
    queryKey: ["system-settings-public"],
    queryFn: getPublicSystemSettings,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  const settings = query.data ?? defaultSystemSettings;
  return {
    ...settings,
    projectLogoUrl: settings.projectLogoUrl || defaultSystemSettings.projectLogoUrl,
    loginLogoUrl: settings.loginLogoUrl || settings.projectLogoUrl || defaultSystemSettings.loginLogoUrl,
    vnmacLogoUrl: settings.vnmacLogoUrl || defaultSystemSettings.vnmacLogoUrl,
    vietnamFlagUrl: settings.vietnamFlagUrl || defaultSystemSettings.vietnamFlagUrl,
    usFlagUrl: settings.usFlagUrl || defaultSystemSettings.usFlagUrl,
    crsLogoUrl: settings.crsLogoUrl || defaultSystemSettings.crsLogoUrl,
  };
}

export function resolveBrandAsset(url?: string | null) {
  return resolveSystemAssetUrl(url);
}
