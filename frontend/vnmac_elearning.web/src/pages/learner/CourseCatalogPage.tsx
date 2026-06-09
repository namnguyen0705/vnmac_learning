import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen, Clock3, Filter, Search, ShieldCheck } from "lucide-react";
import { useAuth } from "../../app/auth";
import { enrollInCourse, getLearnerCourseCatalog, getPublishedCourses } from "../../shared/api/learner";
import { getCourseCoverAsset } from "../../shared/lib/course";
import { formatMinutes } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import {
  LearnerMetaChip,
  LearnerPagination,
  LearnerPanel,
  LearnerProgressBar,
  LearnerScreenTitle,
  LearnerStatusBadge,
} from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";

type ViewFilter = "all" | "enrolled" | "available" | "completed";

const PAGE_SIZE = 4;
const tagPalette = [
  { label: "Mới", className: "bg-emerald-500 text-white" },
  { label: "Phổ biến", className: "bg-amber-400 text-slate-900" },
  { label: "Nâng cao", className: "bg-sky-100 text-sky-700" },
  { label: "Ưu tiên", className: "bg-rose-100 text-rose-700" },
];

function deriveLevel(title: string, index: number) {
  const normalized = title.toLowerCase();
  if (normalized.includes("nâng cao") || index % 3 === 2) {
    return "Nâng cao";
  }

  return "Cơ bản";
}

