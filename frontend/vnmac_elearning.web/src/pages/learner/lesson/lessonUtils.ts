import type { CourseLesson } from "../../../shared/types/api";
import { LESSON_STEPS, STEP_KEYS, type LessonStepKey } from "./lessonFlow";

export function isLessonStep(value: string): value is LessonStepKey {
  return STEP_KEYS.has(value);
}

export function createStepReadiness(): Record<LessonStepKey, boolean> {
  return {
    intro: false,
    video: false,
    classify: false,
    reinforce: false,
    check: false,
    complete: true,
  };
}

export function getStepIndex(step?: string | null) {
  const index = LESSON_STEPS.findIndex((item) => item.key === step);
  return index >= 0 ? index : 0;
}

export function formatVideoTime(value: number) {
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const minutes = Math.floor(safeValue / 60);
  const seconds = safeValue % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getLessonNumber(lesson: CourseLesson) {
  const match = lesson.title.match(/Bài\s+(\d+(?:\.\d+)?)/i);
  return match?.[1] ?? `${lesson.order}`;
}

export function trimLessonTitle(title: string) {
  return title.replace(/^Bài\s+\d+(?:\.\d+)?\s*-\s*/i, "").trim();
}
