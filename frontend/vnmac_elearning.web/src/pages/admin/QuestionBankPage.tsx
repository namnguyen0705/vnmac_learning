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
  AdminMetricCard,
  AdminModal,
  AdminPageHeader,
  AdminPagination,
  AdminSection,
} from "@/shared/ui/admin-kit";
import { createQuestion, deleteQuestion, getAdminCourses, getQuestions, updateQuestion, uploadAdminMedia } from "../../shared/api/admin";
import { humanizeEnum } from "../../shared/lib/format";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import type {
  AdminQuestion,
  HotspotShape,
  QuestionDragItemRequest,
  QuestionDragPairRequest,
  QuestionDragTargetRequest,
  QuestionHotspotTargetRequest,
  QuestionOptionRequest,
  QuestionType,
  UpsertLessonQuestionRequest,
} from "../../shared/types/api";
import { CircleHelp, ImageUp, ListChecks, Loader2, Pencil, Plus, Search, ShieldCheck, Target, Trash2, X } from "lucide-react";

interface QuestionFormState {
  lessonId: string;
  quizId: string;
  type: QuestionType;
  order: number;
  prompt: string;
  explanation: string;
  statement: string;
  mediaTitle: string;
  mediaUrl: string;
  scenarioTitle: string;
  scenarioContext: string;
  options: QuestionOptionRequest[];
  hotspotTargets: QuestionHotspotTargetRequest[];
  dragItems: QuestionDragItemRequest[];
  dragTargets: QuestionDragTargetRequest[];
  correctPairs: QuestionDragPairRequest[];
}

