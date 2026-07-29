import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createLesson,
  deleteImportedScormPackage,
  deleteLesson,
  getAdminCourses,
  getAdminLessonCatalog,
  importScormPackage,
} from "@/shared/api/admin";
import { AdminModal } from "@/shared/ui/admin-kit";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import type { AdminLessonCatalogRow, LessonDifficulty, LessonPublicationStatus, LessonType, ScormPackageRequest } from "@/shared/types/api";
import {
  Archive,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Filter,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

const statusOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "Published", label: "Đã xuất bản" },
  { value: "Draft", label: "Bản nháp" },
  { value: "Archived", label: "Đã lưu trữ" },
] as const;

const difficultyOptions = [
  { value: "all", label: "Tất cả độ khó" },
  { value: "Basic", label: "Cơ bản" },
  { value: "Intermediate", label: "Trung bình" },
  { value: "Advanced", label: "Nâng cao" },
] as const;

const pageSizeOptions = ["10", "20", "30"] as const;

const fallbackThumb = "https://picsum.photos/seed/vnmac-admin-lesson/240/160";

function getNextLessonOrder(lessons: Array<{ order: number }>) {
  return Math.max(0, ...lessons.map((lesson) => lesson.order)) + 1;
}

function formatPercent(part: number, total: number) {
  if (total <= 0) {
    return "0%";
  }

  return `${((part / total) * 100).toFixed(1)}%`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: "--", time: "--" };
  }

  return {
    date: new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date),
    time: new Intl.DateTimeFormat("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date),
  };
}

function getDifficultyMeta(value: LessonDifficulty) {
  switch (value) {
    case "Advanced":
      return { label: "Nâng cao", tone: "danger" };
    case "Intermediate":
      return { label: "Trung bình", tone: "warning" };
    case "Basic":
    default:
      return { label: "Cơ bản", tone: "success" };
  }
}

function getStatusMeta(value: LessonPublicationStatus) {
  switch (value) {
    case "Draft":
      return { label: "Bản nháp", tone: "warning" };
    case "Archived":
      return { label: "Đã lưu trữ", tone: "danger" };
    case "Published":
    default:
      return { label: "Đã xuất bản", tone: "success" };
  }
}

