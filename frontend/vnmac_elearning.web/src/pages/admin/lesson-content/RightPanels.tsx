import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus } from "lucide-react";
import type { LessonContentStep } from "@/shared/types/api";
import type { StepPatch, UploadSlot } from "./contentModel";
import { Field, ListField, UploadBox } from "./FormFields";
import { MediaPanel, ObjectiveImageUploader } from "./MediaPanels";

export function ActivityRightPanel({
  step,
  uploadingKey,
  onStepChange,
  onUpload,
}: {
  step: LessonContentStep;
  uploadingKey: string | null;
  onStepChange: (stepKey: string, patch: StepPatch) => void;
  onUpload: (stepKey: string, slot: UploadSlot, file: File) => Promise<void>;
}) {
  const imageUploading = uploadingKey === `${step.key}-objective`;

  return (
    <div className="admin-step-explanation admin-activity-side-panel">
      <div className="admin-content-section-title">
        <strong>Ảnh bên phải</strong>
        <span>Ảnh này sẽ hiển thị ở cột phải của màn Phân loại phía learner.</span>
      </div>
      <div className="admin-video-right-image-preview">
        {step.objectiveImageUrl ? (
          <img alt={step.objectiveImageAlt || step.title || "Ảnh phân loại"} src={step.objectiveImageUrl} />
        ) : (
          <div>
            <ImagePlus className="size-10" />
            <span>Chưa có ảnh bên phải</span>
          </div>
        )}
      </div>
      <UploadBox
        accept="image/png,image/jpeg,image/webp"
        disabled={Boolean(uploadingKey)}
        label="Upload ảnh bên phải"
        loading={imageUploading}
        onChange={(file) => onUpload(step.key, "objective", file)}
      />
      <Field label="URL ảnh bên phải">
        <Input value={step.objectiveImageUrl} onChange={(event) => onStepChange(step.key, { objectiveImageUrl: event.target.value })} />
      </Field>
      <Field label="Mô tả ảnh">
        <Input value={step.objectiveImageAlt} onChange={(event) => onStepChange(step.key, { objectiveImageAlt: event.target.value })} />
      </Field>
    </div>
  );
}

export function ReinforceRightPanel({
  step,
  uploadingKey,
  onStepChange,
  onUpload,
}: {
  step: LessonContentStep;
  uploadingKey: string | null;
  onStepChange: (stepKey: string, patch: StepPatch) => void;
  onUpload: (stepKey: string, slot: UploadSlot, file: File) => Promise<void>;
}) {
  const imageUploading = uploadingKey === `${step.key}-objective`;

  return (
    <div className="admin-step-explanation admin-reinforce-side-panel">
      <div className="admin-content-section-title">
        <strong>Ảnh và mẹo nhỏ bên phải</strong>
        <span>Ảnh này dùng cho khu vực mẹo nhỏ ở cột phải. Danh sách mẹo và nội dung hoàn thành sẽ được learner dùng để hiển thị Bước 4.</span>
      </div>
      <div className="admin-video-right-image-preview">
        {step.objectiveImageUrl ? (
          <img alt={step.objectiveImageAlt || step.title || "Ảnh mẹo nhỏ"} src={step.objectiveImageUrl} />
        ) : (
          <div>
            <ImagePlus className="size-10" />
            <span>Chưa có ảnh mẹo nhỏ</span>
          </div>
        )}
      </div>
      <UploadBox
        accept="image/png,image/jpeg,image/webp"
        disabled={Boolean(uploadingKey)}
        label="Upload ảnh mẹo nhỏ"
        loading={imageUploading}
        onChange={(file) => onUpload(step.key, "objective", file)}
      />
      <Field label="URL ảnh mẹo nhỏ">
        <Input value={step.objectiveImageUrl} onChange={(event) => onStepChange(step.key, { objectiveImageUrl: event.target.value })} />
      </Field>
      <Field label="Mô tả ảnh">
        <Input value={step.objectiveImageAlt} onChange={(event) => onStepChange(step.key, { objectiveImageAlt: event.target.value })} />
      </Field>
      <ListField label="Mẹo nhỏ" value={step.tips} onChange={(tips) => onStepChange(step.key, { tips })} />
      <Field label="Bạn đã hoàn thành">
        <Textarea
          value={step.feedback}
          onChange={(event) => onStepChange(step.key, { feedback: event.target.value })}
          placeholder="Bạn đã hoàn thành phần phân loại. Bạn đã hiểu cách nhận diện vật nguy hiểm..."
        />
      </Field>
    </div>
  );
}

export function ExplanationPanel({ step, onStepChange }: { step: LessonContentStep; onStepChange: (stepKey: string, patch: StepPatch) => void }) {
  return (
    <div className="admin-step-explanation">
      <div className="admin-content-section-title">
        <strong>Diễn giải bên phải</strong>
        <span>Nội dung này tương ứng panel bên phải trên màn learner.</span>
      </div>
      <Field label="Tiêu đề diễn giải">
        <Input value={step.explanationTitle} onChange={(event) => onStepChange(step.key, { explanationTitle: event.target.value })} />
      </Field>
      <Field label="Nội dung diễn giải">
        <Textarea value={step.explanation} onChange={(event) => onStepChange(step.key, { explanation: event.target.value })} />
      </Field>
      <div className="admin-step-mini-preview">
        <strong>{step.explanationTitle || step.label}</strong>
        <p>{step.explanation || step.description}</p>
        {(step.points.length ? step.points : step.tips).slice(0, 5).map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}
