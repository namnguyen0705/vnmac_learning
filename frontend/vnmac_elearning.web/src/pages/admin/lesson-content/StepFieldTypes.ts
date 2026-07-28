import type { Dispatch, SetStateAction } from "react";
import type { AdminLessonCatalogRow, LessonContent, LessonContentStep } from "@/shared/types/api";
import type { StepPatch, UploadSlot } from "./contentModel";

export type StepFieldsProps = {
  content: LessonContent;
  lesson?: AdminLessonCatalogRow;
  step: LessonContentStep;
  onContentChange: Dispatch<SetStateAction<LessonContent>>;
  onStepChange: (stepKey: string, patch: StepPatch) => void;
  onUpload: (stepKey: string, slot: UploadSlot, file: File) => Promise<void>;
  uploadingKey: string | null;
};
