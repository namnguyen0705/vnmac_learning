import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileImage,
  FileText,
  Lock,
  Play,
  ShieldCheck,
  Trophy,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  getLearnerCourseCatalog,
  getLearnerLearningResults,
  getLearnerCourseProgress,
  getPublishedCourses,
} from "../../shared/api/learner";
import {
  flattenLessons,
  flattenQuizzes,
  sortLessons,
  sortSections,
  toLessonSummaryMap,
  toQuizSummaryMap,
} from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerPanel } from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type { CourseLesson, CourseTreeResponse, LearningResultsResponse, ProgressSnapshotResponse } from "../../shared/types/api";

const OFFICIAL_COURSE_ID = "course-vnmac-elearning";

type RouteItem = {
  id: string;
  number: string;
  title: string;
  status: "done" | "active" | "locked" | "ready";
  href: string;
};

type RouteSection = {
  id: string;
  label: string;
  items: RouteItem[];
};

export function CourseCatalogPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const userId = session?.user.id ?? "";

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
    refetchOnMount: "always",
  });

  const coursesQuery = useQuery({
    queryKey: ["courses", "published", "lesson-home"],
    queryFn: getPublishedCourses,
  });

  const officialCourse = useMemo(() => {
    const courses = coursesQuery.data ?? [];
    return courses.find((course) => course.id === OFFICIAL_COURSE_ID) ?? courses[0] ?? null;
  }, [coursesQuery.data]);

  const catalogItem = officialCourse
    ? catalogQuery.data?.courses.find((item) => item.courseId === officialCourse.id)
    : undefined;

  const progressQuery = useQuery({
    queryKey: ["learner", userId, "course-progress", officialCourse?.id],
    queryFn: () => getLearnerCourseProgress(userId, officialCourse?.id ?? ""),
    enabled: Boolean(userId && officialCourse?.id && catalogItem?.isEnrolled),
    refetchOnMount: "always",
  });

  const learningResultsQuery = useQuery({
    queryKey: ["learner", userId, "learning-results", officialCourse?.id],
    queryFn: () => getLearnerLearningResults(userId, officialCourse?.id ?? ""),
    enabled: Boolean(userId && officialCourse?.id && catalogItem?.isEnrolled),
    refetchOnMount: "always",
  });

  if (catalogQuery.isLoading || coursesQuery.isLoading || (catalogItem?.isEnrolled && (progressQuery.isLoading || learningResultsQuery.isLoading))) {
    return <LoadingBlock label="Đang tải màn hình bài học..." />;
  }

  if (catalogQuery.isError || coursesQuery.isError || !catalogQuery.data) {
    return <MessageBanner tone="error">Không tải được dữ liệu bài học.</MessageBanner>;
  }

  if (!officialCourse) {
    return <MessageBanner tone="warning">Chưa có khóa học chính thức đang xuất bản.</MessageBanner>;
  }

  const progress = progressQuery.data;
  const learningResults = learningResultsQuery.data;
  const route = buildRoute(officialCourse, progress);
  const routeItems = route.flatMap((section, sectionIndex) =>
    section.items.map((item) => ({
      ...item,
      phase: sectionIndex + 1,
    })),
  );
  const routeGridStyle = { gridTemplateColumns: `repeat(${routeItems.length}, minmax(0, 1fr))` };
  const lessons = flattenLessons(officialCourse).filter((lesson) => lesson.type !== "Quiz");
  const percent = learningResults?.overallCompletionPercent ?? progress?.overallCompletionPercent ?? catalogItem?.enrollment?.overallCompletionPercent ?? 0;
  const completedLessons = learningResults?.completedLessons ?? progress?.lessons.filter((lesson) => lesson.status === "Completed").length ?? catalogItem?.enrollment?.completedLessons ?? 0;
  const nextTitle = learningResults?.currentLessonTitle ?? learningResults?.nextLessonTitle ?? findNextTitle(officialCourse, progress);
  const isFreshStart = percent === 0 && completedLessons === 0;
  const heroTitle = isFreshStart
    ? "Bắt đầu hành trình học tập của bạn."
    : "Bạn đã làm rất tốt ở lần học trước.";
  const heroSubtitle = isFreshStart
    ? "Hoàn thành bài học hiện tại để mở bài tiếp theo nhé"
    : `Hoàn thành ${percent}% bài học và mở bài tiếp theo nhé`;

  return (
    <div className={`lesson-home-page ${isFreshStart ? "is-fresh-start" : "is-in-progress"}`}>
      <section className="lesson-home-hero">
        <div className="lesson-home-hero-copy">
          <h1>{heroTitle}</h1>
          <h2>{heroSubtitle}</h2>
          <span />

          <div className="lesson-home-progress-card">
            <p>Tiếp tục khóa học của bạn</p>
            <div className="lesson-home-percent-row">
              <strong>
                {percent}%
                <span>TIẾN ĐỘ HOÀN THÀNH</span>
              </strong>
              <div>
                <div className="lesson-home-progress-track">
                  <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
                </div>
                <small>Bạn đang ở {nextTitle}</small>
              </div>
            </div>
          </div>

          <div className="lesson-home-actions">
            <Button className="lesson-home-primary" type="button" onClick={() => openNext(officialCourse, progress, learningResults, navigate)}>
              <Play className="size-4 fill-current" />
              Tiếp tục học
            </Button>
            <Button className="lesson-home-secondary" type="button" variant="outline" onClick={() => navigate(`/app/courses/${officialCourse.id}`)}>
              Xem lộ trình học
            </Button>
          </div>
        </div>

        <div className="lesson-home-image">
          <div className="lesson-home-photo">
            <span className="lesson-home-cloud cloud-one" />
            <span className="lesson-home-cloud cloud-two" />
            <span className="lesson-home-mountain mountain-one" />
            <span className="lesson-home-mountain mountain-two" />
            <span className="lesson-home-path" />
            <span className="lesson-home-grass" />
            <span className="lesson-home-person person-one" />
            <span className="lesson-home-person person-two" />
            <span className="lesson-home-shell shell-one" />
            <span className="lesson-home-shell shell-two" />
            <div className="lesson-home-warning">
              <span>☠</span>
              <strong>KHU VỰC</strong>
              <strong>CÓ BOM MÌN!</strong>
            </div>
            <blockquote>
              <span>“</span>
              Nhận biết
              <br />
              Tránh xa
              <br />
              Báo ngay
              <span>”</span>
            </blockquote>
            <p>Cùng nhau phòng tránh tai nạn bom mìn vật nổ.</p>
          </div>
        </div>
      </section>

      <section className="lesson-home-grid">
        <LearnerPanel className="lesson-route-card">
          <div className="lesson-route-title">
            <h2>Lộ trình học</h2>
            <ChevronRight className="size-4" />
          </div>
          <div className="lesson-route-scroll">
            <div className="lesson-route-track">
              <div className="lesson-route-phase-row" style={routeGridStyle}>
                {route.map((section, sectionIndex) => (
                  <div
                    className={`lesson-route-phase-label phase-${sectionIndex + 1}`}
                    key={section.id}
                    style={{ gridColumn: `span ${section.items.length}` }}
                  >
                    {section.label}
                  </div>
                ))}
              </div>

              <div className="lesson-route-flat-items" style={routeGridStyle}>
                <div className="lesson-route-rail-segments" style={routeGridStyle}>
                  {route.map((section, sectionIndex) => (
                    <span
                      className={`lesson-route-rail-segment phase-${sectionIndex + 1}`}
                      key={section.id}
                      style={{ gridColumn: `span ${section.items.length}` }}
                    />
                  ))}
                </div>

                {routeItems.map((item) => (
                  <button
                    className={`lesson-route-item phase-${item.phase} ${item.status}`}
                    disabled={item.status === "locked"}
                    key={item.id}
                    type="button"
                    onClick={() => navigate(item.href)}
                  >
                    <span className="lesson-route-dot">
                      {item.status === "done" || item.status === "active" ? (
                        <CheckCircle2 className="size-4" />
                      ) : item.status === "locked" ? (
                        <Lock className="size-4" />
                      ) : null}
                    </span>
                    <strong className="lesson-route-number">{item.number}</strong>
                    <small>{item.title}</small>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </LearnerPanel>

        <LearnerPanel className="lesson-current-course">
          <h2>Khóa học của bạn</h2>
          <div className="lesson-current-course-body">
            <div className="lesson-current-thumb" aria-hidden="true" />
            <div>
              <strong>{officialCourse.title}</strong>
              <div className="lesson-current-progress">
                <span style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
              </div>
              <p>{completedLessons} / {lessons.length} bài đã hoàn thành <b>{percent}%</b></p>
            </div>
          </div>
          <div className="lesson-current-actions">
            <Button className="lesson-home-primary" type="button" onClick={() => openNext(officialCourse, progress, learningResults, navigate)}>
              <Play className="size-4 fill-current" />
              Tiếp tục học
            </Button>
            <Button variant="outline" onClick={() => navigate(`/app/courses/${officialCourse.id}`)}>
              Xem chi tiết
            </Button>
          </div>
        </LearnerPanel>
      </section>

      <section className="lesson-home-bottom-grid">
        <InfoBand
          icon={ShieldCheck}
          title="Thông điệp quan trọng"
          value="Nhận biết - Tránh xa - Báo ngay"
          description="Bảo vệ bản thân và cộng đồng khỏi tai nạn bom mìn vật nổ."
        />
        <LearnerPanel className="lesson-result-card">
          <h2>Kết quả học tập</h2>
          <div className="lesson-result-list">
            <MiniStat icon={BarChart3} label="Tiến độ khóa học" value={`${percent}%`} note={`${completedLessons} / ${lessons.length} bài`} tone="blue" />
            <MiniStat icon={ClipboardCheck} label="Quiz gần nhất" value={`${learningResults?.latestQuizScore ?? 0}/100`} note={`${learningResults?.latestQuizAttempts ?? 0} lần làm`} tone="green" />
            <MiniStat icon={Trophy} label="Trạng thái" value={learningResults?.certificateIssued || progress?.certificateIssued ? "Hoàn thành" : "Chưa hoàn thành"} note={`${learningResults?.studyTimeMinutes ?? 0} phút học`} tone="gold" />
          </div>
        </LearnerPanel>
        <LearnerPanel className="lesson-resource-card">
          <div className="lesson-resource-header">
            <h2>Tài liệu nhanh</h2>
            <button type="button">Xem tất cả</button>
          </div>
          <div className="lesson-resource-list">
            <ResourceChip icon={Download} title="Hướng dẫn xử lý khi gặp vật lạ" type="PDF" tone="red" />
            <ResourceChip icon={FileImage} title="Poster EORE" type="PDF" tone="green" />
            <ResourceChip icon={Video} title="Video minh họa thực tế" type="MP4" tone="blue" />
          </div>
        </LearnerPanel>
      </section>
    </div>
  );
}

function buildRoute(course: CourseTreeResponse, progress?: ProgressSnapshotResponse): RouteSection[] {
  const lessonMap = progress ? toLessonSummaryMap(progress.lessons) : new Map();
  const quizMap = progress ? toQuizSummaryMap(progress.quizzes) : new Map();
  const quizByLessonId = new Map(flattenQuizzes(course).map((quiz) => [quiz.assessmentLessonId, quiz]));

  return sortSections(course.sections).map((section, sectionIndex) => ({
    id: section.id,
    label: getSectionLabel(section.title, sectionIndex),
    items: sortLessons(section.lessons).map((lesson) => {
      const quiz = lesson.type === "Quiz" ? quizByLessonId.get(lesson.id) : undefined;
      const summary = quiz ? quizMap.get(quiz.id) : lessonMap.get(lesson.id);
      const done = quiz ? quizMap.get(quiz.id)?.passed : lessonMap.get(lesson.id)?.status === "Completed";
      const active = progress?.nextLessonId === lesson.id || (quiz && progress?.nextQuizId === quiz.id);
      const ready = "isUnlocked" in (summary ?? {}) ? Boolean(summary?.isUnlocked) : false;
      return {
        id: quiz?.id ?? lesson.id,
        number: getLessonNumber(lesson, sectionIndex),
        title: trimLessonTitle(quiz?.title ?? lesson.title),
        href: quiz ? `/app/courses/${course.id}/quizzes/${quiz.id}` : `/app/courses/${course.id}/lessons/${lesson.id}`,
        status: done ? "done" : active ? "active" : ready ? "ready" : "locked",
      };
    }),
  }));
}

function openNext(
  course: CourseTreeResponse,
  progress: ProgressSnapshotResponse | undefined,
  learningResults: LearningResultsResponse | undefined,
  navigate: ReturnType<typeof useNavigate>,
) {
  const nextLessonId = learningResults?.nextLessonId ?? progress?.nextLessonId;
  if (nextLessonId) {
    const rememberedStep = learningResults?.currentLessonId === nextLessonId ? learningResults.currentStep : "intro";
    const step = rememberedStep === "complete" ? "intro" : rememberedStep;
    const query = step && step !== "intro" ? `?step=${encodeURIComponent(step)}` : "";
    navigate(`/app/courses/${course.id}/lessons/${nextLessonId}${query}`);
    return;
  }
  const nextQuizId = learningResults?.nextQuizId ?? progress?.nextQuizId;
  if (nextQuizId) {
    navigate(`/app/courses/${course.id}/quizzes/${nextQuizId}`);
    return;
  }
  const firstLesson = flattenLessons(course).find((lesson) => lesson.type !== "Quiz");
  navigate(firstLesson ? `/app/courses/${course.id}/lessons/${firstLesson.id}` : `/app/courses/${course.id}`);
}

function findNextTitle(course: CourseTreeResponse, progress?: ProgressSnapshotResponse) {
  const lesson = progress?.nextLessonId ? flattenLessons(course).find((item) => item.id === progress.nextLessonId) : null;
  if (lesson) {
    return trimLessonTitle(lesson.title);
  }
  const quiz = progress?.nextQuizId ? flattenQuizzes(course).find((item) => item.id === progress.nextQuizId) : null;
  return quiz ? quiz.title : "Bài học tiếp theo";
}

function getSectionLabel(title: string, index: number) {
  const lower = title.toLowerCase();
  if (lower.includes("eore")) return "PHẦN 1 - EORE";
  if (lower.includes("sbc")) return "PHẦN 2 - SBC";
  return `PHẦN ${index + 1}`;
}

function getLessonNumber(lesson: CourseLesson, sectionIndex: number) {
  const match = lesson.title.match(/Bài\s+(\d+(?:\.\d+)?)/i);
  return match?.[1] ?? `${sectionIndex + 1}.${lesson.order}`;
}

function trimLessonTitle(title: string) {
  return title.replace(/^Bài\s+\d+(?:\.\d+)?\s*-\s*/i, "").trim();
}

function InfoBand({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <LearnerPanel className="lesson-info-band">
      <span>
        <Icon className="size-6" />
      </span>
      <div>
        <h2>{title}</h2>
        <strong>{value}</strong>
        <p>{description}</p>
      </div>
    </LearnerPanel>
  );
}

function MiniStat({
  icon: Icon,
  label,
  value,
  note,
  tone = "blue",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  tone?: "blue" | "green" | "gold";
}) {
  return (
    <div className={`lesson-mini-stat ${tone}`}>
      <span>
        <Icon className="size-5" />
      </span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <p>{note}</p>
      </div>
    </div>
  );
}

function ResourceChip({ icon: Icon, title, type, tone }: { icon: LucideIcon; title: string; type: string; tone: string }) {
  return (
    <button className={`lesson-resource-chip ${tone}`} type="button">
      <Icon className="size-5" />
      <span>{title}</span>
      <small>{type}</small>
    </button>
  );
}
