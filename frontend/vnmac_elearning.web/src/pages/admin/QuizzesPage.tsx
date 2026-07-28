import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  AdminIconButton,
  AdminPagination,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  AdminModal,
} from "@/shared/ui/admin-kit";
import { createQuiz, deleteQuiz, getAdminCourses, updateQuiz } from "../../shared/api/admin";
import { sortQuizzes, sortSections } from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type { CourseQuiz, CourseStatus, CreateCourseQuizRequest, UpdateCourseQuizRequest } from "../../shared/types/api";
import { CircleHelp, ClipboardCheck, Eye, Pencil, Plus, Search, ShieldCheck, Target, Trash2 } from "lucide-react";

type QuizScope = "Course" | "Section";

interface QuizFormState {
  courseId: string;
  scope: QuizScope;
  sectionId: string;
  title: string;
  description: string;
  order: number;
  intro: string;
  retryHint: string;
  passScore: number;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
}

interface EnrichedQuiz extends CourseQuiz {
  courseTitle: string;
  courseStatus: CourseStatus;
  sectionTitle?: string | null;
  questionCount: number;
  passScore: number;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
}

function createEmptyQuizForm(): QuizFormState {
  return {
    courseId: "",
    scope: "Section",
    sectionId: "",
    title: "",
    description: "",
    order: 1,
    intro: "",
    retryHint: "",
    passScore: 100,
    randomizeQuestionOrder: true,
    randomizeOptionOrder: true,
  };
}

function mapQuizToForm(quiz: EnrichedQuiz): QuizFormState {
  return {
    courseId: quiz.courseId,
    scope: quiz.sectionId ? "Section" : "Course",
    sectionId: quiz.sectionId ?? "",
    title: quiz.title,
    description: quiz.description,
    order: quiz.order,
    intro: quiz.assessment?.intro ?? "",
    retryHint: quiz.assessment?.retryHint ?? "",
    passScore: quiz.assessment?.passScore ?? 100,
    randomizeQuestionOrder: quiz.assessment?.randomizeQuestionOrder ?? true,
    randomizeOptionOrder: quiz.assessment?.randomizeOptionOrder ?? true,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)));
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

function Field({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
      {description ? <p className="text-xs leading-5 text-slate-500">{description}</p> : null}
    </div>
  );
}

function getQuizGroupKey(quiz: EnrichedQuiz) {
  return `${quiz.courseId}::${quiz.sectionId ?? "course"}`;
}