interface EligibleQuestionOwner {
  key: string;
  ownerType: "Interactive" | "Quiz";
  ownerId: string;
  assessmentLessonId: string;
  lessonId?: string;
  quizId?: string;
  courseId: string;
  sectionId?: string | null;
  title: string;
  typeLabel: string;
  courseTitle: string;
  sectionTitle?: string | null;
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

function buildDefaultOptions(): QuestionOptionRequest[] {
  return [
    { code: "true", label: "Đúng", order: 1, isCorrect: true },
    { code: "false", label: "Sai", order: 2, isCorrect: false },
  ];
}

function createEmptyQuestionForm(
  owner?: EligibleQuestionOwner | null,
  type: QuestionType = "MultipleChoice",
): QuestionFormState {
  return {
    lessonId: owner?.lessonId ?? "",
    quizId: owner?.quizId ?? "",
    type,
    order: 1,
    prompt: "",
    explanation: "",
    statement: "",
    mediaTitle: "",
    mediaUrl: "",
    scenarioTitle: "",
    scenarioContext: "",
    options:
      type === "TrueFalse"
        ? buildDefaultOptions()
        : [
            { code: "A", label: "", order: 1, isCorrect: false },
            { code: "B", label: "", order: 2, isCorrect: false },
          ],
    hotspotTargets: [],
    dragItems: [{ code: "item-1", label: "", order: 1 }],
    dragTargets: [{ code: "target-1", label: "", order: 1 }],
    correctPairs: [{ dragItemCode: "item-1", dragTargetCode: "target-1" }],
  };
}

function mapQuestionToForm(question: AdminQuestion): QuestionFormState {
  return {
    lessonId: question.lessonId,
    quizId: "",
    type: question.type,
    order: question.order,
    prompt: question.prompt,
    explanation: question.explanation,
    statement: question.statement ?? "",
    mediaTitle: question.mediaTitle ?? "",
    mediaUrl: question.mediaUrl ?? "",
    scenarioTitle: question.scenarioTitle ?? "",
    scenarioContext: question.scenarioContext ?? "",
    options: question.options,
    hotspotTargets: question.hotspotTargets,
    dragItems: question.dragItems,
    dragTargets: question.dragTargets,
    correctPairs: question.correctPairs,
  };
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(Math.max(0, Math.round(value)));
}

function getQuestionSummary(question: AdminQuestion) {
  if (question.type === "Hotspot") {
    return `${question.hotspotTargets.length} hotspot`;
  }

  if (question.type === "DragDrop") {
    return `${question.dragItems.length} mục kéo / ${question.dragTargets.length} vùng thả`;
  }

  return `${question.options.length} đáp án`;
}

function getQuestionGroupKey(question: AdminQuestion, owner?: EligibleQuestionOwner) {
  return owner ? `${owner.courseId}::${owner.assessmentLessonId}` : `missing::${question.lessonId}`;
}

export function QuestionBankPage() {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isUploadingHotspotImage, setIsUploadingHotspotImage] = useState(false);
  const [courseFilter, setCourseFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState(() => {
    const quizId = searchParams.get("quizId");
    if (quizId) {
      return `quiz:${quizId}`;
    }

    const lessonId = searchParams.get("lessonId");
    if (lessonId) {
      return `lesson:${lessonId}`;
    }

    return "all";
  });
  const [typeFilter, setTypeFilter] = useState<QuestionType | "all">("all");
  const [page, setPage] = useState(1);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<QuestionFormState>(() => createEmptyQuestionForm());

  const coursesQuery = useQuery({
    queryKey: ["admin", "courses"],
    queryFn: getAdminCourses,
  });

  const questionsQuery = useQuery({
    queryKey: ["admin", "questions", "all"],
    queryFn: () => getQuestions(),
  });

  const eligibleOwners = useMemo<EligibleQuestionOwner[]>(
    () =>
      coursesQuery.data?.flatMap((course) => [
        ...course.sections.flatMap((section) =>
          (section.quizzes ?? []).map((quiz) => ({
            key: `quiz:${quiz.id}`,
            ownerType: "Quiz" as const,
            ownerId: quiz.id,
            assessmentLessonId: quiz.assessmentLessonId,
            lessonId: undefined,
            quizId: quiz.id,
            courseId: course.id,
            sectionId: section.id,
            title: quiz.title,
            typeLabel: "Kiểm tra phần học",
            courseTitle: course.title,
            sectionTitle: section.title,
          })),
        ),
        ...(course.quizzes ?? []).map((quiz) => ({
          key: `quiz:${quiz.id}`,
          ownerType: "Quiz" as const,
          ownerId: quiz.id,
          assessmentLessonId: quiz.assessmentLessonId,
          lessonId: undefined,
          quizId: quiz.id,
          courseId: course.id,
          sectionId: null,
          title: quiz.title,
          typeLabel: "Kiểm tra chủ đề",
          courseTitle: course.title,
          sectionTitle: null,
        })),
      ]) ?? [],
    [coursesQuery.data],
  );

  const ownerMap = useMemo(
    () =>
      new Map(
        eligibleOwners.map((owner) => [
          owner.key,
          owner,
        ]),
      ),
    [eligibleOwners],
  );

  const ownerByAssessmentLessonId = useMemo(
    () =>
      new Map(
        eligibleOwners.map((owner) => [
          owner.assessmentLessonId,
          owner,
        ]),
      ),
    [eligibleOwners],
  );

  useEffect(() => {
    if (ownerFilter === "all") {
      return;
    }

    const selectedOwner = ownerMap.get(ownerFilter);
    if (selectedOwner) {
      setCourseFilter(selectedOwner.courseId);
      return;
    }

    setOwnerFilter("all");
  }, [ownerFilter, ownerMap]);

  const ownersForCourse = useMemo(
    () =>
      courseFilter === "all"
        ? eligibleOwners
        : eligibleOwners.filter((owner) => owner.courseId === courseFilter),
    [courseFilter, eligibleOwners],
  );

  useEffect(() => {
    if (ownerFilter !== "all" && !ownersForCourse.some((owner) => owner.key === ownerFilter)) {
      setOwnerFilter("all");
    }
  }, [ownerFilter, ownersForCourse]);

  const allQuestions = questionsQuery.data ?? [];
  const filteredQuestions = useMemo(() => {
    const selectedOwner = ownerFilter !== "all" ? ownerMap.get(ownerFilter) : null;

    return allQuestions.filter((question) => {
      const owner = ownerByAssessmentLessonId.get(question.lessonId);
      if (!owner) {
        return false;
      }

      if (courseFilter !== "all" && owner.courseId !== courseFilter) {
        return false;
      }

      if (selectedOwner && question.lessonId !== selectedOwner.assessmentLessonId) {
        return false;
      }

      if (typeFilter !== "all" && question.type !== typeFilter) {
        return false;
      }

      if (search.trim()) {
        const keyword = search.trim().toLowerCase();
        if (
          !question.prompt.toLowerCase().includes(keyword) &&
          !question.explanation.toLowerCase().includes(keyword) &&
          !owner.title.toLowerCase().includes(keyword) &&
          !owner.courseTitle.toLowerCase().includes(keyword) &&
          !(owner.sectionTitle ?? "").toLowerCase().includes(keyword)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [allQuestions, courseFilter, ownerFilter, ownerByAssessmentLessonId, ownerMap, search, typeFilter]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
  const pagedQuestions = useMemo(
    () => filteredQuestions.slice((page - 1) * pageSize, page * pageSize),
    [filteredQuestions, page],
  );

  const upsertMutation = useMutation({
    mutationFn: async () => {
      const payload: UpsertLessonQuestionRequest = {
        lessonId: form.lessonId || null,
        quizId: form.quizId || null,
        type: form.type,
        order: Number(form.order),
        prompt: form.prompt,
        explanation: form.explanation,
        statement: form.statement || null,
        mediaTitle: form.mediaTitle || null,
        mediaUrl: form.mediaUrl || null,
        scenarioTitle: form.scenarioTitle || null,
        scenarioContext: form.scenarioContext || null,
        options: form.options,
        hotspotTargets: form.hotspotTargets,
        dragItems: form.dragItems,
        dragTargets: form.dragTargets,
        correctPairs: form.correctPairs,
      };

      if (editingQuestionId) {
        return updateQuestion(editingQuestionId, payload);
      }

      return createQuestion(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "questions", "all"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (questionId: string) => deleteQuestion(questionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "questions", "all"] }),
  });

  useEffect(() => {
    if (form.type === "TrueFalse") {
      setForm((current) => ({
        ...current,
        options: buildDefaultOptions(),
      }));
    }
  }, [form.type]);

  useEffect(() => {
    setPage(1);
  }, [courseFilter, ownerFilter, search, typeFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const totalQuestions = filteredQuestions.length;
  const trueFalseCount = filteredQuestions.filter((question) => question.type === "TrueFalse").length;
  const multipleChoiceCount = filteredQuestions.filter((question) => question.type === "MultipleChoice").length;
  const dragDropCount = filteredQuestions.filter((question) => question.type === "DragDrop").length;
  const hotspotCount = filteredQuestions.filter((question) => question.type === "Hotspot").length;
  const scenarioCount = filteredQuestions.filter((question) => question.type === "Scenario").length;
  const renderedQuestionRows = pagedQuestions.map((question, index) => {
    const owner = ownerByAssessmentLessonId.get(question.lessonId);
    const previousQuestion = pagedQuestions[index - 1];
    const previousOwner = previousQuestion ? ownerByAssessmentLessonId.get(previousQuestion.lessonId) : undefined;
    const showGroupHeader =
      !previousQuestion || getQuestionGroupKey(previousQuestion, previousOwner) !== getQuestionGroupKey(question, owner);

    return (
      <Fragment key={question.id}>
        {showGroupHeader ? (
          <TableRow className="bg-slate-50">
            <TableCell className="px-5 py-3" colSpan={6}>
              {owner ? (
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                    <Badge className="px-2 py-0.5 text-[11px]" variant="secondary">
                      Chủ đề
                    </Badge>
                    <span className="font-semibold text-slate-950">{owner.courseTitle}</span>
                    <span className="text-slate-300">/</span>
                    <Badge className="px-2 py-0.5 text-[11px]" variant="outline">
                      {owner.ownerType === "Quiz" ? "Bài kiểm tra" : "Bài học"}
                    </Badge>
                    <span className="font-medium text-slate-700">{owner.title}</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {owner.sectionTitle ? `Phần học: ${owner.sectionTitle}` : "Kiểm tra toàn chủ đề"}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Không tìm thấy ngữ cảnh của nhóm câu hỏi này.</p>
              )}
            </TableCell>
          </TableRow>
        ) : null}
        <TableRow>
          <TableCell className="max-w-[360px]">
            <div className="space-y-1">
              <p className="font-semibold text-slate-950">{question.prompt}</p>
              {owner ? (
                <p className="text-sm text-slate-500">
                  {owner.courseTitle}
                  {owner.sectionTitle ? ` / ${owner.sectionTitle}` : ""}
                  {` / ${owner.title}`}
                </p>
              ) : null}
              <p className="line-clamp-2 text-sm text-slate-500">{question.explanation}</p>
            </div>
          </TableCell>
          <TableCell>
            {owner ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="px-2 py-0.5 text-[11px]" variant="secondary">
                    {owner.ownerType === "Quiz" ? "Bài kiểm tra" : "Bài học"}
                  </Badge>
                  {owner.ownerType === "Quiz" ? (
                    <Button asChild className="h-auto p-0 text-left" variant="link">
                      <Link to={`/admin/quizzes?courseId=${owner.courseId}`}>{owner.title}</Link>
                    </Button>
                  ) : (
                    <Button asChild className="h-auto p-0 text-left" variant="link">
                      <Link to={`/admin/lessons?courseId=${owner.courseId}`}>{owner.title}</Link>
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="px-2 py-0.5 text-[11px]" variant="outline">
                    Phạm vi
                  </Badge>
                  <p className="text-sm font-medium text-slate-700">
                    {owner.sectionTitle ? owner.sectionTitle : "Toàn chủ đề"}
                  </p>
                </div>
              </div>
            ) : (
              <span className="text-slate-400">Không tìm thấy mô-đun</span>
            )}
          </TableCell>
          <TableCell>
            <Badge variant="outline">{humanizeEnum(question.type)}</Badge>
          </TableCell>
          <TableCell>{getQuestionSummary(question)}</TableCell>
          <TableCell>{question.order}</TableCell>
          <TableCell>
            <div className="flex justify-end gap-2">
              <AdminIconButton
                icon={<Pencil className="size-4" />}
                label={`Sửa câu hỏi ${question.order}`}
                variant="ghost"
                onClick={() => openEditModal(question)}
              />
              <AdminIconButton
                icon={<Trash2 className="size-4" />}
                label={`Xóa câu hỏi ${question.order}`}
                variant="destructive"
                onClick={() => {
                  if (window.confirm("Xóa câu hỏi này?")) {
                    deleteMutation.mutate(question.id);
                  }
                }}
              />
            </div>
          </TableCell>
        </TableRow>
      </Fragment>
    );
  });

  function openCreateModal() {
    const defaultOwner =
      ownerFilter !== "all"
        ? ownerMap.get(ownerFilter) ?? ownersForCourse[0] ?? eligibleOwners[0] ?? null
        : ownersForCourse[0] ?? eligibleOwners[0] ?? null;
    setEditingQuestionId(null);
    setForm(createEmptyQuestionForm(defaultOwner, typeFilter !== "all" ? typeFilter : "MultipleChoice"));
    setIsModalOpen(true);
  }

  function openEditModal(question: AdminQuestion) {
    const owner = ownerByAssessmentLessonId.get(question.lessonId);
    setEditingQuestionId(question.id);
    setForm({
      ...mapQuestionToForm(question),
      lessonId: owner?.lessonId ?? "",
      quizId: owner?.quizId ?? "",
    });
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingQuestionId(null);
    const defaultOwner =
      ownerFilter !== "all"
        ? ownerMap.get(ownerFilter) ?? ownersForCourse[0] ?? eligibleOwners[0] ?? null
        : ownersForCourse[0] ?? eligibleOwners[0] ?? null;
    setForm(createEmptyQuestionForm(defaultOwner));
  }

  if (coursesQuery.isLoading || questionsQuery.isLoading) {
    return <LoadingBlock label="Đang tải ngân hàng câu hỏi..." />;
  }

  if (coursesQuery.isError || questionsQuery.isError) {
    return <MessageBanner tone="error">Không tải được ngân hàng câu hỏi.</MessageBanner>;
  }

  if (!eligibleOwners.length) {
    return <MessageBanner tone="warning">Chưa có bài tương tác hoặc bài kiểm tra để gắn câu hỏi.</MessageBanner>;
  }

  return (
    <div className="grid gap-6">
      <AdminPageHeader
        breadcrumbs={["Quản trị", "Nội dung", "Ngân hàng câu hỏi"]}
        title="Ngân hàng câu hỏi"
        actions={
          <Button className="rounded-2xl" type="button" onClick={openCreateModal}>
            <Plus className="size-4" />
            Thêm câu hỏi
          </Button>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <AdminMetricCard accent="blue" icon={<CircleHelp className="size-8" />} label="Tổng câu hỏi" value={formatNumber(totalQuestions)} />
        <AdminMetricCard accent="green" icon={<ShieldCheck className="size-8" />} label="Đúng / Sai" value={formatNumber(trueFalseCount)} />
        <AdminMetricCard accent="blue" icon={<CircleHelp className="size-8" />} label="Trắc nghiệm" value={formatNumber(multipleChoiceCount)} />
        <AdminMetricCard accent="amber" icon={<ListChecks className="size-8" />} label="Kéo thả" value={formatNumber(dragDropCount)} />
        <AdminMetricCard accent="violet" icon={<Target className="size-8" />} label="Điểm chạm" value={formatNumber(hotspotCount)} />
        <AdminMetricCard accent="green" icon={<CircleHelp className="size-8" />} label="Tình huống" value={formatNumber(scenarioCount)} />
      </section>

      <AdminSection title="Bộ lọc ngân hàng câu hỏi">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_240px_220px]">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              className="h-11 rounded-2xl border-slate-200 pl-11"
              placeholder="Tìm nội dung câu hỏi, giải thích, bài học..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <Select value={courseFilter} onValueChange={setCourseFilter}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Tất cả chủ đề" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả chủ đề</SelectItem>
              {coursesQuery.data?.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Tất cả mô-đun" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả mô-đun</SelectItem>
              {ownersForCourse.map((owner) => (
                <SelectItem key={owner.key} value={owner.key}>
                  {owner.ownerType === "Quiz" ? `[Bài kiểm tra] ${owner.title}` : `[Tương tác] ${owner.title}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as QuestionType | "all")}>
            <SelectTrigger className="h-11 rounded-2xl">
              <SelectValue placeholder="Tất cả loại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="TrueFalse">Đúng / Sai</SelectItem>
              <SelectItem value="MultipleChoice">Trắc nghiệm</SelectItem>
              <SelectItem value="DragDrop">Drag &amp; Drop</SelectItem>
              <SelectItem value="Hotspot">Điểm chạm</SelectItem>
              <SelectItem value="Scenario">Tình huống</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </AdminSection>

      <AdminSection
        action={<Badge variant="secondary">{filteredQuestions.length} câu hỏi</Badge>}
        title="Danh sách câu hỏi"
      >
        <div className="overflow-hidden rounded-[28px] border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nội dung câu hỏi</TableHead>
                <TableHead>Nguồn câu hỏi</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Cấu hình</TableHead>
                <TableHead>Thứ tự</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderedQuestionRows}</TableBody>
          </Table>
          <AdminPagination page={page} pageSize={pageSize} totalItems={filteredQuestions.length} onPageChange={setPage} />
        </div>
      </AdminSection>

      <AdminModal
        actions={
          <>
            <Button className="px-4" type="button" variant="outline" onClick={closeModal}>
              Đóng
            </Button>
            <Button className="px-4" disabled={upsertMutation.isPending} type="button" onClick={() => upsertMutation.mutate()}>
              {upsertMutation.isPending ? "Đang lưu..." : editingQuestionId ? "Cập nhật câu hỏi" : "Thêm câu hỏi"}
            </Button>
          </>
        }
        className="max-w-6xl"
        description="Hộp thoại biên tập được gom theo từng loại câu hỏi, nhưng vẫn nằm trong cùng một luồng giao diện danh sách."
        onClose={closeModal}
        open={isModalOpen}
        title={editingQuestionId ? "Cập nhật câu hỏi" : "Thêm câu hỏi"}
      >
        <div className="grid gap-6">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_240px_140px]">
            <div className="xl:col-span-1">
              <Field label="Nguồn câu hỏi">
                <Select
                  value={form.quizId ? `quiz:${form.quizId}` : form.lessonId ? `lesson:${form.lessonId}` : ""}
                  onValueChange={(value) => {
                    const owner = ownerMap.get(value);
                    if (!owner) {
                      return;
                    }

                    setForm((current) => ({
                      ...current,
                      lessonId: owner.lessonId ?? "",
                      quizId: owner.quizId ?? "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bài tương tác hoặc bài kiểm tra" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleOwners.map((owner) => (
                      <SelectItem key={owner.key} value={owner.key}>
                        {owner.ownerType === "Quiz"
                          ? `${owner.title} • ${owner.sectionTitle ? `Kiểm tra phần học: ${owner.sectionTitle}` : "Kiểm tra toàn chủ đề"}`
                          : `${owner.title} • Bài tương tác`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Loại câu hỏi">
              <Select
                value={form.type}
                onValueChange={(value) => {
                  const ownerKey = form.quizId ? `quiz:${form.quizId}` : form.lessonId ? `lesson:${form.lessonId}` : "";
                  const owner = ownerKey ? ownerMap.get(ownerKey) ?? null : null;
                  setForm(createEmptyQuestionForm(owner, value as QuestionType));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TrueFalse">Đúng / Sai</SelectItem>
                  <SelectItem value="MultipleChoice">Trắc nghiệm</SelectItem>
                  <SelectItem value="DragDrop">Drag &amp; Drop</SelectItem>
                  <SelectItem value="Hotspot">Điểm chạm</SelectItem>
                  <SelectItem value="Scenario">Tình huống</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field label="Thứ tự">
              <Input
                min={1}
                type="number"
                value={form.order}
                onChange={(event) => setForm((current) => ({ ...current, order: Number(event.target.value) }))}
              />
            </Field>

            <div className="xl:col-span-3">
              <Field label="Nội dung câu hỏi">
                <Textarea
                  className="min-h-24"
                  value={form.prompt}
                  onChange={(event) => setForm((current) => ({ ...current, prompt: event.target.value }))}
                />
              </Field>
            </div>

            <div className="xl:col-span-3">
              <Field label="Giải thích">
                <Textarea
                  className="min-h-24"
                  value={form.explanation}
                  onChange={(event) => setForm((current) => ({ ...current, explanation: event.target.value }))}
                />
              </Field>
            </div>
          </div>

          {form.type === "TrueFalse" || form.type === "MultipleChoice" || form.type === "Scenario" ? (
            <AdminSection contentClassName="space-y-4" title="Lựa chọn và đáp án">
              <div className="space-y-4">
                {form.options.map((option, index) => (
                  <div
                    className="grid gap-4 border border-slate-200 bg-slate-50 p-4 md:grid-cols-[120px_minmax(0,1fr)_160px] md:items-end"
                    key={`${option.code}-${index}`}
                  >
                    <Field label="Mã">
                      <Input
                        value={option.code}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            options: current.options.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, code: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Nhãn">
                      <Input
                        value={option.label}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            options: current.options.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <div className="flex items-end">
                      <label className="flex h-11 w-full items-center justify-center gap-3 border border-slate-200 bg-white px-4 text-sm text-slate-700">
                        <Checkbox
                          checked={option.isCorrect}
                          onCheckedChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              options: current.options.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, isCorrect: value === true } : item,
                              ),
                            }))
                          }
                        />
                        Đáp án đúng
                      </label>
                    </div>
                  </div>
                ))}

                {form.type !== "TrueFalse" ? (
                  <Button
                    className="px-4"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        options: [
                          ...current.options,
                          {
                            code: `option-${current.options.length + 1}`,
                            label: "",
                            order: current.options.length + 1,
                            isCorrect: false,
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="size-4" />
                    Thêm lựa chọn
                  </Button>
                ) : null}

                {form.type === "Scenario" || form.type === "TrueFalse" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Mệnh đề">
                      <Textarea
                        className="min-h-24"
                        value={form.statement}
                        onChange={(event) => setForm((current) => ({ ...current, statement: event.target.value }))}
                      />
                    </Field>
                    {form.type === "Scenario" ? (
                      <>
                        <Field label="Tiêu đề tình huống">
                          <Input
                            value={form.scenarioTitle}
                            onChange={(event) => setForm((current) => ({ ...current, scenarioTitle: event.target.value }))}
                          />
                        </Field>
                        <div className="md:col-span-2">
                          <Field label="Ngữ cảnh tình huống">
                            <Textarea
                              className="min-h-24"
                              value={form.scenarioContext}
                              onChange={(event) => setForm((current) => ({ ...current, scenarioContext: event.target.value }))}
                            />
                          </Field>
                        </div>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </AdminSection>
          ) : null}

          {form.type === "Hotspot" ? (
            <AdminSection contentClassName="space-y-4" title="Điểm chạm">
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Mô tả ảnh">
                    <Input
                      value={form.mediaTitle}
                      onChange={(event) => setForm((current) => ({ ...current, mediaTitle: event.target.value }))}
                    />
                  </Field>
                  <Field label="Ảnh nền câu hỏi" description="Upload ảnh, sau đó bấm trực tiếp lên ảnh để tạo vùng trả lời.">
                    <div className="flex gap-2">
                      <Input
                        placeholder="/uploads/images/..."
                        value={form.mediaUrl}
                        onChange={(event) => setForm((current) => ({ ...current, mediaUrl: event.target.value }))}
                      />
                      <Button className="relative shrink-0 gap-2" disabled={isUploadingHotspotImage} type="button" variant="outline">
                        {isUploadingHotspotImage ? <Loader2 className="size-4 animate-spin" /> : <ImageUp className="size-4" />}
                        Upload
                        <input
                          accept="image/*"
                          className="absolute inset-0 cursor-pointer opacity-0"
                          disabled={isUploadingHotspotImage}
                          type="file"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            if (!file) return;
                            setIsUploadingHotspotImage(true);
                            try {
                              const media = await uploadAdminMedia(file, "image");
                              setForm((current) => ({
                                ...current,
                                mediaUrl: media.url,
                                mediaTitle: current.mediaTitle || file.name,
                              }));
                            } finally {
                              setIsUploadingHotspotImage(false);
                              event.target.value = "";
                            }
                          }}
                        />
                      </Button>
                    </div>
                  </Field>
                </div>

                {form.mediaUrl ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      Bấm khoảng trống để thêm vùng mới. Giữ và kéo vùng đã có để di chuyển.
                    </p>
                    <div
                      className="relative cursor-crosshair overflow-hidden rounded-2xl border border-slate-200 bg-slate-100"
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        const bounds = event.currentTarget.getBoundingClientRect();
                        const x = Math.round(((event.clientX - bounds.left) / bounds.width) * 1000) / 10;
                        const y = Math.round(((event.clientY - bounds.top) / bounds.height) * 1000) / 10;
                        setForm((current) => {
                          const nextOrder = current.hotspotTargets.length + 1;
                          return {
                            ...current,
                            hotspotTargets: [
                              ...current.hotspotTargets,
                              {
                                code: `target-${nextOrder}`,
                                label: `Vùng ${nextOrder}`,
                                order: nextOrder,
                                shape: "Circle",
                                x,
                                y,
                                width: 12,
                                height: 12,
                                radius: 6,
                                isCorrect: current.hotspotTargets.length === 0,
                              },
                            ],
                          };
                        });
                      }}
                    >
                      <img
                        alt={form.mediaTitle || "Ảnh nền câu hỏi điểm chạm"}
                        className="block h-auto w-full select-none"
                        draggable={false}
                        src={form.mediaUrl}
                      />
                      {form.hotspotTargets.map((target, index) => (
                        <span
                          aria-label={`Di chuyển ${target.label || `vùng ${index + 1}`}`}
                          className="absolute flex min-h-9 min-w-9 touch-none -translate-x-1/2 -translate-y-1/2 cursor-move select-none items-center justify-center border-2 border-white bg-blue-600/75 text-xs font-bold text-white shadow-lg ring-offset-2 hover:bg-blue-700/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          key={`${target.code}-preview-${index}`}
                          role="button"
                          tabIndex={0}
                          style={{
                            left: `${target.x}%`,
                            top: `${target.y}%`,
                            width: `${target.shape === "Circle" ? Math.max(5, target.radius * 2) : Math.max(5, target.width)}%`,
                            height: `${target.shape === "Circle" ? Math.max(5, target.radius * 2) : Math.max(5, target.height)}%`,
                            borderRadius: target.shape === "Circle" ? "9999px" : "10px",
                          }}
                          onClick={(event) => event.stopPropagation()}
                          onPointerDown={(event) => {
                            event.stopPropagation();
                            event.currentTarget.setPointerCapture(event.pointerId);
                          }}
                          onPointerMove={(event) => {
                            if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                            const canvas = event.currentTarget.parentElement;
                            if (!canvas) return;
                            const bounds = canvas.getBoundingClientRect();
                            const x = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
                            const y = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
                            setForm((current) => ({
                              ...current,
                              hotspotTargets: current.hotspotTargets.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      x: Math.round(x * 10) / 10,
                                      y: Math.round(y * 10) / 10,
                                    }
                                  : item,
                              ),
                            }));
                          }}
                          onPointerUp={(event) => {
                            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                              event.currentTarget.releasePointerCapture(event.pointerId);
                            }
                          }}
                        >
                          {index + 1}
                          <span
                            aria-label={`Đổi kích thước ${target.label || `vùng ${index + 1}`}`}
                            className="absolute -bottom-2 -right-2 size-5 touch-none cursor-nwse-resize rounded-full border-2 border-blue-700 bg-white shadow-md"
                            role="button"
                            tabIndex={0}
                            onClick={(event) => event.stopPropagation()}
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              event.currentTarget.setPointerCapture(event.pointerId);
                            }}
                            onPointerMove={(event) => {
                              event.stopPropagation();
                              if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
                              const canvas = event.currentTarget.parentElement?.parentElement;
                              if (!canvas) return;
                              const bounds = canvas.getBoundingClientRect();
                              const pointerX = Math.max(0, Math.min(100, ((event.clientX - bounds.left) / bounds.width) * 100));
                              const pointerY = Math.max(0, Math.min(100, ((event.clientY - bounds.top) / bounds.height) * 100));
                              setForm((current) => ({
                                ...current,
                                hotspotTargets: current.hotspotTargets.map((item, itemIndex) => {
                                  if (itemIndex !== index) return item;
                                  const horizontalDistance = Math.abs(pointerX - item.x);
                                  const verticalDistance = Math.abs(pointerY - item.y);
                                  if (item.shape === "Circle") {
                                    const radius = Math.max(
                                      2,
                                      Math.min(40, Math.sqrt(horizontalDistance ** 2 + verticalDistance ** 2)),
                                    );
                                    return { ...item, radius: Math.round(radius * 10) / 10 };
                                  }

                                  return {
                                    ...item,
                                    width: Math.round(Math.max(4, Math.min(100, horizontalDistance * 2)) * 10) / 10,
                                    height: Math.round(Math.max(4, Math.min(100, verticalDistance * 2)) * 10) / 10,
                                  };
                                }),
                              }));
                            }}
                            onPointerUp={(event) => {
                              event.stopPropagation();
                              if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                                event.currentTarget.releasePointerCapture(event.pointerId);
                              }
                            }}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
                    Hãy upload ảnh nền trước khi tạo các vùng tương tác.
                  </div>
                )}

                {form.hotspotTargets.map((target, index) => (
                  <div
                    className="grid gap-4 border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-3 xl:items-end"
                    key={`${target.code}-${index}`}
                  >
                    <Field label="Mã">
                      <Input
                        value={target.code}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            hotspotTargets: current.hotspotTargets.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, code: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Nhãn">
                      <Input
                        value={target.label}
                        onChange={(event) =>
                          setForm((current) => ({
                            ...current,
                            hotspotTargets: current.hotspotTargets.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                    </Field>
                    <Field label="Hình dạng">
                      <Select
                        value={target.shape}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            hotspotTargets: current.hotspotTargets.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, shape: value as HotspotShape } : item,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn hình dạng" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Rectangle">Hình chữ nhật</SelectItem>
                          <SelectItem value="Circle">Hình tròn</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                    <div className="flex h-11 items-center rounded-md border border-dashed border-blue-200 bg-blue-50 px-4 text-sm text-blue-800">
                      Kéo vùng trên ảnh để di chuyển; kéo chấm trắng ở góc để đổi kích thước.
                    </div>
                    <div className="flex items-end">
                      <div className="flex w-full gap-2">
                      <label className="flex h-11 flex-1 items-center justify-center gap-3 border border-slate-200 bg-white px-4 text-sm text-slate-700">
                        <Checkbox
                          checked={target.isCorrect}
                          onCheckedChange={(value) =>
                            setForm((current) => ({
                              ...current,
                              hotspotTargets: current.hotspotTargets.map((item, itemIndex) =>
                                itemIndex === index ? { ...item, isCorrect: value === true } : item,
                              ),
                            }))
                          }
                        />
                        Đáp án đúng
                      </label>
                      <Button
                        aria-label="Xóa vùng"
                        className="h-11 px-3"
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setForm((current) => ({
                            ...current,
                            hotspotTargets: current.hotspotTargets.filter((_, itemIndex) => itemIndex !== index),
                          }))
                        }
                      >
                        <X className="size-4" />
                      </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AdminSection>
          ) : null}

          {form.type === "DragDrop" ? (
            <AdminSection contentClassName="space-y-6" title="Thiết lập kéo thả">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold text-slate-900">Danh sách mục kéo</p>
                    <Button
                      className="px-3"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          dragItems: [
                            ...current.dragItems,
                            { code: `item-${current.dragItems.length + 1}`, label: "", order: current.dragItems.length + 1 },
                          ],
                        }))
                      }
                    >
                      Thêm mục kéo
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {form.dragItems.map((item, index) => (
                      <div className="grid gap-3 md:grid-cols-2" key={`${item.code}-${index}`}>
                        <Input
                          placeholder="Mã"
                          value={item.code}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              dragItems: current.dragItems.map((entry, itemIndex) =>
                                itemIndex === index ? { ...entry, code: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                        <Input
                          placeholder="Nhãn"
                          value={item.label}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              dragItems: current.dragItems.map((entry, itemIndex) =>
                                itemIndex === index ? { ...entry, label: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="font-semibold text-slate-900">Danh sách vùng thả</p>
                    <Button
                      className="px-3"
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          dragTargets: [
                            ...current.dragTargets,
                            { code: `target-${current.dragTargets.length + 1}`, label: "", order: current.dragTargets.length + 1 },
                          ],
                        }))
                      }
                    >
                      Thêm vùng thả
                    </Button>
                  </div>
                  <div className="space-y-3">
                    {form.dragTargets.map((target, index) => (
                      <div className="grid gap-3 md:grid-cols-2" key={`${target.code}-${index}`}>
                        <Input
                          placeholder="Mã"
                          value={target.code}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              dragTargets: current.dragTargets.map((entry, itemIndex) =>
                                itemIndex === index ? { ...entry, code: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                        <Input
                          placeholder="Nhãn"
                          value={target.label}
                          onChange={(event) =>
                            setForm((current) => ({
                              ...current,
                              dragTargets: current.dragTargets.map((entry, itemIndex) =>
                                itemIndex === index ? { ...entry, label: event.target.value } : entry,
                              ),
                            }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 bg-slate-50 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold text-slate-900">Cặp ghép đúng</p>
                  <Button
                    className="px-3"
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        correctPairs: [
                          ...current.correctPairs,
                          {
                            dragItemCode: current.dragItems[0]?.code ?? "",
                            dragTargetCode: current.dragTargets[0]?.code ?? "",
                          },
                        ],
                      }))
                    }
                  >
                    Thêm cặp
                  </Button>
                </div>
                <div className="space-y-3">
                  {form.correctPairs.map((pair, index) => (
                    <div className="grid gap-3 md:grid-cols-2" key={`${pair.dragItemCode}-${pair.dragTargetCode}-${index}`}>
                      <Select
                        value={pair.dragItemCode}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            correctPairs: current.correctPairs.map((entry, itemIndex) =>
                              itemIndex === index ? { ...entry, dragItemCode: value } : entry,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn mục kéo" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.dragItems.map((item) => (
                            <SelectItem key={item.code} value={item.code}>
                              {item.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={pair.dragTargetCode}
                        onValueChange={(value) =>
                          setForm((current) => ({
                            ...current,
                            correctPairs: current.correctPairs.map((entry, itemIndex) =>
                              itemIndex === index ? { ...entry, dragTargetCode: value } : entry,
                            ),
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn vùng thả" />
                        </SelectTrigger>
                        <SelectContent>
                          {form.dragTargets.map((item) => (
                            <SelectItem key={item.code} value={item.code}>
                              {item.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </AdminSection>
          ) : null}
        </div>
      </AdminModal>
    </div>
  );
}
