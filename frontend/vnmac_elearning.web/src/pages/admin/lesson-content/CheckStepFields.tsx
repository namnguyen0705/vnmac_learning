import { Input } from "@/components/ui/input";
import { MessageSquareText } from "lucide-react";
import { CheckQuestionManager } from "./CheckQuestionManager";
import { Field } from "./FormFields";
import type { StepFieldsProps } from "./StepFieldTypes";

export function CheckStepFields({ content, step, onContentChange, onStepChange }: StepFieldsProps) {
  const update = (patch: Parameters<typeof onStepChange>[1]) => onStepChange(step.key, patch);
  return (
        <div className="admin-step-form">
          <div className="admin-content-section-title">
            <strong>Câu hỏi kiểm tra cuối bài</strong>
            <span>Bộ câu hỏi này thuộc riêng bài học hiện tại, lưu trong LessonContent và không nằm trong câu hỏi chung/cuối khóa.</span>
          </div>
          <div className="admin-content-grid two">
            <Field label="Tiêu đề màn hình">
              <Input value={step.title} onChange={(event) => update({ title: event.target.value })} placeholder="Kiểm tra cuối bài" />
            </Field>
            <Field label="Dòng phụ">
              <Input value={step.subtitle} onChange={(event) => update({ subtitle: event.target.value })} placeholder="Chọn câu trả lời đúng nhất." />
            </Field>
          </div>
          <div className="admin-content-grid two">
            <Field label="Điều kiện đạt (%)">
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
            <Field label="Mô tả kiểm tra">
              <Input
                value={content.quiz.description}
                onChange={(event) => onContentChange((current) => ({ ...current, quiz: { ...current.quiz, description: event.target.value } }))}
                placeholder="Đạt 100% để hoàn thành bài học"
              />
            </Field>
          </div>
          <CheckQuestionManager
            step={step}
            onChange={(questions) => {
              update({ questions });
              onContentChange((current) => ({ ...current, quiz: { ...current.quiz, questionCount: questions.length } }));
            }}
          />
          <div className="admin-content-note">
            <MessageSquareText className="size-4" />
            <span>Bộ câu hỏi này chỉ phục vụ Bước 5 của bài học. Trang câu hỏi chung sẽ chỉ quản lý câu hỏi của quiz/cuối khóa.</span>
          </div>
        </div>
      );
}
