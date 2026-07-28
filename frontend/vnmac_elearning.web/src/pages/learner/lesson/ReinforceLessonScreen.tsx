import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Hand, Lightbulb, Megaphone, ShieldAlert, Users } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import type { LessonContentStep } from "../../../shared/types/api";
import { AUTO_UNLOCK_DELAY_MS, SAFETY_RULES } from "./lessonFlow";
import { HazardScene, RuleRow, TipsCard } from "./LessonVisuals";

export function DynamicReinforceLessonScreen({
  canContinue,
  mustWait,
  step,
  onReadyChange,
}: {
  canContinue: boolean;
  mustWait: boolean;
  step?: LessonContentStep;
  onReadyChange: (isReady: boolean) => void;
}) {
  const customBody = step?.body?.trim() || "";
  const customTips = step?.tips?.map((tip) => tip.trim()).filter(Boolean) ?? [];
  const tipImageUrl = step?.objectiveImageUrl?.trim() || "";
  const feedbackText = step?.feedback?.trim() || "";
  const hasCustomContent = Boolean(customBody || customTips.length || tipImageUrl || feedbackText);

  useEffect(() => {
    if (!mustWait) {
      onReadyChange(true);
      return;
    }

    onReadyChange(false);
    const timer = window.setTimeout(() => onReadyChange(true), AUTO_UNLOCK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mustWait, onReadyChange, step?.key]);

  if (!hasCustomContent) {
    return <ReinforceLessonScreen canContinue={canContinue} mustWait={mustWait} />;
  }

  const feedbackLines = (
    feedbackText || "Bạn đã hoàn thành phần phân loại\nBạn đã hiểu cách nhận diện vật nguy hiểm. Hãy tiếp tục để kiểm tra lại kiến thức."
  )
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const feedbackTitle = feedbackLines[0] || "Bạn đã hoàn thành phần phân loại";
  const feedbackBody = feedbackLines.slice(1).join(" ") || "Bạn đã hiểu cách nhận diện vật nguy hiểm. Hãy tiếp tục để kiểm tra lại kiến thức.";

  return (
    <section className="official-reinforce-screen">
      <div className="official-reinforce-main">
        <div>
          <h1>{step?.title?.trim() || "CỦNG CỐ KIẾN THỨC"}</h1>
          <p>{step?.subtitle?.trim() || "Hãy ghi nhớ những nguyên tắc an toàn quan trọng."}</p>
        </div>

        {customBody ? (
          <section
            className={cn(
              "rounded-lg border border-slate-200 bg-white shadow-[0_10px_24px_rgba(15,23,42,0.05)]",
              "official-reinforce-editor-content",
            )}
            dangerouslySetInnerHTML={{ __html: customBody }}
          />
        ) : (
          <>
            <LearnerPanel className="official-memory-card">
              <h2>
                <CheckCircle2 className="size-8" />
                GHI NHỚ QUAN TRỌNG
              </h2>
              <div className="official-memory-list">
                {SAFETY_RULES.slice(0, 3).map((rule) => (
                  <RuleRow detail={rule.detail} icon={rule.icon} key={rule.title} title={rule.title} tone={rule.tone} />
                ))}
              </div>
              <div className="official-memory-warning">
                <AlertTriangle className="size-5" />
                Khi không chắc chắn, LUÔN coi là nguy hiểm
              </div>
            </LearnerPanel>

            <HazardScene variant="person" />
          </>
        )}

        <div className="official-success-note">
          <CheckCircle2 className="size-6" />
          <div>
            <strong>{feedbackTitle}</strong>
            <span>{feedbackBody}</span>
          </div>
        </div>
        {mustWait && !canContinue ? (
          <div className="official-gate-note">Vui lòng đọc phần củng cố, nút tiếp tục sẽ mở sau 10 giây.</div>
        ) : null}
      </div>

      <DynamicTipsCard step={step} />
    </section>
  );
}

function DynamicTipsCard({ step }: { step?: LessonContentStep }) {
  const imageUrl = step?.objectiveImageUrl?.trim() || "";
  const imageAlt = step?.objectiveImageAlt?.trim() || "Ảnh mẹo nhỏ";
  const tips = step?.tips?.map((tip) => tip.trim()).filter(Boolean) ?? [];

  if (!imageUrl && !tips.length) {
    return <TipsCard />;
  }

  const fallbackIcons = [Hand, ShieldAlert, Megaphone, Users];
  const fallbackTones = ["red", "amber", "green", "blue"];

  return (
    <LearnerPanel className="official-tips-card">
      <h2>
        <Lightbulb className="size-5" />
        MẸO NHỎ
      </h2>
      {imageUrl ? <img alt={imageAlt} className="official-tips-image" src={imageUrl} /> : null}
      {(tips.length ? tips : SAFETY_RULES.map((rule) => `${rule.title} ${rule.detail}`)).map((tip, index) => {
        const Icon = fallbackIcons[index % fallbackIcons.length];
        const tone = fallbackTones[index % fallbackTones.length];
        return (
          <div className={`official-rule-row ${tone}`} key={`${tip}-${index}`}>
            <Icon className="size-5" />
            <strong>{tip}</strong>
            <span />
          </div>
        );
      })}
    </LearnerPanel>
  );
}

function ReinforceLessonScreen({
  canContinue,
  mustWait,
}: {
  canContinue: boolean;
  mustWait: boolean;
}) {
  return (
    <section className="official-reinforce-screen">
      <div className="official-reinforce-main">
        <div>
          <h1>CỦNG CỐ KIẾN THỨC</h1>
          <p>Hãy ghi nhớ những nguyên tắc an toàn quan trọng.</p>
        </div>

        <LearnerPanel className="official-memory-card">
          <h2>
            <CheckCircle2 className="size-8" />
            GHI NHỚ QUAN TRỌNG
          </h2>
          <div className="official-memory-list">
            {SAFETY_RULES.slice(0, 3).map((rule) => (
              <RuleRow detail={rule.detail} icon={rule.icon} key={rule.title} title={rule.title} tone={rule.tone} />
            ))}
          </div>
          <div className="official-memory-warning">
            <AlertTriangle className="size-5" />
            Khi không chắc chắn, LUÔN coi là nguy hiểm
          </div>
        </LearnerPanel>

        <HazardScene variant="person" />

        <div className="official-success-note">
          <CheckCircle2 className="size-6" />
          <div>
            <strong>Bạn đã hoàn thành phần phân loại</strong>
            <span>Bạn đã hiểu cách nhận diện vật nguy hiểm. Hãy tiếp tục để kiểm tra lại kiến thức.</span>
          </div>
        </div>
        {mustWait && !canContinue ? (
          <div className="official-gate-note">Vui lòng đọc phần củng cố, nút tiếp tục sẽ mở sau 10 giây.</div>
        ) : null}
      </div>

      <TipsCard />
    </section>
  );
}
