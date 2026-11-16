import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  Lock,
  Play,
  ShieldCheck,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  getLearnerCourseCatalog,
  getLearnerCourseProgress,
  getPublishedCourses,
} from "../../shared/api/learner";
import {
  flattenLessons,
  flattenQuizzes,
  sortLessons,
  sortQuizzes,
  sortSections,
  toLessonSummaryMap,
  toQuizSummaryMap,
} from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerPanel, LearnerProgressBar } from "../../shared/ui/learner-ui";
import { LearningCompanion, MascotFigure } from "@/shared/ui/LearningCompanion";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import { useBrandingSettings } from "../../shared/ui/branding";
import { parseHomeContent, renderHomeText } from "../../shared/lib/homeContent";
import type {
  CourseLesson,
  CourseQuiz,
  CourseSection,
  CourseTreeResponse,
  ProgressSnapshotResponse,
} from "../../shared/types/api";

type RoadmapStatus = "done" | "active" | "ready" | "locked";

type RoadmapItem = {
  id: string;
  number: string;
  title: string;
  href: string;
  status: RoadmapStatus;
  type: "lesson" | "quiz";
};

type RoadmapSection = {
  id: string;
  label: string;
  items: RoadmapItem[];
};

export function DashboardPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const systemSettings = useBrandingSettings();
  const userId = session?.user.id ?? "";

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  const publishedCoursesQuery = useQuery({
    queryKey: ["courses", "published", userId],
    queryFn: getPublishedCourses,
  });

  const officialCourse = useMemo(() => {
    const courses = publishedCoursesQuery.data ?? [];
    const enrolledCourseId = catalogQuery.data?.courses.find((course) => course.isEnrolled)?.courseId;
    return courses.find((course) => course.id === enrolledCourseId) ?? courses[0] ?? null;
  }, [catalogQuery.data?.courses, publishedCoursesQuery.data]);

  const catalogItem = officialCourse
    ? catalogQuery.data?.courses.find((course) => course.courseId === officialCourse.id)
    : undefined;

  const progressQuery = useQuery({
    queryKey: ["learner", userId, "course-progress", officialCourse?.id],
    queryFn: () => getLearnerCourseProgress(userId, officialCourse?.id ?? ""),
    enabled: Boolean(userId && officialCourse?.id && catalogItem?.isEnrolled),
  });

  if (
    catalogQuery.isLoading ||
    publishedCoursesQuery.isLoading ||
    (catalogItem?.isEnrolled && progressQuery.isLoading)
  ) {
    return <LoadingBlock label="Đang tải màn hình học viên..." />;
  }

  if (
    catalogQuery.isError ||
    publishedCoursesQuery.isError ||
    !catalogQuery.data
  ) {
    return <MessageBanner tone="error">Không tải được dữ liệu học viên.</MessageBanner>;
  }

  if (!officialCourse) {
    return <MessageBanner tone="warning">Chưa có khóa học chính thức đang xuất bản.</MessageBanner>;
  }

  const progress = progressQuery.data;
  const contentLessons = flattenLessons(officialCourse).filter((lesson) => lesson.type !== "Quiz");
  const quizzes = flattenQuizzes(officialCourse);
  const courseObjectives = Array.from(new Set(contentLessons.flatMap((lesson) => [
    ...(lesson.content?.objectives ?? []),
    ...(lesson.videoContent?.objectives ?? []),
  ]).map((item) => item.trim()).filter(Boolean)));
  const passScores = quizzes.map((quiz) => quiz.assessment?.passScore).filter((score): score is number => typeof score === "number");
  const requiredPassScore = passScores.length > 0 ? Math.max(...passScores) : null;
  const homeContent = parseHomeContent(systemSettings.homeContentJson);
  const homeVariables = { lessonCount: contentLessons.length, quizCount: quizzes.length, passScore: requiredPassScore };
  const progressPercent = progress?.overallCompletionPercent ?? catalogItem?.enrollment?.overallCompletionPercent ?? 0;
  const roadmapSections = buildRoadmapSections(officialCourse, progress);

  return (
    <div className="official-learner-home grid gap-4">
      <section className="official-welcome-hero">
        <div className="official-welcome-copy">
          <h1>{homeContent.welcomeTitle}</h1>
          {homeContent.welcomeBodyHtml
            ? <div className="official-home-rich-content" dangerouslySetInnerHTML={{ __html: homeContent.welcomeBodyHtml }} />
            : officialCourse.description ? <p>{officialCourse.description}</p> : null}
          <div className="official-hero-badges">
            <HeroBadge icon={ShieldCheck} title="Học dễ hiểu" subtitle="Áp dụng thực tế" />
            <HeroBadge icon={Target} title="Thực hành tương tác" subtitle="Phản hồi tức thì" />
            <HeroBadge icon={Trophy} title={requiredPassScore == null ? "Bài kiểm tra" : `Đạt ${requiredPassScore}%`} subtitle="Theo yêu cầu khóa học" />
          </div>
        </div>

        <div className="home-mascot-scene"><SafetyHeroIllustration /><div className="home-mascot-greeting"><LearningCompanion celebration={progressPercent >= 100} pose={progressPercent >= 100 ? "celebrate" : progressPercent > 0 ? "encourage" : "welcome"}><strong>{progressPercent >= 100 ? "Bạn đã hoàn thành khóa học!" : progressPercent > 0 ? "Mình cùng tiếp tục nhé!" : "Mình sẽ đồng hành cùng bạn!"}</strong><p>{progressPercent >= 100 ? "Bạn có thể ôn lại hoặc xem kết quả học tập." : progressPercent > 0 ? `Bạn đã đi được ${progressPercent}% hành trình. Chọn Tiếp tục học để trở lại bài đang mở.` : "Bắt đầu từ bài đầu tiên, mình sẽ hướng dẫn bạn từng bước."}</p></LearningCompanion></div></div>
      </section>

      <section className="official-summary-grid">
        <InfoCard icon={BookOpen} tone="blue" title={homeContent.overviewTitle}>
          <div className="official-home-rich-content" dangerouslySetInnerHTML={{ __html: renderHomeText(homeContent.overviewBodyHtml, homeVariables) }} />
          <div className="pt-2">
            <LearnerProgressBar label="Tiến độ của bạn" value={progressPercent} />
          </div>
        </InfoCard>

        <InfoCard icon={Target} tone="red" title={homeContent.objectivesTitle}>
          {homeContent.objectivesBodyHtml
            ? <div className="official-home-rich-content" dangerouslySetInnerHTML={{ __html: homeContent.objectivesBodyHtml }} />
            : courseObjectives.length > 0
            ? courseObjectives.map((objective) => <ChecklistItem key={objective}>{objective}</ChecklistItem>)
            : <p className="text-sm text-slate-500">Khóa học chưa công bố mục tiêu.</p>}
        </InfoCard>

        <InfoCard icon={ClipboardCheck} tone="blue" title={homeContent.tasksTitle}>
          <div className="official-home-rich-content" dangerouslySetInnerHTML={{ __html: homeContent.tasksBodyHtml }} />
          <div className="official-warning-note">
            <AlertCircle className="size-4" />
            <div className="official-home-rich-content" dangerouslySetInnerHTML={{ __html: homeContent.taskWarningHtml }} />
          </div>
        </InfoCard>

        <InfoCard icon={CheckCircle2} tone="green" title={homeContent.outcomesTitle}>
          <div className="official-home-rich-content" dangerouslySetInnerHTML={{ __html: homeContent.outcomesBodyHtml }} />
        </InfoCard>
      </section>

      <LearnerPanel className="official-start-strip">
        <div className="official-start-brand">
          <MascotFigure pose="guide" />
          <div>
            <p>Học an toàn</p>
            <p>Hành động đúng</p>
            <strong>Để bảo vệ mình và cộng đồng</strong>
          </div>
        </div>
        <Button
          className="official-start-button"
          type="button"
          onClick={() => navigate(progressPercent >= 100 ? "/app/results" : "/app/courses")}
        >
          <Play className="size-5 fill-current" />
          {progressPercent >= 100 ? "Xem kết quả" : catalogItem?.isEnrolled ? "Tiếp tục học" : "Bắt đầu khóa học"}
          <ArrowRight className="size-5" />
        </Button>
      </LearnerPanel>

      <LearnerPanel className="official-roadmap-panel">
        <div className="official-roadmap-header">
          <h2>Lộ trình học</h2>
          <p>Cấu trúc khóa học gồm Phần học và Bài học, mở theo thứ tự hoàn thành.</p>
        </div>
        <LearningRoadmap sections={roadmapSections} onNavigate={(href) => navigate(href)} />
      </LearnerPanel>
    </div>
  );
}

