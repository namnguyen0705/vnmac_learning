import { apiRequest, resolveApiUrl } from "./client";
import type {
  AdminQuestion,
  AdminUserRow,
  AnalyticsResponse,
  CourseQuiz,
  CourseSection,
  CourseTreeResponse,
  CreateCourseQuizRequest,
  CreateAdminUserRequest,
  CreateCourseRequest,
  CreateSectionRequest,
  LearnerAdminRow,
  UpdateCourseQuizRequest,
  UpdateAdminUserRequest,
  UpsertLessonQuestionRequest,
  UpsertLessonRequest,
  UpdateCourseRequest,
} from "../types/api";

export function getAdminCourses() {
  return apiRequest<CourseTreeResponse[]>("/api/admin/courses");
}

export function createCourse(payload: CreateCourseRequest) {
  return apiRequest<CourseTreeResponse>("/api/admin/courses", {
    method: "POST",
    body: payload,
  });
}

export function updateCourse(courseId: string, payload: UpdateCourseRequest) {
  return apiRequest<CourseTreeResponse>(`/api/admin/courses/${courseId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteCourse(courseId: string) {
  return apiRequest<void>(`/api/admin/courses/${courseId}`, {
    method: "DELETE",
  });
}

export function createSection(courseId: string, payload: CreateSectionRequest) {
  return apiRequest<CourseSection>(`/api/admin/courses/${courseId}/sections`, {
    method: "POST",
    body: payload,
  });
}

export function getAdminQuizzes(filters: { courseId?: string; sectionId?: string } = {}) {
  const params = new URLSearchParams();
  if (filters.courseId) {
    params.set("courseId", filters.courseId);
  }
  if (filters.sectionId) {
    params.set("sectionId", filters.sectionId);
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<CourseQuiz[]>(`/api/admin/quizzes${query}`);
}

export function createLesson(payload: UpsertLessonRequest) {
  return apiRequest(`/api/admin/lessons`, {
    method: "POST",
    body: payload,
  });
}

export function createQuiz(payload: CreateCourseQuizRequest) {
  return apiRequest<CourseQuiz>("/api/admin/quizzes", {
    method: "POST",
    body: payload,
  });
}

export function updateLesson(lessonId: string, payload: UpsertLessonRequest) {
  return apiRequest(`/api/admin/lessons/${lessonId}`, {
    method: "PUT",
    body: payload,
  });
}

export function updateQuiz(quizId: string, payload: UpdateCourseQuizRequest) {
  return apiRequest<CourseQuiz>(`/api/admin/quizzes/${quizId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteLesson(lessonId: string) {
  return apiRequest<void>(`/api/admin/lessons/${lessonId}`, {
    method: "DELETE",
  });
}

export function deleteQuiz(quizId: string) {
  return apiRequest<void>(`/api/admin/quizzes/${quizId}`, {
    method: "DELETE",
  });
}

export function getQuestions(lessonId?: string, quizId?: string) {
  const params = new URLSearchParams();
  if (lessonId) {
    params.set("lessonId", lessonId);
  }
  if (quizId) {
    params.set("quizId", quizId);
  }
  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<AdminQuestion[]>(`/api/admin/questions${query}`);
}

export function createQuestion(payload: UpsertLessonQuestionRequest) {
  return apiRequest<AdminQuestion>("/api/admin/questions", {
    method: "POST",
    body: payload,
  });
}

export function updateQuestion(questionId: string, payload: UpsertLessonQuestionRequest) {
  return apiRequest<AdminQuestion>(`/api/admin/questions/${questionId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteQuestion(questionId: string) {
  return apiRequest<void>(`/api/admin/questions/${questionId}`, {
    method: "DELETE",
  });
}

export function getAdminUsers(filters: { province?: string; group?: string }) {
  const params = new URLSearchParams();
  if (filters.province) {
    params.set("province", filters.province);
  }
  if (filters.group) {
    params.set("group", filters.group);
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<LearnerAdminRow[]>(`/api/admin/users${query}`);
}

export function getAdminUserAccounts(filters: { province?: string; group?: string; role?: string }) {
  const params = new URLSearchParams();
  if (filters.province) {
    params.set("province", filters.province);
  }
  if (filters.group) {
    params.set("group", filters.group);
  }
  if (filters.role) {
    params.set("role", filters.role);
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<AdminUserRow[]>(`/api/admin/user-accounts${query}`);
}

export function createAdminUser(payload: CreateAdminUserRequest) {
  return apiRequest<AdminUserRow>("/api/admin/user-accounts", {
    method: "POST",
    body: payload,
  });
}

export function updateAdminUser(userId: string, payload: UpdateAdminUserRequest) {
  return apiRequest<AdminUserRow>(`/api/admin/user-accounts/${userId}`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteAdminUser(userId: string) {
  return apiRequest<void>(`/api/admin/user-accounts/${userId}`, {
    method: "DELETE",
  });
}

export function getAnalytics(filters: { province?: string; group?: string }) {
  const params = new URLSearchParams();
  if (filters.province) {
    params.set("province", filters.province);
  }
  if (filters.group) {
    params.set("group", filters.group);
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<AnalyticsResponse>(`/api/admin/analytics${query}`);
}

export function getUserExportUrl(filters: { province?: string; group?: string }) {
  const params = new URLSearchParams();
  if (filters.province) {
    params.set("province", filters.province);
  }
  if (filters.group) {
    params.set("group", filters.group);
  }

  const query = params.size ? `?${params.toString()}` : "";
  return resolveApiUrl(`/api/admin/users/export${query}`);
}
