export type UserRole = "Learner" | "Admin" | "ContentManager" | "DataViewer";
export type CourseStatus = "Draft" | "Published";
export type CourseEnrollmentStatus = "Enrolled" | "InProgress" | "Completed";
export type NotificationAudience = "Learner" | "Admin";
export type NotificationType =
  | "LearnerRegistered"
  | "CourseEnrolled"
  | "CourseCompleted"
  | "SystemAnnouncement"
  | "LearningReminder";
export type LessonType = "Video" | "Interactive" | "Quiz" | "Scorm";
export type LessonDifficulty = "Basic" | "Intermediate" | "Advanced";
export type LessonPublicationStatus = "Published" | "Draft" | "Archived";
export type LessonProgressStatus = "NotStarted" | "InProgress" | "Completed";
export type QuestionType = "TrueFalse" | "MultipleChoice" | "DragDrop" | "Hotspot" | "Scenario";
export type HotspotShape = "Rectangle" | "Circle";
export type ScormVersion = "Scorm12" | "Scorm2004";
export type ScormScoType = "Sco" | "Asset";
export type ScormCompletionStatus =
  | "NotAttempted"
  | "Incomplete"
  | "Completed"
  | "Passed"
  | "Failed"
  | "Browsed"
  | "Unknown";
export type ScormSuccessStatus = "Unknown" | "Passed" | "Failed";

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  createdAt: string;
    lastLogin?: string | null;
  isEmailVerified: boolean;
  emailVerifiedAt?: string | null;
  createdByAdmin: boolean;
  role: UserRole;
  roleId?: string | null;
  roleName: string;
  hasAdminAccess: boolean;
  permissions: string[];
  province: string;
  group: string;
  avatarUrl: string;
}

