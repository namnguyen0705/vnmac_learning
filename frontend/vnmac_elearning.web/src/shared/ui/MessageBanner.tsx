import type { ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from "lucide-react";

export type BannerTone = "error" | "success" | "warning" | "info";

const toneConfig: Record<
  BannerTone,
  {
    variant: "destructive" | "success" | "warning" | "info";
    title: string;
    icon: typeof AlertCircle;
  }
> = {
  error: {
    variant: "destructive",
    title: "Có lỗi xảy ra",
    icon: AlertCircle,
  },
  success: {
    variant: "success",
    title: "Thành công",
    icon: CheckCircle2,
  },
  warning: {
    variant: "warning",
    title: "Cần lưu ý",
    icon: TriangleAlert,
  },
  info: {
    variant: "info",
    title: "Thông tin",
    icon: Info,
  },
};

export function MessageBanner({
  tone,
  children,
}: {
  tone: BannerTone;
  children: ReactNode;
}) {
  const config = toneConfig[tone];
  const Icon = config.icon;

  return (
    <Alert variant={config.variant}>
      <Icon className="size-4" />
      <AlertTitle>{config.title}</AlertTitle>
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
