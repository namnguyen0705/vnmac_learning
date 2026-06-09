import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  Download,
  FileText,
  Hand,
  Lock,
  MonitorPlay,
  Volume2,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  getCourseById,
  getLearnerCourseCatalog,
  getLearnerCourseProgress,
  submitInteractiveAttempt,
  updateVideoProgress,
} from "../../shared/api/learner";
import {
  findLesson,
  flattenLessons,
  flattenQuizzes,
  toLessonSummaryMap,
  toProgressMap,
} from "../../shared/lib/course";
import { clampPercent, formatMinutes } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import {
  LearnerMetaChip,
  LearnerPanel,
  LearnerProgressBar,
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
import type { InteractiveAttemptResponse } from "../../shared/types/api";

function getLessonIcon(type: string) {
  switch (type) {
    case "Interactive":
      return Hand;
    case "Scorm":
      return MonitorPlay;
    default:
      return CirclePlay;
  }
}

export function LessonPage() {
  const { session } = useAuth();
  const { courseId = "", lessonId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? "";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedPercentRef = useRef(0);
  const [videoPercent, setVideoPercent] = useState(0);
  const [interactiveAnswers, setInteractiveAnswers] = useState<Record<string, QuestionDraftAnswer>>({});
  const [interactiveResult, setInteractiveResult] = useState<InteractiveAttemptResponse | null>(null);

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

  const lesson = useMemo(() => {
    if (!courseQuery.data) {
      return undefined;
    }

    return findLesson(courseQuery.data, lessonId);
  }, [courseQuery.data, lessonId]);

  const orderedLessons = useMemo(() => {
    return courseQuery.data ? flattenLessons(courseQuery.data) : [];
  }, [courseQuery.data]);

  const lessonIndex = orderedLessons.findIndex((item) => item.id === lessonId);
  const previousLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < orderedLessons.length - 1 ? orderedLessons[lessonIndex + 1] : null;

  const progressMap = progressQuery.data ? toProgressMap(progressQuery.data.progress) : new Map();
  const lessonSummaryMap = progressQuery.data ? toLessonSummaryMap(progressQuery.data.lessons) : new Map();

  useEffect(() => {
    setInteractiveAnswers({});
    setInteractiveResult(null);
    setVideoPercent(0);
    lastSavedPercentRef.current = 0;
  }, [lessonId]);

  useEffect(() => {
    const snapshot = progressMap.get(lessonId);
    if (snapshot) {
      setVideoPercent(snapshot.watchPercent);
      lastSavedPercentRef.current = snapshot.watchPercent;
    }
  }, [lessonId, progressMap]);

  const refreshProgress = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "course-progress", courseId] }),
    ]);
  };

  const videoMutation = useMutation({
    mutationFn: (payload: { watchPercent: number; watchTimeMinutes: number }) =>
      updateVideoProgress(userId, lessonId, payload),
    onSuccess: refreshProgress,
  });

  const interactiveMutation = useMutation({
    mutationFn: () =>
      submitInteractiveAttempt(userId, lessonId, {
        answers: (lesson?.assessment?.questions ?? []).map((question) =>
          toSubmissionRequest(question.questionId, interactiveAnswers[question.questionId] ?? createEmptyAnswer()),
        ),
      }),
    onSuccess: async (response) => {
      setInteractiveResult(response);
      await refreshProgress();
    },
  });

  const persistVideoProgress = (force = false) => {
    const element = videoRef.current;
    if (!element || !lesson?.videoContent) {
      return;
    }

    const nextPercent = element.duration > 0 ? clampPercent((element.currentTime / element.duration) * 100) : 0;
    if (!force && Math.abs(nextPercent - lastSavedPercentRef.current) < 10 && nextPercent < 100) {
      return;
    }

    lastSavedPercentRef.current = nextPercent;
    videoMutation.mutate({
      watchPercent: nextPercent,
      watchTimeMinutes: Math.round(element.currentTime / 60),
    });
  };

  if (courseQuery.isLoading || catalogQuery.isLoading || (isEnrolled && progressQuery.isLoading)) {
    return <LoadingBlock label="Đang tải màn học bài..." />;
  }

  if (courseQuery.isError || catalogQuery.isError || !courseQuery.data || !lesson || !catalogItem) {
    return <MessageBanner tone="error">Không tải được thông tin bài học.</MessageBanner>;
  }

  if (!isEnrolled) {
    return (
      <div className="grid gap-6">
        <MessageBanner tone="warning">Bạn chưa đăng ký khóa học này nên chưa thể truy cập bài học.</MessageBanner>
        <Button asChild className="w-fit rounded-2xl" variant="outline">
          <Link to={`/app/courses/${courseId}`}>Về trang khóa học</Link>
        </Button>
      </div>
    );
  }

  if (progressQuery.isError || !progressQuery.data) {
    return <MessageBanner tone="error">Không tải được tiến độ bài học.</MessageBanner>;
  }

  const course = courseQuery.data;
  const lessonSummary = lessonSummaryMap.get(lesson.id);
  const allQuizzes = flattenQuizzes(course);
  const firstCourseQuiz = allQuizzes[0] ?? null;

  if (!lessonSummary?.isUnlocked) {
    return (
      <div className="grid gap-6">
        <MessageBanner tone="warning">
          Bài học này chưa được mở. Hãy hoàn thành các bài học trước đó để tiếp tục.
        </MessageBanner>
        <Button asChild className="w-fit rounded-2xl" variant="outline">
          <Link to={`/app/courses/${course.id}`}>Quay về khóa học</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <LearnerScreenTitle index={3} title="Màn học bài" />

      <LearnerPanel className="overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 text-sm text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span>{course.title}</span>
            <span>/</span>
            <span className="font-semibold text-slate-900">{lesson.title}</span>
          </div>
          <Button className="rounded-2xl" type="button" variant="outline">
            <Download className="mr-2 size-4" />
            Tài liệu bài học
          </Button>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_330px]">
          <div className="grid gap-6">
            {lesson.type === "Video" ? (
              <div className="grid gap-4">
                <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950">
                  <video
                    className="aspect-video w-full"
                    controls
                    poster={lesson.videoContent?.posterUrl ?? undefined}
                    ref={videoRef}
                    src={lesson.videoContent?.videoUrl}
                    onEnded={() => persistVideoProgress(true)}
                    onPause={() => persistVideoProgress(true)}
                    onTimeUpdate={(event) => {
                      const element = event.currentTarget;
                      if (!element.duration) {
                        return;
                      }

                      const nextPercent = clampPercent((element.currentTime / element.duration) * 100);
                      setVideoPercent(nextPercent);
                    }}
                  >
                    {lesson.videoContent?.captionsUrl ? (
                      <track default kind="captions" src={lesson.videoContent.captionsUrl} srcLang="vi" />
                    ) : null}
                  </video>
                </div>

                <div className="grid gap-3">
                  <h1 className="text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] text-slate-950">{lesson.title}</h1>
                  <p className="text-sm leading-7 text-slate-600">{lesson.videoContent?.intro}</p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <LearnerPanel className="p-5">
                    <h3 className="text-base font-semibold text-slate-950">Mục tiêu bài học</h3>
                    <ul className="mt-4 grid gap-2 text-sm leading-7 text-slate-600">
                      {(lesson.videoContent?.objectives ?? []).map((objective) => (
                        <li key={objective}>• {objective}</li>
                      ))}
                    </ul>
                  </LearnerPanel>

                  <LearnerPanel className="p-5">
                    <h3 className="text-base font-semibold text-slate-950">Điểm cần ghi nhớ</h3>
                    <ul className="mt-4 grid gap-2 text-sm leading-7 text-slate-600">
                      {(lesson.videoContent?.checkpoints ?? []).map((checkpoint) => (
                        <li key={checkpoint}>• {checkpoint}</li>
                      ))}
                    </ul>
                  </LearnerPanel>
                </div>
              </div>
            ) : null}

            {lesson.type === "Interactive" ? (
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <h1 className="text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] text-slate-950">{lesson.title}</h1>
                  <p className="text-sm leading-7 text-slate-600">
                    Hoàn thành toàn bộ hoạt động tương tác để tiếp tục sang bước kế tiếp của khóa học.
                  </p>
                </div>

                {interactiveResult ? (
                  <MessageBanner tone={interactiveResult.passed ? "success" : "warning"}>
                    {interactiveResult.passed
                      ? `Bạn đã hoàn thành bài tương tác ở lần làm thứ ${interactiveResult.attemptNumber}.`
                      : "Bạn cần làm lại các câu chưa chính xác trước khi tiếp tục."}
                  </MessageBanner>
                ) : null}

                {(lesson.assessment?.questions ?? []).map((question) => (
                  <LearnerQuestionCard
                    answer={interactiveAnswers[question.questionId] ?? createEmptyAnswer()}
                    disabled={interactiveMutation.isPending}
                    key={question.questionId}
                    question={question}
                    onChange={(answer) =>
                      setInteractiveAnswers((current) => ({
                        ...current,
                        [question.questionId]: answer,
                      }))
                    }
                  />
                ))}

                <div className="flex justify-end">
                  <Button
                    className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]"
                    disabled={interactiveMutation.isPending}
                    type="button"
                    onClick={() => interactiveMutation.mutate()}
                  >
                    {interactiveMutation.isPending ? "Đang ghi nhận..." : "Hoàn thành hoạt động"}
                  </Button>
                </div>
              </div>
            ) : null}

            {lesson.type === "Scorm" ? (
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <h1 className="text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] text-slate-950">{lesson.title}</h1>
                  <p className="text-sm leading-7 text-slate-600">
                    Bài học này chạy dưới dạng mô-đun SCORM. Mở trình phát riêng để bắt đầu và hệ thống sẽ tự ghi nhận tiến độ của bạn.
                  </p>
                </div>

                <div className="grid gap-4 rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#f9fbff_0%,#eef4fc_100%)] p-6">
                  <div className="flex items-center gap-3 text-[#163b7b]">
                    <MonitorPlay className="size-5" />
                    <span className="text-sm font-semibold">Mô-đun SCORM</span>
                  </div>
                  <p className="text-sm leading-7 text-slate-600">
                    Nhấn nút bên dưới để mở trình phát SCORM trong cửa sổ học tập đầy đủ.
                  </p>
                  <div>
                    <Button
                      className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]"
                      type="button"
                      onClick={() => navigate(`/app/courses/${course.id}/lessons/${lesson.id}/scorm`)}
                    >
                      Mở bài học SCORM
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button asChild className="rounded-2xl" variant="outline">
                <Link to={previousLesson ? `/app/courses/${course.id}/lessons/${previousLesson.id}` : `/app/courses/${course.id}`}>
                  <ChevronLeft className="mr-2 size-4" />
                  {previousLesson ? "Bài trước" : "Về khóa học"}
                </Link>
              </Button>

              <Button
                className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]"
                type="button"
                onClick={() => {
                  if (nextLesson) {
                    navigate(`/app/courses/${course.id}/lessons/${nextLesson.id}`);
                    return;
                  }

                  if (progressQuery.data?.nextQuizId) {
                    navigate(`/app/courses/${course.id}/quizzes/${progressQuery.data.nextQuizId}`);
                    return;
                  }

                  if (firstCourseQuiz) {
                    navigate(`/app/courses/${course.id}/quizzes/${firstCourseQuiz.id}`);
                  }
                }}
              >
                Bài tiếp theo
                <ChevronRight className="ml-2 size-4" />
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <LearnerPanel className="p-5">
              <h3 className="text-[1.2rem] font-semibold text-slate-950">Tiến độ khóa học</h3>
              <div className="mt-4 grid gap-4">
                <LearnerProgressBar value={progressQuery.data.overallCompletionPercent} />
                <div className="grid gap-2">
                  {orderedLessons.map((item, index) => {
                    const summary = lessonSummaryMap.get(item.id);
                    const Icon = getLessonIcon(item.type);
                    const isCurrent = item.id === lesson.id;

                    return (
                      <button
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-[18px] border px-3 py-3 text-left transition",
                          isCurrent
                            ? "border-[#163b7b] bg-[#f4f8ff]"
                            : "border-slate-200 bg-white hover:border-slate-300",
                        )}
                        key={item.id}
                        type="button"
                        onClick={() => {
                          if (summary?.isUnlocked) {
                            navigate(`/app/courses/${course.id}/lessons/${item.id}`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 place-items-center rounded-full bg-[#eef3ff] text-[#163b7b]">
                            <Icon className="size-4" />
                          </div>
                          <div className="grid gap-0.5">
                            <p className="text-sm font-medium text-slate-900">
                              {index + 1}. {item.title}
                            </p>
                            <p className="text-xs text-slate-500">{formatMinutes(item.durationMinutes)}</p>
                          </div>
                        </div>
                        <LearnerStatusBadge
                          tone={
                            summary?.status === "Completed"
                              ? "success"
                              : isCurrent
                                ? "brand"
                                : summary?.isUnlocked
                                  ? "warning"
                                  : "neutral"
                          }
                        >
                          {summary?.status === "Completed"
                            ? "Xong"
                            : isCurrent
                              ? "Đang học"
                              : summary?.isUnlocked
                                ? "Sẵn sàng"
                                : "Khóa"}
                        </LearnerStatusBadge>
                      </button>
                    );
                  })}

                  {flattenQuizzes(course).map((quiz) => {
                    const canOpen = quiz.id === progressQuery.data.nextQuizId || progressQuery.data.quizzes.some((item) => item.quizId === quiz.id && item.isUnlocked);

                    return (
                      <button
                        className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-slate-300"
                        key={quiz.id}
                        type="button"
                        onClick={() => {
                          if (canOpen) {
                            navigate(`/app/courses/${course.id}/quizzes/${quiz.id}`);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="grid size-8 place-items-center rounded-full bg-amber-50 text-amber-600">
                            <FileText className="size-4" />
                          </div>
                          <div className="grid gap-0.5">
                            <p className="text-sm font-medium text-slate-900">{quiz.title}</p>
                            <p className="text-xs text-slate-500">Bài kiểm tra</p>
                          </div>
                        </div>
                        {canOpen ? <ChevronRight className="size-4 text-slate-400" /> : <Lock className="size-4 text-slate-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </LearnerPanel>

            <LearnerPanel className="p-5">
              <h3 className="text-[1.2rem] font-semibold text-slate-950">Ghi chú bài học</h3>
              <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-600">
                <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="font-medium text-slate-900">Mẹo học nhanh</p>
                  <p className="mt-2">
                    {lesson.type === "Video"
                      ? lesson.videoContent?.transcriptHighlight ?? "Theo dõi kỹ các dấu hiệu cảnh báo để ghi nhớ nội dung chính."
                      : lesson.type === "Interactive"
                        ? "Hoàn thành từng câu hỏi trước khi chuyển sang bước tiếp theo."
                        : "Mô-đun SCORM sẽ tự lưu tiến độ sau mỗi lần tương tác."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <LearnerMetaChip>
                    <Volume2 className="size-3.5" />
                    {lesson.type === "Video" ? `${Math.round(videoPercent)}% đã xem` : "Theo dõi theo trạng thái hoàn thành"}
                  </LearnerMetaChip>
                  <LearnerMetaChip>{formatMinutes(lesson.durationMinutes)}</LearnerMetaChip>
                </div>
              </div>
            </LearnerPanel>
          </div>
        </div>
      </LearnerPanel>
    </div>
  );
}