function buildRoadmapSections(course: CourseTreeResponse, progress?: ProgressSnapshotResponse): RoadmapSection[] {
  const lessonSummaryMap = progress ? toLessonSummaryMap(progress.lessons) : new Map();
  const quizSummaryMap = progress ? toQuizSummaryMap(progress.quizzes) : new Map();
  const quizzes = flattenQuizzes(course);
  const quizByAssessmentLessonId = new Map(quizzes.map((quiz) => [quiz.assessmentLessonId, quiz]));
  const usedQuizIds = new Set<string>();

  return sortSections(course.sections).map((section, index) => {
    const items = sortLessons(section.lessons).map((lesson) => {
      if (lesson.type === "Quiz") {
        const quiz = quizByAssessmentLessonId.get(lesson.id);
        if (quiz) {
          usedQuizIds.add(quiz.id);
        }
        return buildQuizRoadmapItem(course.id, lesson, quiz, progress, quizSummaryMap, `${index + 1}.${lesson.order}`);
      }

      const summary = lessonSummaryMap.get(lesson.id);
      const status: RoadmapStatus =
        summary?.status === "Completed"
          ? "done"
          : progress?.nextLessonId === lesson.id
            ? "active"
            : summary?.isUnlocked
              ? "ready"
              : "locked";

      return {
        id: lesson.id,
        number: getLessonNumber(lesson, index),
        title: trimLessonTitle(lesson.title),
        href: `/app/courses/${course.id}/lessons/${lesson.id}`,
        status,
        type: "lesson" as const,
      };
    });

    if (isFinalSection(section)) {
      sortQuizzes(course.quizzes)
        .filter((quiz) => !usedQuizIds.has(quiz.id))
        .forEach((quiz) => {
          usedQuizIds.add(quiz.id);
          items.push(buildQuizRoadmapItem(course.id, null, quiz, progress, quizSummaryMap, `${index + 1}.${items.length + 1}`));
        });
    }

    return {
      id: section.id,
      label: getSectionLabel(section, index),
      items,
    };
  });
}