export interface UpdateProfileRequest {
  fullName: string;
  phoneNumber: string;
  province: string;
  group: string;
  avatarUrl?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AuthTokenResponse {
  tokenType: string;
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
}

export interface AuthSession {
  user: User;
  tokens: AuthTokenResponse;
}

export interface LoginRequest {
  username: string;
  password: string;
  captchaToken?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  province: string;
  group: string;
  captchaToken?: string;
}

export interface LoginResponse {
  user: User;
  rateLimitPolicy: string;
  loginMode: string;
  otpValidated: boolean;
  captchaValidated: boolean;
  tokens: AuthTokenResponse;
  message: string;
}

export interface RegisterResponse {
  userId: string;
  username: string;
  email: string;
  requiresEmailVerification: boolean;
  verificationExpiresAt: string;
  message: string;
}

export interface ResendVerificationEmailRequest {
  email: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyEmailResponse {
  user: User;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface CourseTreeResponse {
  id: string;
  title: string;
  description: string;
  status: CourseStatus;
  sections: CourseSection[];
  quizzes: CourseQuiz[];
}

export interface CourseSection {
  id: string;
  courseId?: string;
  title: string;
  description: string;
  order: number;
  lessons: CourseLesson[];
  quizzes: CourseQuiz[];
}

export interface UpdateSectionRequest {
  title: string;
  description: string;
  order: number;
}

export interface CourseLesson {
  id: string;
  courseId: string;
  sectionId: string;
  title: string;
  type: LessonType;
  order: number;
  durationMinutes: number;
  statusLabel: string;
  topic: string;
  difficulty: LessonDifficulty;
  publicationStatus: LessonPublicationStatus;
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
  content?: LessonContent | null;
  videoContent?: VideoContent | null;
  assessment?: LearnerAssessment | null;
  scormPackage?: ScormPackage | null;
}

export interface CourseQuiz {
  id: string;
  courseId: string;
  sectionId?: string | null;
  assessmentLessonId: string;
  title: string;
  description: string;
  order: number;
  durationMinutes: number;
  assessment?: LearnerAssessment | null;
}

export interface VideoContent {
  intro: string;
  videoUrl: string;
  posterUrl?: string | null;
  captionsUrl?: string | null;
  objectives: string[];
  checkpoints: string[];
  transcriptHighlight: string;
}

export interface LessonContent {
  summary: string;
  coreMessage: string;
  mainContentType: string;
  steps: LessonContentStep[];
  objectives: string[];
  mainPoints: string[];
  interactionTypes: string[];
  activities: LessonContentActivity[];
  reinforcementPoints: string[];
  quiz: LessonContentQuiz;
  completion: LessonCompletionContent;
}

export interface LessonContentStep {
  key: string;
  order: number;
  label: string;
  screenType: string;
  description: string;
  progressPercent: number;
  isRequired: boolean;
  title: string;
  subtitle: string;
  body: string;
  instruction: string;
  alertText: string;
  primaryActionLabel: string;
  secondaryActionLabel: string;
  mediaUrl: string;
  mediaType: string;
  posterUrl: string;
  captionUrl: string;
  mediaAlt: string;
  objectiveImageUrl: string;
  objectiveImageAlt: string;
  explanationTitle: string;
  explanation: string;
  points: string[];
  tips: string[];
  items: string[];
  targets: string[];
  options: string[];
  dragQuestions: LessonContentDragQuestion[];
  questions: LessonContentCheckQuestion[];
  feedback: string;
}

export interface LessonContentActivity {
  type: string;
  title: string;
  instruction: string;
  items: string[];
  targets: string[];
  feedback: string;
}

export interface LessonContentDragQuestion {
  id: string;
  order: number;
  prompt: string;
  description: string;
  tone: "red" | "amber" | "green" | "blue" | string;
  imageUrl: string;
  imageAlt: string;
  answers: LessonContentDragAnswer[];
}

export interface LessonContentDragAnswer {
  id: string;
  order: number;
  label: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  feedback: string;
}

export interface LessonContentCheckQuestion {
  id: string;
  order: number;
  prompt: string;
  imageUrl: string;
  imageAlt: string;
  explanation: string;
  feedback: string;
  options: LessonContentCheckOption[];
}

export interface LessonContentCheckOption {
  id: string;
  code: string;
  order: number;
  label: string;
  isCorrect: boolean;
}

export interface LessonContentQuiz {
  questionCount: number;
  passScore: number;
  description: string;
}

export interface LessonCompletionContent {
  title: string;
  message: string;
  nextActionLabel: string;
}

export interface LearnerAssessment {
  intro: string;
  retryHint: string;
  passScore: number;
  questionLimit?: number | null;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
  questionCount: number;
  bankQuestionCount?: number;
  questions?: LearnerQuestionPayload[] | null;
}

export interface LearnerDashboardResponse {
  user: User;
  totalEnrolledCourses: number;
  totalCompletedCourses: number;
  totalCertificates: number;
  totalStudyTimeMinutes: number;
  courses: LearnerEnrollmentSummary[];
}

export interface LearnerCourseCatalogResponse {
  userId: string;
  courses: LearnerCourseCatalogItem[];
}

export interface LearnerCourseCatalogItem {
  courseId: string;
  title: string;
  description: string;
  status: CourseStatus;
  totalSections: number;
  totalLessons: number;
  totalQuizzes: number;
  estimatedStudyTimeMinutes: number;
  isEnrolled: boolean;
  enrollment?: LearnerEnrollmentSummary | null;
}

export interface LearnerEnrollmentSummary {
  courseId: string;
  title: string;
  description: string;
  status: CourseStatus;
  enrollmentStatus: CourseEnrollmentStatus;
  enrolledAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
  contentCompletionPercent: number;
  quizCompletionPercent: number;
  overallCompletionPercent: number;
  quizUnlocked: boolean;
  certificateIssued: boolean;
  certificateId?: string | null;
  nextLessonId?: string | null;
  nextQuizId?: string | null;
  totalLessons: number;
  completedLessons: number;
  totalQuizzes: number;
  passedQuizzes: number;
}

export interface LearningResultsResponse {
  userId: string;
  courseId: string;
  courseTitle: string;
  enrollmentStatus: CourseEnrollmentStatus;
  contentCompletionPercent: number;
  quizCompletionPercent: number;
  overallCompletionPercent: number;
  totalLessons: number;
  completedLessons: number;
  inProgressLessons: number;
  lockedLessons: number;
  totalQuizzes: number;
  passedQuizzes: number;
  studyTimeMinutes: number;
  currentLessonId?: string | null;
  currentLessonTitle?: string | null;
  currentStep: string;
  nextLessonId?: string | null;
  nextLessonTitle?: string | null;
  nextQuizId?: string | null;
  nextQuizTitle?: string | null;
  latestQuizScore: number;
  latestQuizAttempts: number;
  certificateIssued: boolean;
}

export interface LearnerLessonSummary {
  courseId: string;
  sectionId: string;
  lessonId: string;
  title: string;
  type: LessonType;
  status: LessonProgressStatus;
  isUnlocked: boolean;
  currentStep: string;
  lastAccessedAt?: string | null;
  watchPercent: number;
  watchTimeMinutes: number;
  interactionAttempts: number;
  quizScore: number;
  quizAttempts: number;
  scormAttempts: number;
  scormScore?: number | null;
  scormCompletionStatus?: ScormCompletionStatus | null;
  scormSuccessStatus?: ScormSuccessStatus | null;
}

export interface ProgressTracking {
  userId: string;
  lessonId: string;
  status: LessonProgressStatus;
  completionTime?: string | null;
  currentStep: string;
  lastAccessedAt?: string | null;
  watchPercent: number;
  watchTimeMinutes: number;
  lastPositionSeconds: number;
  lastWatchedAt?: string | null;
  interactionAttempts: number;
  activeStudySeconds: number;
}

export interface QuizResult {
  userId: string;
  lessonId: string;
  score: number;
  attempts: number;
  lastAttemptAt?: string | null;
}

export interface ScormRegistration {
  userId: string;
  lessonId: string;
  attemptCount: number;
  currentScoId?: string | null;
  completionStatus: ScormCompletionStatus;
  successStatus: ScormSuccessStatus;
  scoreRaw?: number | null;
  scoreMin?: number | null;
  scoreMax?: number | null;
  totalTimeSeconds: number;
  location: string;
  suspendData: string;
  lastLaunchedAt?: string | null;
  lastCommittedAt?: string | null;
  completedAt?: string | null;
}

export interface ProgressSnapshotResponse {
  userId: string;
  courseId: string;
  nextLessonId?: string | null;
  nextQuizId?: string | null;
  contentCompletionPercent: number;
  quizCompletionPercent: number;
  overallCompletionPercent: number;
  quizUnlocked: boolean;
  certificateIssued: boolean;
  lessons: LearnerLessonSummary[];
  quizzes: LearnerCourseQuizSummary[];
  progress: ProgressTracking[];
  quizResults: QuizResult[];
  scormRegistrations: ScormRegistration[];
}

export interface LearnerCourseQuizSummary {
  quizId: string;
  courseId: string;
  sectionId?: string | null;
  assessmentLessonId: string;
  title: string;
  description: string;
  order: number;
  isUnlocked: boolean;
  passed: boolean;
  score: number;
  attempts: number;
}

export interface UpdateVideoProgressRequest {
  watchPercent: number;
  watchTimeMinutes: number;
  lastPositionSeconds: number;
}

export interface DragDropMatchSubmission {
  dragItemCode: string;
  dragTargetCode: string;
}

export interface HotspotClickSubmission {
  x: number;
  y: number;
}

export interface QuestionSubmissionRequest {
  questionId: string;
  selectedOptionCodes: string[];
  selectedHotspotCodes: string[];
  hotspotClicks: HotspotClickSubmission[];
  matches: DragDropMatchSubmission[];
}

export interface InteractiveAttemptRequest {
  answers: QuestionSubmissionRequest[];
}

export interface InteractionTaskResult {
  taskId: string;
  correct: boolean;
  explanation: string;
}

export interface InteractiveAttemptResponse {
  passed: boolean;
  attemptNumber: number;
  results: InteractionTaskResult[];
  progress: ProgressTracking;
}

export interface QuizSessionResponse {
  quizId: string;
  assessmentLessonId: string;
  title: string;
  intro: string;
  passScore: number;
  questions: LearnerQuestionPayload[];
}

export interface LearnerQuestionPayload {
  id: string;
  type: QuestionType;
  order: number;
  prompt: string;
  statement?: string | null;
  mediaTitle?: string | null;
  mediaUrl?: string | null;
  scenarioTitle?: string | null;
  scenarioContext?: string | null;
  allowMultipleAnswers?: boolean;
  options: LearnerQuestionOptionPayload[];
  hotspotTargets: LearnerHotspotTargetPayload[];
  dragItems: LearnerDragItemPayload[];
  dragTargets: LearnerDragTargetPayload[];
}

export interface LearnerQuestionOptionPayload {
  code: string;
  label: string;
  order: number;
}

export interface LearnerHotspotTargetPayload {
  code: string;
  label: string;
  order: number;
  shape: HotspotShape;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
}

export interface LearnerDragItemPayload {
  code: string;
  label: string;
  order: number;
}

export interface LearnerDragTargetPayload {
  code: string;
  label: string;
  order: number;
}

export interface QuizAttemptRequest {
  answers: QuestionSubmissionRequest[];
}

export interface QuizAttemptResponse {
  quizId: string;
  passed: boolean;
  score: number;
  attemptNumber: number;
  wrongQuestionIds: string[];
  result: QuizResult;
}

export interface Certificate {
  userId: string;
  courseId: string;
  certificateId: string;
  issuedDate: string;
  qrCode: string;
}

export interface CertificateResponse {
  userId: string;
  courseId: string;
  courseTitle: string;
  isEligible: boolean;
  outstandingRequirements: string[];
  certificate?: Certificate | null;
}

export interface LearnerCertificatesResponse {
  userId: string;
  certificates: CertificateResponse[];
}

export interface CertificateVerificationResponse {
  isValid: boolean;
  message: string;
  learnerName?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  certificateId?: string | null;
  issuedDate?: string | null;
}

export interface NotificationListResponse {
  unreadCount: number;
  items: NotificationResponse[];
}

export interface NotificationResponse {
  id: string;
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  actorUserId?: string | null;
  actorName?: string | null;
  courseId?: string | null;
  courseTitle?: string | null;
  linkUrl?: string | null;
  createdAt: string;
  readAt?: string | null;
  isRead: boolean;
}

export interface AdminNotificationListResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  unreadCount: number;
  learnerAudienceCount: number;
  adminAudienceCount: number;
  items: AdminNotificationResponse[];
}

export interface AdminNotificationResponse {
  id: string;
  audience: NotificationAudience;
  recipientUserId?: string | null;
  recipientName: string;
  type: NotificationType;
  title: string;
  message: string;
  actorName: string;
  courseTitle: string;
  linkUrl: string;
  createdAt: string;
  readAt?: string | null;
  isRead: boolean;
}

export interface CreateAdminNotificationRequest {
  audience: NotificationAudience;
  type: NotificationType;
  title: string;
  message: string;
  linkUrl: string;
  recipientUserIds: string[];
}

export interface ScormSco {
  id: string;
  identifier: string;
  title: string;
  launchPath: string;
  itemType: ScormScoType;
  order: number;
  masteryScore?: number | null;
}

export interface ScormPackage {
  id: string;
  version: ScormVersion;
  identifier: string;
  title: string;
  entryPath: string;
  launchScoId?: string | null;
  manifestVersion?: string | null;
  scos: ScormSco[];
}

export interface ScormRegistrationSnapshot {
  userId: string;
  lessonId: string;
  attemptCount: number;
  currentScoId?: string | null;
  completionStatus: ScormCompletionStatus;
  successStatus: ScormSuccessStatus;
  scoreRaw?: number | null;
  scoreMin?: number | null;
  scoreMax?: number | null;
  totalTimeSeconds: number;
  location: string;
  hasSuspendData: boolean;
  lastLaunchedAt?: string | null;
  lastCommittedAt?: string | null;
  completedAt?: string | null;
}

export interface ScormLaunchResponse {
  lessonId: string;
  packageId: string;
  packageTitle: string;
  version: ScormVersion;
  sessionId: string;
  scoId: string;
  scoTitle: string;
  launchContentUrl: string;
  playerUrl: string;
  registration: ScormRegistrationSnapshot;
}

export interface AnalyticsItem {
  id: string;
  title: string;
  total: number;
}

export interface LearnerAdminRow {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  createdAt: string;
  lastLogin: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: string | null;
  createdByAdmin: boolean;
  isLocked: boolean;
  province: string;
  group: string;
  completionPercent: number;
  passed: boolean;
  studyTimeMinutes: number;
  stalledAtLessonId: string;
  certificateCount: number;
  enrollments: LearnerEnrollmentAdminRow[];
}

export interface AdminUserRow {
  userId: string;
  username: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  createdAt: string;
  lastLogin: string;
  isEmailVerified: boolean;
  emailVerifiedAt?: string | null;
  createdByAdmin: boolean;
  isLocked: boolean;
  role: UserRole;
  roleId: string;
  roleName: string;
  province: string;
  group: string;
  completionPercent: number;
  passed: boolean;
  studyTimeMinutes: number;
  stalledAtLessonId: string;
  certificateCount: number;
  enrollments: LearnerEnrollmentAdminRow[];
}

export interface LearnerEnrollmentAdminRow {
  courseId: string;
  courseTitle: string;
  enrollmentStatus: CourseEnrollmentStatus;
  contentCompletionPercent: number;
  quizCompletionPercent: number;
  overallCompletionPercent: number;
  quizUnlocked: boolean;
  passedAllQuizzes: boolean;
  certificateIssued: boolean;
  certificateId?: string | null;
  nextLessonId?: string | null;
  nextQuizId?: string | null;
}

export interface AnalyticsResponse {
  provinceFilter: string;
  groupFilter: string;
  totalLearners: number;
  completionRatePercent: number;
  passRatePercent: number;
  averageStudyTimeMinutes: number;
  topDifficultLessons: AnalyticsItem[];
  dropOffLessons: AnalyticsItem[];
  learners: LearnerAdminRow[];
}

export interface TrackingResponse {
  overview: TrackingOverview;
  courses: TrackingCourseOption[];
  learners: TrackingLearnerRow[];
  courseSummaries: TrackingCourseSummary[];
  lessonSummaries: TrackingLessonSummary[];
  videoSummaries: TrackingVideoSummary[];
  dropOffLessons: TrackingDropOffItem[];
  recentEvents: TrackingTimelineEvent[];
}

export interface TrackingOverview {
  totalLearners: number;
  activeLearners: number;
  stalledLearners: number;
  completedCourses: number;
}

export interface TrackingCourseOption {
  courseId: string;
  title: string;
}

export interface TrackingLearnerRow {
  userId: string;
  username: string;
  fullName: string;
  phoneNumber: string;
  province: string;
  group: string;
  status: string;
  lastActivityAt?: string | null;
  courses: TrackingCourseProgress[];
  timeline: TrackingTimelineEvent[];
}

export interface TrackingCourseProgress {
  courseId: string;
  courseTitle: string;
  enrolledAt: string;
  lastAccessedAt?: string | null;
  overallCompletionPercent: number;
  contentCompletionPercent: number;
  quizCompletionPercent: number;
  currentLessonId?: string | null;
  currentLessonTitle?: string | null;
  currentLessonType?: LessonType | null;
  lastPositionSeconds: number;
  lessons: TrackingLessonProgress[];
}

export interface TrackingLessonProgress {
  lessonId: string;
  title: string;
  type: LessonType;
  status: LessonProgressStatus;
  watchPercent: number;
  watchTimeMinutes: number;
  lastPositionSeconds: number;
  lastWatchedAt?: string | null;
  completionTime?: string | null;
  interactionAttempts: number;
  quizAttempts: number;
  quizScore: number;
  scormAttempts: number;
  scormTotalTimeSeconds: number;
  scormLocation: string;
  scormCompletionStatus?: ScormCompletionStatus | null;
  scormSuccessStatus?: ScormSuccessStatus | null;
}

export interface TrackingDropOffItem {
  lessonId: string;
  title: string;
  courseTitle: string;
  learnerCount: number;
  averageWatchPercent: number;
}

export interface TrackingCourseSummary {
  courseId: string;
  courseTitle: string;
  enrolledLearners: number;
  activeLearners: number;
  completedLearners: number;
  averageCompletionPercent: number;
}

export interface TrackingLessonSummary {
  lessonId: string;
  title: string;
  courseTitle: string;
  type: LessonType;
  startedLearners: number;
  completedLearners: number;
  dropOffLearners: number;
  averageProgressPercent: number;
}

export interface TrackingVideoSummary {
  lessonId: string;
  title: string;
  courseTitle: string;
  startedLearners: number;
  completedLearners: number;
  dropOffLearners: number;
  averageWatchPercent: number;
  averageStopPositionSeconds: number;
}

export interface TrackingTimelineEvent {
  id: string;
  userId: string;
  learnerName: string;
  courseTitle: string;
  lessonTitle: string;
  type: string;
  detail: string;
  occurredAt: string;
}

export interface SystemSettingsResponse {
  siteTitle: string;
  headerTitle: string;
  headerSubtitle: string;
  projectLogoUrl: string;
  loginLogoUrl: string;
  vnmacLogoUrl: string;
  vietnamFlagUrl: string;
  usFlagUrl: string;
  crsLogoUrl: string;
  headerBackgroundColor: string;
  headerBackgroundImageUrl: string;
  loginBackgroundImageUrl: string;
  certificateTemplateUrl: string;
  certificateTitle: string;
  certificateCourseTitle: string;
  updatedAt: string;
  updatedByUserId: string;
}

export type UpdateSystemSettingsRequest = Omit<SystemSettingsResponse, "updatedAt" | "updatedByUserId">;

export interface SystemAuditLogResponse {
  page: number;
  pageSize: number;
  totalItems: number;
  modules: string[];
  actions: string[];
  items: SystemAuditLogRow[];
}

export interface SystemAuditLogRow {
  id: string;
  occurredAt: string;
  actorUserId: string;
  actorName: string;
  actorRole?: UserRole | null;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  detailJson: string;
  ipAddress: string;
}

export interface CreateAdminUserRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  roleId?: string | null;
  province: string;
  group: string;
  markEmailAsVerified: boolean;
  isLocked: boolean;
}

export interface UpdateAdminUserRequest {
  username: string;
  password?: string | null;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  roleId?: string | null;
  province: string;
  group: string;
  isEmailVerified: boolean;
  isLocked: boolean;
}

export interface RolePermissionRequest {
  resource: string;
  canView: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
}

export interface RoleResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  isAdmin: boolean;
  userCount: number;
  permissions: RolePermissionRequest[];
}

