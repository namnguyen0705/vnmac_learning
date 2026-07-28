import { useEffect, useMemo, useState, type DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, HelpCircle, Info, MousePointer2, ShieldCheck, Target } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import type { LessonContentDragAnswer, LessonContentDragQuestion, LessonContentStep } from "../../../shared/types/api";
import { HazardScene } from "./LessonVisuals";

export function ClassifyLessonScreen({
  step,
  onReadyChange,
}: {
  step?: LessonContentStep;
  onReadyChange: (isReady: boolean) => void;
}) {
  const questions = useMemo(() => buildActivityQuestions(step), [step]);
  const answers = useMemo(() => flattenActivityAnswers(questions), [questions]);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState<string | null>(null);
  const placedAnswerIds = new Set(Object.keys(placements).filter((answerId) => Boolean(placements[answerId])));
  const unplacedAnswers = answers.filter((answer) => !placedAnswerIds.has(answer.id));
  const allPlaced = answers.length > 0 && answers.every((answer) => placements[answer.id]);
  const allCorrect = allPlaced && answers.every((answer) => placements[answer.id] === answer.questionId);

  useEffect(() => {
    setPlacements({});
    setChecked(false);
    setSelectedAnswerId(null);
    onReadyChange(false);
  }, [onReadyChange, step]);

  useEffect(() => {
    onReadyChange(checked && allCorrect);
  }, [allCorrect, checked, onReadyChange]);

  const placeAnswer = (answerId: string, questionId: string) => {
    setPlacements((current) => ({ ...current, [answerId]: questionId }));
    setChecked(false);
    setSelectedAnswerId(null);
  };

  const removeAnswer = (answerId: string) => {
    setPlacements((current) => {
      const next = { ...current };
      delete next[answerId];
      return next;
    });
    setChecked(false);
    setSelectedAnswerId(null);
  };

  const handleZoneClick = (questionId: string) => {
    if (selectedAnswerId) {
      placeAnswer(selectedAnswerId, questionId);
    }
  };

  const handleDrop = (questionId: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const answerId = event.dataTransfer.getData("text/plain");
    if (answerId) {
      placeAnswer(answerId, questionId);
    }
  };

  return (
    <section className="official-classify-screen">
      <div className="official-classify-main">
        <div className="official-classify-head">
          <div>
            <h1>{step?.title?.trim() || "PHÂN LOẠI"}</h1>
            <p>{step?.subtitle?.trim() || "Hãy kéo từng vật vào nhóm phù hợp."}</p>
          </div>
          {step?.instruction ? (
            <LearnerPanel className="official-activity-instruction">
              <strong>Hướng dẫn:</strong>
              <span>{step.instruction}</span>
            </LearnerPanel>
          ) : null}
        </div>

        {step?.alertText ? (
          <div className="official-soft-alert">
            <AlertTriangle className="size-4" />
            {step.alertText}
          </div>
        ) : null}

        <div className="official-touch-hint">
          Trên điện thoại: chạm vào đáp án, sau đó chạm vào nhóm phù hợp để phân loại.
        </div>

        <div className="official-drop-grid official-drop-grid-dynamic">
          {questions.map((question) => {
            const placedAnswers = answers.filter((answer) => placements[answer.id] === question.id);
            return (
              <div
                className={`official-drop-zone ${toDropTone(question.tone)} ${
                  checked && placedAnswers.some((answer) => answer.questionId !== question.id) ? "has-error" : ""
                }`}
                key={question.id}
                role="button"
                tabIndex={selectedAnswerId ? 0 : -1}
                onClick={() => handleZoneClick(question.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(question.id, event)}
                onKeyDown={(event) => {
                  if ((event.key === "Enter" || event.key === " ") && selectedAnswerId) {
                    event.preventDefault();
                    handleZoneClick(question.id);
                  }
                }}
              >
                <h2>
                  {getActivityIcon(question.tone)}
                  {question.prompt || `Câu hỏi ${question.order}`}
                </h2>
                {question.description ? <p>{question.description}</p> : null}
                <div className="official-drop-answer-stack">
                  {placedAnswers.length ? (
                    placedAnswers.map((answer) => (
                      <ActivityAnswerCard
                        answer={answer}
                        checked={checked}
                        key={answer.id}
                        placedQuestionId={question.id}
                        onRemove={() => removeAnswer(answer.id)}
                        onSelect={() => setSelectedAnswerId(answer.id)}
                        onDragStart={(event) => event.dataTransfer.setData("text/plain", answer.id)}
                      />
                    ))
                  ) : (
                    <div className="official-drop-empty">Thả đáp án vào đây</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="official-object-grid official-answer-bank">
          {unplacedAnswers.map((answer) => (
            <ActivityAnswerCard
              answer={answer}
              isSelected={selectedAnswerId === answer.id}
              key={answer.id}
              onSelect={() => setSelectedAnswerId((current) => current === answer.id ? null : answer.id)}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", answer.id)}
            />
          ))}
        </div>

        <div className={cn("official-classify-info", checked && (allCorrect ? "is-success" : "is-error"))}>
          {checked ? allCorrect ? <CheckCircle2 className="size-5" /> : <AlertTriangle className="size-5" /> : <Info className="size-5" />}
          {checked
            ? allCorrect
              ? step?.feedback || "Bạn đã phân loại đúng tất cả đáp án."
              : "Một số đáp án chưa đúng. Hãy kéo lại vào vùng phù hợp."
            : "Bạn cần phân loại đúng tất cả các đáp án để tiếp tục."}
        </div>

        <div className="official-classify-actions">
          <Button className="official-blue-button" disabled={!answers.length} type="button" onClick={() => setChecked(true)}>
            {step?.primaryActionLabel || "Kiểm tra"}
            <ShieldCheck className="size-4" />
          </Button>
        </div>
      </div>

      <ActivitySideImage step={step} />
    </section>
  );
}

type ActivityAnswerView = LessonContentDragAnswer & {
  questionId: string;
  questionPrompt: string;
  questionTone: string;
};

function buildActivityQuestions(step?: LessonContentStep): LessonContentDragQuestion[] {
  const source = step?.dragQuestions?.length ? step.dragQuestions : [];
  if (source.length) {
    return source.map((question, questionIndex) => ({
      ...question,
      id: question.id || `question-${questionIndex + 1}`,
      order: question.order || questionIndex + 1,
      tone: question.tone || "blue",
      answers: (question.answers ?? []).map((answer, answerIndex) => ({
        ...answer,
        id: answer.id || `${question.id || `question-${questionIndex + 1}`}-answer-${answerIndex + 1}`,
        order: answer.order || answerIndex + 1,
      })),
    }));
  }

  const targets = step?.targets?.length ? step.targets : ["Nguy hiểm", "Không chắc", "An toàn"];
  const items = step?.items?.length ? step.items : ["Bom phá", "Mìn chống tăng", "Lựu đạn", "Đá", "Lon nước", "Đạn cối", "Chai nhựa", "Vật lạ gỉ sét"];
  const tones = ["red", "amber", "green", "blue"];

  return targets.map((target, targetIndex) => ({
    id: `fallback-${targetIndex + 1}`,
    order: targetIndex + 1,
    prompt: target,
    description: targetIndex === 0 ? "Vật nổ chắc chắn, rất nguy hiểm" : targetIndex === 1 ? "Không chắc là vật nổ, cần thận trọng" : "Vật dụng thông thường, an toàn",
    tone: tones[targetIndex] ?? "blue",
    imageUrl: "",
    imageAlt: "",
    answers: items
      .filter((_, itemIndex) => itemIndex % targets.length === targetIndex)
      .map((item, itemIndex) => ({
        id: `fallback-${targetIndex + 1}-${itemIndex + 1}`,
        order: itemIndex + 1,
        label: item,
        description: "",
        imageUrl: "",
        imageAlt: "",
        feedback: "",
      })),
  }));
}

function flattenActivityAnswers(questions: LessonContentDragQuestion[]): ActivityAnswerView[] {
  return questions.flatMap((question) =>
    question.answers.map((answer) => ({
      ...answer,
      questionId: question.id,
      questionPrompt: question.prompt,
      questionTone: question.tone,
    })),
  );
}

function ActivityAnswerCard({
  answer,
  checked,
  isSelected,
  placedQuestionId,
  onDragStart,
  onRemove,
  onSelect,
}: {
  answer: ActivityAnswerView;
  checked?: boolean;
  isSelected?: boolean;
  placedQuestionId?: string;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onRemove?: () => void;
  onSelect?: () => void;
}) {
  const isCheckedPlacement = Boolean(checked && placedQuestionId);
  const isCorrect = !isCheckedPlacement || placedQuestionId === answer.questionId;

  return (
    <div
      className={cn(
        "official-object-card official-activity-answer-card",
        toDropTone(answer.questionTone),
        isSelected && "is-selected",
        isCheckedPlacement && (isCorrect ? "is-correct" : "is-wrong"),
      )}
      draggable
      onDragStart={onDragStart}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect?.();
        }
      }}
      role="button"
      tabIndex={0}
    >
      {answer.imageUrl ? (
        <img alt={answer.imageAlt || answer.label} className="official-answer-image" src={answer.imageUrl} />
      ) : (
        <span className="official-object-visual" />
      )}
      <strong>{answer.label || "Đáp án chưa nhập"}</strong>
      {answer.description ? <small>{answer.description}</small> : null}
      {onRemove ? (
        <button
          aria-label="Đưa đáp án về danh sách"
          className="official-answer-remove"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
        >
          ×
        </button>
      ) : (
        <MousePointer2 className="size-4" />
      )}
    </div>
  );
}

function ActivitySideImage({ step }: { step?: LessonContentStep }) {
  const imageUrl = step?.objectiveImageUrl?.trim() || "";
  const imageAlt = step?.objectiveImageAlt?.trim() || step?.title || "Ảnh phân loại";

  return (
    <LearnerPanel className="official-activity-side-image-card">
      {imageUrl ? <img alt={imageAlt} src={imageUrl} /> : <HazardScene variant="person" />}
    </LearnerPanel>
  );
}

function toDropTone(tone?: string) {
  return tone === "red" || tone === "danger"
    ? "red"
    : tone === "amber" || tone === "warning" || tone === "uncertain"
      ? "amber"
      : tone === "green" || tone === "safe"
        ? "green"
        : "blue";
}

function getActivityIcon(tone?: string) {
  const normalized = toDropTone(tone);
  if (normalized === "red") {
    return <AlertTriangle className="size-5" />;
  }
  if (normalized === "amber") {
    return <HelpCircle className="size-5" />;
  }
  if (normalized === "green") {
    return <ShieldCheck className="size-5" />;
  }
  return <Target className="size-5" />;
}
