export function formatDateTime(value?: string | null) {
  if (!value) {
    return "Chưa có dữ liệu";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMinutes(value: number) {
  if (value <= 0) {
    return "0 phút";
  }

  if (value < 60) {
    return `${value} phút`;
  }

  const hours = Math.floor(value / 60);
  const minutes = value % 60;

  return minutes ? `${hours} giờ ${minutes} phút` : `${hours} giờ`;
}

export function formatSeconds(value: number) {
  if (value <= 0) {
    return "0 giây";
  }

  if (value < 60) {
    return `${value} giây`;
  }

  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return seconds ? `${minutes} phút ${seconds} giây` : `${minutes} phút`;
}

export function humanizeEnum(value: string) {
  const labelMap: Record<string, string> = {
    Video: "Video",
    Interactive: "Tương tác",
    Quiz: "Bài kiểm tra",
    Scorm: "SCORM",
    Scorm12: "SCORM 1.2",
    Scorm2004: "SCORM 2004",
    TrueFalse: "Đúng / Sai",
    MultipleChoice: "Trắc nghiệm",
    DragDrop: "Kéo thả",
    Hotspot: "Điểm chạm",
    Scenario: "Tình huống",
    Published: "Đang mở",
    Draft: "Bản nháp",
    Enrolled: "Đã đăng ký",
    InProgress: "Đang học",
    Completed: "Hoàn thành",
    NotStarted: "Chưa bắt đầu",
    NotAttempted: "Chưa bắt đầu",
    Incomplete: "Chưa hoàn thành",
    Passed: "Đạt",
    Failed: "Không đạt",
    Browsed: "Đã xem",
    Unknown: "Chưa xác định",
  };

  if (labelMap[value]) {
    return labelMap[value];
  }

  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\bScorm\b/g, "SCORM")
    .trim();
}

export function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export function splitMultiline(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function toMultiline(value: string[]) {
  return value.join("\n");
}
