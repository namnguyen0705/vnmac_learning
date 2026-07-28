import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Shield, ShieldCheck, Target } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import type { LessonContentStep } from "../../../shared/types/api";
import { AUTO_UNLOCK_DELAY_MS } from "./lessonFlow";
import { HazardScene, ObjectiveRow } from "./LessonVisuals";

export function IntroLessonScreen({
  canStart,
  lessonNumber,
  mustWait,
  objectives,
  step,
  title,
  onReadyChange,
  onStart,
}: {
  canStart: boolean;
  lessonNumber: string;
  mustWait: boolean;
  objectives: string[];
  step?: LessonContentStep;
  title: string;
  onReadyChange: (isReady: boolean) => void;
  onStart: () => void;
}) {
  const screenKicker = step?.subtitle?.trim() || "GIỚI THIỆU BÀI HỌC";
  const body = step?.body?.trim() || "Trong cuộc sống hằng ngày, chúng ta có thể gặp những vật lạ nguy hiểm. Bài học này giúp bạn nhận biết và xử lý an toàn.";
  const heroImageUrl = step?.mediaUrl?.trim() || "";
  const heroImageAlt = step?.mediaAlt?.trim() || title;
  const objectiveTitle = step?.explanationTitle?.trim() || "MỤC TIÊU BÀI HỌC";
  const importantMessage = step?.tips?.[0]?.trim() || step?.explanation?.trim() || "Nhận biết - Tránh xa - Báo ngay";
  const importantDescription = step?.explanation?.trim() || body;
  const startLabel = step?.primaryActionLabel?.trim() || "Bắt đầu học";

  useEffect(() => {
    if (!mustWait) {
      onReadyChange(true);
      return;
    }

    onReadyChange(false);
    const timer = window.setTimeout(() => onReadyChange(true), AUTO_UNLOCK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [mustWait, onReadyChange, step?.key, title]);

  return (
    <section className="official-lesson-intro">
      <div className="official-lesson-copy">
        <p className="official-screen-kicker">{screenKicker}</p>
        <span className="official-lesson-badge">BÀI {lessonNumber}</span>
        <h1>{title}</h1>
        <p>{body}</p>
      </div>

      {heroImageUrl ? <img alt={heroImageAlt} className="official-intro-image" src={heroImageUrl} /> : <HazardScene variant="card" />}

      <LearnerPanel className="official-objectives-card">
        <h2>
          <Target className="size-5" />
          {objectiveTitle}
        </h2>
        <div className="official-objective-list">
          {objectives.slice(0, 3).map((item) => (
            <ObjectiveRow icon={ShieldCheck} key={item} title={item} />
          ))}
        </div>
      </LearnerPanel>

      <div className="official-important-strip">
        <div>
          <Shield className="size-7" />
          <strong>THÔNG ĐIỆP QUAN TRỌNG</strong>
          <span>{importantMessage}</span>
        </div>
        <p>{importantDescription}</p>
        <Button className="official-blue-button" disabled={!canStart} type="button" onClick={onStart}>
          <Play className="size-4 fill-current" />
          {startLabel}
        </Button>
      </div>
      {mustWait && !canStart ? (
        <div className="official-gate-note">Vui lòng đọc nội dung bài học, nút tiếp tục sẽ mở sau 10 giây.</div>
      ) : null}
    </section>
  );
}
