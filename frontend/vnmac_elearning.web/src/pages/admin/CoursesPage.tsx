import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminCourseThumb,
  AdminIconButton,
  AdminModal,
  AdminPagination,
  AdminSection,
  AdminStatusBadge,
} from "@/shared/ui/admin-kit";
import { createCourse, createSection, deleteCourse, getAdminCourses, updateCourse } from "../../shared/api/admin";
import { flattenLessons, sortSections } from "../../shared/lib/course";
import { humanizeEnum } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type { CourseSection, CourseStatus, CourseTreeResponse } from "../../shared/types/api";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Eye,
  FolderTree,
  ListChecks,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

interface CourseFormState {
  title: string;
  description: string;
  status: CourseStatus;
}

interface SectionFormState {
  title: string;
  description: string;
  order: number;
}

interface EnrichedCourse extends CourseTreeResponse {
  index: number;
  sectionCount: number;
  lessonCount: number;
  quizCount: number;
  questionCount: number;
  learnerCount: number;
}

const emptyCourseForm: CourseFormState = {
  title: "",
  description: "",
  status: "Draft",
};

const emptySectionForm: SectionFormState = {
  title: "",
  description: "",
  order: 1,
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)));
}

function getSectionQuestionCount(section: CourseSection) {
  return (
    section.lessons.reduce((total, lesson) => total + (lesson.assessment?.questionCount ?? 0), 0) +
    (section.quizzes ?? []).reduce((total, quiz) => total + (quiz.assessment?.questionCount ?? 0), 0)
  );
}

function getCourseQuizCount(course: CourseTreeResponse) {
  return course.sections.reduce((total, section) => total + (section.quizzes?.length ?? 0), 0) + (course.quizzes?.length ?? 0);
}

function getCourseQuestionCount(course: CourseTreeResponse) {
  return course.sections.reduce((total, section) => total + getSectionQuestionCount(section), 0) +
    (course.quizzes ?? []).reduce((total, quiz) => total + (quiz.assessment?.questionCount ?? 0), 0);
}

function CompactStat({
  label,
  value,
  helper,
  icon,
  accentClassName,
}: {
  label: string;
  value: string;
  helper?: string;
  icon: ReactNode;
  accentClassName: string;
}) {
  return (
    <div className="rounded-[22px] border border-slate-200 bg-white px-3.5 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.05)]">
      <div className="flex items-center gap-3">
        <div className={`grid size-9 place-items-center rounded-2xl ${accentClassName}`}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400">{label}</p>
          <p className="mt-1 text-[1.65rem] font-semibold leading-none text-slate-950">{value}</p>
          {helper ? <p className="mt-1 text-[11px] leading-4 text-slate-500">{helper}</p> : null}
        </div>
      </div>
    </div>
  );
}

