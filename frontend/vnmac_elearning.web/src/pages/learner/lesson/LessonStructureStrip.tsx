import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import { LESSON_STEPS, type LessonStepKey } from "./lessonFlow";

export function LessonStructureStrip({
  canNext,
  canOpenStep,
  currentStep,
  nextLabel,
  onBack,
  onNext,
  onStep,
}: {
  canNext: boolean;
  canOpenStep: (step: LessonStepKey) => boolean;
  currentStep: LessonStepKey;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  onStep: (step: LessonStepKey) => void;
}) {
  const currentIndex = LESSON_STEPS.findIndex((step) => step.key === currentStep);
  const progress = LESSON_STEPS[currentIndex]?.progress ?? 0;

  return (
    <LearnerPanel className="lesson-structure-strip official-lesson-strip">
      <div className="lesson-structure-progress">
        <div className="lesson-structure-progress-label">
          <span>Tiến độ bài học</span>
          <strong>{progress}%</strong>
        </div>
        <div className="lesson-structure-progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="lesson-structure-steps">
        {LESSON_STEPS.map((step, index) => {
          const isDone = index < currentIndex;
          const isActive = step.key === currentStep;
          const isAvailable = canOpenStep(step.key);
          return (
            <button
              className={cn("lesson-structure-step", isDone && "done", isActive && "active")}
              disabled={!isAvailable}
              key={step.key}
              type="button"
              onClick={() => onStep(step.key)}
            >
              <span>{isDone ? <CheckCircle2 className="size-4" /> : index + 1}</span>
              <small>{step.label}</small>
            </button>
          );
        })}
      </div>

      <div className="lesson-structure-actions">
        <Button className="lesson-structure-back" type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lại
        </Button>
        <Button className="lesson-structure-next" disabled={!canNext} type="button" onClick={onNext}>
          {nextLabel}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </LearnerPanel>
  );
}
