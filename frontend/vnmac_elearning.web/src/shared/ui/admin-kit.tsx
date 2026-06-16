import { Fragment, useEffect, type ComponentProps, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const thumbGradients = [
  "from-sky-500 via-blue-600 to-indigo-700",
  "from-emerald-500 via-teal-600 to-cyan-700",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-violet-500 via-purple-600 to-fuchsia-600",
  "from-cyan-400 via-sky-500 to-blue-700",
  "from-lime-400 via-emerald-500 to-teal-700",
];

export function AdminPageHeader({
  title,
  breadcrumbs,
  actions,
}: {
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
      <div className="space-y-2">
        {breadcrumbs?.length ? (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            {breadcrumbs.map((item, index) => (
              <div className="flex items-center gap-2" key={`${item}-${index}`}>
                {index > 0 ? <ChevronRight className="size-4 text-slate-300" /> : null}
                <span className={cn(index === breadcrumbs.length - 1 && "font-semibold text-slate-800")}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        ) : null}
        <div className="space-y-1">
          <h1 className="text-[1.20rem] font-semibold tracking-tight text-slate-950">{title}</h1>
        </div>
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function AdminSection({
  title,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card className={cn("border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.06)]", className)}>
      {title != "" && (
      <CardHeader className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-[1.20rem]">{title}</CardTitle>
        </div>
          {action}
        </CardHeader>
      )}
      <CardContent className={cn("px-5 pt-4 pb-5", contentClassName)}>{children}</CardContent>
    </Card>
  );
}

export function AdminMetricCard({
  icon,
  label,
  value,
  delta,
  accent = "blue",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: string;
  accent?: "blue" | "green" | "amber" | "violet";
}) {
  const accentMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-500",
    violet: "bg-violet-50 text-violet-600",
  };

  return (
    <Card className="border-slate-200 bg-white shadow-[0_16px_48px_rgba(15,23,42,0.05)]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn("grid size-12 place-items-center rounded-full", accentMap[accent])}>{icon}</div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="text-[1.55rem] font-semibold leading-none tracking-tight text-slate-950">{value}</p>
          {delta ? <p className="text-xs text-emerald-600">{delta}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminProgressRow({
  label,
  value,
  colorClassName = "bg-blue-500",
}: {
  label: string;
  value: number;
  colorClassName?: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="font-semibold text-slate-900">{value.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={cn("h-2 rounded-full", colorClassName)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

export function AdminCourseThumb({
  title,
  index = 0,
  className,
}: {
  title: string;
  index?: number;
  className?: string;
}) {
  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((item) => item[0]?.toUpperCase())
    .join("");

  return (
    <div
      className={cn(
        "relative grid h-14 w-14 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br text-lg font-semibold text-white shadow-lg",
        thumbGradients[index % thumbGradients.length],
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.28),_transparent_45%)]" />
      <span className="relative z-10">{initials || "EL"}</span>
    </div>
  );
}

export function AdminStatusBadge({ status }: { status: string }) {
  const normalized = status
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
  const variant =
    normalized.includes("publish") ||
    normalized.includes("open") ||
    normalized.includes("hoan thanh") ||
    normalized.includes("dang mo") ||
    normalized.includes("xac thuc")
      ? "success"
      : normalized.includes("draft") || normalized.includes("nhap") || normalized.includes("luu tru")
        ? "warning"
        : normalized.includes("fail") || normalized.includes("khoa") || normalized.includes("cho xac thuc")
          ? "danger"
          : "outline";

  return <Badge variant={variant}>{status}</Badge>;
}

export function AdminDonut({
  value,
  label,
  sublabel,
  className,
}: {
  value: number;
  label: string;
  sublabel?: string;
  className?: string;
}) {
  const bounded = Math.max(0, Math.min(100, value));
  const style = {
    background: `conic-gradient(#2f9e44 0deg ${bounded * 3.6}deg, #e5e7eb ${bounded * 3.6}deg 360deg)`,
  } satisfies CSSProperties;

  return (
    <div className={cn("grid place-items-center gap-4", className)}>
      <div className="grid size-44 place-items-center rounded-full" style={style}>
        <div className="grid size-30 place-items-center rounded-full bg-white text-center shadow-inner">
          <div>
            <p className="text-3xl font-semibold text-slate-950">{bounded.toFixed(1)}%</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        </div>
      </div>
      {sublabel ? <p className="text-sm text-slate-500">{sublabel}</p> : null}
    </div>
  );
}

export function AdminToolbarButton({
  icon,
  children,
  variant = "outline",
  ...props
}: ComponentProps<typeof Button> & { icon?: ReactNode }) {
  return (
    <Button className="h-10 gap-2 rounded-2xl px-4 text-sm" variant={variant} {...props}>
      {icon}
      {children}
    </Button>
  );
}

export function AdminIconButton({
  icon,
  label,
  className,
  ...props
}: ComponentProps<typeof Button> & {
  icon: ReactNode;
  label: string;
}) {
  return (
    <Button
      aria-label={label}
      className={cn("size-8 p-0", className)}
      size="icon"
      title={label}
      type="button"
      {...props}
    >
      {icon}
    </Button>
  );
}

function getPaginationItems(totalPages: number, currentPage: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((left, right) => left - right);
}

export function AdminPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
}: {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}) {
  const safeTotal = Math.max(0, totalItems);
  const totalPages = Math.max(1, Math.ceil(safeTotal / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = safeTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = safeTotal === 0 ? 0 : Math.min(safeTotal, currentPage * pageSize);
  const pages = getPaginationItems(totalPages, currentPage);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
      <p className="text-xs text-slate-500">
        Hiển thị {start}-{end} / {safeTotal}
      </p>
      <div className="flex items-center gap-1">
        <Button
          aria-label="Trang trước"
          className="size-8 p-0"
          disabled={currentPage === 1}
          size="icon"
          title="Trang trước"
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((item, index) => {
          const previous = pages[index - 1];
          const showDots = previous && item - previous > 1;

          return (
            <Fragment key={item}>
              {showDots ? <span className="px-1 text-xs text-slate-400">...</span> : null}
              <Button
                className="h-8 min-w-8 px-2 text-xs"
                size="sm"
                type="button"
                variant={item === currentPage ? "default" : "outline"}
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            </Fragment>
          );
        })}
        <Button
          aria-label="Trang sau"
          className="size-8 p-0"
          disabled={currentPage === totalPages}
          size="icon"
          title="Trang sau"
          type="button"
          variant="outline"
          onClick={() => onPageChange(currentPage + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function AdminModal({
  open,
  title,
  description,
  onClose,
  actions,
  children,
  className,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <button
        aria-label="Đóng hội thoại"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
        type="button"
      />
      <div
        className={cn(
          "admin-modal-shell relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.22)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
          <div className="space-y-1">
            <h2 className="text-[1.15rem] font-semibold tracking-tight text-slate-950">{title}</h2>
            {description ? <p className="max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
          </div>
          <Button className="size-9 p-0" onClick={onClose} size="icon" type="button" variant="ghost">
            <X className="size-5" />
          </Button>
        </div>
        <div className="max-h-[calc(92vh-132px)] overflow-y-auto px-5 py-5">{children}</div>
        {actions ? (
          <div className="admin-modal-footer flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
            {actions}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
