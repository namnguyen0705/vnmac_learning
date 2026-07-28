import { useQuery } from "@tanstack/react-query";
import { getPublicSystemSettings, resolveSystemAssetUrl } from "../api/system";
import type { SystemSettingsResponse } from "../types/api";

export const defaultSystemSettings: SystemSettingsResponse = {
  siteTitle: "RAPPORT Project",
  headerTitle: "RAPPORT PROJECT",
  headerSubtitle: "DU AN GIAO DUC NGUY CO BOM MIN VAT NO VA THAY DOI HANH VI XA HOI",
  projectLogoUrl: "",
  loginLogoUrl: "",
  vnmacLogoUrl: "",
  vietnamFlagUrl: "",
  usFlagUrl: "",
  crsLogoUrl: "",
  headerBackgroundColor: "#ffffff",
  headerBackgroundImageUrl: "",
  loginBackgroundImageUrl: "",
  certificateTemplateUrl: "",
  certificateTitle: "CHUNG NHAN",
  certificateCourseTitle: "GIAO DUC NGUY CO BOM MIN, VAT NO VA THAY DOI HANH VI XA HOI",
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

  return query.data ?? defaultSystemSettings;
}

export function resolveBrandAsset(url?: string | null) {
  return resolveSystemAssetUrl(url);
}
