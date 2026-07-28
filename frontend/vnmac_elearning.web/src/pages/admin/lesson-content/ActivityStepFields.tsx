import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ActivityDragDropEditor } from "./ActivityDragDropEditor";
import { Field } from "./FormFields";
import type { StepFieldsProps } from "./StepFieldTypes";

export function ActivityStepFields({ step, onStepChange }: StepFieldsProps) {
  const update = (patch: Parameters<typeof onStepChange>[1]) => onStepChange(step.key, patch);
  return (
    <div className="admin-step-form">
      <div className="admin-content-section-title">
        <strong>Cấu trúc kéo - thả</strong>
        <span>Mỗi câu hỏi là một vùng thả. Các đáp án nằm trong câu hỏi đó được xem là đáp án đúng và có thể kèm ảnh.</span>
      </div>
      <div className="admin-content-grid two">
        <Field label="Tiêu đề màn hình">
          <Input value={step.title} onChange={(event) => update({ title: event.target.value })} placeholder="Phân loại" />
        </Field>
        <Field label="Mô tả ngắn">
          <Input value={step.subtitle} onChange={(event) => update({ subtitle: event.target.value })} />
        </Field>
      </div>
      <Field label="Hướng dẫn thao tác">
        <Textarea value={step.instruction} onChange={(event) => update({ instruction: event.target.value })} />
      </Field>
      <div className="admin-content-grid two">
        <Field label="Cảnh báo ngắn">
          <Input value={step.alertText} onChange={(event) => update({ alertText: event.target.value })} />
        </Field>
        <Field label="Phản hồi sau khi làm đúng">
          <Input value={step.feedback} onChange={(event) => update({ feedback: event.target.value })} />
        </Field>
      </div>
      <div className="admin-content-grid two">
        <Field label="Nút kiểm tra">
          <Input value={step.primaryActionLabel} onChange={(event) => update({ primaryActionLabel: event.target.value })} />
        </Field>
        <Field label="Nút tiếp tục">
          <Input value={step.secondaryActionLabel} onChange={(event) => update({ secondaryActionLabel: event.target.value })} />
        </Field>
      </div>
      <ActivityDragDropEditor step={step} onChange={(dragQuestions) => update({ dragQuestions })} />
    </div>
  );
}
