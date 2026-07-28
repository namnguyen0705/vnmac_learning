import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadAdminMedia } from "@/shared/api/admin";
import { AdminModal } from "@/shared/ui/admin-kit";
import type { LessonContentCheckOption, LessonContentCheckQuestion, LessonContentStep } from "@/shared/types/api";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { createCheckOption, createCheckQuestion, normalizeCheckQuestionsForEditor } from "./contentModel";
import { Field, UploadBox } from "./FormFields";

export function CheckQuestionManager({
  step,
  onChange,
}: {
  step: LessonContentStep;
  onChange: (questions: LessonContentCheckQuestion[]) => void;
}) {
  const questions = [...(step.questions ?? [])].sort((left, right) => left.order - right.order);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [draft, setDraft] = useState<LessonContentCheckQuestion>(() => createCheckQuestion(1));
  const [uploading, setUploading] = useState(false);

  const openCreate = () => {
    setEditingQuestionId(null);
    setDraft(createCheckQuestion(questions.length + 1));
    setIsModalOpen(true);
  };

  const openEdit = (question: LessonContentCheckQuestion) => {
    setEditingQuestionId(question.id);
    setDraft({ ...question, options: question.options.map((option) => ({ ...option })) });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingQuestionId(null);
    setUploading(false);
  };

  const saveDraft = () => {
    const normalized = normalizeCheckQuestionsForEditor({ questions: [draft] }, undefined, true)[0] ?? createCheckQuestion(questions.length + 1);
    const next: LessonContentCheckQuestion[] = editingQuestionId
      ? questions.map((question) => (question.id === editingQuestionId ? { ...normalized, order: question.order } : question))
      : [...questions, { ...normalized, order: questions.length + 1 }];

    onChange(
      next
        .map((question, questionIndex) => ({
          ...question,
          order: questionIndex + 1,
          options: question.options.map((option, optionIndex) => ({
            ...option,
            code: option.code || String.fromCharCode(65 + optionIndex),
            order: optionIndex + 1,
          })),
        }))
        .sort((left, right) => left.order - right.order),
    );
    closeModal();
  };

  const removeQuestion = (questionId: string) => {
    if (!window.confirm("Xóa câu hỏi kiểm tra cuối bài này?")) {
      return;
    }

    onChange(questions.filter((question) => question.id !== questionId).map((question, index) => ({ ...question, order: index + 1 })));
  };

  const updateOption = (optionId: string, patch: Partial<LessonContentCheckOption>) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option) => (option.id === optionId ? { ...option, ...patch } : option)),
    }));
  };

  const setCorrectOption = (optionId: string) => {
    setDraft((current) => ({
      ...current,
      options: current.options.map((option) => ({ ...option, isCorrect: option.id === optionId })),
    }));
  };

  const addOption = () => {
    setDraft((current) => ({
      ...current,
      options: [...current.options, createCheckOption(current.options.length + 1, { isCorrect: false })],
    }));
  };

  const removeOption = (optionId: string) => {
    setDraft((current) => {
      const next = current.options.filter((option) => option.id !== optionId);
      const safeNext = next.length >= 2 ? next : current.options;
      const hasCorrect = safeNext.some((option) => option.isCorrect);
      return {
        ...current,
        options: safeNext.map((option, index) => ({
          ...option,
          order: index + 1,
          code: option.code || String.fromCharCode(65 + index),
          isCorrect: hasCorrect ? option.isCorrect : index === 0,
        })),
      };
    });
  };

  const uploadQuestionImage = async (file: File) => {
    setUploading(true);
    try {
      const media = await uploadAdminMedia(file, "image");
      setDraft((current) => ({ ...current, imageUrl: media.url, imageAlt: current.imageAlt || file.name }));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="admin-check-question-manager">
      <div className="admin-content-section-title with-action">
        <div>
          <strong>Danh sách câu hỏi trong bài</strong>
          <span>{questions.length} câu hỏi riêng cho kiểm tra cuối bài này.</span>
        </div>
        <Button className="admin-primary-button" type="button" onClick={openCreate}>
          <Plus className="size-4" />
          Thêm câu hỏi
        </Button>
      </div>

      {questions.length ? (
        <div className="admin-check-question-list">
          {questions.map((question) => {
            const correct = question.options.find((option) => option.isCorrect);
            return (
              <div className="admin-check-question-card" key={question.id}>
                <div className="admin-check-question-index">{question.order}</div>
                <div className="admin-check-question-body">
                  <strong>{question.prompt || "Câu hỏi chưa nhập nội dung"}</strong>
                  <span>{question.options.length} đáp án{correct ? ` - đúng: ${correct.code || correct.label}` : ""}</span>
                  {question.feedback ? <p>{question.feedback}</p> : null}
                </div>
                {question.imageUrl ? <img alt={question.imageAlt || question.prompt} src={question.imageUrl} /> : null}
                <div className="admin-check-question-actions">
                  <Button type="button" variant="outline" onClick={() => openEdit(question)}>
                    <Pencil className="size-4" />
                    Sửa
                  </Button>
                  <Button type="button" variant="outline" onClick={() => removeQuestion(question.id)}>
                    <Trash2 className="size-4" />
                    Xóa
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="admin-activity-empty">Chưa có câu hỏi kiểm tra cuối bài.</div>
      )}

      <AdminModal
        actions={
          <>
            <Button type="button" variant="outline" onClick={closeModal}>
              Hủy
            </Button>
            <Button className="admin-primary-button" type="button" onClick={saveDraft}>
              Lưu câu hỏi
            </Button>
          </>
        }
        description="Câu hỏi này chỉ lưu trong LessonContent của bài học, không thêm vào ngân hàng câu hỏi chung."
        open={isModalOpen}
        title={editingQuestionId ? "Sửa câu hỏi cuối bài" : "Thêm câu hỏi cuối bài"}
        onClose={closeModal}
      >
        <div className="admin-check-question-modal">
          <div className="admin-content-grid two">
            <Field label="Thứ tự">
              <Input
                min={1}
                type="number"
                value={draft.order}
                onChange={(event) => setDraft((current) => ({ ...current, order: Number(event.target.value) }))}
              />
            </Field>
            <Field label="Mô tả ảnh">
              <Input value={draft.imageAlt} onChange={(event) => setDraft((current) => ({ ...current, imageAlt: event.target.value }))} />
            </Field>
          </div>
          <Field label="Nội dung câu hỏi">
            <Textarea value={draft.prompt} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} />
          </Field>
          <div className="admin-content-grid two">
            <UploadBox
              accept="image/png,image/jpeg,image/webp"
              disabled={uploading}
              label="Upload ảnh câu hỏi"
              loading={uploading}
              onChange={uploadQuestionImage}
            />
            <Field label="URL ảnh câu hỏi">
              <Input value={draft.imageUrl} onChange={(event) => setDraft((current) => ({ ...current, imageUrl: event.target.value }))} />
            </Field>
          </div>
          <Field label="Giải thích / diễn giải">
            <Textarea value={draft.explanation} onChange={(event) => setDraft((current) => ({ ...current, explanation: event.target.value }))} />
          </Field>
          <Field label="Phản hồi khi đúng">
            <Textarea value={draft.feedback} onChange={(event) => setDraft((current) => ({ ...current, feedback: event.target.value }))} />
          </Field>
          <div className="admin-check-option-editor">
            <div className="admin-content-section-title with-action">
              <div>
                <strong>Đáp án</strong>
                <span>Chọn một đáp án đúng cho câu hỏi.</span>
              </div>
              <Button type="button" variant="outline" onClick={addOption}>
                <Plus className="size-4" />
                Thêm đáp án
              </Button>
            </div>
            {draft.options.map((option, index) => (
              <div className="admin-check-option-row" key={option.id}>
                <label>
                  <input checked={option.isCorrect} name="correct-option" type="radio" onChange={() => setCorrectOption(option.id)} />
                  Đúng
                </label>
                <Input value={option.code} onChange={(event) => updateOption(option.id, { code: event.target.value })} placeholder={String.fromCharCode(65 + index)} />
                <Input value={option.label} onChange={(event) => updateOption(option.id, { label: event.target.value })} placeholder={`Đáp án ${index + 1}`} />
                <Button disabled={draft.options.length <= 2} type="button" variant="outline" onClick={() => removeOption(option.id)}>
                  <X className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