function CourseStructure({ course }: { course: EnrichedCourse }) {
  const sections = sortSections(course.sections);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-3">
        {sections.map((section) => {
          const lessons = [...section.lessons].sort((left, right) => left.order - right.order);
          const quizzes = [...(section.quizzes ?? [])].sort((left, right) => left.order - right.order);
          const questionCount = getSectionQuestionCount(section);

          return (
            <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4" key={section.id}>
              <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <p className="font-semibold text-slate-950">
                    Phần {section.order}: {section.title}
                  </p>
                  <p className="text-sm text-slate-500">{section.description || "Chưa có mô tả cho phần học này."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{lessons.length} bài học</Badge>
                  <Badge variant="secondary">{quizzes.length} quiz</Badge>
                  <Badge variant="outline">{questionCount} câu hỏi</Badge>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {lessons.length ? (
                  lessons.map((lesson) => (
                    <div
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-3 md:flex-row md:items-center md:justify-between"
                      key={lesson.id}
                    >
                      <div className="space-y-1">
                        <p className="font-medium text-slate-900">
                          Bài {lesson.order}: {lesson.title}
                        </p>
                        <p className="text-sm text-slate-500">
                          {humanizeEnum(lesson.type)} • {lesson.durationMinutes} phút
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">{lesson.assessment?.questionCount ?? 0} câu hỏi</Badge>
                        <Badge variant="secondary">{lesson.statusLabel}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                    Phần học này chưa có bài học nào.
                  </div>
                )}

                {quizzes.length ? (
                  <div className="space-y-2 pt-2">
                    {quizzes.map((quiz) => (
                      <div
                        className="flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-3 md:flex-row md:items-center md:justify-between"
                        key={quiz.id}
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-slate-900">
                            Quiz {quiz.order}: {quiz.title}
                          </p>
                          <p className="text-sm text-slate-500">
                            {quiz.description || "Quiz thuộc phần học này"} • {quiz.durationMinutes} phút
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="outline">{quiz.assessment?.questionCount ?? 0} câu hỏi</Badge>
                          <Badge variant="secondary">Quiz phần học</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}

        {course.quizzes.length ? (
          <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <p className="font-semibold text-slate-950">Quiz toàn khóa</p>
                <p className="text-sm text-slate-500">Các quiz chỉ mở khi học viên hoàn thành toàn bộ nội dung của khóa.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{course.quizzes.length} quiz</Badge>
                <Badge variant="outline">
                  {course.quizzes.reduce((total, quiz) => total + (quiz.assessment?.questionCount ?? 0), 0)} câu hỏi
                </Badge>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {course.quizzes.map((quiz) => (
                <div
                  className="flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/50 px-3 py-3 md:flex-row md:items-center md:justify-between"
                  key={quiz.id}
                >
                  <div className="space-y-1">
                    <p className="font-medium text-slate-900">
                      Quiz {quiz.order}: {quiz.title}
                    </p>
                    <p className="text-sm text-slate-500">
                      {quiz.description || "Quiz toàn khóa"} • {quiz.durationMinutes} phút
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{quiz.assessment?.questionCount ?? 0} câu hỏi</Badge>
                    <Badge variant="secondary">Quiz khóa học</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-5 py-5">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Tóm tắt khóa học</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-sm text-slate-500">Tổng phần học</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(course.sectionCount)}</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-sm text-slate-500">Tổng bài học</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(course.lessonCount)}</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-sm text-slate-500">Tổng quiz</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(course.quizCount)}</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-sm text-slate-500">Tổng câu hỏi</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(course.questionCount)}</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3">
            <p className="text-sm text-slate-500">Học viên</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">{formatNumber(course.learnerCount)}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-2">
          <Button asChild className="rounded-2xl" size="sm" variant="outline">
            <Link to={`/admin/lessons?courseId=${course.id}`}>Mở danh sách bài học chi tiết</Link>
          </Button>
          <Button asChild className="rounded-2xl" size="sm" variant="outline">
            <Link to={`/admin/quizzes?courseId=${course.id}`}>Mở danh sách quiz</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

export function CoursesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | CourseStatus>("all");
  const [page, setPage] = useState(1);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseFormState>(emptyCourseForm);
  const [sectionForm, setSectionForm] = useState<SectionFormState>(emptySectionForm);

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: getAdminCourses,
  });

  const allCourses = coursesQuery.data ?? [];
  const enrichedCourses = useMemo<EnrichedCourse[]>(
    () =>
      allCourses.map((course, index) => ({
        ...course,
        index,
        sectionCount: course.sections.length,
        lessonCount: flattenLessons(course).length,
        quizCount: getCourseQuizCount(course),
        questionCount: getCourseQuestionCount(course),
        learnerCount: Math.round(920 + (allCourses.length - index) * 138),
      })),
    [allCourses],
  );

  const filteredCourses = useMemo(() => {
    return enrichedCourses.filter((course) => {
      if (statusFilter !== "all" && course.status !== statusFilter) {
        return false;
      }

      if (search.trim()) {
        const keyword = search.trim().toLowerCase();
        if (
          !course.title.toLowerCase().includes(keyword) &&
          !course.description.toLowerCase().includes(keyword)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [enrichedCourses, search, statusFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredCourses.length / pageSize));
  const pagedCourses = useMemo(
    () => filteredCourses.slice((page - 1) * pageSize, page * pageSize),
    [filteredCourses, page],
  );

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const editingCourse = enrichedCourses.find((course) => course.id === editingCourseId) ?? null;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });

  const upsertMutation = useMutation({
    mutationFn: async () => {
      if (editingCourseId) {
        return updateCourse(editingCourseId, courseForm);
      }

      return createCourse(courseForm);
    },
    onSuccess: async () => {
      await invalidate();
      closeModal();
    },
  });

  const createSectionMutation = useMutation({
    mutationFn: () => {
      if (!editingCourseId) {
        throw new Error("Khóa học chưa được chọn.");
      }

      return createSection(editingCourseId, {
        title: sectionForm.title,
        description: sectionForm.description,
        order: Number(sectionForm.order),
      });
    },
    onSuccess: async () => {
      await invalidate();
      setSectionForm((current) => ({
        ...emptySectionForm,
        order: current.order + 1,
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (courseId: string) => deleteCourse(courseId),
    onSuccess: () => invalidate(),
  });

  const totalCourses = enrichedCourses.length;
  const publishedCourses = enrichedCourses.filter((course) => course.status === "Published").length;
  const draftCourses = enrichedCourses.filter((course) => course.status === "Draft").length;
  const totalSections = enrichedCourses.reduce((total, course) => total + course.sectionCount, 0);
  const totalQuizzes = enrichedCourses.reduce((total, course) => total + course.quizCount, 0);
  const totalQuestions = enrichedCourses.reduce((total, course) => total + course.questionCount, 0);

  function openCreateModal() {
    setEditingCourseId(null);
    setCourseForm(emptyCourseForm);
    setSectionForm(emptySectionForm);
    setIsModalOpen(true);
  }

  function openEditModal(courseId: string) {
    const target = enrichedCourses.find((course) => course.id === courseId);
    if (!target) {
      return;
    }

    setEditingCourseId(target.id);
    setCourseForm({
      title: target.title,
      description: target.description,
      status: target.status,
    });
    setSectionForm({
      title: "",
      description: "",
      order: target.sections.length + 1,
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCourseId(null);
    setCourseForm(emptyCourseForm);
    setSectionForm(emptySectionForm);
  }

  function toggleExpanded(courseId: string) {
    setExpandedCourseId((current) => (current === courseId ? null : courseId));
  }

  if (coursesQuery.isLoading) {
    return <LoadingBlock label="Đang tải danh sách khóa học..." />;
  }

  if (coursesQuery.isError || !coursesQuery.data) {
    return <MessageBanner tone="error">Không tải được danh sách khóa học.</MessageBanner>;
  }

  return (
    <div className="grid gap-4">
      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        <CompactStat
          accentClassName="bg-blue-50 text-blue-600"
          helper="Tổng số khóa học đang có trên hệ thống."
          icon={<BookOpen className="size-5" />}
          label="Khóa học"
          value={formatNumber(totalCourses)}
        />
        <CompactStat
          accentClassName="bg-emerald-50 text-emerald-600"
          helper={`${formatNumber(publishedCourses)} đang mở • ${formatNumber(draftCourses)} bản nháp`}
          icon={<PlayCircle className="size-5" />}
          label="Trạng thái"
          value={formatNumber(publishedCourses)}
        />
        <CompactStat
          accentClassName="bg-violet-50 text-violet-600"
          helper="Tổng số phần học thuộc tất cả khóa học."
          icon={<FolderTree className="size-5" />}
          label="Phần học"
          value={formatNumber(totalSections)}
        />
        <CompactStat
          accentClassName="bg-amber-50 text-amber-600"
          helper="Tổng số câu hỏi gắn trong các bài học."
          icon={<ListChecks className="size-5" />}
          label="Câu hỏi"
          value={formatNumber(totalQuestions)}
        />
        <CompactStat
          accentClassName="bg-rose-50 text-rose-600"
          helper="Quiz đã được tách khỏi bài học và thuộc phần học hoặc toàn khóa."
          icon={<PlayCircle className="size-5" />}
          label="Quiz"
          value={formatNumber(totalQuizzes)}
        />
      </section>

      <AdminSection
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{filteredCourses.length} khóa học</Badge>
            <Button className="h-8 px-3 text-xs" type="button" onClick={openCreateModal}>
              <Plus className="size-3.5" />
              Thêm khóa học
            </Button>
          </div>
        }
        subtitle="Thu gọn bộ lọc và hiển thị luôn cấu trúc bên trong để không phải chuyển qua lại giữa Khóa học và Bài học."
        title="Danh sách khóa học"
      >
        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 rounded-2xl border-slate-200 pl-11"
                placeholder="Tìm tên khóa học hoặc mô tả..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | CourseStatus)}>
              <SelectTrigger className="h-10 rounded-2xl">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="Published">Đăng mở</SelectItem>
                <SelectItem value="Draft">Bản nháp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-slate-200">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Khóa học</TableHead>
                  <TableHead>Phần học</TableHead>
                  <TableHead>Bài học</TableHead>
                  <TableHead>Câu hỏi</TableHead>
                  <TableHead>Học viên</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedCourses.map((course) => {
                  const isExpanded = expandedCourseId === course.id;

                  return (
                    <Fragment key={course.id}>
                      <TableRow key={course.id}>
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <button
                              aria-label={isExpanded ? "Thu gọn cấu trúc khóa học" : "Mở cấu trúc khóa học"}
                              className="mt-1 rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-slate-300 hover:text-slate-800"
                              onClick={() => toggleExpanded(course.id)}
                              type="button"
                            >
                              {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                            <AdminCourseThumb index={course.index} title={course.title} />
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-950">{course.title}</p>
                              <p className="mt-1 text-sm text-slate-500 line-clamp-2">{course.description}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <Badge variant="outline">ID: {course.id}</Badge>
                                <Badge variant="secondary">
                                  {course.sectionCount} phần • {course.lessonCount} bài • {course.questionCount} câu hỏi
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{formatNumber(course.sectionCount)}</TableCell>
                        <TableCell>{formatNumber(course.lessonCount)}</TableCell>
                        <TableCell>{formatNumber(course.questionCount)}</TableCell>
                        <TableCell>{formatNumber(course.learnerCount)}</TableCell>
                        <TableCell>
                          <AdminStatusBadge status={course.status === "Published" ? "Đăng mở" : "Bản nháp"} />
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
  <AdminIconButton
    icon={<Eye className="size-4" />}
    label={isExpanded ? "Ẩn cấu trúc khóa học" : "Xem cấu trúc khóa học"}
    variant="outline"
    onClick={() => toggleExpanded(course.id)}
  />
  <AdminIconButton
    icon={<Pencil className="size-4" />}
    label={`Sửa khóa học ${course.title}`}
    variant="ghost"
    onClick={() => openEditModal(course.id)}
  />
  <AdminIconButton
    icon={<Trash2 className="size-4" />}
    label={`Xóa khóa học ${course.title}`}
    variant="destructive"
    onClick={() => {
      if (window.confirm(`Xóa khóa học "${course.title}"?`)) {
        deleteMutation.mutate(course.id);
      }
    }}
  />
</div>
                        </TableCell>
                      </TableRow>

                      {isExpanded ? (
                        <TableRow key={`${course.id}-expanded`} className="bg-slate-50/70">
                          <TableCell className="p-0" colSpan={7}>
                            <div className="border-t border-slate-100 px-5 py-5">
                              <CourseStructure course={course} />
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            <AdminPagination page={page} pageSize={pageSize} totalItems={filteredCourses.length} onPageChange={setPage} />
          </div>
        </div>
      </AdminSection>

      <AdminModal
        actions={
          <>
            <Button className="rounded-2xl" type="button" variant="outline" onClick={closeModal}>
              Đóng
            </Button>
            <Button className="rounded-2xl" disabled={upsertMutation.isPending} type="button" onClick={() => upsertMutation.mutate()}>
              {upsertMutation.isPending ? "Đang lưu..." : editingCourseId ? "Cập nhật khóa học" : "Thêm khóa học"}
            </Button>
          </>
        }
        description="Tạo, sửa và bổ sung phần học ngay trong cùng một hộp thoại để luồng quản trị không bị tách rời."
        onClose={closeModal}
        open={isModalOpen}
        title={editingCourseId ? "Cập nhật khóa học" : "Thêm khóa học"}
      >
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Tên khóa học</Label>
              <Input
                className="rounded-2xl"
                value={courseForm.title}
                onChange={(event) => setCourseForm((current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Mô tả</Label>
              <Textarea
                className="min-h-28 rounded-2xl"
                value={courseForm.description}
                onChange={(event) => setCourseForm((current) => ({ ...current, description: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Trạng thái</Label>
              <Select
                value={courseForm.status}
                onValueChange={(value) => setCourseForm((current) => ({ ...current, status: value as CourseStatus }))}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Bản nháp</SelectItem>
                  <SelectItem value="Published">Đăng mở</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {editingCourse ? (
            <AdminSection subtitle="Mỗi phần học hiển thị ngay số bài học để dễ tổ chức cấu trúc." title="Phần học trong khóa">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-3">
                  {sortSections(editingCourse.sections).map((section) => (
                    <div className="rounded-[24px] border border-slate-200 px-4 py-4" key={section.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            Phần {section.order}: {section.title}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{section.description || "Chưa có mô tả"}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{section.lessons.length} bài học</Badge>
                          <Badge variant="outline">{getSectionQuestionCount(section)} câu hỏi</Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                  {!editingCourse.sections.length ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200 px-4 py-4 text-sm text-slate-500">
                      Khóa học này chưa có phần học.
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
                  <p className="font-semibold text-slate-900">Thêm phần học mới</p>
                  <p className="mt-1 text-sm text-slate-500">Tạo nhanh phần học để nối tiếp sang danh sách bài học.</p>
                  <div className="mt-4 space-y-4">
                    <div className="space-y-2">
                      <Label>Tiêu đề phần học</Label>
                      <Input
                        className="rounded-2xl"
                        value={sectionForm.title}
                        onChange={(event) => setSectionForm((current) => ({ ...current, title: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Textarea
                        className="min-h-24 rounded-2xl"
                        value={sectionForm.description}
                        onChange={(event) => setSectionForm((current) => ({ ...current, description: event.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Thứ tự</Label>
                      <Input
                        className="rounded-2xl"
                        min={1}
                        type="number"
                        value={sectionForm.order}
                        onChange={(event) => setSectionForm((current) => ({ ...current, order: Number(event.target.value) }))}
                      />
                    </div>
                    <Button
                      className="w-full rounded-2xl"
                      disabled={createSectionMutation.isPending}
                      type="button"
                      onClick={() => createSectionMutation.mutate()}
                    >
                      {createSectionMutation.isPending ? "Đang thêm phần học..." : "Thêm phần học"}
                    </Button>
                  </div>
                </div>
              </div>
            </AdminSection>
          ) : null}
        </div>
      </AdminModal>
    </div>
  );
}

