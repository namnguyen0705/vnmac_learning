import { Input } from "@/components/ui/input";
import { Field } from "./FormFields";
import { VideoUploadPanel } from "./MediaPanels";
import type { StepFieldsProps } from "./StepFieldTypes";

export function VideoStepFields({ step, onStepChange, onUpload, uploadingKey }: StepFieldsProps) {
  const update = (patch: Parameters<typeof onStepChange>[1]) => onStepChange(step.key, patch);

  return (
        <div className="admin-step-form">
          <div className="admin-content-section-title">
            <strong>Video bài học</strong>
            <span>Bên trái của màn learner chỉ cần một video chính. Video upload trực tiếp sẽ được lưu trong DB ở bước này.</span>
          </div>
          <div className="admin-content-grid two">
            <Field label="Tiêu đề màn hình">
              <Input value={step.title} onChange={(event) => update({ title: event.target.value })} placeholder="Xem video" />
            </Field>
            <Field label="Mô tả ngắn cho video">
              <Input value={step.mediaAlt} onChange={(event) => update({ mediaAlt: event.target.value })} />
            </Field>
          </div>
          <VideoUploadPanel onStepChange={onStepChange} onUpload={onUpload} step={step} uploadingKey={uploadingKey} />
        </div>
      );
}