export interface UpsertRoleRequest {
  code: string;
  name: string;
  description: string;
  permissions: RolePermissionRequest[];
}

export interface CreateCourseRequest {
  title: string;
  description: string;
  status: CourseStatus;
}

export interface UpdateCourseRequest extends CreateCourseRequest {}

export interface CreateSectionRequest {
  title: string;
  description: string;
  order: number;
}

export interface LessonAssessmentRequest {
  intro: string;
  retryHint: string;
  passScore: number;
  questionLimit?: number | null;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
}

export interface ScormScoRequest {
  id: string;
  identifier: string;
  title: string;
  launchPath: string;
  itemType: ScormScoType;
  order: number;
  masteryScore?: number | null;
}

export interface ScormPackageRequest {
  version: ScormVersion;
  identifier: string;
  title: string;
  entryPath: string;
  launchScoId?: string | null;
  manifestVersion?: string | null;
  scos: ScormScoRequest[];
}

export interface UpsertLessonRequest {
  courseId: string;
  sectionId: string;
  title: string;
  type: LessonType;
  order: number;
  durationMinutes: number;
  statusLabel: string;
  topic?: string;
  difficulty?: LessonDifficulty;
  publicationStatus?: LessonPublicationStatus;
  thumbnailUrl?: string;
  content?: LessonContent | null;
  videoContent?: VideoContent | null;
  assessment?: LessonAssessmentRequest | null;
  scormPackage?: ScormPackageRequest | null;
}

