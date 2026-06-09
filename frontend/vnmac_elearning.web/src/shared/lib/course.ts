import type {
  CourseQuiz,
  CourseLesson,
  CourseSection,
  CourseTreeResponse,
  LearnerCourseQuizSummary,
  LearnerLessonSummary,
  ProgressTracking,
  QuizResult,
  ScormRegistration,
} from "../types/api";

export function sortSections(sections: CourseSection[]) {
  return (Array.isArray(sections) ? [...sections] : []).sort((left, right) => left.order - right.order);
}

export function sortLessons(lessons: CourseLesson[]) {
  return (Array.isArray(lessons) ? [...lessons] : []).sort((left, right) => left.order - right.order);
}

export function sortQuizzes(quizzes: CourseQuiz[]) {
  return (Array.isArray(quizzes) ? [...quizzes] : []).sort((left, right) => left.order - right.order);
}

export function flattenLessons(course: CourseTreeResponse) {
  return sortSections(course.sections).flatMap((section) => sortLessons(section.lessons));
}

export function flattenQuizzes(course: CourseTreeResponse) {
  return [
    ...sortSections(course.sections).flatMap((section) => sortQuizzes(section.quizzes)),
    ...sortQuizzes(course.quizzes),
  ];
}

export function findLesson(course: CourseTreeResponse, lessonId: string) {
  return flattenLessons(course).find((lesson) => lesson.id === lessonId);
}

export function findQuiz(course: CourseTreeResponse, quizId: string) {
  return flattenQuizzes(course).find((quiz) => quiz.id === quizId);
}

export function findSection(course: CourseTreeResponse, sectionId: string) {
  return sortSections(course.sections).find((section) => section.id === sectionId);
}

export function toLessonSummaryMap(lessons: LearnerLessonSummary[]) {
  return new Map(lessons.map((lesson) => [lesson.lessonId, lesson]));
}

export function toQuizSummaryMap(quizzes: LearnerCourseQuizSummary[]) {
  return new Map(quizzes.map((quiz) => [quiz.quizId, quiz]));
}

export function toProgressMap(progress: ProgressTracking[]) {
  return new Map(progress.map((item) => [item.lessonId, item]));
}

export function toQuizResultMap(items: QuizResult[]) {
  return new Map(items.map((item) => [item.lessonId, item]));
}

export function toScormMap(items: ScormRegistration[]) {
  return new Map(items.map((item) => [item.lessonId, item]));
}

export function getCourseCoverAsset(course: CourseTreeResponse) {
  const firstVideoLesson = flattenLessons(course).find(
    (lesson) => lesson.videoContent?.posterUrl || lesson.videoContent?.videoUrl,
  );

  return {
    posterUrl: firstVideoLesson?.videoContent?.posterUrl ?? null,
    lessonTitle: firstVideoLesson?.title ?? null,
  };
}

export function getCourseContentCount(course: CourseTreeResponse) {
  return flattenLessons(course).length;
}
