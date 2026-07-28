import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { uploadAdminMedia } from "@/shared/api/admin";
import { Field, RichTextEditor } from "./FormFields";
import type { StepFieldsProps } from "./StepFieldTypes";

export function IntroStepFields({ content, step, onContentChange, onStepChange }: StepFieldsProps) {
  const update = (patch: Parameters<typeof onStepChange>[1]) => onStepChange(step.key, patch);
  return (
    <div className="admin-step-form">
      <div className="admin-content-section-title">
        <strong>Nội dung nhận diện</strong>
        <span>Nhập nội dung bên trái của màn giới thiệu bằng rich text editor.</span>
      </div>
      <RichTextEditor
        value={step.body}
        onChange={(body) => update({ body })}
        onUploadImage={async (file) => {
          const media = await uploadAdminMedia(file, "image");
          return media.url;
        }}
      />
      <div className="admin-content-grid two">
        <Field label="Thông điệp chính">
          <Input
            value={step.tips[0] ?? ""}
            onChange={(event) => update({ tips: event.target.value.trim() ? [event.target.value] : [] })}
            placeholder="Nhận biết - Tránh xa - Báo ngay"
          />
        </Field>
        <Field label="Diễn giải thông điệp">
          <Textarea
            value={step.alertText}
            onChange={(event) => update({ alertText: event.target.value })}
            placeholder="Nhận diện đúng và xử lý an toàn là rất quan trọng..."
          />
        </Field>
      </div>
      <Field label="Tóm tắt chung của bài học">
        <Textarea value={content.summary} onChange={(event) => onContentChange((current) => ({ ...current, summary: event.target.value }))} />
      </Field>
    </div>
  );
}
