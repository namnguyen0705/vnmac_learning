import { Lightbulb, Megaphone, ShieldAlert, Skull, Users, Hand, type LucideIcon } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import { SAFETY_RULES } from "./lessonFlow";

export function HazardScene({ variant }: { variant: "card" | "video" | "person" | "thumb" }) {
  return (
    <div className={`official-danger-scene ${variant}`} aria-hidden="true">
      <span className="scene-cloud cloud-a" />
      <span className="scene-cloud cloud-b" />
      <span className="scene-mountain mountain-a" />
      <span className="scene-mountain mountain-b" />
      <span className="scene-path" />
      <span className="scene-field" />
      <span className="scene-barrier barrier-a" />
      <span className="scene-barrier barrier-b" />
      <div className="scene-warning-sign">
        <Skull className="size-7" />
        <strong>KHU VỰC</strong>
        <strong>NGUY HIỂM</strong>
      </div>
      <span className="scene-shell shell-a" />
      <span className="scene-shell shell-b" />
      {variant === "person" ? (
        <div className="scene-person">
          <span className="head" />
          <span className="body" />
          <span className="arm" />
        </div>
      ) : null}
      {variant === "video" ? (
        <blockquote>
          Nhận biết
          <br />
          Tránh xa
          <br />
          Báo ngay
        </blockquote>
      ) : null}
    </div>
  );
}

export function ObjectiveRow({ icon: Icon, title }: { icon: LucideIcon; title: string }) {
  return (
    <div className="official-objective-row">
      <Icon className="size-5" />
      <span>{title}</span>
    </div>
  );
}

export function DropZone({
  icon: Icon,
  label,
  note,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  note: string;
  tone: "red" | "amber" | "green";
}) {
  return (
    <div className={`official-drop-zone ${tone}`}>
      <h2>
        <Icon className="size-5" />
        {label}
      </h2>
      <p>{note}</p>
      <div>Thả vào đây</div>
    </div>
  );
}

export function TipsCard() {
  return (
    <LearnerPanel className="official-tips-card">
      <h2>
        <Lightbulb className="size-5" />
        MẸO NHỚ
      </h2>
      {SAFETY_RULES.map((rule) => (
        <RuleRow detail={rule.detail} icon={rule.icon} key={rule.title} title={rule.title} tone={rule.tone} />
      ))}
    </LearnerPanel>
  );
}

export function RuleRow({
  detail,
  icon: Icon,
  title,
  tone,
}: {
  detail: string;
  icon: LucideIcon;
  title: string;
  tone: string;
}) {
  return (
    <div className={`official-rule-row ${tone}`}>
      <Icon className="size-5" />
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

export function SummaryLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="official-summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function formatCompletionDate(value?: string | null) {
  if (!value) {
    return "Vừa hoàn thành";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Vừa hoàn thành";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