export function QuizzesPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState(searchParams.get("courseId") ?? "all");
  const [scopeFilter, setScopeFilter] = useState<QuizScope | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "Published" | "Draft">("all");
  const [page, setPage] = useState(1);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<QuizFormState>(createEmptyQuizForm);

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: getAdminCourses,
  });

  const allCourses = coursesQuery.data ?? [];
  const allQuizzes = useMemo<EnrichedQuiz[]>(
    () =>
      allCourses.flatMap((course) => [
        ...sortSections(course.sections).flatMap((section) =>
          sortQuizzes(section.quizzes ?? []).map((quiz) => ({
            ...quiz,
            courseTitle: course.title,
            courseStatus: course.status,
            sectionTitle: section.title,
            questionCount: quiz.assessment?.questionCount ?? 0,
            passScore: quiz.assessment?.passScore ?? 100,
            randomizeQuestionOrder: quiz.assessment?.randomizeQuestionOrder ?? true,
            randomizeOptionOrder: quiz.assessment?.randomizeOptionOrder ?? true,
          })),
        ),
        ...sortQuizzes(course.quizzes ?? []).map((quiz) => ({
          ...quiz,
          courseTitle: course.title,
          courseStatus: course.status,
          sectionTitle: null,
          questionCount: quiz.assessment?.questionCount ?? 0,
          passScore: quiz.assessment?.passScore ?? 100,
          randomizeQuestionOrder: quiz.assessment?.randomizeQuestionOrder ?? true,
          randomizeOptionOrder: quiz.assessment?.randomizeOptionOrder ?? true,
        })),
      ]),
    [allCourses],
  );

  const filteredQuizzes = useMemo(() => {
    return allQuizzes.filter((quiz) => {
      if (courseFilter !== "all" && quiz.courseId !== courseFilter) {
        return false;
      }

      if (scopeFilter === "Section" && !quiz.sectionId) {
        return false;
      }

      if (scopeFilter === "Course" && quiz.sectionId) {
        return false;
      }

      if (statusFilter !== "all" && quiz.courseStatus !== statusFilter) {
        return false;
      }

      if (search.trim()) {
        const keyword = search.trim().toLowerCase();
        if (
          !quiz.title.toLowerCase().includes(keyword) &&
          !quiz.description.toLowerCase().includes(keyword) &&
          !quiz.courseTitle.toLowerCase().includes(keyword) &&
          !(quiz.sectionTitle ?? "").toLowerCase().includes(keyword)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allQuizzes, courseFilter, scopeFilter, search, statusFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredQuizzes.length / pageSize));
  const pagedQuizzes = useMemo(
    () => filteredQuizzes.slice((page - 1) * pageSize, page * pageSize),
    [filteredQuizzes, page],
  );

  useEffect(() => {
    setPage(1);
  }, [courseFilter, scopeFilter, search, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const activeCourse = allCourses.find((course) => course.id === form.courseId) ?? null;
  const activeSections = activeCourse?.sections ?? [];
  const editingQuiz = allQuizzes.find((quiz) => quiz.id === editingQuizId) ?? null;

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload: CreateCourseQuizRequest | UpdateCourseQuizRequest = {
        courseId: form.courseId,
        sectionId: form.scope === "Section" ? form.sectionId : null,
        title: form.title,
        description: form.description,
        order: Number(form.order),
        assessment: {
          intro: form.intro,
          retryHint: form.retryHint,
          passScore: Number(form.passScore),
          randomizeQuestionOrder: form.randomizeQuestionOrder,
          randomizeOptionOrder: form.randomizeOptionOrder,
        },
      };

      if (editingQuizId) {
        return updateQuiz(editingQuizId, payload);
      }

      return createQuiz(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions", "all"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (quizId: string) => deleteQuiz(quizId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "courses"] });
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions", "all"] });
    },
  });

  const totalQuizzes = filteredQuizzes.length;
  const sectionQuizCount = filteredQuizzes.filter((quiz) => quiz.sectionId).length;
  const courseQuizCount = filteredQuizzes.filter((quiz) => !quiz.sectionId).length;
  const totalQuestions = filteredQuizzes.reduce((total, quiz) => total + quiz.questionCount, 0);
  const emptyQuizCount = filteredQuizzes.filter((quiz) => quiz.questionCount === 0).length;

  function openCreateModal() {
    const defaultCourseId = courseFilter !== "all" ? courseFilter : allCourses[0]?.id ?? "";
    const defaultSections = allCourses.find((course) => course.id === defaultCourseId)?.sections ?? [];
    setEditingQuizId(null);
    setForm({
      ...createEmptyQuizForm(),
      courseId: defaultCourseId,
      sectionId: defaultSections[0]?.id ?? "",
      scope: defaultSections.length ? "Section" : "Course",
    });
    setIsModalOpen(true);
  }

  function openEditModal(quiz: EnrichedQuiz) {
    setEditingQuizId(quiz.id);
    setForm(mapQuizToForm(quiz));
    setIsModalOpen(true);
  }

  function closeModal() {
    setEditingQuizId(null);
    setIsModalOpen(false);
    setForm(createEmptyQuizForm());
  }

  if (coursesQuery.isLoading) {
    return <LoadingBlock label="Đang tải danh sách bài kiểm tra..." />;
  }

  if (coursesQuery.isError || !coursesQuery.data) {
    return <MessageBanner tone="error">Không tải được danh sách bài kiểm tra.</MessageBanner>;
  }

  return (
    <div className="grid gap-4">
      <AdminPageHeader
        breadcrumbs={["Quản trị", "Nội dung", "Bài kiểm tra"]}
        title="Quản lý bài kiểm tra"
        actions={
          <Button className="rounded-2xl" type="button" onClick={openCreateModal}>
            <Plus className="size-4" />
            Thêm bài kiểm tra
          </Button>
        }
      />

      <section className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-5">
        <CompactStat
          accentClassName="bg-blue-50 text-blue-600"
          helper="Tổng số bài kiểm tra theo bộ lọc hiện tại."
          icon={<ClipboardCheck className="size-5" />}
          label="Bài kiểm tra"
          value={formatNumber(totalQuizzes)}
        />
        <CompactStat
          accentClassName="bg-emerald-50 text-emerald-600"
          helper="Bài kiểm tra chỉ mở sau khi hoàn thành phần học tương ứng."
          icon={<ShieldCheck className="size-5" />}
          label="Kiểm tra phần học"
          value={formatNumber(sectionQuizCount)}
        />
        <CompactStat
          accentClassName="bg-violet-50 text-violet-600"
          helper="Bài kiểm tra chỉ mở sau khi học viên hoàn thành toàn bộ chủ đề."
          icon={<Target className="size-5" />}
          label="Kiểm tra chủ đề"
          value={formatNumber(courseQuizCount)}
        />
        <CompactStat
          accentClassName="bg-amber-50 text-amber-600"
          helper="Tổng câu hỏi đang gắn trong các bài kiểm tra."
          icon={<CircleHelp className="size-5" />}
          label="Câu hỏi"
          value={formatNumber(totalQuestions)}
        />
        <CompactStat
          accentClassName="bg-rose-50 text-rose-600"
          helper="Bài kiểm tra chưa có câu hỏi cần được hoàn thiện trước khi xuất bản."
          icon={<Search className="size-5" />}
          label="Chưa có câu hỏi"
          value={formatNumber(emptyQuizCount)}
        />
      </section>

      <AdminSection
        action={
          <Badge variant="secondary">{filteredQuizzes.length} bài kiểm tra</Badge>
        }
        title="Danh sách bài kiểm tra"
      >
        <div className="space-y-4">
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_220px_180px_180px]">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-10 rounded-2xl border-slate-200 pl-11"
                placeholder="Tìm bài kiểm tra, chủ đề, phần học..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-10 rounded-2xl">
                <SelectValue placeholder="Tất cả chủ đề" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả chủ đề</SelectItem>
                {allCourses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={scopeFilter} onValueChange={(value) => setScopeFilter(value as QuizScope | "all")}>
              <SelectTrigger className="h-10 rounded-2xl">
                <SelectValue placeholder="Phạm vi bài kiểm tra" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả phạm vi</SelectItem>
                <SelectItem value="Section">Kiểm tra phần học</SelectItem>
                <SelectItem value="Course">Kiểm tra chủ đề</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "all" | "Published" | "Draft")}>
              <SelectTrigger className="h-10 rounded-2xl">
                <SelectValue placeholder="Trạng thái chủ đề" />
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
                  <TableHead>Bài kiểm tra</TableHead>
                  <TableHead>Phạm vi</TableHead>
                  <TableHead>Điều kiện mở</TableHead>
                  <TableHead>Cấu hình</TableHead>
                  <TableHead>Câu hỏi</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedQuizzes.map((quiz, index) => {
                  const previousQuiz = pagedQuizzes[index - 1];
                  const showGroupHeader = !previousQuiz || getQuizGroupKey(previousQuiz) !== getQuizGroupKey(quiz);

                  return (
                    <Fragment key={quiz.id}>
                      {showGroupHeader ? (
                        <TableRow className="bg-slate-50">
                          <TableCell className="px-5 py-3" colSpan={6}>
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                                <Badge className="px-2 py-0.5 text-[11px]" variant="secondary">
                                  Chủ đề
                                </Badge>
                                <span className="font-semibold text-slate-950">{quiz.courseTitle}</span>
                                {quiz.sectionTitle ? (
                                  <>
                                    <span className="text-slate-300">/</span>
                                    <Badge className="px-2 py-0.5 text-[11px]" variant="outline">
                                      Phần học
                                    </Badge>
                                    <span className="font-medium text-slate-700">{quiz.sectionTitle}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                                      Kiểm tra toàn chủ đề
                                    </span>
                                  </>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">
                                {quiz.sectionTitle ? "Nhóm bài kiểm tra theo phần học." : "Nhóm bài kiểm tra áp dụng cho toàn bộ chủ đề."}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                      <TableRow>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <span className="grid size-11 place-items-center rounded-2xl bg-slate-100 text-slate-700">
                                <ClipboardCheck className="size-5" />
                              </span>
                              <div>
                                <p className="font-semibold text-slate-950">{quiz.title}</p>
                                <p className="text-sm text-slate-500">
                                  {quiz.courseTitle}
                                  {quiz.sectionTitle ? ` / ${quiz.sectionTitle}` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="outline">Thứ tự {quiz.order}</Badge>
                              <Badge variant="secondary">{quiz.durationMinutes} phút</Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <Badge variant="outline">{quiz.sectionTitle ? "Kiểm tra phần học" : "Kiểm tra chủ đề"}</Badge>
                            <AdminStatusBadge status={quiz.courseStatus === "Published" ? "Đăng mở" : "Bản nháp"} />
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[260px]">
                          <p className="text-sm font-medium text-slate-900">
                            {quiz.sectionTitle
                              ? "Hoàn thành 100% nội dung của phần học"
                              : "Hoàn thành 100% toàn bộ nội dung chủ đề"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Học viên chỉ được mở bài kiểm tra khi đã học xong nội dung tương ứng.
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-slate-600">
                            <p>
                              Điểm đạt: <span className="font-semibold text-slate-950">{quiz.passScore}%</span>
                            </p>
                            <p>{quiz.randomizeQuestionOrder ? "Random câu hỏi" : "Giữ nguyên thứ tự câu hỏi"}</p>
                            <p>{quiz.randomizeOptionOrder ? "Random đáp án" : "Giữ nguyên thứ tự đáp án"}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <p className="font-semibold text-slate-950">{formatNumber(quiz.questionCount)} câu hỏi</p>
                            <Button asChild className="h-8 px-3 text-xs" type="button" variant="outline">
                              <Link to={`/admin/questions?quizId=${quiz.id}`}>Quản lý câu hỏi</Link>
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <AdminIconButton
                              icon={<Eye className="size-4" />}
                              label={`Xem câu hỏi của bài kiểm tra ${quiz.title}`}
                              variant="outline"
                              onClick={() => {
                                window.location.assign(`/admin/questions?quizId=${quiz.id}`);
                              }}
                            />
                            <AdminIconButton
                              icon={<Pencil className="size-4" />}
                              label={`Sửa bài kiểm tra ${quiz.title}`}
                              variant="ghost"
                              onClick={() => openEditModal(quiz)}
                            />
                            <AdminIconButton
                              icon={<Trash2 className="size-4" />}
                              label={`Xóa bài kiểm tra ${quiz.title}`}
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(`Xóa bài kiểm tra "${quiz.title}"?`)) {
                                  deleteMutation.mutate(quiz.id);
                                }
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
            <AdminPagination page={page} pageSize={pageSize} totalItems={filteredQuizzes.length} onPageChange={setPage} />
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
              {upsertMutation.isPending ? "Đang lưu..." : editingQuiz ? "Cập nhật bài kiểm tra" : "Thêm bài kiểm tra"}
            </Button>
          </>
        }
        className="max-w-4xl"
        onClose={closeModal}
        open={isModalOpen}
        title={editingQuiz ? "Cập nhật bài kiểm tra" : "Thêm bài kiểm tra"}
      >
        <div className="grid gap-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Field label="Chủ đề">
              <Select
                value={form.courseId}
                onValueChange={(value) => {
                  const nextSections = allCourses.find((course) => course.id === value)?.sections ?? [];
                  setForm((current) => ({
                    ...current,
                    courseId: value,
                    sectionId: nextSections[0]?.id ?? "",
                    scope: nextSections.length ? current.scope : "Course",
                  }));
                }}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Chọn chủ đề" />
                </SelectTrigger>
                <SelectContent>
                  {allCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Phạm vi bài kiểm tra">
              <Select
                value={form.scope}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    scope: value as QuizScope,
                    sectionId: value === "Section" ? current.sectionId || activeSections[0]?.id || "" : "",
                  }))
                }
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue placeholder="Chọn phạm vi" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Section">Kiểm tra phần học</SelectItem>
                  <SelectItem value="Course">Kiểm tra chủ đề</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field
              description={form.scope === "Course" ? "Không cần chọn phần học cho bài kiểm tra toàn chủ đề." : undefined}
              label="Phần học"
            >
              {form.scope === "Section" ? (
                <Select
                  value={form.sectionId}
                  onValueChange={(value) => setForm((current) => ({ ...current, sectionId: value }))}
                >
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue placeholder="Chọn phần học" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input className="rounded-2xl" disabled value="Kiểm tra toàn chủ đề" />
              )}
            </Field>

            <div className="md:col-span-2 xl:col-span-2">
              <Field label="Tiêu đề bài kiểm tra">
                <Input
                  className="rounded-2xl"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Thứ tự">
              <Input
                className="rounded-2xl"
                min={1}
                type="number"
                value={form.order}
                onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) }))}
              />
            </Field>

            <div className="md:col-span-2 xl:col-span-3">
              <Field label="Mô tả">
                <Textarea
                  className="min-h-20 rounded-2xl"
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </Field>
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <Field label="Giới thiệu trước bài kiểm tra">
                <Textarea
                  className="min-h-20 rounded-2xl"
                  value={form.intro}
                  onChange={(event) => setForm((current) => ({ ...current, intro: event.target.value }))}
                />
              </Field>
            </div>

            <div className="md:col-span-2 xl:col-span-3">
              <Field label="Gợi ý khi làm lại">
                <Textarea
                  className="min-h-20 rounded-2xl"
                  value={form.retryHint}
                  onChange={(event) => setForm((current) => ({ ...current, retryHint: event.target.value }))}
                />
              </Field>
            </div>

            <Field label="Điểm đạt (%)">
              <Input
                className="rounded-2xl"
                max={100}
                min={1}
                type="number"
                value={form.passScore}
                onChange={(event) => setForm((current) => ({ ...current, passScore: Number(event.target.value) }))}
              />
            </Field>

            <div className="space-y-3 md:col-span-2 xl:col-span-2">
              <Label className="text-sm font-medium text-slate-700">Thiết lập trộn câu hỏi</Label>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <Checkbox
                    checked={form.randomizeQuestionOrder}
                    onCheckedChange={(value) =>
                      setForm((current) => ({ ...current, randomizeQuestionOrder: value === true }))
                    }
                  />
                  Random câu hỏi
                </label>
                <label className="flex items-center gap-3 rounded-[20px] border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <Checkbox
                    checked={form.randomizeOptionOrder}
                    onCheckedChange={(value) =>
                      setForm((current) => ({ ...current, randomizeOptionOrder: value === true }))
                    }
                  />
                  Random đáp án
                </label>
              </div>
            </div>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
