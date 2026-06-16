import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Clock3,
  PlayCircle,
  Search,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../app/auth";
import { enrollInCourse, getLearnerCourseCatalog, getPublishedCourses } from "../../shared/api/learner";
import { formatMinutes } from "../../shared/lib/format";
import { getCourseCoverAsset } from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerMetaChip, LearnerPanel, LearnerProgressBar, LearnerStatusBadge } from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type { LearnerCourseCatalogItem } from "../../shared/types/api";

type CourseFilter = "all" | "new" | "learning" | "completed";

type CourseCover = {
  posterUrl: string | null;
  lessonTitle: string | null;
};

const filters: { id: CourseFilter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "new", label: "Khóa học mới" },
  { id: "learning", label: "Đang học" },
  { id: "completed", label: "Đã hoàn thành" },
];

const fallbackImages = [
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
];

export function CourseCatalogPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? "";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CourseFilter>("all");

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  const publishedCoursesQuery = useQuery({
    queryKey: ["courses", "published", "covers"],
    queryFn: getPublishedCourses,
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollInCourse(userId, courseId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["learner", userId, "catalog"] }),
        queryClient.invalidateQueries({ queryKey: ["learner", userId, "dashboard"] }),
      ]);
    },
  });

  const coverMap = useMemo(() => {
    return new Map(
      (publishedCoursesQuery.data ?? []).map((course) => [course.id, getCourseCoverAsset(course)]),
    );
  }, [publishedCoursesQuery.data]);

  const groups = useMemo(() => {
    const courses = catalogQuery.data?.courses ?? [];
    return {
      allCourses: courses,
      newCourses: courses.filter((course) => !course.isEnrolled),
      learningCourses: courses.filter((course) => course.isEnrolled && !course.enrollment?.certificateIssued),
      completedCourses: courses.filter((course) => course.enrollment?.certificateIssued),
    };
  }, [catalogQuery.data?.courses]);

  const visibleCourses = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    let rows = groups.allCourses;

    if (filter === "new") {
      rows = groups.newCourses;
    } else if (filter === "learning") {
      rows = groups.learningCourses;
    } else if (filter === "completed") {
      rows = groups.completedCourses;
    }

    if (!keyword) {
      return rows;
    }

    return rows.filter((course) => `${course.title} ${course.description}`.toLowerCase().includes(keyword));
  }, [filter, groups.allCourses, groups.completedCourses, groups.learningCourses, groups.newCourses, search]);

  const featuredCourse = groups.learningCourses[0] ?? groups.newCourses[0] ?? groups.completedCourses[0] ?? null;
  const featuredCover = featuredCourse ? coverMap.get(featuredCourse.courseId) : null;

  if (catalogQuery.isLoading) {
    return <LoadingBlock label="Đang tải danh sách khóa học..." />;
  }

  if (catalogQuery.isError || !catalogQuery.data) {
    return <MessageBanner tone="error">Không tải được danh sách khóa học.</MessageBanner>;
  }

  return (
    <div className="grid gap-7">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
        <LearnerPanel className="overflow-hidden">
          <div className="relative min-h-[500px]">
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${featuredCover?.posterUrl ?? getFallbackImage(featuredCourse?.courseId ?? "hero")})` }}
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(248,250,252,0.97)_0%,rgba(248,250,252,0.9)_46%,rgba(15,46,99,0.34)_100%)]" />
            <div className="relative z-10 grid min-h-[500px] gap-8 p-7 sm:p-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#163b7b] shadow-sm">
                  <Sparkles className="size-3.5" />
                  Thư viện học tập
                </div>
                <h1 className="mt-5 text-[2.35rem] font-semibold leading-tight text-slate-950 sm:text-[3rem]">
                  Chọn khóa học phù hợp và bắt đầu lộ trình an toàn
                </h1>
                <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-700">
                  Toàn bộ khóa học được trình bày như một thư viện nội dung. Học viên có thể xem video giới thiệu,
                  đăng ký khóa mới, tiếp tục khóa đang học hoặc mở lại khóa đã hoàn thành.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="h-12 rounded-2xl border-slate-200 bg-white/95 pl-10"
                      placeholder="Tìm kiếm khóa học..."
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </div>
                  <Button className="h-12 rounded-2xl bg-[#163b7b] px-6 hover:bg-[#0f2e63]" type="button" onClick={() => setFilter("all")}>
                    Xem tất cả
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 rounded-2xl border border-white/70 bg-white/90 p-5 shadow-[0_22px_60px_rgba(15,46,99,0.18)] backdrop-blur">
                <p className="text-sm font-semibold text-slate-950">Tổng quan thư viện</p>
                <LandingStat label="Tất cả khóa học" value={groups.allCourses.length} icon={BookOpen} />
                <LandingStat label="Đang học" value={groups.learningCourses.length} icon={PlayCircle} />
                <LandingStat label="Đã hoàn thành" value={groups.completedCourses.length} icon={Award} />
              </div>
            </div>
          </div>
        </LearnerPanel>

        <LearnerPanel className="p-6">
          <h2 className="text-[1.25rem] font-semibold text-slate-950">Khóa học nổi bật</h2>
          {featuredCourse ? (
            <div className="mt-5 grid gap-4">
              <CourseCard
                course={featuredCourse}
                cover={featuredCover}
                emphasized
                onEnroll={() => enrollMutation.mutate(featuredCourse.courseId)}
                onOpen={() => navigate(`/app/courses/${featuredCourse.courseId}`)}
              />
            </div>
          ) : (
            <div className="mt-5">
              <MessageBanner tone="info">Chưa có khóa học để hiển thị.</MessageBanner>
            </div>
          )}
        </LearnerPanel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Khóa học mới" value={groups.newCourses.length} icon={BookOpen} />
        <SummaryCard label="Khóa đang học" value={groups.learningCourses.length} icon={PlayCircle} />
        <SummaryCard label="Khóa đã hoàn thành" value={groups.completedCourses.length} icon={CheckCircle2} />
      </section>

      <LearnerPanel className="p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-[1.35rem] font-semibold text-slate-950">Toàn bộ khóa học</h2>
            <p className="mt-2 text-sm text-slate-600">
              Mỗi khóa học có thumbnail video ở bên ngoài để học viên nhận diện nhanh nội dung trước khi mở chi tiết.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((item) => (
              <Button
                className="rounded-2xl"
                key={item.id}
                type="button"
                variant={filter === item.id ? "default" : "outline"}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
          {visibleCourses.length ? (
            visibleCourses.map((course) => (
              <CourseCard
                course={course}
                cover={coverMap.get(course.courseId)}
                key={course.courseId}
                onEnroll={() => enrollMutation.mutate(course.courseId)}
                onOpen={() => navigate(`/app/courses/${course.courseId}`)}
              />
            ))
          ) : (
            <div className="md:col-span-2 2xl:col-span-4">
              <MessageBanner tone="info">Không có khóa học phù hợp với bộ lọc hiện tại.</MessageBanner>
            </div>
          )}
        </div>
      </LearnerPanel>

      <section className="grid gap-6 xl:grid-cols-2">
        <CourseCollection title="Khóa học mới nhất" courses={groups.newCourses} coverMap={coverMap} empty="Hiện chưa có khóa học mới." />
        <CourseCollection title="Khóa học đã hoàn thành" courses={groups.completedCourses} coverMap={coverMap} empty="Bạn chưa hoàn thành khóa học nào." />
      </section>
    </div>
  );
}

function CourseCard({
  course,
  cover,
  emphasized = false,
  onEnroll,
  onOpen,
}: {
  course: LearnerCourseCatalogItem;
  cover?: CourseCover | null;
  emphasized?: boolean;
  onEnroll: () => void;
  onOpen: () => void;
}) {
  const progress = course.enrollment?.overallCompletionPercent ?? 0;
  const completed = Boolean(course.enrollment?.certificateIssued);
  const imageUrl = cover?.posterUrl ?? getFallbackImage(course.courseId);

  return (
    <div
      className={
        emphasized
          ? "group grid gap-4 overflow-hidden rounded-2xl border border-[#bdd7ff] bg-[#f7fbff] shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_55px_rgba(15,46,99,0.16)]"
          : "group grid gap-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#163b7b]/35 hover:shadow-[0_22px_55px_rgba(15,46,99,0.14)]"
      }
    >
      <button className="relative aspect-video overflow-hidden text-left" type="button" onClick={onOpen}>
        <img className="h-full w-full object-cover transition duration-500 group-hover:scale-105" src={imageUrl} alt={course.title} loading="lazy" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.08)_0%,rgba(15,23,42,0.76)_100%)]" />
        <div className="absolute left-4 top-4">
          <LearnerStatusBadge tone={completed ? "success" : course.isEnrolled ? "brand" : "neutral"}>
            {completed ? "Hoàn thành" : course.isEnrolled ? "Đang học" : "Mới"}
          </LearnerStatusBadge>
        </div>
        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/80">Video khóa học</p>
            <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">{cover?.lessonTitle ?? "Xem nội dung giới thiệu"}</p>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-[#163b7b] shadow-lg transition duration-300 group-hover:scale-110">
            <PlayCircle className="size-6" />
          </span>
        </div>
      </button>

      <div className="grid gap-4 p-5 pt-0">
        <div>
          <h3 className="line-clamp-2 text-lg font-semibold leading-snug text-slate-950">{course.title}</h3>
          <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{course.description}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <LearnerMetaChip>
            <BookOpen className="size-3.5" />
            {course.totalLessons} bài học
          </LearnerMetaChip>
          <LearnerMetaChip>
            <ShieldCheck className="size-3.5" />
            {course.totalQuizzes} bài kiểm tra
          </LearnerMetaChip>
          <LearnerMetaChip>
            <Clock3 className="size-3.5" />
            {formatMinutes(course.estimatedStudyTimeMinutes)}
          </LearnerMetaChip>
        </div>

        {course.isEnrolled ? (
          <LearnerProgressBar label="Tiến độ khóa học" value={progress} />
        ) : (
          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Đăng ký để bắt đầu học, lưu tiến độ và nhận chứng chỉ khi hoàn thành.
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          {course.isEnrolled ? (
            <Button className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]" type="button" onClick={onOpen}>
              {completed ? "Xem lại khóa" : "Tiếp tục học"}
            </Button>
          ) : (
            <Button className="rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]" type="button" onClick={onEnroll}>
              Đăng ký học
            </Button>
          )}
          <Button className="rounded-2xl" type="button" variant="outline" onClick={onOpen}>
            Chi tiết
          </Button>
        </div>
      </div>
    </div>
  );
}

function CourseCollection({
  title,
  courses,
  coverMap,
  empty,
}: {
  title: string;
  courses: LearnerCourseCatalogItem[];
  coverMap: Map<string, CourseCover>;
  empty: string;
}) {
  return (
    <LearnerPanel className="p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.25rem] font-semibold text-slate-950">{title}</h2>
        <span className="text-sm text-slate-500">{courses.length} khóa học</span>
      </div>
      <div className="mt-5 grid gap-3">
        {courses.length ? (
          courses.slice(0, 5).map((course) => {
            const cover = coverMap.get(course.courseId);
            return (
              <Link
                className="group grid grid-cols-[92px_minmax(0,1fr)] gap-4 rounded-2xl border border-slate-200 bg-white p-3 transition duration-300 hover:-translate-y-0.5 hover:border-[#163b7b]/40 hover:shadow-md"
                key={course.courseId}
                to={`/app/courses/${course.courseId}`}
              >
                <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-100">
                  <img className="h-full w-full object-cover transition duration-300 group-hover:scale-105" src={cover?.posterUrl ?? getFallbackImage(course.courseId)} alt={course.title} loading="lazy" />
                  <div className="absolute inset-0 grid place-items-center bg-slate-950/20 text-white">
                    <PlayCircle className="size-6" />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="line-clamp-2 font-semibold text-slate-950">{course.title}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {course.totalLessons} bài học - {course.totalQuizzes} bài kiểm tra
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[#163b7b]">{course.enrollment?.overallCompletionPercent ?? 0}%</p>
                </div>
              </Link>
            );
          })
        ) : (
          <MessageBanner tone="info">{empty}</MessageBanner>
        )}
      </div>
    </LearnerPanel>
  );
}

function SummaryCard({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <LearnerPanel className="overflow-hidden p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <span className="grid size-12 place-items-center rounded-2xl bg-[#eaf3ff] text-[#163b7b]">
          <Icon className="size-5" />
        </span>
      </div>
    </LearnerPanel>
  );
}

function LandingStat({ label, value, icon: Icon }: { label: string; value: number; icon: LucideIcon }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="size-4 text-[#163b7b]" />
        <span className="text-sm text-slate-600">{label}</span>
      </div>
      <strong className="text-slate-950">{value}</strong>
    </div>
  );
}

function getFallbackImage(seed: string) {
  const hash = [...seed].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return fallbackImages[hash % fallbackImages.length];
}
