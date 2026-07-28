import type { LessonContentCheckOption, LessonContentCheckQuestion, LessonContentDragAnswer, LessonContentDragQuestion } from "@/shared/types/api";

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createActivityAnswer(order: number): LessonContentDragAnswer {
  return {
    id: createId("answer"),
    order,
    label: "",
    description: "",
    imageUrl: "",
    imageAlt: "",
    feedback: "",
  };
}

export function createActivityQuestion(order: number): LessonContentDragQuestion {
  return {
    id: createId("question"),
    order,
    prompt: "",
    description: "",
    tone: "blue",
    imageUrl: "",
    imageAlt: "",
    answers: [createActivityAnswer(1)],
  };
}

export function createCheckOption(order: number, patch: Partial<LessonContentCheckOption> = {}): LessonContentCheckOption {
  return {
    id: createId("option"),
    code: String.fromCharCode(64 + order),
    order,
    label: "",
    isCorrect: order === 1,
    ...patch,
  };
}

export function createCheckQuestion(order: number): LessonContentCheckQuestion {
  return {
    id: createId("check"),
    order,
    prompt: "",
    imageUrl: "",
    imageAlt: "",
    explanation: "",
    feedback: "",
    options: [createCheckOption(1), createCheckOption(2, { isCorrect: false })],
  };
}
