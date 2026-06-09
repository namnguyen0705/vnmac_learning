import { apiRequest } from "./client";
import type {
  CertificateResponse,
  CertificateVerificationResponse,
  CourseTreeResponse,
  InteractiveAttemptRequest,
  InteractiveAttemptResponse,
  LearnerCourseCatalogResponse,
  LearnerCertificatesResponse,
  LearnerDashboardResponse,
  LearnerEnrollmentSummary,
  ProgressTracking,
  ProgressSnapshotResponse,
  QuizAttemptRequest,
  QuizAttemptResponse,
  QuizSessionResponse,
  ScormLaunchResponse,
  UpdateVideoProgressRequest,
} from "../types/api";

export function getPublishedCourses() {
  return apiRequest<CourseTreeResponse[]>("/api/courses");
}

export function getCourseById(courseId: string) {
  return apiRequest<CourseTreeResponse>(`/api/courses/${courseId}`);
}

export function getLearnerCourseCatalog(userId: string) {
  return apiRequest<LearnerCourseCatalogResponse>(`/api/learning/learners/${userId}/catalog`);
}

export function getLearnerDashboard(userId: string) {
  return apiRequest<LearnerDashboardResponse>(`/api/learning/learners/${userId}/dashboard`);
}

export function enrollInCourse(userId: string, courseId: string) {
  return apiRequest<LearnerEnrollmentSummary>(`/api/learning/learners/${userId}/courses/${courseId}/enroll`, {
    method: "POST",
  });
}

export function getLearnerCourseProgress(userId: string, courseId: string) {
  return apiRequest<ProgressSnapshotResponse>(`/api/learning/learners/${userId}/courses/${courseId}/progress`);
}

export function updateVideoProgress(
  userId: string,
  lessonId: string,
  payload: UpdateVideoProgressRequest,
) {
  return apiRequest<ProgressTracking>(`/api/learning/learners/${userId}/lessons/${lessonId}/video-progress`, {
    method: "POST",
    body: payload,
  });
}

export function submitInteractiveAttempt(
  userId: string,
  lessonId: string,
  payload: InteractiveAttemptRequest,
) {
  return apiRequest<InteractiveAttemptResponse>(
    `/api/learning/learners/${userId}/lessons/${lessonId}/interactive-attempts`,
    {
      method: "POST",
      body: payload,
    },
  );
}

export function getQuizSession(userId: string, quizId: string) {
  return apiRequest<QuizSessionResponse>(`/api/learning/learners/${userId}/quizzes/${quizId}/session`);
}

export function submitQuizAttempt(userId: string, quizId: string, payload: QuizAttemptRequest) {
  return apiRequest<QuizAttemptResponse>(`/api/learning/learners/${userId}/quizzes/${quizId}/attempts`, {
    method: "POST",
    body: payload,
  });
}

export function getLearnerCertificates(userId: string) {
  return apiRequest<LearnerCertificatesResponse>(`/api/learning/learners/${userId}/certificates`);
}

export function getCourseCertificate(userId: string, courseId: string) {
  return apiRequest<CertificateResponse>(`/api/learning/learners/${userId}/courses/${courseId}/certificate`);
}

export function verifyCertificate(certificateId: string) {
  return apiRequest<CertificateVerificationResponse>(`/api/certificates/verify/${certificateId}`, {
    auth: false,
  });
}

export function launchScormLesson(userId: string, lessonId: string, scoId?: string) {
  const query = scoId ? `?scoId=${encodeURIComponent(scoId)}` : "";
  return apiRequest<ScormLaunchResponse>(
    `/api/learning/learners/${userId}/lessons/${lessonId}/scorm/launch${query}`,
    {
      method: "POST",
    },
  );
}
