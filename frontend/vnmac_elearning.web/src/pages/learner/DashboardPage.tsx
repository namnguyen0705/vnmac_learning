import { useQuery } from "@tanstack/react-query";
import { useMemo, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileQuestion,
  Lock,
  Play,
  ShieldCheck,
  Target,
  Trophy,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  getLearnerCourseCatalog,
  getLearnerCourseProgress,
  getLearnerDashboard,
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
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type {
  CourseLesson,
  CourseQuiz,
  CourseSection,
  CourseTreeResponse,
  ProgressSnapshotResponse,
} from "../../shared/types/api";

const OFFICIAL_COURSE_ID = "course-vnmac-elearning";

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
  const userId = session?.user.id ?? "";

  const dashboardQuery = useQuery({
    queryKey: ["learner", userId, "dashboard"],
    queryFn: () => getLearnerDashboard(userId),
    enabled: Boolean(userId),
  });

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  const publishedCoursesQuery = useQuery({
    queryKey: ["courses", "published", "official-dashboard"],
    queryFn: getPublishedCourses,
  });

  const officialCourse = useMemo(() => {
    const courses = publishedCoursesQuery.data ?? [];
    return courses.find((course) => course.id === OFFICIAL_COURSE_ID) ?? courses[0] ?? null;
  }, [publishedCoursesQuery.data]);

  const catalogItem = officialCourse
    ? catalogQuery.data?.courses.find((course) => course.courseId === officialCourse.id)
    : undefined;

  const progressQuery = useQuery({
    queryKey: ["learner", userId, "course-progress", officialCourse?.id],
    queryFn: () => getLearnerCourseProgress(userId, officialCourse?.id ?? ""),
    enabled: Boolean(userId && officialCourse?.id && catalogItem?.isEnrolled),
  });

  if (
    dashboardQuery.isLoading ||
    catalogQuery.isLoading ||
    publishedCoursesQuery.isLoading ||
    (catalogItem?.isEnrolled && progressQuery.isLoading)
  ) {
    return <LoadingBlock label="Đang tải màn hình học viên..." />;
  }

  if (
    dashboardQuery.isError ||
    catalogQuery.isError ||
    publishedCoursesQuery.isError ||
    !dashboardQuery.data ||
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
  const progressPercent = progress?.overallCompletionPercent ?? catalogItem?.enrollment?.overallCompletionPercent ?? 0;
  const roadmapSections = buildRoadmapSections(officialCourse, progress);

  return (
    <div className="official-learner-home grid gap-4">
      <section className="official-welcome-hero">
        <div className="official-welcome-copy">
          <h1>Chào mừng bạn!</h1>
          <p>
            Khóa học giúp bạn nhận biết nguy cơ bom mìn, thực hành hành vi an toàn và truyền thông hiệu quả
            trong cộng đồng.
          </p>
          <div className="official-hero-badges">
            <HeroBadge icon={ShieldCheck} title="Học dễ hiểu" subtitle="Áp dụng thực tế" />
            <HeroBadge icon={Target} title="Thực hành tương tác" subtitle="Phản hồi tức thì" />
            <HeroBadge icon={Trophy} title="Đạt 100%" subtitle="Nhận chứng chỉ" />
          </div>
        </div>

        <SafetyHeroIllustration />
      </section>

      <section className="official-summary-grid">
        <InfoCard icon={BookOpen} tone="blue" title="Tổng quan khóa học">
          <ChecklistItem>{contentLessons.length} bài học + {quizzes.length} bài kiểm tra cuối khóa</ChecklistItem>
          <ChecklistItem>Học theo trình tự, không bỏ qua bài</ChecklistItem>
          <ChecklistItem>Phải đạt 100% để hoàn thành khóa học</ChecklistItem>
          <div className="pt-2">
            <LearnerProgressBar label="Tiến độ của bạn" value={progressPercent} />
          </div>
        </InfoCard>

        <InfoCard icon={Target} tone="red" title="Mục đích khóa học">
          <ChecklistItem>Nhận diện các loại vật nổ nguy hiểm</ChecklistItem>
          <ChecklistItem>Tránh các hành vi sai, nguy hiểm</ChecklistItem>
          <ChecklistItem>Thực hiện đúng hành vi an toàn</ChecklistItem>
          <ChecklistItem>Truyền thông thay đổi hành vi hiệu quả</ChecklistItem>
          <ChecklistItem>Góp phần bảo vệ bản thân và cộng đồng</ChecklistItem>
        </InfoCard>

        <InfoCard icon={ClipboardCheck} tone="blue" title="Nhiệm vụ của bạn">
          <TaskItem title="Học bài" description="Xem video, đọc nội dung, ghi nhớ kiến thức" />
          <TaskItem title="Thực hành" description="Tham gia hoạt động tương tác trong bài" />
          <TaskItem title="Làm quiz" description="Trả lời câu hỏi cuối bài để kiểm tra" />
          <TaskItem title="Đạt 100%" description="Hoàn thành 100% mỗi bài tiếp theo" />
          <div className="official-warning-note">
            <AlertCircle className="size-4" />
            <span>Bạn cần hoàn thành từng bước để đảm bảo an toàn.</span>
          </div>
        </InfoCard>

        <InfoCard icon={Award} tone="green" title="Sau khi học xong">
          <SuccessItem>Hiểu rõ nguy cơ từ bom mìn, vật nổ</SuccessItem>
          <SuccessItem>Biết cách xử lý an toàn khi gặp vật lạ</SuccessItem>
          <SuccessItem>Truyền đạt thông điệp đúng, dễ hiểu</SuccessItem>
          <SuccessItem>Tự tin hỗ trợ và bảo vệ cộng đồng</SuccessItem>
          <SuccessItem>Nhận chứng chỉ hoàn thành khóa học</SuccessItem>
          <div className="official-certificate-mini">
            <span>Chứng chỉ</span>
            <strong>Hoàn thành</strong>
          </div>
        </InfoCard>
      </section>

      <LearnerPanel className="official-start-strip">
        <div className="official-start-brand">
          <div className="official-start-shield">
            <ShieldCheck className="size-9" />
          </div>
          <div>
            <p>Học an toàn</p>
            <p>Hành động đúng</p>
            <strong>Để bảo vệ mình và cộng đồng</strong>
          </div>
        </div>
        <Button
          className="official-start-button"
          type="button"
          onClick={() => navigate(catalogItem?.isEnrolled ? "/app/courses" : `/app/courses/${officialCourse.id}`)}
        >
          <Play className="size-5 fill-current" />
          Bắt đầu khóa học
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
    number: lesson ? getLessonNumber(lesson, 2) : fallbackNumber,
    title: trimLessonTitle(quiz?.title ?? lesson?.title ?? "Bài kiểm tra cuối khóa"),
    href: quiz ? `/app/courses/${courseId}/quizzes/${quiz.id}` : `/app/courses/${courseId}`,
    status,
    type: "quiz",
  };
}

function getLessonNumber(lesson: CourseLesson, sectionIndex: number) {
  const match = lesson.title.match(/Bài\s+(\d+(?:\.\d+)?)/i);
  return match?.[1] ?? `${sectionIndex + 1}.${lesson.order}`;
}

function trimLessonTitle(title: string) {
  return title.replace(/^Bài\s+\d+(?:\.\d+)?\s*-\s*/i, "").trim();
}

function getSectionLabel(section: CourseSection, index: number) {
  const title = section.title.toLowerCase();
  if (section.id.includes("eore") || title.includes("eore")) {
    return "PHẦN 1 - EORE";
  }
  if (section.id.includes("sbc") || title.includes("sbc")) {
    return "PHẦN 2 - SBC";
  }
  return `PHẦN ${index + 1}`;
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

function SuccessItem({ children }: { children: ReactNode }) {
  return (
    <div className="official-success-row">
      <CheckCircle2 className="size-4" />
      <span>{children}</span>
    </div>
  );
}

function TaskItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="official-task-row">
      <UsersRound className="size-4" />
      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
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
