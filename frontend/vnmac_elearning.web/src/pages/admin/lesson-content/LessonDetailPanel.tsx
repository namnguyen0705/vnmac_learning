import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { AdminLessonCatalogRow, LessonContent } from "@/shared/types/api";
import { Field, ListField } from "./FormFields";

export function LessonDetailPanel({
  content,
  lesson,
  onContentChange,
}: {
  content: LessonContent;
  lesson?: AdminLessonCatalogRow;
  onContentChange: Dispatch<SetStateAction<LessonContent>>;
}) {
  const updateField = (field: keyof Pick<LessonContent, "summary" | "coreMessage" | "mainContentType">, value: string) => {
    onContentChange((current) => ({ ...current, [field]: value }));
  };

  const updateList = (
    field: keyof Pick<LessonContent, "objectives" | "mainPoints" | "interactionTypes" | "reinforcementPoints">,
    value: string[],
  ) => {
    onContentChange((current) => ({ ...current, [field]: value }));
  };

  return (
    <section className="admin-lesson-detail-card">
      <div className="admin-lesson-detail-head">
        <div>
          <span>Chi tiết bài học</span>
          <h2>{lesson?.title ?? "Thông tin bài học"}</h2>
          <p>Phần thông tin tổng quát này dùng để mô tả bài học, mục tiêu, nội dung chính và cấu hình hiển thị chung.</p>
        </div>
        <div className="admin-lesson-detail-meta">
          <span>{lesson?.sectionTitle || "Phần học"}</span>
          <span>{lesson?.durationMinutes ?? 0} phút</span>
          <span>{lesson?.publicationStatus ?? "Published"}</span>
        </div>
      </div>

      <div className="admin-lesson-detail-grid">
        <div className="admin-lesson-detail-column">
          <div className="admin-content-section-title">
            <strong>Nội dung tổng quát</strong>
            <span>Các trường này mô tả bài học ở cấp tổng thể, không phụ thuộc riêng một bước.</span>
          </div>
          <Field label="Tóm tắt bài học">
            <Textarea value={content.summary} onChange={(event) => updateField("summary", event.target.value)} />
          </Field>
          <div className="admin-content-grid two">
            <Field label="Thông điệp cốt lõi">
              <Input value={content.coreMessage} onChange={(event) => updateField("coreMessage", event.target.value)} />
            </Field>
            <Field label="Hình thức nội dung chính">
              <Input value={content.mainContentType} onChange={(event) => updateField("mainContentType", event.target.value)} />
            </Field>
          </div>
          <ListField label="Mục tiêu bài học" value={content.objectives} onChange={(value) => updateList("objectives", value)} />
          <ListField label="Nội dung chi tiết / ý chính" value={content.mainPoints} onChange={(value) => updateList("mainPoints", value)} />
        </div>

        <div className="admin-lesson-detail-column">
          <div className="admin-content-section-title">
            <strong>Tương tác, củng cố và kiểm tra</strong>
            <span>Dùng để quản lý cấu trúc/nội dung của bài học trước khi đi vào 6 màn cụ thể.</span>
          </div>
          <ListField label="Hình thức tương tác" value={content.interactionTypes} onChange={(value) => updateList("interactionTypes", value)} />
          <ListField label="Điểm củng cố" value={content.reinforcementPoints} onChange={(value) => updateList("reinforcementPoints", value)} />
          <div className="admin-content-grid two">
            <Field label="Số câu cuối bài">
              <Input
                min={0}
                type="number"
                value={content.quiz.questionCount}
                onChange={(event) =>
                  onContentChange((current) => ({ ...current, quiz: { ...current.quiz, questionCount: Number(event.target.value) } }))
                }
              />
            </Field>
            <Field label="Điểm đạt (%)">
              <Input
                max={100}
                min={0}
                type="number"
                value={content.quiz.passScore}
                onChange={(event) =>
                  onContentChange((current) => ({ ...current, quiz: { ...current.quiz, passScore: Number(event.target.value) } }))
                }
              />
            </Field>
          </div>
          <Field label="Mô tả kiểm tra cuối bài">
            <Textarea
              value={content.quiz.description}
              onChange={(event) => onContentChange((current) => ({ ...current, quiz: { ...current.quiz, description: event.target.value } }))}
            />
          </Field>
          <div className="admin-content-grid two">
            <Field label="Tiêu đề hoàn thành">
              <Input
                value={content.completion.title}
                onChange={(event) => onContentChange((current) => ({ ...current, completion: { ...current.completion, title: event.target.value } }))}
              />
            </Field>
            <Field label="Nút tiếp theo">
              <Input
                value={content.completion.nextActionLabel}
                onChange={(event) =>
                  onContentChange((current) => ({ ...current, completion: { ...current.completion, nextActionLabel: event.target.value } }))
                }
              />
            </Field>
          </div>
          <Field label="Nội dung hoàn thành">
            <Textarea
              value={content.completion.message}
              onChange={(event) => onContentChange((current) => ({ ...current, completion: { ...current.completion, message: event.target.value } }))}
            />
          </Field>
        </div>
      </div>
    </section>
  );
}
