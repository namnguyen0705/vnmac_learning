import { Hand, Megaphone, ShieldAlert, Users } from "lucide-react";

export const LESSON_STEPS = [
  { key: "intro", label: "Giới thiệu", progress: 0 },
  { key: "video", label: "Video", progress: 25 },
  { key: "classify", label: "Kéo thả", progress: 70 },
  { key: "reinforce", label: "Củng cố", progress: 70 },
  { key: "check", label: "Kiểm tra", progress: 90 },
  { key: "complete", label: "Hoàn thành", progress: 100 },
] as const;

export type LessonStepKey = (typeof LESSON_STEPS)[number]["key"];

export const STEP_KEYS = new Set<string>(LESSON_STEPS.map((step) => step.key));
export const AUTO_UNLOCK_DELAY_MS = 10000;
export const LAST_STEP_INDEX = LESSON_STEPS.length - 1;

export const DEFAULT_OBJECTIVES = [
  "Nhận biết một số loại vật nổ thường gặp",
  "Phân biệt vật nguy hiểm, không chắc và an toàn",
  "Biết cách xử lý đúng khi gặp vật lạ",
];

export const SAFETY_RULES = [
  { title: "Không chạm", detail: "vào vật lạ.", icon: Hand, tone: "red" },
  { title: "Tránh xa", detail: "ngay lập tức.", icon: ShieldAlert, tone: "amber" },
  { title: "Báo ngay", detail: "cho người có trách nhiệm.", icon: Megaphone, tone: "green" },
  { title: "Bảo vệ", detail: "bản thân và cộng đồng.", icon: Users, tone: "blue" },
] as const;
