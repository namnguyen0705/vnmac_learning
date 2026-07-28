import type { LessonContentStep } from "@/shared/types/api";
import { CheckCircle2, ClipboardCheck, Film, Layers3, ListChecks, ShieldCheck } from "lucide-react";

export type StepKey = "intro" | "video" | "activity" | "reinforce" | "check" | "complete";
export type ContentTabKey = "details" | StepKey;
export type StepPatch = Partial<LessonContentStep>;
export type UploadSlot = "image" | "video" | "poster" | "caption" | "objective";

export const stepIcons: Record<StepKey, typeof Layers3> = {
  intro: Layers3,
  video: Film,
  activity: ListChecks,
  reinforce: ShieldCheck,
  check: ClipboardCheck,
  complete: CheckCircle2,
};

export const emptyStep: LessonContentStep = {
  key: "",
  order: 1,
  label: "",
  screenType: "",
  description: "",
  progressPercent: 0,
  isRequired: true,
  title: "",
  subtitle: "",
  body: "",
  instruction: "",
  alertText: "",
  primaryActionLabel: "",
  secondaryActionLabel: "",
  mediaUrl: "",
  mediaType: "",
  posterUrl: "",
  captionUrl: "",
  mediaAlt: "",
  objectiveImageUrl: "",
  objectiveImageAlt: "",
  explanationTitle: "",
  explanation: "",
  points: [],
  tips: [],
  items: [],
  targets: [],
  options: [],
  dragQuestions: [],
  questions: [],
  feedback: "",
};
