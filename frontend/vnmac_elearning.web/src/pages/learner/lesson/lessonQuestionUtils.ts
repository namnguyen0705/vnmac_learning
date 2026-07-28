import type { LearnerQuestionOptionPayload, LearnerQuestionPayload, LessonContentStep, QuestionSubmissionRequest } from "../../../shared/types/api";

export type LessonCheckOptionView = {
  code: string;
  label: string;
  isCorrect: boolean;
};

export type LessonCheckQuestionView = {
  id: string;
  prompt: string;
  imageUrl: string;
  imageAlt: string;
  explanation: string;
  feedback: string;
  options: LessonCheckOptionView[];
};

export function buildCheckQuestions(step?: LessonContentStep): LessonCheckQuestionView[] {
  const contentQuestions = step?.questions?.filter((question) => question.prompt.trim() || question.options.length) ?? [];
  if (contentQuestions.length) {
    return contentQuestions.map((question, questionIndex) => ({
      id: question.id || `check-${questionIndex + 1}`,
      prompt: question.prompt.trim() || `Câu ${questionIndex + 1}`,
      imageUrl: question.imageUrl || "",
      imageAlt: question.imageAlt || question.prompt || `Câu ${questionIndex + 1}`,
      explanation: question.explanation || "",
      feedback: question.feedback || "",
      options: question.options.length
        ? question.options.map((option, optionIndex) => ({
            code: option.code || String.fromCharCode(65 + optionIndex),
            label: option.label,
            isCorrect: option.isCorrect,
          }))
        : [],
    }));
  }

  const fallbackQuestion = buildFallbackQuestion();
  const fallbackCorrectOption = findLikelyCorrectOption(fallbackQuestion);
  return [
    {
      id: fallbackQuestion.id,
      prompt: fallbackQuestion.prompt,
      imageUrl: "",
      imageAlt: fallbackQuestion.prompt,
      explanation: "Hãy chọn hành động giữ khoảng cách an toàn và báo cho người có trách nhiệm.",
      feedback: "Đây là hành vi an toàn. Bạn cần tránh xa và báo ngay cho người có trách nhiệm.",
      options: fallbackQuestion.options.map((option) => ({
        code: option.code,
        label: option.label,
        isCorrect: option.code === fallbackCorrectOption?.code,
      })),
    },
  ];
}

export function buildFallbackQuestion(): LearnerQuestionPayload {
  return {
    id: "fallback-check",
    type: "MultipleChoice",
    order: 1,
    prompt: "Bạn thấy một vật kim loại lạ trong ruộng, bạn nên làm gì?",
    statement: null,
    mediaTitle: null,
    scenarioTitle: null,
    scenarioContext: null,
    options: [
      { code: "a", label: "Nhặt lên xem", order: 1 },
      { code: "b", label: "Mang về nhà", order: 2 },
      { code: "c", label: "Tránh xa và báo cho người lớn / người có trách nhiệm", order: 3 },
    ],
    hotspotTargets: [],
    dragItems: [],
    dragTargets: [],
  };
}

export function toLikelyCorrectSubmission(question: LearnerQuestionPayload): QuestionSubmissionRequest {
  const option = findLikelyCorrectOption(question);
  return {
    questionId: question.id,
    selectedOptionCodes: option ? [option.code] : [],
    selectedHotspotCodes: [],
    hotspotClicks: [],
    matches: [],
  };
}

export function findLikelyCorrectOption(question: LearnerQuestionPayload): LearnerQuestionOptionPayload | null {
  const options = question.options ?? [];
  if (!options.length) {
    return null;
  }

  const prompt = normalizeText(`${question.prompt} ${question.statement ?? ""}`);

  if (question.type === "TrueFalse") {
    const shouldBeFalse = [
      "ru nguoi",
      "nen cham",
      "thu xem",
      "cung mot cach noi",
      "noi cang dai",
      "co the cham",
    ].some((needle) => prompt.includes(needle));
    return options.find((option) => normalizeText(option.label).includes(shouldBeFalse ? "sai" : "dung")) ?? options[0];
  }

  if (prompt.includes("hanh vi nao") && prompt.includes("nguy hiem")) {
    return findOptionByNeedles(options, ["nhat", "cham", "thu"]) ?? options[0];
  }

  if (prompt.includes("vat nao")) {
    return findOptionByNeedles(options, ["dan", "phao", "bom", "min"]) ?? options[0];
  }

  return (
    findOptionByNeedles(options, [
      "tranh xa va bao",
      "bao nguoi",
      "khong cham",
      "tranh xa",
      "danh dau tu xa",
      "ngay khi",
      "noi ngan",
      "de nho",
      "don gian",
      "can bao ngay",
      "hieu nguoi",
      "phu hop",
      "gioi thieu",
      "dat cau hoi",
      "hoi va lang nghe",
      "giup nguoi dan",
    ]) ?? options[0]
  );
}

function findOptionByNeedles(options: LearnerQuestionOptionPayload[], needles: string[]) {
  return options.find((option) => {
    const label = normalizeText(option.label);
    return needles.some((needle) => label.includes(needle));
  });
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}
