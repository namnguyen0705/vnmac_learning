import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, HelpCircle, Star } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import { MessageBanner } from "../../../shared/ui/MessageBanner";
import type { CourseLesson, LessonContentStep } from "../../../shared/types/api";
import { HazardScene, SummaryLine } from "./LessonVisuals";
import { buildCheckQuestions, type LessonCheckQuestionView } from "./lessonQuestionUtils";

export function LessonCheckScreen({
  lesson,
  mutationError,
  mutationPending,
  step,
  onContinue,
  onReadyChange,
}: {
  lesson: CourseLesson;
  mutationError: boolean;
  mutationPending: boolean;
  step?: LessonContentStep;
  onContinue: () => void;
  onReadyChange: (isReady: boolean) => void;
}) {
  const checkQuestions = useMemo(() => shuffleCheckQuestions(buildCheckQuestions(step)), [step]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<Record<string, string>>({});
  const [checkedQuestionIds, setCheckedQuestionIds] = useState<Record<string, boolean>>({});
  const activeQuestion = checkQuestions[currentQuestionIndex] ?? checkQuestions[0];
  const activeQuestionCount = Math.max(checkQuestions.length, 1);
  const isLastQuestion = currentQuestionIndex >= activeQuestionCount - 1;
  const activeSelectedCode = activeQuestion ? selectedCodes[activeQuestion.id] : undefined;
  const activeSelectedOption = activeQuestion?.options.find((option) => option.code === activeSelectedCode);
  const activeChecked = Boolean(activeQuestion && checkedQuestionIds[activeQuestion.id]);
  const activeCorrect = Boolean(activeChecked && activeSelectedOption?.isCorrect);
  const isCheckQuestionCorrect = (question?: LessonCheckQuestionView) => {
    if (!question || !checkedQuestionIds[question.id]) {
      return false;
    }

    const code = selectedCodes[question.id];
    const option = question.options.find((candidate) => candidate.code === code);
    return Boolean(option?.isCorrect);
  };
  const allCheckQuestionsCorrect =
    checkQuestions.length > 0 &&
    checkQuestions.every((question) => isCheckQuestionCorrect(question));
  const activeImageUrl = activeQuestion?.imageUrl?.trim() || "";
  const activeImageAlt = activeQuestion?.imageAlt?.trim() || activeQuestion?.prompt || "Minh họa câu hỏi";
  const activeFeedbackText =
    activeSelectedOption?.isCorrect
      ? activeQuestion?.feedback?.trim() || step?.feedback?.trim() || "Chính xác. Bạn đã chọn hành vi an toàn."
      : activeChecked
        ? activeQuestion?.explanation?.trim() || "Đáp án này chưa đúng. Hãy chọn lại đáp án an toàn nhất."
        : "";

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setSelectedCodes({});
    setCheckedQuestionIds({});
    onReadyChange(false);
  }, [lesson.id, onReadyChange, step]);

  useEffect(() => {
    onReadyChange(allCheckQuestionsCorrect);
  }, [allCheckQuestionsCorrect, onReadyChange]);

  const selectCheckOption = (questionId: string, code: string) => {
    setSelectedCodes((current) => ({ ...current, [questionId]: code }));
    setCheckedQuestionIds((current) => {
      const next = { ...current };
      delete next[questionId];
      return next;
    });
  };

  const checkActiveQuestion = () => {
    if (!activeQuestion || !activeSelectedCode) {
      return;
    }

    setCheckedQuestionIds((current) => ({ ...current, [activeQuestion.id]: true }));
  };

  const goToNextCheckQuestion = () => {
    if (activeCorrect && currentQuestionIndex < activeQuestionCount - 1) {
      setCurrentQuestionIndex((current) => current + 1);
    }
  };

  const continueAfterCorrect = () => {
    if (!activeCorrect) {
      return;
    }

    if (isLastQuestion) {
      onContinue();
      return;
    }

    goToNextCheckQuestion();
  };

  if (activeCorrect) {
    return (
      <LessonCheckFeedbackScreen
        isFinal={isLastQuestion}
        mutationError={mutationError}
        mutationPending={mutationPending}
        question={activeQuestion}
        questionCount={activeQuestionCount}
        questionIndex={currentQuestionIndex}
        feedbackText={activeFeedbackText}
        imageAlt={activeImageAlt}
        imageUrl={activeImageUrl}
        onContinue={continueAfterCorrect}
      />
    );
  }

  return (
    <section className="official-lesson-check">
      <div className="official-check-main">
        <div>
          <h1>KIỂM TRA CUỐI BÀI</h1>
          <p>Chọn câu trả lời đúng nhất.</p>
        </div>

        <LearnerPanel className="official-question-panel">
          <div className="official-question-progress">
            <strong className="official-question-current">Câu {currentQuestionIndex + 1}/{activeQuestionCount}</strong>
            <strong>Câu {currentQuestionIndex + 1}/{activeQuestionCount}</strong>
            <span
              style={{
                background: `linear-gradient(90deg, #075bdc ${((currentQuestionIndex + 1) / activeQuestionCount) * 100}%, #e5ebf3 ${((currentQuestionIndex + 1) / activeQuestionCount) * 100}%)`,
              }}
            />
          </div>

          <div className="official-question-body">
            {activeImageUrl ? <img alt={activeImageAlt} className="official-question-image" src={activeImageUrl} /> : <HazardScene variant="thumb" />}
            <div className="official-question-content">
              <h2>{activeQuestion?.prompt}</h2>
              {activeQuestion?.options.map((option, index) => {
                const checked = option.code === activeSelectedCode;
                const showCorrect = activeChecked && checked && option.isCorrect;
                const showWrong = activeChecked && checked && !option.isCorrect;
                return (
                  <button
                    className={cn("official-answer-row", checked && "selected", showWrong && "is-wrong")}
                    key={option.code}
                    type="button"
                    onClick={() => activeQuestion && selectCheckOption(activeQuestion.id, option.code)}
                  >
                    <span>{checked ? <CheckCircle2 className="size-4" /> : null}</span>
                    <strong>{String.fromCharCode(65 + index)}.</strong>
                    {option.label}
                    {showCorrect ? <CheckCircle2 className="ml-auto size-5 text-emerald-600" /> : null}
                    {showWrong ? <AlertTriangle className="ml-auto size-5 text-red-600" /> : null}
                  </button>
                );
              })}
              {activeChecked ? <div className={cn("official-correct-box", !activeCorrect && "is-wrong")}>
                {activeCorrect ? <CheckCircle2 className="size-6" /> : <AlertTriangle className="size-6" />}
                <div>
                  <strong className="official-check-result-title">{activeCorrect ? "Chính xác!" : "Chưa đúng"}</strong>
                  <strong>Chính xác!</strong>
                  <span>{activeFeedbackText}</span>
                </div>
              </div> : null}
            </div>
          </div>
        </LearnerPanel>

        {mutationError ? (
          <MessageBanner tone="error">Chưa ghi nhận được kết quả bài học. Vui lòng thử lại.</MessageBanner>
        ) : null}
      </div>

      <LearnerPanel className="official-test-info">
        <h2>
          <ClipboardCheck className="size-5" />
          Thông tin bài kiểm tra
        </h2>
        <SummaryLine label="Bài kiểm tra" value={lesson.title} />
        <SummaryLine label="Số câu hỏi" value={`${activeQuestionCount} câu`} />
        <SummaryLine label="Yêu cầu" value="Đạt 100% để hoàn thành bài học" />
        <div className="official-question-nav">
          {Array.from({ length: activeQuestionCount }).map((_, index) => (
            <button
              className={cn(index === currentQuestionIndex && "active", checkedQuestionIds[checkQuestions[index]?.id ?? ""] && "done")}
              disabled={index > currentQuestionIndex && !isCheckQuestionCorrect(checkQuestions[index - 1])}
              key={index}
              type="button"
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>
        <div className="official-status-legend">
          <span><CheckCircle2 className="size-4" /> Đã trả lời đúng</span>
          <span><HelpCircle className="size-4" /> Chưa trả lời</span>
          <span><AlertTriangle className="size-4" /> Đang trả lời</span>
        </div>
        <Button
          className="official-blue-button w-full"
          disabled={mutationPending || !activeSelectedCode}
          type="button"
          onClick={checkActiveQuestion}
        >
          {mutationPending ? "Đang kiểm tra..." : "Kiểm tra"}
        </Button>
      </LearnerPanel>
    </section>
  );
}

function LessonCheckFeedbackScreen({
  feedbackText,
  imageAlt,
  imageUrl,
  isFinal,
  mutationError,
  mutationPending,
  question,
  questionCount,
  questionIndex,
  onContinue,
}: {
  feedbackText: string;
  imageAlt: string;
  imageUrl: string;
  isFinal: boolean;
  mutationError: boolean;
  mutationPending: boolean;
  question?: LessonCheckQuestionView;
  questionCount: number;
  questionIndex: number;
  onContinue: () => void;
}) {
  if (isFinal) {
    return (
      <section className="official-lesson-check-feedback is-final">
        <LearnerPanel className="official-check-feedback-card">
          <div className="official-check-score-ring">
            <strong>100%</strong>
            <span>
              {Array.from({ length: 5 }).map((_, index) => (
                <Star className="size-4 fill-current" key={index} />
              ))}
            </span>
          </div>
          <h1>Tuyệt vời!</h1>
          <p>Bạn đã trả lời đúng tất cả câu hỏi.</p>
          <div className="official-check-feedback-note">
            <CheckCircle2 className="size-5" />
            Bạn có thể tiếp tục bài học.
          </div>
          {mutationError ? <MessageBanner tone="error">Chưa ghi nhận được kết quả bài học. Vui lòng thử lại.</MessageBanner> : null}
          <Button className="official-blue-button official-check-feedback-button" disabled={mutationPending} type="button" onClick={onContinue}>
            {mutationPending ? "Đang lưu..." : "Tiếp tục"}
            <ArrowRight className="size-4" />
          </Button>
        </LearnerPanel>
      </section>
    );
  }

  return (
    <section className="official-lesson-check-feedback">
      <LearnerPanel className="official-check-feedback-card">
        <div className="official-check-feedback-progress">
          <span
            style={{
              background: `linear-gradient(90deg, #075bdc ${((questionIndex + 1) / questionCount) * 100}%, #e5ebf3 ${((questionIndex + 1) / questionCount) * 100}%)`,
            }}
          />
          <strong>{questionIndex + 1}/{questionCount}</strong>
        </div>
        <CheckCircle2 className="official-check-feedback-icon" />
        <h1>Đúng!</h1>
        <p>{feedbackText}</p>
        <div className="official-check-knowledge">
          <strong>Kiến thức liên quan:</strong>
          <span>{question?.explanation || feedbackText}</span>
          {imageUrl ? <img alt={imageAlt} src={imageUrl} /> : <HazardScene variant="thumb" />}
        </div>
        <Button className="official-blue-button official-check-feedback-button" type="button" onClick={onContinue}>
          Tiếp tục
        </Button>
      </LearnerPanel>
    </section>
  );
}

function shuffleCheckQuestions(questions: LessonCheckQuestionView[]) {
  return [...questions]
    .map((question) => ({ question, sort: Math.random() }))
    .sort((left, right) => left.sort - right.sort)
    .map((item) => item.question);
}
