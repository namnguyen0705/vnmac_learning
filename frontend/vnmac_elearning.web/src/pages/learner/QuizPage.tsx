import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileQuestion,
  HelpCircle,
  Lightbulb,
  ListChecks,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Trophy,
  XCircle,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  getCourseById,
  getLearnerCourseCatalog,
  getLearnerCourseProgress,
  getQuizSession,
  submitQuizAttempt,
} from "../../shared/api/learner";
import { findQuiz, toQuizSummaryMap } from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerPanel } from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type { LearnerQuestionPayload } from "../../shared/types/api";
import {
  createEmptyAnswer,
  LearnerQuestionCard,
  toSubmissionRequest,
  type QuestionDraftAnswer,
} from "../../features/question-engine/LearnerQuestionCard";

type SubmittedResult = {
  passed: boolean;
  score: number;
  attemptNumber: number;
};

const FINAL_TOPICS = [
  "Nhận diện (EORE)",
  "Hành vi (EORE)",
  "Tình huống thực tế (EORE + SBC)",
  "Truyền thông (SBC)",
];

export function QuizPage() {
  const { session } = useAuth();
  const { courseId = "", quizId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? "";

  const courseQuery = useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => getCourseById(courseId),
    enabled: Boolean(courseId),
  });

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  const catalogItem = catalogQuery.data?.courses.find((item) => item.courseId === courseId);
  const isEnrolled = Boolean(catalogItem?.isEnrolled);

  const progressQuery = useQuery({
    queryKey: ["learner", userId, "course-progress", courseId],
    queryFn: () => getLearnerCourseProgress(userId, courseId),
    enabled: Boolean(userId && courseId && isEnrolled),
  });

  const quiz = useMemo(() => {
    if (!courseQuery.data) {
      return undefined;
    }

    return findQuiz(courseQuery.data, quizId);
  }, [courseQuery.data, quizId]);

  const quizSummary = progressQuery.data ? toQuizSummaryMap(progressQuery.data.quizzes).get(quizId) : undefined;
  const quizSessionQuery = useQuery({
    queryKey: ["learner", userId, "quiz-session", quizId],
    queryFn: () => getQuizSession(userId, quizId),
    enabled: Boolean(userId && quizId && isEnrolled && quizSummary?.isUnlocked),
  });

  const [answers, setAnswers] = useState<Record<string, QuestionDraftAnswer>>({});
  const [quizResult, setQuizResult] = useState<SubmittedResult | null>(null);
  const [isStarted, setIsStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forceRetake, setForceRetake] = useState(false);

  useEffect(() => {
    setAnswers({});
    setQuizResult(null);
    setIsStarted(false);
    setCurrentIndex(0);
    setForceRetake(false);
  }, [quizId, userId]);

  const invalidateLearnerQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "course-progress", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "quiz-session", quizId] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "course-certificate", courseId] }),
    ]);
  };

  const quizMutation = useMutation({
    mutationFn: () =>
      submitQuizAttempt(userId, quizId, {
        answers: (quizSessionQuery.data?.questions ?? []).map((question) => toQuizSubmission(question, answers)),
      }),
    onSuccess: async (response) => {
      setQuizResult({
        passed: response.passed,
        score: response.score,
        attemptNumber: response.attemptNumber,
      });
      setIsStarted(false);
      await invalidateLearnerQueries();
    },
  });

  if (courseQuery.isLoading || catalogQuery.isLoading || (isEnrolled && progressQuery.isLoading)) {
    return <LoadingBlock label="Đang tải bài kiểm tra..." />;
  }

  if (courseQuery.isError || catalogQuery.isError || !courseQuery.data || !quiz || !catalogItem) {
    return <MessageBanner tone="error">Không tải được bài kiểm tra.</MessageBanner>;
  }

  if (!isEnrolled) {
    return (
      <div className="grid gap-6">
        <MessageBanner tone="warning">Bạn chưa đăng ký khóa học này. Hãy đăng ký khóa học trước khi làm bài kiểm tra.</MessageBanner>
        <Button asChild className="w-fit rounded-lg" variant="outline">
          <Link to={`/app/courses/${courseId}`}>Về trang khóa học</Link>
        </Button>
      </div>
    );
  }

  if (progressQuery.isError || !progressQuery.data) {
    return <MessageBanner tone="error">Không tải được dữ liệu bài kiểm tra.</MessageBanner>;
  }

  const questionCount = quizSessionQuery.data?.questions.length ?? quiz.assessment?.questionCount ?? 12;
  const effectiveResult =
    quizResult ??
    (!forceRetake && quizSummary?.passed
      ? {
          passed: true,
          score: quizSummary.score,
          attemptNumber: quizSummary.attempts,
        }
      : null);

  if (!quizSummary?.isUnlocked) {
    return (
      <FinalQuizIntro
        disabled
        questionCount={questionCount}
        title={quiz.title}
        onBack={() => navigate("/app/courses")}
        onStart={() => undefined}
      />
    );
  }

  if (quizSessionQuery.isLoading && !effectiveResult?.passed) {
    return <LoadingBlock label="Đang chuẩn bị câu hỏi bài kiểm tra..." />;
  }

  if (quizSessionQuery.isError && !effectiveResult?.passed) {
    return <MessageBanner tone="error">Không tải được phiên bài kiểm tra.</MessageBanner>;
  }

  if (effectiveResult?.passed) {
    return (
      <FinalQuizResult
        passed
        questionCount={questionCount}
        score={effectiveResult.score}
        onRetry={() => {
          setAnswers({});
          setQuizResult(null);
          setIsStarted(true);
          setCurrentIndex(0);
          setForceRetake(true);
        }}
        onReview={() => navigate("/app/courses")}
      />
    );
  }

  if (quizResult && !quizResult.passed) {
    return (
      <FinalQuizResult
        questionCount={questionCount}
        score={quizResult.score}
        onRetry={() => {
          setAnswers({});
          setQuizResult(null);
          setIsStarted(true);
          setCurrentIndex(0);
          setForceRetake(true);
        }}
        onReview={() => navigate("/app/courses")}
      />
    );
  }

  if (!isStarted) {
    return (
      <FinalQuizIntro
        questionCount={questionCount}
        title={quiz.title}
        onBack={() => navigate("/app/courses")}
        onStart={() => {
          setAnswers({});
          setQuizResult(null);
          setCurrentIndex(0);
          setForceRetake(false);
          setIsStarted(true);
        }}
      />
    );
  }

  const questions = quizSessionQuery.data?.questions ?? [];
  const currentQuestion = questions[currentIndex];

  if (!currentQuestion) {
    return <MessageBanner tone="error">Không có câu hỏi trong bài kiểm tra.</MessageBanner>;
  }

  const currentAnswer = answers[currentQuestion.id] ?? createEmptyAnswer();
  const answeredCount = questions.filter((question) => isQuestionAnswered(question, answers[question.id])).length;
  const allQuestionsAnswered = answeredCount === questions.length;

  const goPrevious = () => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  };

  const goNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((index) => index + 1);
      return;
    }

    if (allQuestionsAnswered) {
      quizMutation.mutate();
    }
  };

  return (
    <FinalQuizQuestion
      answeredCount={answeredCount}
      currentIndex={currentIndex}
      disabled={quizMutation.isPending}
      error={quizMutation.isError}
      canSubmit={allQuestionsAnswered}
      question={currentQuestion}
      questionCount={questions.length}
      answer={currentAnswer}
      onBack={goPrevious}
      onNext={goNext}
      onChange={(answer) =>
        setAnswers((current) => ({
          ...current,
          [currentQuestion.id]: answer,
        }))
      }
    />
  );
}

