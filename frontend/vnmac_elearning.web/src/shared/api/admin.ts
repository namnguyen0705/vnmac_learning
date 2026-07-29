import { apiRequest, resolveApiUrl } from "./client";
import { useAuthStore } from "../stores/auth-store";
import type {
  AdminLessonCatalogResponse,
  AdminNotificationListResponse,
  AdminNotificationResponse,
  AdminQuestion,
  AdminUserRow,
  AnalyticsResponse,
  CourseQuiz,
  CourseLesson,
  CourseSection,
  CourseTreeResponse,
  CreateCourseQuizRequest,
  CreateAdminUserRequest,
  RoleResponse,
  ScormPackageRequest,
  UpsertRoleRequest,
  CreateAdminNotificationRequest,
  CreateCourseRequest,
  CreateSectionRequest,
  UpdateSectionRequest,
  LearnerAdminRow,
  LessonContent,
  LessonDifficulty,
  LessonPublicationStatus,
  MediaUploadResponse,
  MediaLibraryItem,
  CreateMediaLibraryItemRequest,
  UpdateMediaLibraryItemRequest,
  SystemAuditLogResponse,
  SystemSettingsResponse,
  TrackingResponse,
  UpdateCourseQuizRequest,
  UpdateAdminUserRequest,
  UpdateSystemSettingsRequest,
  UpsertLessonQuestionRequest,
  UpsertLessonRequest,
  UpdateCourseRequest,
  UpdateLessonMetadataRequest,
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

export function updateSection(courseId: string, sectionId: string, payload: UpdateSectionRequest) {
  return apiRequest<CourseSection>(`/api/admin/courses/${courseId}/sections/${sectionId}`, {
    method: "PUT",
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

export function getAdminLessonCatalog(
  filters: {
    search?: string;
    topic?: string;
    status?: LessonPublicationStatus | "all";
    difficulty?: LessonDifficulty | "all";
    page?: number;
    pageSize?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.topic && filters.topic !== "all") {
    params.set("topic", filters.topic);
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }
  if (filters.difficulty && filters.difficulty !== "all") {
    params.set("difficulty", filters.difficulty);
  }
  if (filters.page) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<AdminLessonCatalogResponse>(`/api/admin/lessons/catalog${query}`);
}

export function getLessonContent(lessonId: string) {
  return apiRequest<LessonContent>(`/api/admin/lessons/${lessonId}/content`);
}

export function createLessonContent(lessonId: string, payload: LessonContent) {
  return apiRequest<LessonContent>(`/api/admin/lessons/${lessonId}/content`, {
    method: "POST",
    body: payload,
  });
}

export function updateLessonContent(lessonId: string, payload: LessonContent) {
  return apiRequest<LessonContent>(`/api/admin/lessons/${lessonId}/content`, {
    method: "PUT",
    body: payload,
  });
}

export function deleteLessonContent(lessonId: string) {
  return apiRequest<void>(`/api/admin/lessons/${lessonId}/content`, {
    method: "DELETE",
  });
}

export function createLesson(payload: UpsertLessonRequest) {
  return apiRequest<CourseLesson>(`/api/admin/lessons`, {
    method: "POST",
    body: payload,
  });
}

export async function uploadAdminMedia(file: File, mediaType: "image" | "video" | "poster" | "caption" | "document") {
  const session = useAuthStore.getState().session;
  const formData = new FormData();
  formData.set("file", file);
  formData.set("mediaType", mediaType);

  const headers = new Headers();
  if (session?.tokens.accessToken) {
    headers.set("Authorization", `Bearer ${session.tokens.accessToken}`);
  }

  const response = await fetch(resolveApiUrl("/api/admin/media/upload"), {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload file thất bại.");
  }

  const payload = (await response.json()) as MediaUploadResponse;
  return {
    ...payload,
    url: resolveApiUrl(payload.url),
  };
}

export async function importScormPackage(file: File) {
  const session = useAuthStore.getState().session;
  const formData = new FormData();
  formData.set("file", file);

  const headers = new Headers();
  if (session?.tokens.accessToken) {
    headers.set("Authorization", `Bearer ${session.tokens.accessToken}`);
  }

  const response = await fetch(resolveApiUrl("/api/admin/scorm/import"), {
    method: "POST",
    headers,
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string } | null;
    throw new Error(payload?.message ?? "Không thể nhập gói SCORM.");
  }

  return await response.json() as ScormPackageRequest;
}

export function deleteImportedScormPackage(entryPath: string) {
  return apiRequest<void>(`/api/admin/scorm/import?entryPath=${encodeURIComponent(entryPath)}`, {
    method: "DELETE",
  });
}

export async function getMediaLibrary() {
  const items = await apiRequest<MediaLibraryItem[]>("/api/admin/media/library");
  return items.map((item) => ({
    ...item,
    url: resolveApiUrl(item.url),
    thumbnailUrl: item.thumbnailUrl ? resolveApiUrl(item.thumbnailUrl) : "",
  }));
}

export function deleteMediaLibraryItem(fileName: string) {
  return apiRequest<void>(`/api/admin/media/library/${encodeURIComponent(fileName)}`, {
    method: "DELETE",
  });
}

export function createMediaLibraryItem(payload: CreateMediaLibraryItemRequest) {
  return apiRequest<MediaLibraryItem>("/api/admin/media/library", {
    method: "POST",
    body: payload,
  });
}

export function updateMediaLibraryItem(id: string, payload: UpdateMediaLibraryItemRequest) {
  return apiRequest<MediaLibraryItem>(`/api/admin/media/library/${id}`, {
    method: "PUT",
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
  return apiRequest<CourseLesson>(`/api/admin/lessons/${lessonId}`, {
    method: "PUT",
    body: payload,
  });
}

export function updateLessonMetadata(lessonId: string, payload: UpdateLessonMetadataRequest) {
  return apiRequest<CourseLesson>(`/api/admin/lessons/${lessonId}/metadata`, {
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

export function getRoles() {
  return apiRequest<RoleResponse[]>("/api/admin/roles");
}

export function createRole(payload: UpsertRoleRequest) {
  return apiRequest<RoleResponse>("/api/admin/roles", { method: "POST", body: payload });
}

export function updateRole(roleId: string, payload: UpsertRoleRequest) {
  return apiRequest<RoleResponse>(`/api/admin/roles/${roleId}`, { method: "PUT", body: payload });
}

export function deleteRole(roleId: string) {
  return apiRequest<void>(`/api/admin/roles/${roleId}`, { method: "DELETE" });
}

export function assignUserRole(userId: string, roleId: string) {
  return apiRequest<void>(`/api/admin/user-accounts/${userId}/role`, {
    method: "PUT",
    body: { roleId },
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

export function getTracking(filters: { courseId?: string; province?: string; group?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters.courseId) {
    params.set("courseId", filters.courseId);
  }
  if (filters.province) {
    params.set("province", filters.province);
  }
  if (filters.group) {
    params.set("group", filters.group);
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<TrackingResponse>(`/api/admin/tracking${query}`);
}

export function getTrackingExportUrl(filters: { courseId?: string; province?: string; group?: string; status?: string }) {
  const params = new URLSearchParams();
  if (filters.courseId) {
    params.set("courseId", filters.courseId);
  }
  if (filters.province) {
    params.set("province", filters.province);
  }
  if (filters.group) {
    params.set("group", filters.group);
  }
  if (filters.status && filters.status !== "all") {
    params.set("status", filters.status);
  }

  const query = params.size ? `?${params.toString()}` : "";
  return resolveApiUrl(`/api/admin/tracking/export${query}`);
}

export function getSystemSettings() {
  return apiRequest<SystemSettingsResponse>("/api/admin/settings");
}

export function updateSystemSettings(payload: UpdateSystemSettingsRequest) {
  return apiRequest<SystemSettingsResponse>("/api/admin/settings", {
    method: "PUT",
    body: payload,
  });
}

export function getSystemLogs(
  filters: {
    search?: string;
    module?: string;
    action?: string;
    actorUserId?: string;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.module && filters.module !== "all") {
    params.set("module", filters.module);
  }
  if (filters.action && filters.action !== "all") {
    params.set("action", filters.action);
  }
  if (filters.actorUserId?.trim()) {
    params.set("actorUserId", filters.actorUserId.trim());
  }
  if (filters.page) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<SystemAuditLogResponse>(`/api/admin/system-logs${query}`);
}

export function getAdminNotifications(
  filters: {
    search?: string;
    audience?: string;
    type?: string;
    unreadOnly?: boolean;
    page?: number;
    pageSize?: number;
  } = {},
) {
  const params = new URLSearchParams();
  if (filters.search?.trim()) {
    params.set("search", filters.search.trim());
  }
  if (filters.audience && filters.audience !== "all") {
    params.set("audience", filters.audience);
  }
  if (filters.type && filters.type !== "all") {
    params.set("type", filters.type);
  }
  if (filters.unreadOnly) {
    params.set("unreadOnly", "true");
  }
  if (filters.page) {
    params.set("page", String(filters.page));
  }
  if (filters.pageSize) {
    params.set("pageSize", String(filters.pageSize));
  }

  const query = params.size ? `?${params.toString()}` : "";
  return apiRequest<AdminNotificationListResponse>(`/api/admin/notifications${query}`);
}

export function createAdminNotification(payload: CreateAdminNotificationRequest) {
  return apiRequest<AdminNotificationResponse>("/api/admin/notifications", {
    method: "POST",
    body: payload,
  });
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