function LessonRow({
  index,
  lesson,
  onEditContent,
  onArchive,
}: {
  index: number;
  lesson: AdminLessonCatalogRow;
  onEditContent: (lesson: AdminLessonCatalogRow) => void;
  onArchive: (lesson: AdminLessonCatalogRow) => void;
}) {
  const difficulty = getDifficultyMeta(lesson.difficulty);
  const status = getStatusMeta(lesson.publicationStatus);
  const updatedAt = formatDateTime(lesson.updatedAt);

  return (
    <tr>
      <td className="admin-lessons-index">{index}</td>
      <td>
        <div className="admin-lesson-title-cell">
          <img
            alt=""
            className="admin-lesson-thumb"
            onError={(event) => {
              event.currentTarget.src = fallbackThumb;
            }}
            src={lesson.thumbnailUrl || fallbackThumb}
          />
          <div>
            <strong>{lesson.title}</strong>
            <span>{lesson.description}</span>
          </div>
        </div>
      </td>
      <td>
        <span className="admin-pill admin-pill-blue">{lesson.topic || lesson.sectionTitle}</span>
      </td>
      <td>
        <span className={`admin-pill admin-pill-${difficulty.tone}`}>{difficulty.label}</span>
      </td>
      <td>
        <span className={`admin-status admin-status-${status.tone}`}>
          <i />
          {status.label}
        </span>
      </td>
      <td className="admin-lessons-number">{lesson.learnerCount.toLocaleString("vi-VN")}</td>
      <td className="admin-lessons-date">
        <strong>{updatedAt.date}</strong>
        <span>{updatedAt.time}</span>
      </td>
      <td>
        <div className="admin-table-actions">
          <Button aria-label="Xem nội dung bài học" onClick={() => onEditContent(lesson)} size="icon" type="button" variant="outline">
            <Eye className="size-4" />
          </Button>
          <Button aria-label="Sửa nội dung bài học" onClick={() => onEditContent(lesson)} size="icon" type="button" variant="outline">
            <Pencil className="size-4" />
          </Button>
          <Button
            aria-label="Lưu trữ bài học"
            disabled={lesson.publicationStatus === "Archived"}
            onClick={() => onArchive(lesson)}
            size="icon"
            type="button"
            variant="outline"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function LessonsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [topic, setTopic] = useState("all");
  const [status, setStatus] = useState<LessonPublicationStatus | "all">("all");
  const [difficulty, setDifficulty] = useState<LessonDifficulty | "all">("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scormPackage, setScormPackage] = useState<ScormPackageRequest | null>(null);
  const [isImportingScorm, setIsImportingScorm] = useState(false);
  const [scormImportError, setScormImportError] = useState("");
  const [createForm, setCreateForm] = useState({
    courseId: "",
    sectionId: "",
    title: "",
    type: "Video" as LessonType,
    order: 1,
    durationMinutes: 5,
    difficulty: "Basic" as LessonDifficulty,
    publicationStatus: "Draft" as LessonPublicationStatus,
  });

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses", "lesson-create"],
    queryFn: getAdminCourses,
  });

  const catalogQuery = useQuery({
    queryKey: ["admin-lesson-catalog", search, topic, status, difficulty, page, pageSize],
    queryFn: () =>
      getAdminLessonCatalog({
        search,
        topic,
        status,
        difficulty,
        page,
        pageSize,
      }),
  });

  const catalog = catalogQuery.data;
  const selectedCourse = coursesQuery.data?.find((course) => course.id === createForm.courseId);

  const createMutation = useMutation({
    mutationFn: () => createLesson({
      ...createForm,
      statusLabel: createForm.publicationStatus === "Published" ? "Đã xuất bản" : "Bản nháp",
      topic: selectedCourse?.sections.find((section) => section.id === createForm.sectionId)?.title ?? "",
      thumbnailUrl: "",
      scormPackage: createForm.type === "Scorm" ? scormPackage : null,
    }),
    onSuccess: async (lesson) => {
      if (createForm.type !== "Scorm" && scormPackage) {
        await deleteImportedScormPackage(scormPackage.entryPath).catch(() => undefined);
      }
      setScormPackage(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-lesson-catalog"] });
      setIsCreateOpen(false);
      navigate(`/admin/lessons/${lesson.id}/content`);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (lessonId: string) => deleteLesson(lessonId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-lesson-catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
    },
  });

  const openCreateLesson = () => {
    const course = coursesQuery.data?.[0];
    setCreateForm({
      courseId: course?.id ?? "",
      sectionId: course?.sections[0]?.id ?? "",
      title: "",
      type: "Video",
      order: getNextLessonOrder(course?.sections[0]?.lessons ?? []),
      durationMinutes: 5,
      difficulty: "Basic",
      publicationStatus: "Draft",
    });
    setScormPackage(null);
    setScormImportError("");
    setIsImportingScorm(false);
    setIsCreateOpen(true);
  };

  const closeCreateLesson = () => {
    const importedPackage = scormPackage;
    setIsCreateOpen(false);
    setScormPackage(null);
    setScormImportError("");
    if (importedPackage) {
      void deleteImportedScormPackage(importedPackage.entryPath).catch(() => undefined);
    }
  };

  const importScorm = async (file: File) => {
    setIsImportingScorm(true);
    setScormImportError("");
    try {
      const imported = await importScormPackage(file);
      const previousPackage = scormPackage;
      setScormPackage(imported);
      if (previousPackage && previousPackage.entryPath !== imported.entryPath) {
        await deleteImportedScormPackage(previousPackage.entryPath).catch(() => undefined);
      }
      setCreateForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : imported.title,
      }));
    } catch (error) {
      setScormImportError(error instanceof Error ? error.message : "Không thể nhập gói SCORM.");
    } finally {
      setIsImportingScorm(false);
    }
  };
  const totalPages = Math.max(1, Math.ceil((catalog?.totalItems ?? 0) / pageSize));
  const visiblePages = useMemo(() => {
    const pages = new Set<number>([1, totalPages, page - 1, page, page + 1]);
    return [...pages].filter((item) => item >= 1 && item <= totalPages).sort((a, b) => a - b);
  }, [page, totalPages]);

  const metricCards = [
    {
      label: "Tổng bài học",
      value: catalog?.totalLessons ?? 0,
      helper: `+${catalog?.newLessonsThisWeek ?? 0} bài học mới trong tuần`,
      icon: BookOpen,
      tone: "blue",
    },
    {
      label: "Đã xuất bản",
      value: catalog?.publishedLessons ?? 0,
      helper: formatPercent(catalog?.publishedLessons ?? 0, catalog?.totalLessons ?? 0),
      icon: CheckCircle2,
      tone: "green",
    },
    {
      label: "Bản nháp",
      value: catalog?.draftLessons ?? 0,
      helper: formatPercent(catalog?.draftLessons ?? 0, catalog?.totalLessons ?? 0),
      icon: RefreshCcw,
      tone: "amber",
    },
    {
      label: "Đã lưu trữ",
      value: catalog?.archivedLessons ?? 0,
      helper: formatPercent(catalog?.archivedLessons ?? 0, catalog?.totalLessons ?? 0),
      icon: Archive,
      tone: "red",
    },
  ] as const;

  const resetToFirstPage = () => setPage(1);
  const openLessonContentPage = (lesson: AdminLessonCatalogRow) => {
    navigate(`/admin/lessons/${lesson.lessonId}/content`);
  };
  const archiveLesson = (lesson: AdminLessonCatalogRow) => {
    const confirmed = window.confirm(
      `Lưu trữ "${lesson.title}"?\n\nBài học sẽ bị ẩn khỏi lộ trình học, nhưng toàn bộ tiến độ và kết quả của học viên vẫn được giữ nguyên.`,
    );
    if (confirmed) {
      archiveMutation.mutate(lesson.lessonId);
    }
  };

  return (
    <div className="admin-lessons-page">
      <section className="admin-lessons-heading">
        <div>
          <h1>Quản lý bài học trực tuyến</h1>
          <p>Trang chủ <span>/</span> Quản lý nội dung <span>/</span> Quản lý bài học</p>
        </div>
        <div className="admin-lessons-heading-actions">
          <Button className="admin-secondary-button" type="button" variant="outline">
            <Upload className="size-4" />
            Nhập bài học
          </Button>
          <Button className="admin-primary-button" type="button" onClick={openCreateLesson}>
            <Plus className="size-4" />
            Thêm bài học mới
          </Button>
        </div>
      </section>

      {catalogQuery.isError ? (
        <MessageBanner tone="error">Không tải được danh sách bài học. Vui lòng kiểm tra API admin.</MessageBanner>
      ) : null}

      {catalogQuery.isLoading && !catalog ? (
        <LoadingBlock label="Đang tải danh sách bài học..." />
      ) : (
        <>
          <section className="admin-lesson-metrics" aria-label="Thống kê bài học">
            {metricCards.map((item) => {
              const Icon = item.icon;
              return (
                <article className="admin-lesson-metric-card" data-tone={item.tone} key={item.label}>
                  <div className="admin-lesson-metric-icon">
                    <Icon className="size-6" />
                  </div>
                  <div>
                    <strong>{item.value.toLocaleString("vi-VN")}</strong>
                    <span>{item.label}</span>
                    <small>{item.helper}</small>
                  </div>
                </article>
              );
            })}
          </section>

          <section className="admin-lesson-table-card">
            <div className="admin-lesson-filters">
              <div className="admin-lesson-search">
                <Search className="size-4" />
                <Input
                  onChange={(event) => {
                    resetToFirstPage();
                    setSearch(event.target.value);
                  }}
                  placeholder="Tìm kiếm bài học..."
                  value={search}
                />
              </div>

              <label>
                <span>Phần học</span>
                <Select
                  onValueChange={(value) => {
                    resetToFirstPage();
                    setTopic(value);
                  }}
                  value={topic}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả phần học</SelectItem>
                    {(catalog?.topics ?? []).map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span>Trạng thái</span>
                <Select
                  onValueChange={(value) => {
                    resetToFirstPage();
                    setStatus(value as LessonPublicationStatus | "all");
                  }}
                  value={status}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <label>
                <span>Độ khó</span>
                <Select
                  onValueChange={(value) => {
                    resetToFirstPage();
                    setDifficulty(value as LessonDifficulty | "all");
                  }}
                  value={difficulty}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficultyOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>

              <Button className="admin-filter-button" type="button" variant="outline">
                <Filter className="size-4" />
                Lọc nâng cao
              </Button>
              <Button
                aria-label="Tải lại"
                className="admin-refresh-button"
                onClick={() => void catalogQuery.refetch()}
                size="icon"
                type="button"
                variant="outline"
              >
                <RefreshCcw className={catalogQuery.isFetching ? "size-4 animate-spin" : "size-4"} />
              </Button>
            </div>

            <div className="admin-lessons-table-wrap">
              <table className="admin-lessons-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Bài học</th>
                    <th>Phần học</th>
                    <th>Độ khó</th>
                    <th>Trạng thái</th>
                    <th>Lượt học</th>
                    <th>Cập nhật</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(catalog?.items ?? []).map((lesson, index) => (
                    <LessonRow
                      index={(page - 1) * pageSize + index + 1}
                      key={lesson.lessonId}
                      lesson={lesson}
                      onEditContent={openLessonContentPage}
                      onArchive={archiveLesson}
                    />
                  ))}
                  {catalog?.items.length === 0 ? (
                    <tr>
                      <td className="admin-lessons-empty" colSpan={8}>
                        Không có bài học phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            <div className="admin-lessons-pagination">
              <div className="admin-page-size">
                <span>Hiển thị</span>
                <Select
                  onValueChange={(value) => {
                    setPage(1);
                    setPageSize(Number(value));
                  }}
                  value={String(pageSize)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {pageSizeOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>kết quả mỗi trang</span>
              </div>

              <div className="admin-page-buttons">
                <Button
                  disabled={page <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronLeft className="size-4" />
                </Button>
                {visiblePages.map((item, index) => (
                  <div className="admin-page-fragment" key={item}>
                    {index > 0 && item - visiblePages[index - 1] > 1 ? <span>...</span> : null}
                    <Button
                      className={item === page ? "is-active" : undefined}
                      onClick={() => setPage(item)}
                      size="icon"
                      type="button"
                      variant={item === page ? "default" : "outline"}
                    >
                      {item}
                    </Button>
                  </div>
                ))}
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  size="icon"
                  type="button"
                  variant="outline"
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          </section>
        </>
      )}

      <AdminModal
        description="Chọn chủ đề và phần học trước khi tạo. Sau khi tạo, hệ thống mở ngay màn hình biên soạn nội dung."
        actions={(
          <>
            <Button type="button" variant="outline" onClick={closeCreateLesson}>Hủy</Button>
            <Button
              disabled={
                createMutation.isPending ||
                isImportingScorm ||
                !createForm.courseId ||
                !createForm.sectionId ||
                !createForm.title.trim() ||
                (createForm.type === "Scorm" && !scormPackage)
              }
              type="button"
              onClick={() => createMutation.mutate()}
            >
              <Plus className="size-4" />
              {createMutation.isPending ? "Đang tạo..." : "Tạo và biên soạn"}
            </Button>
          </>
        )}
        open={isCreateOpen}
        title="Thêm bài học mới"
        onClose={closeCreateLesson}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 md:col-span-2">
            <Label>Tên bài học</Label>
            <Input value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="grid gap-2">
            <Label>Chủ đề</Label>
            <Select
              value={createForm.courseId}
              onValueChange={(courseId) => {
                const course = coursesQuery.data?.find((item) => item.id === courseId);
                setCreateForm((current) => ({
                  ...current,
                  courseId,
                  sectionId: course?.sections[0]?.id ?? "",
                  order: getNextLessonOrder(course?.sections[0]?.lessons ?? []),
                }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Chọn chủ đề" /></SelectTrigger>
              <SelectContent>
                {(coursesQuery.data ?? []).map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <Label>Phần học</Label>
            <Select
              value={createForm.sectionId}
              onValueChange={(sectionId) => {
                const section = selectedCourse?.sections.find((item) => item.id === sectionId);
                setCreateForm((current) => ({ ...current, sectionId, order: getNextLessonOrder(section?.lessons ?? []) }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Chọn phần học" /></SelectTrigger>
              <SelectContent>
                {(selectedCourse?.sections ?? []).map((section) => <SelectItem key={section.id} value={section.id}>{section.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <Label>Loại bài học</Label>
            <Select
              value={createForm.type}
              onValueChange={(type) => {
                setCreateForm((current) => ({ ...current, type: type as LessonType }));
                if (type !== "Scorm") {
                  if (scormPackage) {
                    void deleteImportedScormPackage(scormPackage.entryPath).catch(() => undefined);
                  }
                  setScormPackage(null);
                  setScormImportError("");
                }
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Video">Video</SelectItem>
                <SelectItem value="Interactive">Tương tác</SelectItem>
                <SelectItem value="Scorm">SCORM</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {createForm.type === "Scorm" ? (
            <div className="grid gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 md:col-span-2">
              <div>
                <Label>Gói SCORM (.zip)</Label>
                <p className="mt-1 text-xs text-slate-500">
                  Hệ thống tự đọc imsmanifest.xml, nhận diện SCORM 1.2/2004 và danh sách SCO.
                </p>
              </div>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border bg-white px-4 py-3 text-sm font-medium hover:bg-slate-50">
                {isImportingScorm ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                {isImportingScorm ? "Đang kiểm tra và giải nén..." : scormPackage ? "Thay gói SCORM" : "Chọn file ZIP"}
                <input
                  accept=".zip,application/zip"
                  className="sr-only"
                  disabled={isImportingScorm}
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void importScorm(file);
                    event.target.value = "";
                  }}
                />
              </label>
              {scormPackage ? (
                <div className="grid gap-1 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                  <strong>{scormPackage.title}</strong>
                  <span>
                    {scormPackage.version === "Scorm2004" ? "SCORM 2004" : "SCORM 1.2"}
                    {" · "}{scormPackage.scos.length} SCO
                  </span>
                  <span className="break-all text-xs">{scormPackage.entryPath}</span>
                </div>
              ) : null}
              {scormImportError ? <MessageBanner tone="error">{scormImportError}</MessageBanner> : null}
            </div>
          ) : null}
          <label className="grid gap-2">
            <Label>Độ khó</Label>
            <Select value={createForm.difficulty} onValueChange={(difficulty) => setCreateForm((current) => ({ ...current, difficulty: difficulty as LessonDifficulty }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Basic">Cơ bản</SelectItem>
                <SelectItem value="Intermediate">Trung bình</SelectItem>
                <SelectItem value="Advanced">Nâng cao</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <Label>Thứ tự</Label>
            <Input min={1} type="number" value={createForm.order} onChange={(event) => setCreateForm((current) => ({ ...current, order: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2">
            <Label>Thời lượng (phút)</Label>
            <Input min={1} type="number" value={createForm.durationMinutes} onChange={(event) => setCreateForm((current) => ({ ...current, durationMinutes: Number(event.target.value) }))} />
          </label>
          <label className="grid gap-2 md:col-span-2">
            <Label>Trạng thái</Label>
            <Select value={createForm.publicationStatus} onValueChange={(publicationStatus) => setCreateForm((current) => ({ ...current, publicationStatus: publicationStatus as LessonPublicationStatus }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Bản nháp</SelectItem>
                <SelectItem value="Published">Đã xuất bản</SelectItem>
                <SelectItem value="Archived">Lưu trữ</SelectItem>
              </SelectContent>
            </Select>
          </label>
          {createMutation.isError ? <p className="text-sm text-red-600 md:col-span-2">Không thể tạo bài học. Vui lòng kiểm tra dữ liệu.</p> : null}
        </div>
      </AdminModal>
    </div>
  );
}
