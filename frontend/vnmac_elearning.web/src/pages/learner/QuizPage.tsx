import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Download, QrCode, Share2, ShieldCheck, Trophy } from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  getCourseById,
  getCourseCertificate,
  getLearnerCourseCatalog,
  getLearnerCourseProgress,
  getQuizSession,
  submitQuizAttempt,
} from "../../shared/api/learner";
import { findQuiz, toQuizResultMap, toQuizSummaryMap } from "../../shared/lib/course";
import { formatDateTime } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import {
  LearnerMetaChip,
  LearnerPanel,
  LearnerScreenTitle,
  LearnerStatusBadge,
} from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";
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

export function QuizPage() {
  const { session } = useAuth();
  const { courseId = "", quizId = "" } = useParams();
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

  const certificateQuery = useQuery({
    queryKey: ["learner", userId, "course-certificate", courseId],
    queryFn: () => getCourseCertificate(userId, courseId),
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

  const [quizAnswers, setQuizAnswers] = useState<Record<string, QuestionDraftAnswer>>({});
  const [quizResult, setQuizResult] = useState<SubmittedResult | null>(null);

  useEffect(() => {
    setQuizAnswers({});
    setQuizResult(null);
  }, [quizId]);

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
        answers: (quizSessionQuery.data?.questions ?? []).map((question) =>
          toSubmissionRequest(question.questionId, quizAnswers[question.questionId] ?? createEmptyAnswer()),
        ),
      }),
    onSuccess: async (response) => {
      setQuizResult({
        passed: response.passed,
        score: response.score,
        attemptNumber: response.attemptNumber,
      });
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
        <MessageBanner tone="warning">
          Bạn chưa đăng ký khóa học này. Hãy đăng ký khóa học trước khi làm bài kiểm tra.
        </MessageBanner>
        <Button asChild className="w-fit rounded-2xl" variant="outline">
          <Link to={`/app/courses/${courseId}`}>Về trang khóa học</Link>
        </Button>
      </div>
    );
  }

  if (progressQuery.isError || !progressQuery.data || certificateQuery.isError) {
    return <MessageBanner tone="error">Không tải được dữ liệu bài kiểm tra.</MessageBanner>;
  }

  const quizResultSummary = toQuizResultMap(progressQuery.data.quizResults).get(quiz.assessmentLessonId);
  const effectiveResult =
    quizResult ??
    (quizSummary?.passed
      ? {
          passed: true,
          score: quizSummary.score,
          attemptNumber: quizSummary.attempts,
        }
      : null);

  if (!quizSummary?.isUnlocked) {
    return (
      <div className="grid gap-6">
        <MessageBanner tone="warning">
          Bài kiểm tra này chưa được mở. Bạn cần hoàn thành toàn bộ bài học nội dung liên quan trước khi làm bài.
        </MessageBanner>
        <Button asChild className="w-fit rounded-2xl" variant="outline">
          <Link to={`/app/courses/${courseId}`}>Quay về khóa học</Link>
        </Button>
      </div>
    );
  }

  if (quizSessionQuery.isLoading && !effectiveResult?.passed) {
    return <LoadingBlock label="Đang chuẩn bị câu hỏi bài kiểm tra..." />;
  }

  if (quizSessionQuery.isError && !effectiveResult?.passed) {
    return <MessageBanner tone="error">Không tải được phiên bài kiểm tra.</MessageBanner>;
  }

  const course = courseQuery.data;
  const certificate = certificateQuery.data?.certificate ?? null;
  const questionCount = quizSessionQuery.data?.questions.length ?? 0;
  const answeredCount = Object.values(quizAnswers).filter((item) => {
    return item.selectedOptionCodes.length > 0 || item.selectedHotspotCodes.length > 0 || Object.keys(item.matches).length > 0;
  }).length;

  return (
    <div className="grid gap-6">
      <LearnerScreenTitle index={4} title="Bài kiểm tra & Chứng chỉ" />

      {effectiveResult?.passed ? (
        <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
          <LearnerPanel className="overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4 text-sm text-slate-500">
              {course.title} / <span className="font-semibold text-slate-900">{quiz.title}</span>
            </div>

            <div className="grid gap-6 p-6">
              <div className="grid gap-5 rounded-[28px] bg-[radial-gradient(circle_at_top,_rgba(255,204,98,0.32),_transparent_54%),linear-gradient(180deg,#fffdfa_0%,#fff7ea_100%)] px-6 py-10 text-center">
                <div className="mx-auto grid size-20 place-items-center rounded-full bg-amber-100 text-amber-600">
                  <Trophy className="size-10" />
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-slate-500">Kết quả bài kiểm tra</p>
                  <h3 className="text-[4rem] font-semibold tracking-[-0.06em] text-[#163b7b]">
                    {effectiveResult.score}%
                  </h3>
                  <p className="text-lg font-medium text-slate-900">Bạn đã hoàn thành xuất sắc.</p>
                </div>

                <div className="grid gap-3 rounded-[22px] border border-slate-200 bg-white p-4 text-left sm:grid-cols-3">
                  <ResultStat label="Số câu đúng" value={`${questionCount}/${questionCount}`} />
                  <ResultStat label="Lần làm bài" value={String(effectiveResult.attemptNumber)} />
                  <ResultStat label="Điều kiện đạt" value="100%" />
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 p-5">
                <h4 className="text-base font-semibold text-slate-950">Điều kiện cấp chứng chỉ</h4>
                <div className="mt-4 grid gap-3 text-sm">
                  <RequirementRow label="Hoàn thành 100% bài học nội dung" value="100%" />
                  <RequirementRow label="Đạt 100% bài kiểm tra" value="100%" />
                  <RequirementRow
                    label="Thời lượng học tối thiểu"
                    value={`${catalogItem.estimatedStudyTimeMinutes} phút`}
                  />
                </div>

                <Button asChild className="mt-5 w-full rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]">
                  <Link to="/app/certificate">Xem chứng chỉ của tôi</Link>
                </Button>
              </div>
            </div>
          </LearnerPanel>

          <LearnerPanel className="overflow-hidden p-6">
            <h3 className="text-[1.35rem] font-semibold text-slate-950">Chứng chỉ hoàn thành khóa học</h3>

            <div className="mt-5 rounded-[28px] border border-[#efddba] bg-[linear-gradient(180deg,#fffef9_0%,#fff9ef_100%)] p-8 shadow-[inset_0_0_0_1px_rgba(241,211,162,0.45)]">
              <div className="mx-auto grid max-w-[640px] gap-6 text-center text-slate-900">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Trung tâm Hành động Bom mìn Quốc gia Việt Nam
                </p>

                <div className="grid gap-3">
                  <h4 className="text-[2.4rem] font-semibold tracking-[0.06em] text-[#163b7b]">CHỨNG CHỈ</h4>
                  <p className="text-lg">Hoàn thành khóa học</p>
                </div>

                <div className="grid gap-2">
                  <p className="text-[1.45rem] font-semibold">{course.title}</p>
                  <p className="text-lg">Cấp cho học viên</p>
                  <p className="text-[2rem] font-semibold tracking-[-0.03em]">{session?.user.fullName}</p>
                </div>

                <div className="grid gap-2 text-sm text-slate-600">
                  <p>Đã hoàn thành khóa học với kết quả xuất sắc.</p>
                  <p>Ngày cấp: {certificate?.issuedDate ? formatDateTime(certificate.issuedDate) : "Đang cập nhật"}</p>
                  <p>Mã chứng chỉ: {certificate?.certificateId ?? "VNMAC-2025-000123"}</p>
                </div>

                <div className="grid items-end gap-6 sm:grid-cols-[1fr_auto]">
                  <div className="text-left text-sm text-slate-500">
                    <p>Giám đốc Trung tâm</p>
                    <div className="mt-6 h-12 w-36 border-b border-slate-300" />
                  </div>
                  <div className="grid place-items-center gap-2 rounded-[24px] border border-slate-200 bg-white p-4">
                    <QrCode className="size-20 text-slate-800" />
                    <span className="text-xs text-slate-500">Quét mã để xác thực</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button className="rounded-2xl" type="button" variant="outline">
                <Download className="mr-2 size-4" />
                Tải xuống PDF
              </Button>
              <Button className="rounded-2xl" type="button" variant="outline">
                <Share2 className="mr-2 size-4" />
                Chia sẻ
              </Button>
            </div>
          </LearnerPanel>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
          <div className="grid gap-6">
            <LearnerPanel className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="grid gap-3">
                  <span className="w-fit rounded-full bg-[#eaf3ff] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#163b7b]">
                    {quiz.sectionId ? "Bài kiểm tra theo phần học" : "Bài kiểm tra cuối khóa"}
                  </span>
                  <div className="space-y-2">
                    <h1 className="text-[2rem] font-semibold leading-tight tracking-[-0.035em] text-slate-950">{quiz.title}</h1>
                    <p className="max-w-[760px] text-sm leading-7 text-slate-600">
                      Bạn cần trả lời đúng 100% số câu hỏi để hoàn thành bài kiểm tra và đủ điều kiện nhận chứng chỉ.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <LearnerMetaChip>{questionCount} câu hỏi</LearnerMetaChip>
                  <LearnerMetaChip>Điều kiện đạt 100%</LearnerMetaChip>
                </div>
              </div>
            </LearnerPanel>

            {quizMutation.isError ? (
              <MessageBanner tone="error">Không thể nộp bài kiểm tra. Vui lòng thử lại.</MessageBanner>
            ) : null}

            {quizSessionQuery.data?.questions.map((question) => (
              <LearnerQuestionCard
                answer={quizAnswers[question.questionId] ?? createEmptyAnswer()}
                disabled={quizMutation.isPending}
                key={question.questionId}
                question={question}
                onChange={(answer) =>
                  setQuizAnswers((current) => ({
                    ...current,
                    [question.questionId]: answer,
                  }))
                }
              />
            ))}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button asChild className="rounded-2xl" variant="outline">
                <Link to={`/app/courses/${course.id}`}>Quay về khóa học</Link>
              </Button>
              <Button
                className="rounded-2xl bg-[#163b7b] px-5 hover:bg-[#0f2e63]"
                disabled={quizMutation.isPending}
                type="button"
                onClick={() => quizMutation.mutate()}
              >
                {quizMutation.isPending ? "Đang nộp bài..." : "Nộp bài kiểm tra"}
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <LearnerPanel className="p-5">
              <h3 className="text-[1.2rem] font-semibold text-slate-950">Trạng thái bài kiểm tra</h3>
              <div className="mt-4 grid gap-3 text-sm">
                <SummaryRow label="Số câu đã trả lời" value={`${answeredCount}/${questionCount}`} />
                <SummaryRow label="Điểm gần nhất" value={`${quizResultSummary?.score ?? quizSummary?.score ?? 0}%`} />
                <SummaryRow label="Số lần làm" value={String(quizResultSummary?.attempts ?? quizSummary?.attempts ?? 0)} />
              </div>
            </LearnerPanel>

            <LearnerPanel className="p-5">
              <h3 className="text-[1.2rem] font-semibold text-slate-950">Điều kiện nhận chứng chỉ</h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-600">
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Hoàn thành bài học nội dung</span>
                  <LearnerStatusBadge
                    tone={catalogItem.enrollment?.contentCompletionPercent === 100 ? "success" : "warning"}
                  >
                    {catalogItem.enrollment?.contentCompletionPercent ?? 0}%
                  </LearnerStatusBadge>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                  <span>Đạt 100% bài kiểm tra</span>
                  <LearnerStatusBadge tone={quizSummary?.passed ? "success" : "warning"}>
                    {quizSummary?.score ?? 0}%
                  </LearnerStatusBadge>
                </div>
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Bài kiểm tra chỉ được ghi nhận hoàn thành khi bạn đạt đủ 100% số câu trả lời đúng.
                </div>
              </div>
            </LearnerPanel>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-950">{value}</p>
    </div>
  );
}

function RequirementRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-3 text-slate-600">
        <ShieldCheck className="size-4 text-emerald-500" />
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-600">{label}</span>
      <strong className="text-slate-950">{value}</strong>
    </div>
  );
}
