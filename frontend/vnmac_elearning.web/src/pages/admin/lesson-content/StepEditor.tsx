import type { Dispatch, SetStateAction } from "react";
import type { AdminLessonCatalogRow, LessonContent, LessonContentStep } from "@/shared/types/api";
import type { StepPatch, UploadSlot } from "./contentModel";
import { StepContentFields } from "./StepContentFields";
import { MediaPanel, VideoRightPanel } from "./MediaPanels";
import { ActivityRightPanel, ExplanationPanel, ReinforceRightPanel } from "./RightPanels";

export function StepEditor({
  content,
  lesson,
  step,
  uploadingKey,
  onContentChange,
  onStepChange,
  onUpload,
}: {
  content: LessonContent;
  lesson?: AdminLessonCatalogRow;
  step: LessonContentStep;
  uploadingKey: string | null;
  onContentChange: Dispatch<SetStateAction<LessonContent>>;
  onStepChange: (stepKey: string, patch: StepPatch) => void;
  onUpload: (stepKey: string, slot: UploadSlot, file: File) => Promise<void>;
}) {
  return (
    <div className="admin-step-editor">
      <div className="admin-step-layout">
        <section className="admin-step-panel admin-step-left-panel">
          <div className="admin-step-panel-head">
            <span>Bước {step.order}</span>
            <h2>{step.label}</h2>
            <p>{step.screenType}</p>
          </div>
          <StepContentFields
            content={content}
            lesson={lesson}
            onContentChange={onContentChange}
            onStepChange={onStepChange}
            onUpload={onUpload}
            step={step}
            uploadingKey={uploadingKey}
          />
        </section>

        <aside className="admin-step-panel admin-step-right-panel">
          {step.key === "video" ? (
            <VideoRightPanel onStepChange={onStepChange} onUpload={onUpload} step={step} uploadingKey={uploadingKey} />
          ) : step.key === "activity" ? (
            <ActivityRightPanel onStepChange={onStepChange} onUpload={onUpload} step={step} uploadingKey={uploadingKey} />
          ) : step.key === "reinforce" ? (
            <ReinforceRightPanel onStepChange={onStepChange} onUpload={onUpload} step={step} uploadingKey={uploadingKey} />
          ) : (
            <>
              <MediaPanel onStepChange={onStepChange} onUpload={onUpload} step={step} uploadingKey={uploadingKey} />
              <ExplanationPanel onStepChange={onStepChange} step={step} />
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
