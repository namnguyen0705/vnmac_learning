import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Film, ImagePlus } from "lucide-react";
import type { LessonContentStep } from "@/shared/types/api";
import type { StepPatch, UploadSlot } from "./contentModel";
import { Field, ListField, UploadBox } from "./FormFields";

export function VideoUploadPanel({
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
  const videoUploading = uploadingKey === `${step.key}-video`;

  return (
    <div className="admin-video-upload-panel">
      <div className="admin-media-preview admin-video-only-preview">
        {step.mediaUrl ? (
          <video controls src={step.mediaUrl}>
            {step.captionUrl ? <track default kind="captions" src={step.captionUrl} srcLang="vi" /> : null}
          </video>
        ) : (
          <div>
            <Film className="size-10" />
            <span>Chưa có video bài học</span>
          </div>
        )}
      </div>
      <UploadBox
        accept="video/mp4,video/webm,video/quicktime,video/x-m4v"
        disabled={Boolean(uploadingKey)}
        label="Upload video"
        loading={videoUploading}
        onChange={(file) => onUpload(step.key, "video", file)}
      />
      <Field label="URL video">
        <Input value={step.mediaUrl} onChange={(event) => onStepChange(step.key, { mediaUrl: event.target.value, mediaType: "video" })} />
      </Field>
    </div>
  );
}

export function VideoRightPanel({
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
  const objectiveUploading = uploadingKey === `${step.key}-objective`;
  const importantMessage = step.tips[0] ?? "";

  return (
    <div className="admin-step-explanation admin-video-right-editor">
      <div className="admin-content-section-title">
        <strong>Nội dung bên phải</strong>
        <span>Có thể dùng một ảnh minh họa hoặc nhập danh sách ý chính để learner hiển thị cạnh video.</span>
      </div>

      <Field label="Tiêu đề khối bên phải">
        <Input value={step.explanationTitle} onChange={(event) => onStepChange(step.key, { explanationTitle: event.target.value })} />
      </Field>

      <div className="admin-video-right-image-preview">
        {step.objectiveImageUrl ? (
          <img alt={step.objectiveImageAlt || step.explanationTitle || step.label} src={step.objectiveImageUrl} />
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
        loading={objectiveUploading}
        onChange={(file) => onUpload(step.key, "objective", file)}
      />
      <div className="admin-content-grid two">
        <Field label="URL ảnh bên phải">
          <Input value={step.objectiveImageUrl} onChange={(event) => onStepChange(step.key, { objectiveImageUrl: event.target.value })} />
        </Field>
        <Field label="Mô tả ảnh">
          <Input value={step.objectiveImageAlt} onChange={(event) => onStepChange(step.key, { objectiveImageAlt: event.target.value })} />
        </Field>
      </div>

      <ListField label="Danh sách nội dung chính bên phải" value={step.points} onChange={(points) => onStepChange(step.key, { points })} />

      <Field label="Thông điệp quan trọng">
        <Input
          value={importantMessage}
          onChange={(event) => onStepChange(step.key, { tips: event.target.value.trim() ? [event.target.value] : [] })}
          placeholder="Nhận biết - Tránh xa - Báo ngay"
        />
      </Field>

      <Field label="Cảnh báo / ghi chú vàng">
        <Textarea value={step.alertText} onChange={(event) => onStepChange(step.key, { alertText: event.target.value })} />
      </Field>
    </div>
  );
}

export function MediaPanel({
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
  const isVideoStep = step.key === "video" || step.mediaType === "video";
  const mainUploading = uploadingKey === `${step.key}-${isVideoStep ? "video" : "image"}`;
  const posterUploading = uploadingKey === `${step.key}-poster`;
  const captionUploading = uploadingKey === `${step.key}-caption`;

  return (
    <div className="admin-step-media">
      <div className="admin-content-section-title">
        <strong>{isVideoStep ? "Video / poster" : "Ảnh minh họa"}</strong>
        <span>File được upload trực tiếp vào API và lưu dưới `wwwroot/uploads`.</span>
      </div>

      <div className="admin-media-preview">
        {isVideoStep && step.mediaUrl ? (
          <video controls poster={step.posterUrl || undefined} src={step.mediaUrl}>
            {step.captionUrl ? <track default kind="captions" src={step.captionUrl} srcLang="vi" /> : null}
          </video>
        ) : null}
        {!isVideoStep && step.mediaUrl ? <img alt={step.mediaAlt || step.title} src={step.mediaUrl} /> : null}
        {!step.mediaUrl ? (
          <div>
            <ImagePlus className="size-10" />
            <span>Chưa có file media</span>
          </div>
        ) : null}
      </div>

      <div className="admin-upload-grid">
        <UploadBox
          accept={isVideoStep ? "video/mp4,video/webm,video/quicktime,video/x-m4v" : "image/png,image/jpeg,image/webp"}
          disabled={Boolean(uploadingKey)}
          label={isVideoStep ? "Upload video" : "Upload ảnh"}
          loading={mainUploading}
          onChange={(file) => onUpload(step.key, isVideoStep ? "video" : "image", file)}
        />
        {isVideoStep ? (
          <>
            <UploadBox
              accept="image/png,image/jpeg,image/webp"
              disabled={Boolean(uploadingKey)}
              label="Upload poster"
              loading={posterUploading}
              onChange={(file) => onUpload(step.key, "poster", file)}
            />
            <UploadBox
              accept=".vtt,.srt,text/vtt"
              disabled={Boolean(uploadingKey)}
              label="Upload phụ đề"
              loading={captionUploading}
              onChange={(file) => onUpload(step.key, "caption", file)}
            />
          </>
        ) : null}
      </div>

      <Field label={isVideoStep ? "URL video" : "URL ảnh"}>
        <Input value={step.mediaUrl} onChange={(event) => onStepChange(step.key, { mediaUrl: event.target.value, mediaType: isVideoStep ? "video" : "image" })} />
      </Field>
      {isVideoStep ? (
        <div className="admin-content-grid two">
          <Field label="URL poster">
            <Input value={step.posterUrl} onChange={(event) => onStepChange(step.key, { posterUrl: event.target.value })} />
          </Field>
          <Field label="URL phụ đề">
            <Input value={step.captionUrl} onChange={(event) => onStepChange(step.key, { captionUrl: event.target.value })} />
          </Field>
        </div>
      ) : null}
      <Field label="Mô tả ảnh/video">
        <Input value={step.mediaAlt} onChange={(event) => onStepChange(step.key, { mediaAlt: event.target.value })} />
      </Field>
    </div>
  );
}

export function ObjectiveImageUploader({
  imageAlt,
  imageUrl,
  loading,
  onAltChange,
  onUrlChange,
  onUpload,
}: {
  imageAlt: string;
  imageUrl: string;
  loading: boolean;
  onAltChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="admin-objective-upload">
      <div className="admin-content-section-title">
        <strong>Ảnh mục tiêu bài học</strong>
        <span>Upload ảnh riêng cho khối mục tiêu ở bên phải màn giới thiệu.</span>
      </div>
      <div className="admin-objective-preview">
        {imageUrl ? (
          <img alt={imageAlt || "Ảnh mục tiêu bài học"} src={imageUrl} />
        ) : (
          <div>
            <ImagePlus className="size-10" />
            <span>Chưa có ảnh mục tiêu</span>
          </div>
        )}
      </div>
      <UploadBox
        accept="image/png,image/jpeg,image/webp"
        disabled={loading}
        label="Upload ảnh mục tiêu"
        loading={loading}
        onChange={onUpload}
      />
      <div className="admin-content-grid two">
        <Field label="URL ảnh mục tiêu">
          <Input value={imageUrl} onChange={(event) => onUrlChange(event.target.value)} />
        </Field>
        <Field label="Mô tả ảnh mục tiêu">
          <Input value={imageAlt} onChange={(event) => onAltChange(event.target.value)} />
        </Field>
      </div>
    </div>
  );
}
