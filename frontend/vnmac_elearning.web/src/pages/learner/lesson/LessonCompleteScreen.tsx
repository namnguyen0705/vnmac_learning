import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, BookOpen, CheckCircle2, RotateCcw, Trophy } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import type { CourseLesson, LessonContentStep, ProgressTracking } from "../../../shared/types/api";
import { SummaryLine, formatCompletionDate } from "./LessonVisuals";

export function LessonCompleteContentScreen({
  checkStep,
  coursePercent,
  lesson,
  lessonNumber,
  nextLabel,
  progress,
  step,
  title,
  onNext,
  onReplay,
  onReview,
}: {
  checkStep?: LessonContentStep;
  coursePercent: number;
  lesson: CourseLesson;
  lessonNumber: string;
  nextLabel: string;
  progress?: ProgressTracking;
  step?: LessonContentStep;
  title: string;
  onNext: () => void;
  onReplay: () => void;
  onReview: () => void;
}) {
  const screenTitle = step?.title?.trim() || "Hoàn thành";
  const congratulationTitle = step?.subtitle?.trim() || "Chúc mừng!";
  const defaultDescription = `Bạn đã hoàn thành Bài ${lessonNumber} - ${title}`;
  const description = step?.body?.trim() || defaultDescription;
  const noteLines = step?.points?.length
    ? step.points
    : [
        "Bạn đã đạt 100% điểm trong bài kiểm tra.",
        "Bạn đã nắm vững kiến thức nhận diện vật nguy hiểm.",
      ];
  const replayLabel = step?.tips?.[0]?.trim() || "Học lại bài học";
  const reviewLabel = step?.secondaryActionLabel?.trim() || step?.tips?.[1]?.trim() || "Xem lại nội dung";
  const nextActionLabel = nextLabel || step?.primaryActionLabel?.trim() || step?.tips?.[2]?.trim();
  const resultTitle = step?.explanationTitle?.trim() || "Kết quả bài học";
  const statusLabel = step?.alertText?.trim() || "Đạt yêu cầu";
  const resultDescription = step?.explanation?.trim();
  const questionCount = Math.max(checkStep?.questions?.length || lesson.content?.quiz?.questionCount || 5, 1);
  const scoreText = `${questionCount}/${questionCount}`;
  const completedAt = formatCompletionDate(progress?.completionTime);
  const heroImageUrl = step?.mediaUrl?.trim() || "";
  const heroImageAlt = step?.mediaAlt?.trim() || congratulationTitle;

  return (
    <section className="official-complete-screen official-complete-dynamic">
      <h1 className="official-complete-title">{screenTitle}</h1>

      <div className="official-complete-main">
        <div className={cn("official-complete-hero", heroImageUrl && "with-image")}>
          <div className="official-confetti" />
          <div className="official-complete-copy">
            <CheckCircle2 className="official-complete-mark" />
            <div>
              <h2>{congratulationTitle}</h2>
              <p>{description}</p>
            </div>
            <div className="official-complete-note">
              <CheckCircle2 className="size-5" />
              <span>{noteLines.join(" ")}</span>
            </div>
            <div className="official-complete-actions">
              <Button className="official-light-button" type="button" variant="outline" onClick={onReplay}>
                <RotateCcw className="size-4" />
                {replayLabel}
              </Button>
              <Button className="official-light-button" type="button" variant="outline" onClick={onReview}>
                <BookOpen className="size-4" />
                {reviewLabel}
              </Button>
              <Button className="official-blue-button" type="button" onClick={onNext}>
                {nextActionLabel}
                <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>

          {heroImageUrl ? <img alt={heroImageAlt} className="official-complete-hero-image" src={heroImageUrl} /> : null}
        </div>
      </div>

      <LearnerPanel className="official-result-card">
        <h2>
          <Trophy className="size-5" />
          {resultTitle}
        </h2>
        <div className="official-result-ring">100%</div>
        <SummaryLine label="Điểm số" value={scoreText} />
        <SummaryLine label="Trạng thái" value={statusLabel} />
        <SummaryLine label="Bài học" value={`Bài ${lessonNumber} - ${title}`} />
        <SummaryLine label="Thời gian hoàn thành" value={completedAt} />
        {resultDescription ? <p className="official-result-description">{resultDescription}</p> : null}
        <div className="official-course-mini-progress">
          <span style={{ width: `${Math.max(0, Math.min(100, coursePercent))}%` }} />
        </div>
        <small>{coursePercent}% nội dung khóa học đã hoàn thành</small>
      </LearnerPanel>
    </section>
  );
}

function LessonCompleteScreen({
  coursePercent,
  lessonNumber,
  nextLabel,
  title,
  onNext,
  onReplay,
  onReview,
}: {
  coursePercent: number;
  lessonNumber: string;
  nextLabel: string;
  title: string;
  onNext: () => void;
  onReplay: () => void;
  onReview: () => void;
}) {
  return (
    <section className="official-complete-screen">
      <div className="official-complete-main">
        <div className="official-complete-hero">
          <div className="official-confetti" />
          <CheckCircle2 className="official-complete-mark" />
          <div>
            <h1>Chúc mừng!</h1>
            <p>Bạn đã hoàn thành Bài {lessonNumber} - {title}</p>
          </div>
          <div className="official-complete-note">
            <CheckCircle2 className="size-5" />
            <span>Bạn đã đạt 100% điểm trong bài kiểm tra. Bạn đã nắm vững kiến thức nhận diện vật nguy hiểm.</span>
          </div>
          <div className="official-complete-actions">
            <Button className="official-light-button" type="button" variant="outline" onClick={onReplay}>
              <RotateCcw className="size-4" />
              Học lại bài học
            </Button>
            <Button className="official-light-button" type="button" variant="outline" onClick={onReview}>
              <BookOpen className="size-4" />
              Xem lại nội dung
            </Button>
            <Button className="official-blue-button" type="button" onClick={onNext}>
              {nextLabel}
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>

      <LearnerPanel className="official-result-card">
        <h2>
          <Trophy className="size-5" />
          Kết quả bài học
        </h2>
        <div className="official-result-ring">100%</div>
        <SummaryLine label="Điểm số" value="5/5" />
        <SummaryLine label="Trạng thái" value="Đạt yêu cầu" />
        <SummaryLine label="Bài học" value={`Bài ${lessonNumber} - ${title}`} />
        <div className="official-course-mini-progress">
          <span style={{ width: `${Math.max(0, Math.min(100, coursePercent))}%` }} />
        </div>
        <small>{coursePercent}% nội dung khóa học đã hoàn thành</small>
      </LearnerPanel>
    </section>
  );
}
