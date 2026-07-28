import type { AdminLessonCatalogRow, LessonContent, LessonContentCheckQuestion, LessonContentStep } from "@/shared/types/api";
import { blueprintByKey, officialStepBlueprints } from "./contentBlueprints";
import { createActivityAnswer, createActivityQuestion, createCheckOption, createCheckQuestion, createId } from "./contentFactories";
import { emptyStep } from "./contentTypes";

export function normalizeDragQuestionsForEditor(step: Pick<LessonContentStep, "dragQuestions" | "targets" | "items">, fallback?: LessonContentStep) {
  const source = step.dragQuestions?.length ? step.dragQuestions : fallback?.dragQuestions;
  if (source?.length) {
    return source.map((question, questionIndex) => ({
      ...question,
      id: question.id || createId("question"),
      order: question.order || questionIndex + 1,
      tone: question.tone || "blue",
      answers: (question.answers?.length ? question.answers : [createActivityAnswer(1)]).map((answer, answerIndex) => ({
        ...answer,
        id: answer.id || createId("answer"),
        order: answer.order || answerIndex + 1,
      })),
    }));
  }

  const targets = step.targets?.length ? step.targets : fallback?.targets ?? [];
  const items = step.items?.length ? step.items : fallback?.items ?? [];
  if (!targets.length) {
    return [createActivityQuestion(1)];
  }

  return targets.map((target, index) => ({
    id: createId("question"),
    order: index + 1,
    prompt: target,
    description: "",
    tone: ["red", "amber", "green"][index] ?? "blue",
    imageUrl: "",
    imageAlt: "",
    answers: items
      .filter((_, itemIndex) => itemIndex % targets.length === index)
      .map((item, itemIndex) => ({
        ...createActivityAnswer(itemIndex + 1),
        label: item,
      })),
  }));
}

export function normalizeCheckQuestionsForEditor(
  step: Partial<LessonContentStep>,
  fallback?: LessonContentStep,
  hasExplicitQuestions = false,
): LessonContentCheckQuestion[] {
  const source = hasExplicitQuestions ? step.questions ?? [] : step.questions?.length ? step.questions : fallback?.questions;
  if (source?.length) {
    return source.map((question, questionIndex) => {
      const options = (question.options?.length ? question.options : [createCheckOption(1), createCheckOption(2, { isCorrect: false })]).map(
        (option, optionIndex) => ({
          ...option,
          id: option.id || createId("option"),
          code: option.code || String.fromCharCode(65 + optionIndex),
          order: option.order || optionIndex + 1,
        }),
      );

      if (options.length > 0 && !options.some((option) => option.isCorrect)) {
        options[0] = { ...options[0], isCorrect: true };
      }

      return {
        ...question,
        id: question.id || createId("check"),
        order: question.order || questionIndex + 1,
        imageUrl: question.imageUrl ?? "",
        imageAlt: question.imageAlt ?? "",
        explanation: question.explanation ?? "",
        feedback: question.feedback ?? "",
        options,
      };
    });
  }

  if (hasExplicitQuestions && step.key !== "check") {
    return [];
  }

  const fallbackOptions = step.options?.length ? step.options : fallback?.options ?? [];
  if (fallbackOptions.length) {
    return [
      {
        ...createCheckQuestion(1),
        prompt: step.body || fallback?.body || "",
        imageUrl: step.mediaUrl || fallback?.mediaUrl || "",
        imageAlt: step.mediaAlt || fallback?.mediaAlt || "",
        feedback: step.feedback || fallback?.feedback || "",
        options: fallbackOptions.map((label, index) =>
          createCheckOption(index + 1, {
            label,
            isCorrect: index === fallbackOptions.length - 1,
          }),
        ),
      },
    ];
  }

  return [createCheckQuestion(1)];
}

function normalizeStep(step: Partial<LessonContentStep> | undefined, fallback: LessonContentStep, index: number): LessonContentStep {
  const hasExplicitQuestions = Boolean(step && "questions" in step);
  const merged = { ...fallback, ...(step ?? {}) };
  return {
    ...emptyStep,
    ...merged,
    key: merged.key?.trim() || fallback.key || `step-${index + 1}`,
    order: merged.order > 0 ? merged.order : fallback.order || index + 1,
    label: merged.label?.trim() || fallback.label,
    screenType: merged.screenType?.trim() || fallback.screenType,
    description: merged.description?.trim() || fallback.description,
    progressPercent: Math.max(0, Math.min(100, merged.progressPercent ?? fallback.progressPercent)),
    title: merged.title?.trim() || fallback.title,
    subtitle: merged.subtitle?.trim() || fallback.subtitle,
    body: merged.body ?? fallback.body,
    instruction: merged.instruction ?? fallback.instruction,
    alertText: merged.alertText ?? fallback.alertText,
    primaryActionLabel: merged.primaryActionLabel?.trim() || fallback.primaryActionLabel,
    secondaryActionLabel: merged.secondaryActionLabel?.trim() || fallback.secondaryActionLabel,
    mediaUrl: merged.mediaUrl ?? "",
    mediaType: merged.mediaType?.trim() || fallback.mediaType,
    posterUrl: merged.posterUrl ?? "",
    captionUrl: merged.captionUrl ?? "",
    mediaAlt: merged.mediaAlt?.trim() || fallback.mediaAlt,
    objectiveImageUrl: merged.objectiveImageUrl ?? "",
    objectiveImageAlt: merged.objectiveImageAlt?.trim() || fallback.objectiveImageAlt,
    explanationTitle: merged.explanationTitle?.trim() || fallback.explanationTitle,
    explanation: merged.explanation ?? fallback.explanation,
    points: merged.points?.length ? merged.points : fallback.points,
    tips: merged.tips?.length ? merged.tips : fallback.tips,
    items: merged.items?.length ? merged.items : fallback.items,
    targets: merged.targets?.length ? merged.targets : fallback.targets,
    options: merged.options?.length ? merged.options : fallback.options,
    dragQuestions: normalizeDragQuestionsForEditor(merged, fallback),
    questions: normalizeCheckQuestionsForEditor(merged, fallback, hasExplicitQuestions),
    feedback: merged.feedback ?? fallback.feedback,
  };
}

export function normalizeSteps(steps: LessonContentStep[] | undefined) {
  const result = new Map<string, LessonContentStep>();

  (steps?.length ? steps : officialStepBlueprints).forEach((step, index) => {
    const fallback = blueprintByKey.get(step.key) ?? officialStepBlueprints[index] ?? { ...emptyStep, key: `step-${index + 1}` };
    const normalized = normalizeStep(step, fallback, index);
    result.set(normalized.key, normalized);
  });

  officialStepBlueprints.forEach((fallback, index) => {
    if (!result.has(fallback.key)) {
      result.set(fallback.key, normalizeStep(undefined, fallback, index));
    }
  });

  return [...result.values()].sort((left, right) => left.order - right.order);
}

export function createEmptyContent(lesson?: AdminLessonCatalogRow): LessonContent {
  return {
    summary: lesson?.description ?? "",
    coreMessage: "",
    mainContentType: "Video hoặc slide",
    steps: normalizeSteps(undefined),
    objectives: [],
    mainPoints: [],
    interactionTypes: [],
    activities: [],
    reinforcementPoints: [],
    quiz: {
      questionCount: 5,
      passScore: 100,
      description: "",
    },
    completion: {
      title: lesson ? `Hoàn thành ${lesson.title}` : "Hoàn thành bài học",
      message: "",
      nextActionLabel: "Tiếp tục",
    },
  };
}