export function CourseCatalogPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? "";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ViewFilter>("all");
  const [page, setPage] = useState(1);

  const learnerCatalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  const publishedCoursesQuery = useQuery({
    queryKey: ["courses", "published"],
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

  const publishedCoverMap = useMemo(() => {
    return new Map(
      (publishedCoursesQuery.data ?? []).map((course) => {
        const asset = getCourseCoverAsset(course);
        return [course.id, asset.posterUrl];
      }),
    );
  }, [publishedCoursesQuery.data]);

  const filteredCourses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (learnerCatalogQuery.data?.courses ?? [])
      .filter((course) => {
        if (!normalizedSearch) {
          return true;
        }

        return `${course.title} ${course.description}`.toLowerCase().includes(normalizedSearch);
      })
      .filter((course) => {
        if (filter === "enrolled") {
          return course.isEnrolled;
        }

        if (filter === "available") {
          return !course.isEnrolled;
        }

        if (filter === "completed") {
          return Boolean(course.enrollment?.certificateIssued);
        }

        return true;
      });
  }, [filter, learnerCatalogQuery.data?.courses, search]);

  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCourses = filteredCourses.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (learnerCatalogQuery.isLoading || publishedCoursesQuery.isLoading) {
    return <LoadingBlock label="Đang tải danh sách khóa học..." />;
  }

  if (learnerCatalogQuery.isError || publishedCoursesQuery.isError || !learnerCatalogQuery.data) {
    return <MessageBanner tone="error">Không tải được danh sách khóa học.</MessageBanner>;
  }

  return (
    <div className="grid gap-6">
      <LearnerScreenTitle index={1} title="Danh sách khóa học" />

      <LearnerPanel className="overflow-hidden">
        <div className="relative min-h-[320px] overflow-hidden p-8">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `linear-gradient(90deg, rgba(255,255,255,0.94) 0%, rgba(255,255,255,0.88) 36%, rgba(255,255,255,0.28) 62%, rgba(255,255,255,0.1) 100%), url('${publishedCoverMap.values().next().value ?? ""}')`,
            }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(229,239,255,0.18)_0%,rgba(255,255,255,0)_100%)]" />

          <div className="relative z-10 grid max-w-[560px] gap-4">
            <h1 className="text-[2.35rem] font-semibold leading-[1.08] tracking-[-0.05em] text-[#12284c]">
              Trang bị kiến thức an toàn
              <br />
              bảo vệ bản thân, cộng đồng
            </h1>
            <p className="text-sm leading-7 text-slate-600">
              Các khóa học được thiết kế bởi chuyên gia về giáo dục phòng tránh tai nạn bom mìn, vật nổ,
              giúp bạn học đúng, hiểu sâu và áp dụng được.
            </p>

            <div className="flex flex-col gap-3 pt-3 sm:flex-row">
              <div className="flex h-11 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                <Search className="size-4 text-slate-400" />
                <input
                  className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                  placeholder="Tìm kiếm khóa học..."
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <div className="flex h-11 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 shadow-sm">
                <Filter className="size-4 text-slate-400" />
                <select
                  className="bg-transparent text-sm text-slate-700 outline-none"
                  value={filter}
                  onChange={(event) => {
                    setFilter(event.target.value as ViewFilter);
                    setPage(1);
                  }}
                >
                  <option value="all">Tất cả khóa học</option>
                  <option value="enrolled">Đã đăng ký</option>
                  <option value="available">Chưa đăng ký</option>
                  <option value="completed">Đã hoàn thành</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </LearnerPanel>

      {pagedCourses.length === 0 ? (
        <MessageBanner tone="info">Không có khóa học nào phù hợp với bộ lọc hiện tại.</MessageBanner>
      ) : (
        <div className="grid gap-5 xl:grid-cols-4">
          {pagedCourses.map((course, index) => {
            const level = deriveLevel(course.title, index);
            const tag = tagPalette[index % tagPalette.length];
            const progress = course.enrollment?.overallCompletionPercent ?? 0;
            const posterUrl = publishedCoverMap.get(course.courseId) ?? null;

            return (
              <LearnerPanel
                className="overflow-hidden transition hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.1)]"
                key={course.courseId}
              >
                <div
                  className={cn(
                    "relative h-[170px] border-b border-slate-200 bg-[linear-gradient(135deg,#456b42_0%,#8fba76_52%,#e5edd0_100%)] bg-cover bg-center",
                    posterUrl ? "" : "bg-[linear-gradient(135deg,#456b42_0%,#8fba76_52%,#e5edd0_100%)]",
                  )}
                  style={posterUrl ? { backgroundImage: `url('${posterUrl}')` } : undefined}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.06)_0%,rgba(15,23,42,0.3)_100%)]" />
                  <div className="absolute left-4 top-4">
                    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold shadow-sm", tag.className)}>
                      {tag.label}
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  <div className="grid gap-2">
                    <h3 className="line-clamp-2 text-[1.2rem] font-semibold leading-snug text-slate-950">{course.title}</h3>
                    <LearnerStatusBadge tone={level === "Nâng cao" ? "brand" : "neutral"}>{level}</LearnerStatusBadge>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
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
                    <LearnerProgressBar label="Tiến độ" value={progress} />
                  ) : (
                    <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      Đăng ký để bắt đầu lộ trình học của khóa này.
                    </div>
                  )}

                  <div className="flex gap-3">
                    {course.isEnrolled ? (
                      <Button
                        className="w-full rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]"
                        type="button"
                        onClick={() => navigate(`/app/courses/${course.courseId}`)}
                      >
                        {progress > 0 ? "Tiếp tục học" : "Vào khóa học"}
                      </Button>
                    ) : (
                      <Button
                        className="w-full rounded-2xl bg-[#163b7b] hover:bg-[#0f2e63]"
                        disabled={enrollMutation.isPending}
                        type="button"
                        onClick={() => enrollMutation.mutate(course.courseId)}
                      >
                        Đăng ký học
                      </Button>
                    )}

                    <Button asChild className="rounded-2xl" variant="outline">
                      <Link to={`/app/courses/${course.courseId}`}>Chi tiết</Link>
                    </Button>
                  </div>
                </div>
              </LearnerPanel>
            );
          })}
        </div>
      )}

      <LearnerPanel className="p-4">
        <div className="flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <span>
            Hiển thị {Math.min((currentPage - 1) * PAGE_SIZE + 1, filteredCourses.length)} - {Math.min(currentPage * PAGE_SIZE, filteredCourses.length)} của {filteredCourses.length} khóa học
          </span>
          <LearnerPagination page={currentPage} totalPages={totalPages} onPageChange={setPage} />
        </div>
      </LearnerPanel>
    </div>
  );
}