function buildQuizRoadmapItem(
  courseId: string,
  lesson: CourseLesson | null,
  quiz: CourseQuiz | undefined,
  progress: ProgressSnapshotResponse | undefined,
  quizSummaryMap: ReadonlyMap<string, { passed: boolean; isUnlocked: boolean }>,
  fallbackNumber: string,
): RoadmapItem {
  const summary = quiz ? quizSummaryMap.get(quiz.id) : undefined;
  const status: RoadmapStatus = summary?.passed
    ? "done"
    : quiz && progress?.nextQuizId === quiz.id
      ? "active"
      : summary?.isUnlocked
        ? "ready"
        : "locked";

  return {
    id: quiz?.id ?? lesson?.id ?? fallbackNumber,
    number: "KT",
    title: trimLessonTitle(quiz?.title ?? lesson?.title ?? "Bài kiểm tra cuối phần"),
    href: quiz ? `/app/courses/${courseId}/quizzes/${quiz.id}` : "/app/courses",
    status,
    type: "quiz",
  };
}

function getLessonNumber(lesson: CourseLesson, sectionIndex: number) {
  const match = lesson.title.match(/Bài(?:\s+học)?(?:\s+số)?\s+(\d+(?:\.\d+)?)/i);
  return match?.[1] ?? `${sectionIndex + 1}.${lesson.order}`;
}

function trimLessonTitle(title: string) {
  return title.replace(/^Bài(?:\s+học)?(?:\s+số)?\s+\d+(?:\.\d+)?\s*[–-]\s*/i, "").trim();
}

function getSectionLabel(section: CourseSection, index: number) {
  return section.title || `PHẦN ${index + 1}`;
}

function isFinalSection(section: CourseSection) {
  const title = section.title.toLowerCase();
  return section.id.includes("final") || title.includes("cuối khóa") || title.includes("kiểm tra");
}

function LearningRoadmap({
  sections,
  onNavigate,
}: {
  sections: RoadmapSection[];
  onNavigate: (href: string) => void;
}) {
  return (
    <div className="official-roadmap-scroll">
      <div className="official-roadmap-track">
        {sections.map((section) => (
          <div className="official-roadmap-section" key={section.id}>
            <div className="official-roadmap-section-title">{section.label}</div>
            <div className="official-roadmap-items">
              {section.items.map((item) => (
                <button
                  className={`official-roadmap-item ${item.status}`}
                  aria-current={item.status === "active" ? "step" : undefined}
                  disabled={item.status === "locked"}
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.href)}
                >
                  <span className="official-roadmap-dot">
                    {item.status === "done" ? (
                      <CheckCircle2 className="size-4" />
                    ) : item.status === "locked" ? (
                      <Lock className="size-4" />
                    ) : item.type === "quiz" ? (
                      <FileQuestion className="size-4" />
                    ) : (
                      <span />
                    )}
                  </span>
                  <span className="official-roadmap-number">{item.number}</span>
                  <span className="official-roadmap-name">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HeroBadge({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="official-hero-badge">
      <span>
        <Icon className="size-5" />
      </span>
      <div>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  tone,
  title,
  children,
}: {
  icon: LucideIcon;
  tone: "blue" | "red" | "green";
  title: string;
  children: ReactNode;
}) {
  return (
    <LearnerPanel className={`official-info-card ${tone}`}>
      <div className="official-info-card-title">
        <span>
          <Icon className="size-6" />
        </span>
        <h2>{title}</h2>
      </div>
      <div className="official-info-card-body">{children}</div>
    </LearnerPanel>
  );
}

function ChecklistItem({ children }: { children: ReactNode }) {
  return (
    <div className="official-check-row">
      <CheckCircle2 className="size-4" />
      <span>{children}</span>
    </div>
  );
}

function SafetyHeroIllustration() {
  return (
    <div className="safety-hero-illustration" aria-hidden="true">
      <div className="safety-sky">
        <span className="cloud cloud-one" />
        <span className="cloud cloud-two" />
        <span className="sun" />
      </div>
      <div className="mountain mountain-back" />
      <div className="mountain mountain-front" />
      <div className="field field-one" />
      <div className="field field-two" />
      <div className="warning-sign">
        <span className="skull">☠</span>
        <strong>KHU VỰC</strong>
        <strong>NGUY HIỂM</strong>
      </div>
      <div className="barrier barrier-left" />
      <div className="barrier barrier-right" />
      <span className="mine mine-one" />
      <span className="mine mine-two" />
      <span className="shell shell-one" />
      <span className="shell shell-two" />
    </div>
  );
}