function FinalQuizIntro({
  disabled = false,
  questionCount,
  title,
  onBack,
  onStart,
}: {
  disabled?: boolean;
  questionCount: number;
  title: string;
  onBack: () => void;
  onStart: () => void;
}) {
  return (
    <section className="final-quiz-intro">
      <div className="final-quiz-intro-copy">
        <h1>BÀI KIỂM TRA CUỐI KHÓA</h1>
        <p>Bạn sẽ làm bài kiểm tra để hoàn thành khóa học. Hãy chọn câu trả lời đúng nhất.</p>
        <div className="final-quiz-illustration" aria-hidden="true">
          <FileQuestion className="size-20" />
          <Award className="size-16" />
        </div>
      </div>

      <LearnerPanel className="final-quiz-info-card">
        <QuizInfoRow icon={ListChecks} label="Số câu hỏi" value={`${questionCount} câu`} />
        <QuizInfoRow
          icon={BookOpen}
          label="Nội dung"
          value={
            <ul>
              {FINAL_TOPICS.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          }
        />
        <QuizInfoRow icon={Clock3} label="Thời gian" value="5 - 7 phút" />
        <QuizInfoRow icon={Trophy} label="Điều kiện đạt" value="Phải đạt 100%" />
        <QuizInfoRow icon={HelpCircle} label="Câu hỏi" value="Được chọn ngẫu nhiên cho mỗi lần làm bài" />
        <Button className="official-blue-button final-quiz-start" disabled={disabled} type="button" onClick={onStart}>
          {disabled ? "Chưa đủ điều kiện" : "Bắt đầu"}
          <ArrowRight className="size-5" />
        </Button>
        <button className="final-quiz-back" type="button" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Quay lại bài học
        </button>
        <p className="final-quiz-note">
          <Shield className="size-4" />
          {disabled ? "Bạn cần hoàn thành 100% bài học để mở bài kiểm tra cuối khóa." : "Bạn cần đạt 100% để hoàn thành khóa học và nhận chứng chỉ."}
        </p>
      </LearnerPanel>
    </section>
  );
}

function FinalQuizQuestion({
  answer,
  answeredCount,
  canSubmit,
  currentIndex,
  disabled,
  error,
  question,
  questionCount,
  onBack,
  onNext,
  onChange,
}: {
  answer: QuestionDraftAnswer;
  answeredCount: number;
  canSubmit: boolean;
  currentIndex: number;
  disabled: boolean;
  error: boolean;
  question: LearnerQuestionPayload;
  questionCount: number;
  onBack: () => void;
  onNext: () => void;
  onChange: (answer: QuestionDraftAnswer) => void;
}) {
  const percent = Math.round(((currentIndex + 1) / questionCount) * 100);
  const isLastQuestion = currentIndex === questionCount - 1;

  return (
    <section className="final-quiz-question-screen">
      <div className="final-quiz-progress-head">
        <h1>Câu {currentIndex + 1} / {questionCount}</h1>
        <div className="final-quiz-progress-track">
          <span style={{ width: `${percent}%` }} />
        </div>
        <strong>{percent}%</strong>
        <div className="final-quiz-randomized">
          <Shuffle className="size-5" />
          Câu hỏi được chọn ngẫu nhiên
        </div>
      </div>

      <div className="final-quiz-question-grid">
        <LearnerPanel className="final-question-card">
          <p>PHẦN {currentIndex < 6 ? "1: NHẬN DIỆN (EORE)" : "2: TRUYỀN THÔNG (SBC)"}</p>
          <LearnerQuestionCard
            answer={answer}
            disabled={disabled}
            question={question}
            onChange={onChange}
          />
        </LearnerPanel>

        <LearnerPanel className="final-hint-card">
          <h2>
            <Lightbulb className="size-6" />
            GỢI Ý
          </h2>
          <p>Nguyên tắc quan trọng:</p>
          <strong>“Không chạm - Tránh xa - Báo ngay”</strong>
          <div className="final-hint-scene" aria-hidden="true">
            <ShieldAlert className="size-16" />
            <span>KHU VỰC NGUY HIỂM</span>
          </div>
          <div className="final-answered-count">
            <CheckCircle2 className="size-4" />
            Đã trả lời {answeredCount}/{questionCount}
          </div>
        </LearnerPanel>
      </div>

      {error ? <MessageBanner tone="error">Không nộp được bài kiểm tra. Vui lòng thử lại.</MessageBanner> : null}

      {isLastQuestion && !canSubmit ? (
        <MessageBanner tone="warning">Bạn cần trả lời đủ {questionCount} câu trước khi nộp bài.</MessageBanner>
      ) : null}

      <div className="final-quiz-actions">
        <Button className="final-prev-button" disabled={currentIndex === 0 || disabled} type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Câu trước
        </Button>
        <Button className="official-blue-button final-next-button" disabled={disabled || !isQuestionAnswered(question, answer) || (isLastQuestion && !canSubmit)} type="button" onClick={onNext}>
          {isLastQuestion ? "Nộp bài" : "Tiếp theo"}
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </section>
  );
}

function FinalQuizResult({
  passed = false,
  questionCount,
  score,
  onRetry,
  onReview,
}: {
  passed?: boolean;
  questionCount: number;
  score: number;
  onRetry: () => void;
  onReview: () => void;
}) {
  const correctCount = Math.round((Math.max(0, Math.min(100, score)) / 100) * questionCount);

  return (
    <section className={cn("final-quiz-result", passed ? "success" : "failed")}>
      <LearnerPanel className="final-result-panel">
        <div className="final-result-visual" aria-hidden="true">
          {passed ? <ShieldCheck className="size-32" /> : <ShieldAlert className="size-32" />}
        </div>

        <div className="final-result-content">
          <h1>
            {passed ? <Trophy className="size-8" /> : <XCircle className="size-8" />}
            {passed ? "CHÚC MỪNG!" : "CHƯA ĐẠT"}
          </h1>
          <p>{passed ? "Bạn đã hoàn thành bài kiểm tra cuối khóa." : "Bạn chưa đáp ứng yêu cầu đạt 100%."}</p>

          <div className="final-result-score">
            <span>Kết quả</span>
            <strong>{correctCount} / {questionCount}</strong>
            <small>{score}%</small>
          </div>

          {passed ? (
            <div className="final-result-benefits">
              <span><ShieldCheck className="size-5" /> Bạn đã nắm vững kiến thức và kỹ năng</span>
              <span><Award className="size-5" /> Đủ điều kiện nhận chứng chỉ</span>
              <span><Lightbulb className="size-5" /> Cùng chung tay xây dựng cộng đồng an toàn</span>
            </div>
          ) : (
            <div className="final-result-warning">
              <AlertTriangle className="size-8" />
              <span>Hãy xem lại bài học để củng cố kiến thức và thử lại để đạt kết quả tốt nhất.</span>
            </div>
          )}

          <div className="final-result-actions">
            {passed ? (
              <Button asChild className="official-blue-button">
                <Link to="/app/certificate">
                  Nhận chứng chỉ
                  <Award className="size-4" />
                </Link>
              </Button>
            ) : (
              <Button className="final-red-button" type="button" onClick={onRetry}>
                <RotateCcw className="size-4" />
                Làm lại bài kiểm tra
              </Button>
            )}
            <Button className="final-review-button" type="button" variant="outline" onClick={onReview}>
              <BookOpen className="size-4" />
              Xem lại bài học
            </Button>
          </div>
        </div>
      </LearnerPanel>
    </section>
  );
}

function QuizInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string | ReactNode;
}) {
  return (
    <div className="final-quiz-info-row">
      <Icon className="size-6" />
      <strong>{label}</strong>
      <div>{value}</div>
    </div>
  );
}

function toQuizSubmission(
  question: LearnerQuestionPayload,
  answers: Record<string, QuestionDraftAnswer>,
) {
  return toSubmissionRequest(question.id, answers[question.id]);
}

function isQuestionAnswered(question: LearnerQuestionPayload, answer?: QuestionDraftAnswer) {
  if (!answer) {
    return false;
  }

  if (question.type === "Hotspot") {
    return answer.hotspotClicks.length > 0;
  }

  if (question.type === "DragDrop") {
    return question.dragItems.length > 0 &&
      question.dragItems.every((item) => Boolean(answer.matches[item.code]));
  }

  return answer.selectedOptionCodes.length > 0;
}
