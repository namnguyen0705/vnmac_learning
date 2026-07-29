import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  CirclePlay,
  Clock3,
  Hand,
  Lock,
  MonitorPlay,
  Save,
  ScrollText,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import { enrollInCourse, getCourseById, getLearnerCourseCatalog, getLearnerCourseProgress } from "../../shared/api/learner";
import {
  getCourseCoverAsset,
  sortLessons,
  sortQuizzes,
  sortSections,
  toLessonSummaryMap,
  toQuizSummaryMap,
} from "../../shared/lib/course";
import { formatMinutes } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import {
  LearnerMetaChip,
  LearnerPanel,
  LearnerProgressBar,
  LearnerScreenTitle,
  LearnerStatusBadge,
} from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";

function getLessonIcon(type: string) {
  switch (type) {
    case "Interactive":
      return Hand;
    case "Scorm":
      return MonitorPlay;
    case "Quiz":
      return ScrollText;
    default:
      return CirclePlay;
  }
}

function getLessonPath(courseId: string, lesson: { id: string; type: string }) {
  const base = `/app/courses/${courseId}/lessons/${lesson.id}`;
  return lesson.type === "Scorm" ? `${base}/scorm` : base;
}

export function CoursePage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { courseId = "" } = useParams();
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
    refetchOnMount: "always",
  });

  const catalogItem = catalogQuery.data?.courses.find((item) => item.courseId === courseId);
  const isEnrolled = Boolean(catalogItem?.isEnrolled);

  const progressQuery = useQuery({
    queryKey: ["learner", userId, "course-progress", courseId],
    queryFn: () => getLearnerCourseProgress(userId, courseId),
    enabled: Boolean(userId && courseId && isEnrolled),
    refetchOnMount: "always",
  });

  const enrollMutation = useMutation({
    mutationFn: () => enrollInCourse(userId, courseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["learner", userId, "catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["learner", userId, "dashboard"] }),
      ]);
    },
  });

  if (courseQuery.isLoading || catalogQuery.isLoading || (isEnrolled && progressQuery.isLoading)) {
    return <LoadingBlock label="Đang tải chi tiết khóa học..." />;
  }

  if (courseQuery.isError || catalogQuery.isError || !courseQuery.data || !catalogItem) {
    return <MessageBanner tone="error">Không tải được chi tiết khóa học.</MessageBanner>;
  }

  const course = courseQuery.data;
  const cover = getCourseCoverAsset(course);
  const level = course.title.toLowerCase().includes("nâng cao") ? "Nâng cao" : "Cơ bản";

  if (!isEnrolled) {
    return (
      <div className="grid gap-6">
        <LearnerScreenTitle index={2} title="Chi tiết khóa học" />
        <LearnerPanel className="overflow-hidden">
          <div className="grid gap-6 p-8 xl:grid-cols-[0.42fr_0.58fr]">
            <div
              className="min-h-[260px] rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#456b42_0%,#8fba76_52%,#e5edd0_100%)] bg-cover bg-center"
              style={cover.posterUrl ? { backgroundImage: `url('${cover.posterUrl}')` } : undefined}
            />
            <div className="grid gap-5">
              <div className="flex items-center gap-3">
                <h1 className="text-[2.1rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950">{course.title}</h1>
                <LearnerStatusBadge tone="brand">{level}</LearnerStatusBadge>
              </div>
              <p className="text-sm leading-7 text-slate-600">{course.description}</p>
              <div className="flex flex-wrap gap-2">
                <LearnerMetaChip>{catalogItem.totalLessons} bài học</LearnerMetaChip>
                <LearnerMetaChip>{catalogItem.totalQuizzes} bài kiểm tra</LearnerMetaChip>
                <LearnerMetaChip>{formatMinutes(catalogItem.estimatedStudyTimeMinutes)}</LearnerMetaChip>
              </div>
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm leading-7 text-slate-600">
                  Hãy đăng ký khóa học để mở lộ trình học, xem chi tiết từng bài và bắt đầu tích lũy tiến độ.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="rounded-2xl bg-[#163b7b] text-white hover:bg-[#0f2e63] hover:text-white"
                  disabled={enrollMutation.isPending}
                  type="button"
                  onClick={() => enrollMutation.mutate()}
                >
                  Đăng ký khóa học
                </Button>
                <Button asChild className="rounded-2xl" variant="outline">
                  <Link to="/app/courses">Về danh sách khóa học</Link>
                </Button>
              </div>
            </div>
          </div>
        </LearnerPanel>
      </div>
    );
  }

  if (progressQuery.isError || !progressQuery.data) {
    return <MessageBanner tone="error">Không tải được tiến độ khóa học.</MessageBanner>;
  }

  const progress = progressQuery.data;
  const lessonSummaryMap = toLessonSummaryMap(progress.lessons);
  const quizSummaryMap = toQuizSummaryMap(progress.quizzes);
  const courseCompleted = progress.certificateIssued;
  const lessonIdsRenderedInSections = new Set(
    sortSections(course.sections).flatMap((section) => sortLessons(section.lessons).map((lesson) => lesson.id)),
  );

  return (
    <div className="learner-course-page grid gap-6">
      <LearnerScreenTitle index={2} title="Chi tiết khóa học" />

      <LearnerPanel className="overflow-hidden p-6">
        <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
          <div
            className="course-detail-cover min-h-[260px] rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#456b42_0%,#8fba76_52%,#e5edd0_100%)] bg-cover bg-center"
            style={cover.posterUrl ? { backgroundImage: `url('${cover.posterUrl}')` } : undefined}
          />

          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[2.05rem] font-semibold leading-tight tracking-[-0.04em] text-slate-950">{course.title}</h1>
              <LearnerStatusBadge tone={level === "Nâng cao" ? "brand" : "neutral"}>{level}</LearnerStatusBadge>
            </div>

            <p className="max-w-[820px] text-sm leading-7 text-slate-600">{course.description}</p>

            <div className="flex flex-wrap gap-2">
              <LearnerMetaChip>
                <BookOpen className="size-3.5" />
                {catalogItem.totalLessons} bài học
              </LearnerMetaChip>
              <LearnerMetaChip>
                <ScrollText className="size-3.5" />
                {catalogItem.totalQuizzes} bài kiểm tra
              </LearnerMetaChip>
              <LearnerMetaChip>
                <Clock3 className="size-3.5" />
                {formatMinutes(catalogItem.estimatedStudyTimeMinutes)}
              </LearnerMetaChip>
            </div>

            <div className="grid gap-3">
              <LearnerProgressBar label="Tiến độ khóa học" value={progress.overallCompletionPercent} />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                className="rounded-2xl bg-[#163b7b] text-white hover:bg-[#0f2e63] hover:text-white"
                type="button"
                onClick={() => {
                  if (progress.nextLessonId) {
                    const nextLesson = course.sections
                      .flatMap((section) => section.lessons)
                      .find((lesson) => lesson.id === progress.nextLessonId);
                    if (nextLesson) {
                      navigate(getLessonPath(course.id, nextLesson));
                    }
                    return;
                  }

                  if (progress.nextQuizId) {
                    navigate(`/app/courses/${course.id}/quizzes/${progress.nextQuizId}`);
                  }
                }}
              >
                {progress.nextLessonId ? "Tiếp tục học" : "Tiếp tục bài kiểm tra"}
              </Button>
              <Button className="rounded-2xl" type="button" variant="outline">
                <Save className="mr-2 size-4" />
                Lưu khóa học
              </Button>
            </div>
          </div>
        </div>
      </LearnerPanel>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <LearnerPanel className="p-6">
          <h3 className="text-[1.35rem] font-semibold text-slate-950">Lộ trình học tập</h3>
          <div className="mt-5 grid gap-3">
            {sortSections(course.sections).map((section, sectionIndex) => {
              const sectionLessons = sortLessons(section.lessons);
              const sectionQuizzes = sortQuizzes(section.quizzes);

              return (
                <div className="grid gap-3" key={section.id}>
                  <div className="flex items-center gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="grid size-8 place-items-center rounded-full bg-[#eaf3ff] text-sm font-semibold text-[#163b7b]">
                      {sectionIndex + 1}
                    </div>
                    <div className="grid gap-0.5">
                      <p className="text-sm font-semibold text-slate-950">{section.title}</p>
                      <p className="text-xs text-slate-500">{section.description}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 pl-4">
                    {sectionLessons.map((lesson) => {
                      const summary = lessonSummaryMap.get(lesson.id);
                      const quiz = lesson.type === "Quiz"
                        ? sortQuizzes(course.quizzes).find((item) => item.assessmentLessonId === lesson.id)
                        : undefined;
                      const quizSummary = quiz ? quizSummaryMap.get(quiz.id) : undefined;
                      const isUnlocked = lesson.type === "Quiz" ? Boolean(quizSummary?.isUnlocked) : Boolean(summary?.isUnlocked);
                      const statusTone = quizSummary?.passed
                        ? "success"
                        : quizSummary?.isUnlocked
                          ? "warning"
                          : summary?.status === "Completed"
                            ? "success"
                            : summary?.status === "InProgress"
                              ? "warning"
                              : isUnlocked
                                ? "brand"
                                : "neutral";
                      const statusText = quizSummary?.passed
                        ? "Hoàn thành"
                        : quizSummary?.isUnlocked
                          ? "Đang mở"
                          : summary?.status === "Completed"
                            ? "Hoàn thành"
                            : summary?.status === "InProgress"
                              ? "Đang học"
                              : isUnlocked
                                ? "Sẵn sàng"
                                : "Chưa mở";
                      const LessonIcon = getLessonIcon(lesson.type);

                      return (
                        <button
                          className={cn(
                            "grid gap-3 rounded-[22px] border p-4 text-left transition",
                            isUnlocked
                              ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
                              : "border-slate-200 bg-slate-50/80 text-slate-400",
                          )}
                          key={lesson.id}
                          type="button"
                          onClick={() => {
                            if (!isUnlocked) {
                              return;
                            }

                            if (quiz) {
                              navigate(`/app/courses/${course.id}/quizzes/${quiz.id}`);
                              return;
                            }

                            if (summary?.isUnlocked) {
                              navigate(getLessonPath(course.id, lesson));
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="grid size-9 place-items-center rounded-full bg-[#eef3ff] text-[#163b7b]">
                                <LessonIcon className="size-4" />
                              </div>
                              <div className="grid gap-1">
                                <p className="text-sm font-semibold text-slate-950">{lesson.title}</p>
                                <p className="text-xs text-slate-500">
                                  {lesson.type === "Video"
                                    ? "Nội dung video"
                                    : lesson.type === "Interactive"
                                      ? "Hoạt động tương tác"
                                      : lesson.type === "Quiz"
                                        ? "Bài kiểm tra cuối khóa"
                                        : "Mô-đun SCORM"}
                                </p>
                              </div>
                            </div>
                            <LearnerStatusBadge tone={statusTone}>{statusText}</LearnerStatusBadge>
                          </div>
                        </button>
                      );
                    })}

                    {sectionQuizzes.map((quiz) => {
                      const summary = quizSummaryMap.get(quiz.id);

                      return (
                        <button
                          className={cn(
                            "grid gap-3 rounded-[22px] border p-4 text-left transition",
                            summary?.isUnlocked
                              ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
                              : "border-slate-200 bg-slate-50/80 text-slate-400",
                          )}
                          key={quiz.id}
                          type="button"
                          onClick={() => {
                            if (summary?.isUnlocked) {
                              navigate(`/app/courses/${course.id}/quizzes/${quiz.id}`);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="grid size-9 place-items-center rounded-full bg-amber-50 text-amber-600">
                                <ScrollText className="size-4" />
                              </div>
                              <div className="grid gap-1">
                                <p className="text-sm font-semibold text-slate-950">{quiz.title}</p>
                                <p className="text-xs text-slate-500">Bài kiểm tra phần học</p>
                              </div>
                            </div>
                            <LearnerStatusBadge
                              tone={summary?.passed ? "success" : summary?.isUnlocked ? "warning" : "neutral"}
                            >
                              {summary?.passed ? "Hoàn thành" : summary?.isUnlocked ? "Đang mở" : "Chưa mở khóa"}
                            </LearnerStatusBadge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {sortQuizzes(course.quizzes).filter((quiz) => !lessonIdsRenderedInSections.has(quiz.assessmentLessonId)).map((quiz) => {
              const summary = quizSummaryMap.get(quiz.id);

              return (
                <button
                  className={cn(
                    "flex items-center justify-between gap-4 rounded-[22px] border p-4 text-left transition",
                    summary?.isUnlocked
                      ? "border-slate-200 bg-white hover:border-slate-300 hover:shadow-[0_14px_28px_rgba(15,23,42,0.06)]"
                      : "border-slate-200 bg-slate-50/80 text-slate-400",
                  )}
                  key={quiz.id}
                  type="button"
                  onClick={() => {
                    if (summary?.isUnlocked) {
                      navigate(`/app/courses/${course.id}/quizzes/${quiz.id}`);
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 place-items-center rounded-full bg-amber-50 text-amber-600">
                      <ScrollText className="size-4" />
                    </div>
                    <div className="grid gap-1">
                      <p className="text-sm font-semibold text-slate-950">{quiz.title}</p>
                      <p className="text-xs text-slate-500">Bài kiểm tra cuối khóa</p>
                    </div>
                  </div>
                  <LearnerStatusBadge tone={summary?.passed ? "success" : summary?.isUnlocked ? "warning" : "neutral"}>
                    {summary?.passed ? "Hoàn thành" : summary?.isUnlocked ? "Đang mở" : "Chưa mở khóa"}
                  </LearnerStatusBadge>
                </button>
              );
            })}
          </div>
        </LearnerPanel>

        <div className="grid gap-6">
          <LearnerPanel className="p-6">
            <h3 className="text-[1.25rem] font-semibold text-slate-950">Thông tin khóa học</h3>
            <div className="mt-5 grid gap-3 text-sm text-slate-600">
              <InfoRow icon={BookOpen} label="Cấp độ" value={level} />
              <InfoRow icon={UserRound} label="Đối tượng" value={session?.user.group ?? "Cộng đồng"} />
              <InfoRow icon={CalendarDays} label="Cập nhật" value="15/05/2025" />
              <InfoRow icon={ScrollText} label="Đơn vị vận hành" value="Trung tâm Hành động Bom mìn Quốc gia Việt Nam" />
            </div>
          </LearnerPanel>

          <LearnerPanel className="p-6">
            <h3 className="text-[1.25rem] font-semibold text-slate-950">Điều kiện mở khóa bài kiểm tra</h3>
            <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <div className="grid size-9 place-items-center rounded-2xl bg-white text-amber-600 shadow-sm">
                  <Lock className="size-4" />
                </div>
                <div className="grid gap-2 text-sm text-amber-900">
                  <p className="font-semibold">Hoàn thành 100% các bài học</p>
                  <p>Bạn cần hoàn thành tất cả nội dung khóa học để mở bài kiểm tra cuối phần hoặc cuối khóa.</p>
                </div>
              </div>
            </div>
          </LearnerPanel>

          <LearnerPanel className="p-6">
            <h3 className="text-[1.25rem] font-semibold text-slate-950">Tình trạng hiện tại</h3>
            <div className="mt-5 grid gap-3">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Tiến độ nội dung</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{progress.contentCompletionPercent}%</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Tiến độ bài kiểm tra</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{progress.quizCompletionPercent}%</p>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.08em] text-slate-500">Chứng chỉ</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">{courseCompleted ? "Đã đủ điều kiện" : "Chưa đủ điều kiện"}</p>
              </div>
            </div>
          </LearnerPanel>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-[18px] bg-slate-50 px-4 py-3">
      <div className="grid size-9 place-items-center rounded-xl bg-white text-[#163b7b] shadow-sm">
        <Icon className="size-4" />
      </div>
      <div className="grid gap-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
        <p className="text-sm font-medium text-slate-800">{value}</p>
      </div>
    </div>
  );
}
