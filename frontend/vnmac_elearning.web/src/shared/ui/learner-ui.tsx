import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      <div className="grid size-10 place-items-center rounded-full bg-[#0d2857] text-base font-bold text-white shadow-[0_10px_24px_rgba(13,40,87,0.18)]">
        {index}
      </div>
      <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-slate-950">{title}</h2>
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
        "rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.06)]",
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
  const variant =
    tone === "success"
      ? "success"
      : tone === "warning"
        ? "warning"
        : tone === "brand"
          ? "secondary"
          : "outline";

  return <Badge variant={variant}>{children}</Badge>;
}
