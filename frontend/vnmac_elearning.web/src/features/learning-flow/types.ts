export interface FlowOption {
  code: string; label: string; audioUrl?: string; imageUrl?: string; requiresImage?: boolean;
  x: number; y: number; width: number; height: number;
  polygon?: { x: number; y: number }[];
}
export interface FlowItem {
  id: string; kind: "text" | "gallery" | "video" | "choice" | "classify" | "sort" | "hotspot" | "match" | "group";
  title: string; body: string; narration: string; imageUrl: string; requiresImage: boolean;
  actionLabel?: string; autoAdvance?: boolean;
  productionNotes?: string; isHidden?: boolean;
  audioUrl: string; requiresAudio?: boolean; videoUrl: string; captionUrl: string; durationSeconds: number; multiple: boolean;
  feedbackAudioUrl?: string; feedbackByCode?: Record<string, string>; leftItems?: FlowOption[]; groupId?: string; options: FlowOption[]; correctCodes?: string[]; reviewNote?: string; correctFeedback?: string; wrongFeedback?: string;
}
export interface FlowStep { isHidden?: boolean; id: string; title: string; policy: string; shuffleOnRetry: boolean; autoAdvance?: boolean; items: FlowItem[]; drawRules?: { kind: string; count: number }[]; timeLimitSeconds?: number; passCount?: number }
export interface FlowAnswer { correctCodes?: string[]; codes: string[]; correct: boolean; feedback: string }
export interface FlowSession {
  id: string; title: string; courseId: string; revision: number; serverTime?: string; completed: boolean; reviewing: boolean;
  progressPercent: number; steps: { id: string; title: string; index: number; completed: boolean }[];
  isSectionAssessment?: boolean; assessmentQuestionCount?: number; assessmentAnsweredCount?: number;
  stepId: string; stepTitle: string; policy: string; autoAdvance?: boolean; itemIndex: number; itemCount: number;
  feedbackAudioUrl?: string | null; exam?: FlowExam | null; correctCodes?: string[] | null; item: FlowItem; answer?: FlowAnswer | null; blockedReason: string; quizFinished: boolean;
  correctCount: number; answeredCount: number; enteredAt: string; lastPosition: number; watchedSeconds: number;
  nextUrl: string; nextLabel: string;
}
export interface FlowAction { action: "advance" | "answer" | "watch" | "retry" | "navigate" | "submit"; targetIndex?: number; codes?: string[]; positionSeconds?: number; x?: number; y?: number }

export interface FlowExam { deadline: string; submitted: boolean; passed: boolean; correctCount?: number; questions: { id: string; index: number; title: string; options: FlowOption[]; codes: string[]; correctCodes?: string[]; explanation?: string; audioUrl?: string; feedbackAudioUrl?: string; correct?: boolean }[] }
