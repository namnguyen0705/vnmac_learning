import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, CirclePlay, Lock, type LucideIcon } from "lucide-react";
import { resolveBrandAsset, useBrandingSettings } from "./branding";

export function OfficialLogo({ compact = false, variant = "header" }: { compact?: boolean; variant?: "header" | "login" }) {
  const settings = useBrandingSettings();
  const logoUrl = resolveBrandAsset(variant === "login" && settings.loginLogoUrl ? settings.loginLogoUrl : settings.projectLogoUrl);

  return (
    <div className="official-logo flex min-w-0 items-center gap-3">
      {logoUrl ? <img alt={settings.headerTitle} className="official-logo-image" src={logoUrl} /> : null}
      <div className={cn("official-logo-mark", logoUrl && "hidden")} aria-hidden="true">
        <span className="official-logo-roof" />
        <span className="official-logo-people">
          <i />
          <i />
          <i />
        </span>
      </div>
      {compact ? null : (
        <div className="min-w-0">
          <p className="text-[11px] font-black uppercase leading-tight text-[#0b4d96]">{settings.headerTitle}</p>
          <p className="max-w-[280px] text-[10px] font-bold uppercase leading-snug text-[#0b4d96]">{settings.headerSubtitle}</p>
          <p className="hidden max-w-[280px] text-[10px] font-bold uppercase leading-snug text-[#0b4d96]">
            Dự án giáo dục nguy cơ bom mìn vật nổ và thay đổi hành vi xã hội
          </p>
        </div>
      )}
    </div>
  );
}

export function OfficialPartnerMarks() {
  const settings = useBrandingSettings();
  const vnmacLogo = resolveBrandAsset(settings.vnmacLogoUrl);
  const vietnamFlag = resolveBrandAsset(settings.vietnamFlagUrl);
  const usFlag = resolveBrandAsset(settings.usFlagUrl);
  const crsLogo = resolveBrandAsset(settings.crsLogoUrl);

  return (
    <div className="official-partner-marks" aria-label="Đối tác dự án">
      {vnmacLogo ? <img alt="VNMAC" className="official-partner-image official-partner-vnmac-image" src={vnmacLogo} /> : null}
      <span className={cn("partner-vnmac", vnmacLogo && "hidden")}>
        VNMAC
        <small>
          Viet Nam National
          <br />
          Mine Action Centre
        </small>
      </span>
      {vietnamFlag ? <img alt="Viet Nam" className="official-flag-image" src={vietnamFlag} /> : null}
      <span className={cn("flag-vietnam", vietnamFlag && "hidden")} aria-label="Việt Nam" />
      {usFlag ? <img alt="United States" className="official-flag-image" src={usFlag} /> : null}
      <span className={cn("flag-us", usFlag && "hidden")} aria-label="Hoa Kỳ" />
      {crsLogo ? <img alt="CRS" className="official-partner-image official-partner-crs-image" src={crsLogo} /> : null}
      <span className={cn("partner-crs", crsLogo && "hidden")}>
        <i />
        CRS
        <small>Catholic Relief Services</small>
      </span>
    </div>
  );
}

export function LearnerPageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-slate-200 bg-white px-5 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-7">
      <div className="min-w-0">
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#0d58b3]">{eyebrow}</p> : null}
        <h1 className="mt-1 text-[1.45rem] font-bold leading-tight text-slate-950 sm:text-[1.7rem]">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export type LearningStep = {
  id: string;
  label: string;
  status: "done" | "active" | "locked" | "ready";
  icon?: LucideIcon;
};

export function LearningStepper({ steps }: { steps: LearningStep[] }) {
  return (
    <div className="overflow-x-auto border-y border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex min-w-max max-w-5xl items-center justify-center gap-3">
        {steps.map((step, index) => {
          const Icon =
            step.icon ??
            (step.status === "done"
              ? CheckCircle2
              : step.status === "locked"
                ? Lock
                : step.status === "active"
                  ? CirclePlay
                  : Circle);

          return (
            <div className="flex items-center gap-3" key={step.id}>
              {index > 0 ? <div className="h-px w-8 bg-slate-200" /> : null}
              <div
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                  step.status === "done" && "border-emerald-200 bg-emerald-50 text-emerald-700",
                  step.status === "active" && "border-[#0d58b3] bg-[#eaf3ff] text-[#0d58b3]",
                  step.status === "ready" && "border-slate-200 bg-white text-slate-700",
                  step.status === "locked" && "border-slate-200 bg-slate-50 text-slate-400",
                )}
              >
                <Icon className="size-3.5" />
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function OfficialActionBar({
  left,
  center,
  right,
}: {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="sticky bottom-0 z-20 grid gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.06)] backdrop-blur md:grid-cols-[1fr_auto_1fr] md:items-center">
      <div className="flex justify-start">{left}</div>
      <div className="flex justify-center">{center}</div>
      <div className="flex justify-end">{right}</div>
    </div>
  );
}

export function LearnerScreenTitle({
  index,
  title,
  className,
}: {
  index: number;
  title: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="grid size-9 place-items-center rounded-lg bg-[#0d58b3] text-sm font-bold text-white shadow-sm">
        {index}
      </div>
      <h2 className="text-[1.55rem] font-bold text-slate-950">{title}</h2>
    </div>
  );
}

export function LearnerPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function LearnerMetaChip({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LearnerProgressBar({
  value,
  label,
  tone = "navy",
  showValue = true,
}: {
  value: number;
  label?: string;
  tone?: "navy" | "green" | "amber";
  showValue?: boolean;
}) {
  const fillClass =
    tone === "green"
      ? "bg-emerald-500"
      : tone === "amber"
        ? "bg-amber-400"
        : "bg-[#163b7b]";

  return (
    <div className="grid gap-2">
      {label ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-slate-600">{label}</span>
          {showValue ? <strong className="text-slate-950">{value}%</strong> : null}
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full transition-all", fillClass)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function LearnerPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={page === 1}
        type="button"
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-4" />
      </button>

      {pages.map((pageNumber) => (
        <button
          className={cn(
            "grid size-9 place-items-center rounded-xl border text-sm font-semibold transition",
            pageNumber === page
              ? "border-[#163b7b] bg-[#163b7b] text-white"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
          )}
          key={pageNumber}
          type="button"
          onClick={() => onPageChange(pageNumber)}
        >
          {pageNumber}
        </button>
      ))}

      <button
        className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={page === totalPages}
        type="button"
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="size-4" />
      </button>
    </div>
  );
}

export function LearnerStatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "brand";
}) {
  const variant = tone === "success" ? "success" : tone === "warning" ? "warning" : "outline";
  const brandClass = tone === "brand" ? "border-[#bdd7ff] bg-[#eaf3ff] text-[#0d58b3]" : undefined;

  return (
    <Badge className={brandClass} variant={variant}>
      {children}
    </Badge>
  );
}
