import type { FlowItem } from "./types";
import { plainFlowText } from "./richText";

export type EditorTab = "content" | "narration" | "media" | "answers" | "settings";
export type IssueKind = "video" | "image" | "audio" | "answer" | "review" | "content";
export interface ContentIssue { kind: IssueKind; label: string; detail: string; tab: EditorTab }

export const flowKindLabels: Record<FlowItem["kind"], string> = {
  text: "Nội dung", gallery: "Trình chiếu ảnh", video: "Video", choice: "Câu hỏi", classify: "Phân loại", sort: "Sắp xếp", hotspot: "Chọn vị trí", match: "Nối các ý", group: "Xếp nhóm",
};

export function contentIssues(item: FlowItem): ContentIssue[] {
  const issues: ContentIssue[] = [];
  if (!plainFlowText(item.title)) issues.push({ kind: "content", label: "Thiếu tiêu đề", detail: "Nhập tiêu đề hoặc câu hỏi cho màn hình này.", tab: "content" });
  if (item.kind === "video" && !item.videoUrl?.trim()) issues.push({ kind: "video", label: "Thiếu video", detail: "Chưa có video cho màn hình này. Chọn tệp video hoặc nhập đường dẫn.", tab: "media" });
  if (item.requiresImage && !item.imageUrl?.trim()) issues.push({ kind: "image", label: "Thiếu ảnh", detail: "Chưa có ảnh minh họa bắt buộc.", tab: "media" });
  const missingOptions = (item.options ?? []).filter(option => option.requiresImage && !option.imageUrl?.trim());
  if (missingOptions.length) issues.push({ kind: "image", label: `Thiếu ${missingOptions.length} ảnh lựa chọn`, detail: `Bổ sung ảnh cho lựa chọn ${missingOptions.map(option => option.code).join(", ")}.`, tab: "answers" });
  if (item.requiresAudio && !item.audioUrl?.trim()) issues.push({ kind: "audio", label: "Thiếu lời đọc", detail: "Chưa có tệp âm thanh lời đọc bắt buộc.", tab: "media" });
  if (item.kind === "video" && (!Number.isFinite(item.durationSeconds) || item.durationSeconds <= 1)) issues.push({ kind: "content", label: "Thiếu thời lượng", detail: "Nhập thời lượng thực tế của video để ghi nhận xem hết.", tab: "settings" });
  if (["choice", "classify", "sort", "hotspot"].includes(item.kind)) {
    const options = item.options ?? [], correct = item.correctCodes ?? [];
    if (!correct.length || correct.some(code => !options.some(option => option.code === code))) issues.push({ kind: "answer", label: "Thiếu đáp án", detail: "Chưa có đầy đủ mã đáp án đúng hợp lệ.", tab: "answers" });
    if (item.kind === "sort" && new Set(correct).size !== options.length) issues.push({ kind: "answer", label: "Thiếu thứ tự", detail: "Thứ tự đúng cần có đủ các bước, mỗi bước một lần.", tab: "answers" });
  }
  if (item.reviewNote?.trim()) issues.push({ kind: "review", label: "Chờ duyệt", detail: item.reviewNote, tab: "settings" });
  return issues;
}
