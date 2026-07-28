import { uploadAdminMedia } from "@/shared/api/admin";
import { RichTextEditor } from "./FormFields";
import type { StepFieldsProps } from "./StepFieldTypes";

export function ReinforceStepFields({ step, onStepChange }: StepFieldsProps) {
  const update = (patch: Parameters<typeof onStepChange>[1]) => onStepChange(step.key, patch);
  return (
        <div className="admin-step-form">
          <div className="admin-content-section-title">
            <strong>Nội dung củng cố bên trái</strong>
            <span>Admin tự thiết kế toàn bộ phần bên trái bằng editor này, có thể chèn tiêu đề, checklist, màu chữ, bảng và ảnh minh họa.</span>
          </div>
          <RichTextEditor
            value={step.body}
            onChange={(body) => update({ body })}
            onUploadImage={async (file) => {
              const media = await uploadAdminMedia(file, "image");
              return media.url;
            }}
          />
        </div>
      );
}
