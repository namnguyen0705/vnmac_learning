export type HomeTask = { title: string; description: string };

export type HomeContent = {
  curriculumVersion: "part1";
  welcomeTitle: string;
  welcomeDescription: string;
  welcomeBodyHtml: string;
  overviewTitle: string;
  overviewItems: string[];
  overviewBodyHtml: string;
  objectivesTitle: string;
  objectives: string[];
  objectivesBodyHtml: string;
  tasksTitle: string;
  tasks: HomeTask[];
  tasksBodyHtml: string;
  taskWarning: string;
  taskWarningHtml: string;
  outcomesTitle: string;
  outcomes: string[];
  outcomesBodyHtml: string;
};

export const defaultHomeContent: HomeContent = {
  curriculumVersion: "part1",
  welcomeTitle: "Chào mừng bạn!",
  welcomeDescription: "",
  welcomeBodyHtml: "",
  overviewTitle: "Tổng quan khóa học",
  overviewItems: ["{lessonCount} bài học + {quizCount} bài kiểm tra cuối phần", "Học theo trình tự, không bỏ qua bài", "Đạt tối thiểu {passScore}% ở bài kiểm tra"],
  overviewBodyHtml: "<ul><li>{lessonCount} bài học + {quizCount} bài kiểm tra cuối phần</li><li>Học theo trình tự, không bỏ qua bài</li><li>Đạt tối thiểu {passScore}% ở bài kiểm tra</li></ul>",
  objectivesTitle: "Mục đích khóa học",
  objectives: [],
  objectivesBodyHtml: "",
  tasksTitle: "Nhiệm vụ của bạn",
  tasks: [
    { title: "Học bài", description: "Xem video, đọc nội dung, ghi nhớ kiến thức" },
    { title: "Thực hành", description: "Tham gia hoạt động tương tác trong bài" },
    { title: "Làm kiểm tra", description: "Trả lời câu hỏi cuối bài để kiểm tra" },
    { title: "Hoàn thành", description: "Đáp ứng yêu cầu của từng bài học và bài kiểm tra" },
  ],
  tasksBodyHtml: "<p><strong>Học bài</strong><br>Xem video, đọc nội dung, ghi nhớ kiến thức</p><p><strong>Thực hành</strong><br>Tham gia hoạt động tương tác trong bài</p><p><strong>Làm kiểm tra</strong><br>Trả lời câu hỏi cuối bài để kiểm tra</p><p><strong>Hoàn thành</strong><br>Đáp ứng yêu cầu của từng bài học và bài kiểm tra</p>",
  taskWarning: "Bạn cần hoàn thành từng bước để đảm bảo an toàn.",
  taskWarningHtml: "<p>Bạn cần hoàn thành từng bước để đảm bảo an toàn.</p>",
  outcomesTitle: "Sau khi học xong",
  outcomes: ["Hiểu rõ nguy cơ từ bom mìn, vật nổ", "Biết cách xử lý an toàn khi gặp vật lạ", "Truyền đạt thông điệp đúng, dễ hiểu", "Tự tin hỗ trợ và bảo vệ cộng đồng"],
  outcomesBodyHtml: "<ul><li>Hiểu rõ nguy cơ từ bom mìn, vật nổ</li><li>Biết cách xử lý an toàn khi gặp vật lạ</li><li>Truyền đạt thông điệp đúng, dễ hiểu</li><li>Tự tin hỗ trợ và bảo vệ cộng đồng</li></ul>",
};

export function parseHomeContent(value?: string): HomeContent {
  if (!value) return defaultHomeContent;
  try {
    const parsed = JSON.parse(value) as Partial<HomeContent>;
    if (parsed.curriculumVersion !== "part1") return defaultHomeContent;
    const content = { ...defaultHomeContent, ...parsed };
    if (!parsed.overviewBodyHtml && parsed.overviewItems) content.overviewBodyHtml = listToHtml(parsed.overviewItems);
    if (!parsed.objectivesBodyHtml && parsed.objectives) content.objectivesBodyHtml = listToHtml(parsed.objectives);
    if (!parsed.tasksBodyHtml && parsed.tasks) content.tasksBodyHtml = parsed.tasks.map((item) => `<p><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.description)}</p>`).join("");
    if (!parsed.taskWarningHtml && parsed.taskWarning) content.taskWarningHtml = `<p>${escapeHtml(parsed.taskWarning)}</p>`;
    if (!parsed.outcomesBodyHtml && parsed.outcomes) content.outcomesBodyHtml = listToHtml(parsed.outcomes);
    if (!parsed.welcomeBodyHtml && parsed.welcomeDescription) content.welcomeBodyHtml = `<p>${escapeHtml(parsed.welcomeDescription)}</p>`;
    return content;
  } catch {
    return defaultHomeContent;
  }
}

function listToHtml(items: string[]) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

export function renderHomeText(value: string, variables: { lessonCount: number; quizCount: number; passScore: number | null }) {
  return value
    .split("{lessonCount}").join(String(variables.lessonCount))
    .split("{quizCount}").join(String(variables.quizCount))
    .split("{passScore}").join(variables.passScore == null ? "—" : String(variables.passScore));
}