export interface UpdateLessonMetadataRequest {
  courseId: string;
  sectionId: string;
  title: string;
  order: number;
  durationMinutes: number;
  statusLabel: string;
  topic?: string;
  difficulty: LessonDifficulty;
  publicationStatus: LessonPublicationStatus;
}

export interface AdminLessonCatalogResponse {
  totalLessons: number;
  publishedLessons: number;
  draftLessons: number;
  archivedLessons: number;
  newLessonsThisWeek: number;
  page: number;
  pageSize: number;
  totalItems: number;
  topics: string[];
  items: AdminLessonCatalogRow[];
}

export interface AdminLessonCatalogRow {
  lessonId: string;
  courseId: string;
  sectionId: string;
  courseTitle: string;
  sectionTitle: string;
  title: string;
  description: string;
  type: LessonType;
  order: number;
  statusLabel: string;
  topic: string;
  difficulty: LessonDifficulty;
  publicationStatus: LessonPublicationStatus;
  learnerCount: number;
  questionCount: number;
  durationMinutes: number;
  thumbnailUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaUploadResponse {
  fileName: string;
  originalFileName: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  mediaType: string;
}

export interface MediaLibraryItem {
  id?: string;
  fileName: string;
  originalFileName: string;
  url: string;
  contentType: string;
  sizeBytes: number;
  mediaType: "document" | "image" | "video" | "caption";
  uploadedAt: string;
  isPublic: boolean;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  sortOrder: number;
  isInUse: boolean;
  usages: MediaUsage[];
}

export interface CreateMediaLibraryItemRequest {
  fileName: string;
  originalFileName: string;
  fileUrl: string;
  contentType: string;
  sizeBytes: number;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  sortOrder: number;
}

export interface UpdateMediaLibraryItemRequest {
  title: string;
  description: string;
  thumbnailUrl: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  sortOrder: number;
}

export interface MediaUsage {
  sourceType: "Lesson" | "Question";
  sourceId: string;
  sourceTitle: string;
  field: string;
  adminUrl: string;
}

export interface CreateCourseQuizRequest {
  courseId: string;
  sectionId?: string | null;
  title: string;
  description: string;
  order: number;
  assessment?: LessonAssessmentRequest | null;
}

export interface UpdateCourseQuizRequest extends CreateCourseQuizRequest {}

export interface QuestionOptionRequest {
  code: string;
  label: string;
  order: number;
  isCorrect: boolean;
}

export interface QuestionHotspotTargetRequest {
  code: string;
  label: string;
  order: number;
  shape: HotspotShape;
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  isCorrect: boolean;
}

export interface QuestionDragItemRequest {
  code: string;
  label: string;
  order: number;
}

export interface QuestionDragTargetRequest {
  code: string;
  label: string;
  order: number;
}

export interface QuestionDragPairRequest {
  dragItemCode: string;
  dragTargetCode: string;
}

export interface UpsertLessonQuestionRequest {
  lessonId?: string | null;
  quizId?: string | null;
  type: QuestionType;
  order: number;
  prompt: string;
  explanation: string;
  statement?: string | null;
  mediaTitle?: string | null;
  mediaUrl?: string | null;
  scenarioTitle?: string | null;
  scenarioContext?: string | null;
  options: QuestionOptionRequest[];
  hotspotTargets: QuestionHotspotTargetRequest[];
  dragItems: QuestionDragItemRequest[];
  dragTargets: QuestionDragTargetRequest[];
  correctPairs: QuestionDragPairRequest[];
}

export interface AdminQuestion {
  id: string;
  lessonId: string;
  type: QuestionType;
  order: number;
  prompt: string;
  explanation: string;
  statement?: string | null;
  mediaTitle?: string | null;
  mediaUrl?: string | null;
  scenarioTitle?: string | null;
  scenarioContext?: string | null;
  options: QuestionOptionRequest[];
  hotspotTargets: QuestionHotspotTargetRequest[];
  dragItems: QuestionDragItemRequest[];
  dragTargets: QuestionDragTargetRequest[];
  correctPairs: QuestionDragPairRequest[];
}

export interface ApiErrorPayload {
  key?: string;
  message?: string;
  detail?: string;
}
