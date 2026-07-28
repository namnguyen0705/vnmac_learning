import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import { useAuth } from "../../app/auth";
import {
  completeLessonContent,
  getCourseById,
  getLearnerCourseCatalog,
  getLearnerCourseProgress,
  submitInteractiveAttempt,
  updateLessonStudyState,
  updateVideoProgress,
} from "../../shared/api/learner";
import {
  findLesson,
  flattenLessons,
  flattenQuizzes,
  toLessonSummaryMap,
  toProgressMap,
} from "../../shared/lib/course";
import { LoadingBlock } from "../../shared/ui/LoadingBlock";
import { LearnerPanel } from "../../shared/ui/learner-ui";
import { MessageBanner } from "../../shared/ui/MessageBanner";
import {
  ClassifyLessonScreen,
  DEFAULT_OBJECTIVES,
  DynamicReinforceLessonScreen,
  IntroLessonScreen,
  LAST_STEP_INDEX,
  LESSON_STEPS,
  LessonCheckScreen,
  LessonCompleteContentScreen,
  LessonStructureStrip,
  QuizLessonEntry,
  VideoLessonScreen,
  createStepReadiness,
  getLessonNumber,
  getStepIndex,
  isLessonStep,
  toLikelyCorrectSubmission,
  trimLessonTitle,
  type LessonStepKey,
} from "./lesson/LessonPageParts";

export function LessonPage() {
  const { session } = useAuth();
  const { courseId = "", lessonId = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const userId = session?.user.id ?? "";
  const requestedStep = searchParams.get("step") ?? "intro";
  const currentStep = isLessonStep(requestedStep) ? requestedStep : "intro";
  const stepIndex = getStepIndex(currentStep);

  const courseQuery = useQuery({
    queryKey: ["courses", courseId],
    queryFn: () => getCourseById(courseId),
    enabled: Boolean(courseId),
  });

  const catalogQuery = useQuery({
    queryKey: ["learner", userId, "catalog"],
    queryFn: () => getLearnerCourseCatalog(userId),
    enabled: Boolean(userId),
  });

  const catalogItem = catalogQuery.data?.courses.find((item) => item.courseId === courseId);
  const isEnrolled = Boolean(catalogItem?.isEnrolled);

  const progressQuery = useQuery({
    queryKey: ["learner", userId, "course-progress", courseId],
    queryFn: () => getLearnerCourseProgress(userId, courseId),
    enabled: Boolean(userId && courseId && isEnrolled),
  });

  const lesson = useMemo(
    () => (courseQuery.data ? findLesson(courseQuery.data, lessonId) : undefined),
    [courseQuery.data, lessonId],
  );

  const orderedLessons = useMemo(
    () => (courseQuery.data ? flattenLessons(courseQuery.data).filter((item) => item.type !== "Quiz") : []),
    [courseQuery.data],
  );

  const quizzes = useMemo(() => (courseQuery.data ? flattenQuizzes(courseQuery.data) : []), [courseQuery.data]);
  const finalQuiz = quizzes.find((quiz) => !quiz.sectionId) ?? quizzes[0] ?? null;
  const quizForLesson = quizzes.find((quiz) => quiz.assessmentLessonId === lessonId) ?? finalQuiz;
  const lessonIndex = orderedLessons.findIndex((item) => item.id === lessonId);
  const previousLesson = lessonIndex > 0 ? orderedLessons[lessonIndex - 1] : null;
  const nextLesson = lessonIndex >= 0 && lessonIndex < orderedLessons.length - 1 ? orderedLessons[lessonIndex + 1] : null;
  const progressMap = progressQuery.data ? toProgressMap(progressQuery.data.progress) : new Map();
  const lessonSummaryMap = progressQuery.data ? toLessonSummaryMap(progressQuery.data.lessons) : new Map();
  const lessonSummary = lessonSummaryMap.get(lessonId);
  const progress = progressMap.get(lessonId);
  const isLessonCompleted = lessonSummary?.status === "Completed" || progress?.status === "Completed";
  const persistedStepIndex = getStepIndex(progress?.currentStep);
  const [readySteps, setReadySteps] = useState<Record<LessonStepKey, boolean>>(createStepReadiness);
  const [highestReachedIndex, setHighestReachedIndex] = useState(0);
  const [locallyCompletedLessonId, setLocallyCompletedLessonId] = useState<string | null>(null);
  const maxReachableIndex = isLessonCompleted ? LAST_STEP_INDEX : Math.max(highestReachedIndex, persistedStepIndex);
  const isCompletionSaved = isLessonCompleted || locallyCompletedLessonId === lessonId;
  const currentStepCanAdvance =
    isLessonCompleted ||
    currentStep === "complete" ||
    stepIndex < maxReachableIndex ||
    Boolean(readySteps[currentStep]);

  const markStepReady = useCallback((step: LessonStepKey, isReady = true) => {
    setReadySteps((current) => {
      if (current[step] === isReady) {
        return current;
      }

      return { ...current, [step]: isReady };
    });
  }, []);

  const invalidateLearnerQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "catalog"] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "course-progress", courseId] }),
      queryClient.invalidateQueries({ queryKey: ["learner", userId, "learning-results", courseId] }),
    ]);
  };

  const studyStateMutation = useMutation({
    mutationFn: (step: LessonStepKey) => updateLessonStudyState(userId, lessonId, step),
  });

  const completionMutation = useMutation({
    mutationFn: async () => {
      if (!lesson) {
        return null;
      }

      if (lesson.content?.steps?.length) {
        return completeLessonContent(userId, lesson.id);
      }

      if (lesson.type === "Video") {
        return updateVideoProgress(userId, lesson.id, {
          watchPercent: 100,
          watchTimeMinutes: Math.max(1, lesson.durationMinutes),
          lastPositionSeconds: lesson.durationMinutes * 60,
        });
      }

      if (lesson.type === "Interactive" && lesson.assessment?.questions?.length) {
        return submitInteractiveAttempt(userId, lesson.id, {
          answers: lesson.assessment.questions.map(toLikelyCorrectSubmission),
        });
      }

      return completeLessonContent(userId, lesson.id);
    },
    onSuccess: async (result) => {
      const completedLessonId =
        result && "lessonId" in result
          ? result.lessonId
          : result && "progress" in result
            ? result.progress.lessonId
            : lessonId;
      setLocallyCompletedLessonId(completedLessonId);
      await invalidateLearnerQueries();
    },
  });
  const canShowCompleteScreen = isCompletionSaved || completionMutation.isPending;

  const videoProgressMutation = useMutation({
    mutationFn: (payload: { watchPercent: number; watchTimeMinutes: number; lastPositionSeconds: number }) =>
      updateVideoProgress(userId, lessonId, payload),
    onSuccess: async () => {
      markStepReady("video", true);
      await queryClient.invalidateQueries({ queryKey: ["learner", userId, "course-progress", courseId] });
    },
  });

  const handleIntroReady = useCallback((isReady: boolean) => markStepReady("intro", isReady), [markStepReady]);
  const handleVideoReady = useCallback((isReady: boolean) => markStepReady("video", isReady), [markStepReady]);
  const handleClassifyReady = useCallback((isReady: boolean) => markStepReady("classify", isReady), [markStepReady]);
  const handleReinforceReady = useCallback((isReady: boolean) => markStepReady("reinforce", isReady), [markStepReady]);
  const handleCheckReady = useCallback((isReady: boolean) => markStepReady("check", isReady), [markStepReady]);


  useEffect(() => {
    setReadySteps(createStepReadiness());
    setHighestReachedIndex(0);
    setLocallyCompletedLessonId(null);
    completionMutation.reset();
    videoProgressMutation.reset();
  }, [lessonId]);

  useEffect(() => {
    setHighestReachedIndex((current) =>
      isLessonCompleted ? LAST_STEP_INDEX : Math.max(current, persistedStepIndex),
    );
  }, [isLessonCompleted, persistedStepIndex]);

  useEffect(() => {
    if (!progressQuery.data || isLessonCompleted || currentStep === "complete") {
      return;
    }

    if (stepIndex > maxReachableIndex) {
      setSearchParams({ step: LESSON_STEPS[maxReachableIndex]?.key ?? "intro" }, { replace: true });
    }
  }, [currentStep, isLessonCompleted, maxReachableIndex, progressQuery.data, setSearchParams, stepIndex]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [lessonId, currentStep]);

  useEffect(() => {
    if (!progressQuery.data || currentStep !== "complete" || canShowCompleteScreen) {
      return;
    }

    setSearchParams({ step: LESSON_STEPS[maxReachableIndex]?.key ?? "intro" }, { replace: true });
  }, [canShowCompleteScreen, currentStep, maxReachableIndex, progressQuery.data, setSearchParams]);

  useEffect(() => {
    if (!userId || !lesson || !isEnrolled || !progressQuery.data || !lessonSummary?.isUnlocked) {
      return;
    }

    if (currentStep === "complete" && !canShowCompleteScreen) {
      return;
    }

    studyStateMutation.mutate(currentStep);
  }, [canShowCompleteScreen, currentStep, isEnrolled, lesson, lessonSummary?.isUnlocked, progressQuery.data, userId]);

  useEffect(() => {
    if (!userId || !lesson || !isEnrolled || !lessonSummary?.isUnlocked) {
      return;
    }

    let lastTick = Date.now();
    const heartbeat = window.setInterval(() => {
      const now = Date.now();
      const activeSeconds = Math.min(60, Math.max(0, Math.round((now - lastTick) / 1000)));
      lastTick = now;

      if (document.visibilityState === "visible" && activeSeconds > 0) {
        updateLessonStudyState(userId, lessonId, currentStep, activeSeconds).catch(() => undefined);
      }
    }, 30_000);

    return () => window.clearInterval(heartbeat);
  }, [currentStep, isEnrolled, lesson, lessonId, lessonSummary?.isUnlocked, userId]);

  if (courseQuery.isLoading || catalogQuery.isLoading || (isEnrolled && progressQuery.isLoading)) {
    return <LoadingBlock label="Đang tải bài học..." />;
  }

  if (courseQuery.isError || catalogQuery.isError || !courseQuery.data || !lesson || !catalogItem) {
    return <MessageBanner tone="error">Không tải được bài học.</MessageBanner>;
  }

  if (!isEnrolled) {
    return (
      <div className="grid gap-6">
        <MessageBanner tone="warning">Bạn chưa đăng ký khóa học này. Hãy đăng ký khóa học trước khi học bài.</MessageBanner>
        <Button asChild className="w-fit rounded-lg" variant="outline">
          <Link to={`/app/courses/${courseId}`}>Về trang khóa học</Link>
        </Button>
      </div>
    );
  }

  if (progressQuery.isError || !progressQuery.data) {
    return <MessageBanner tone="error">Không tải được tiến độ bài học.</MessageBanner>;
  }

  if (lesson.type === "Quiz") {
    return <QuizLessonEntry courseId={courseId} quiz={quizForLesson} />;
  }

  if (lessonSummary && !lessonSummary.isUnlocked) {
    return (
      <LearnerPanel className="official-locked-lesson">
        <Lock className="size-10" />
        <div>
          <h1>Bài học chưa được mở</h1>
          <p>Bạn cần hoàn thành bài học trước đó để tiếp tục lộ trình.</p>
          <Button asChild className="mt-4 rounded-lg" variant="outline">
            <Link to="/app/courses">Quay lại lộ trình học</Link>
          </Button>
        </div>
      </LearnerPanel>
    );
  }

  const lessonNumber = getLessonNumber(lesson);
  const lessonTitle = trimLessonTitle(lesson.title);
  const introContentStep = lesson.content?.steps?.find((step) => step.key === "intro");
  const videoContentStep = lesson.content?.steps?.find((step) => step.key === "video");
  const activityContentStep = lesson.content?.steps?.find((step) => step.key === "activity");
  const reinforceContentStep = lesson.content?.steps?.find((step) => step.key === "reinforce");
  const checkContentStep = lesson.content?.steps?.find((step) => step.key === "check");
  const completeContentStep = lesson.content?.steps?.find((step) => step.key === "complete");
  const objectives = introContentStep?.points?.length
    ? introContentStep.points
    : lesson.content?.objectives?.length
      ? lesson.content.objectives
      : lesson.videoContent?.objectives?.length
        ? lesson.videoContent.objectives
        : DEFAULT_OBJECTIVES;
  const checkpoints = videoContentStep?.points?.length
    ? videoContentStep.points
    : lesson.videoContent?.checkpoints?.length
      ? lesson.videoContent.checkpoints
      : DEFAULT_OBJECTIVES;
  const videoImportantMessage = videoContentStep?.tips?.[0]?.trim() || lesson.content?.coreMessage?.trim() || "Nhận biết - Tránh xa - Báo ngay";
  const completionReady = isCompletionSaved;
  const introMustWait = !isLessonCompleted && maxReachableIndex <= getStepIndex("intro");
  const reinforceMustWait = !isLessonCompleted && maxReachableIndex <= getStepIndex("reinforce");
  const videoAlreadyWatched = isLessonCompleted || (progress?.watchPercent ?? 0) >= 100 || maxReachableIndex > getStepIndex("video");
  const canOpenStep = (step: LessonStepKey) => {
    const targetIndex = getStepIndex(step);
    return isLessonCompleted || targetIndex <= maxReachableIndex || (targetIndex === stepIndex + 1 && currentStepCanAdvance);
  };

  const goToStep = (step: LessonStepKey, force = false) => {
    if (!force && !canOpenStep(step)) {
      return;
    }

    setHighestReachedIndex((current) => Math.max(current, getStepIndex(step)));
    setSearchParams({ step });
  };

  const recordVideoWatchedToEnd = (payload: { watchPercent: number; watchTimeMinutes: number; lastPositionSeconds: number }) => {
    markStepReady("video", true);
    if (!videoProgressMutation.isPending) {
      videoProgressMutation.mutate(payload);
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      goToStep(LESSON_STEPS[stepIndex - 1].key);
      return;
    }

    if (previousLesson) {
      navigate(`/app/courses/${courseId}/lessons/${previousLesson.id}?step=complete`);
      return;
    }

    navigate("/app/courses");
  };

  const saveLessonCompletion = async () => {
    if (completionReady) {
      return true;
    }

    if (completionMutation.isPending) {
      return false;
    }

    try {
      await completionMutation.mutateAsync();
      return true;
    } catch {
      return false;
    }
  };

  const goNext = async () => {
    if (!currentStepCanAdvance) {
      return;
    }

    if (currentStep === "complete") {
      const saved = await saveLessonCompletion();
      if (!saved) {
        return;
      }

      if (nextLesson) {
        navigate(`/app/courses/${courseId}/lessons/${nextLesson.id}`);
        return;
      }

      if (finalQuiz) {
        navigate(`/app/courses/${courseId}/quizzes/${finalQuiz.id}`);
        return;
      }

      navigate(`/app/courses/${courseId}`);
      return;
    }

    if (currentStep === "check") {
      const saved = await saveLessonCompletion();
      if (saved) {
        goToStep("complete", true);
      }
      return;
    }

    goToStep(LESSON_STEPS[stepIndex + 1]?.key ?? "complete");
  };

  const nextLessonNumber = nextLesson ? getLessonNumber(nextLesson) : "";
  const nextLabel = currentStep === "complete"
    ? nextLesson
      ? `Sang bài ${nextLessonNumber}`
      : "Bài kiểm tra cuối khóa"
    : "Tiếp tục";

  return (
    <div className="official-lesson-page">
      {currentStep === "intro" ? (
        <IntroLessonScreen
          canStart={currentStepCanAdvance}
          mustWait={introMustWait}
          lessonNumber={lessonNumber}
          objectives={objectives}
          step={introContentStep}
          title={lessonTitle}
          onReadyChange={handleIntroReady}
          onStart={() => goToStep("video")}
        />
      ) : null}

      {currentStep === "video" ? (
        <VideoLessonScreen
          checkpoints={checkpoints}
          coreMessage={videoImportantMessage}
          initialWatched={videoAlreadyWatched}
          legacyVideo={lesson.videoContent}
          step={videoContentStep}
          title={lessonTitle}
          onReadyChange={handleVideoReady}
          onWatchedToEnd={recordVideoWatchedToEnd}
        />
      ) : null}

      {currentStep === "classify" ? <ClassifyLessonScreen step={activityContentStep} onReadyChange={handleClassifyReady} /> : null}

      {currentStep === "reinforce" ? (
        <DynamicReinforceLessonScreen
          canContinue={currentStepCanAdvance}
          mustWait={reinforceMustWait}
          step={reinforceContentStep}
          onReadyChange={handleReinforceReady}
        />
      ) : null}

      {currentStep === "check" ? (
        <LessonCheckScreen
          lesson={lesson}
          mutationError={completionMutation.isError}
          mutationPending={completionMutation.isPending}
          step={checkContentStep}
          onContinue={goNext}
          onReadyChange={handleCheckReady}
        />
      ) : null}

      {currentStep === "complete" ? (
        <LessonCompleteContentScreen
          checkStep={checkContentStep}
          coursePercent={progressQuery.data.contentCompletionPercent}
          lesson={lesson}
          lessonNumber={lessonNumber}
          nextLabel={nextLabel}
          progress={progress}
          step={completeContentStep}
          title={lessonTitle}
          onNext={goNext}
          onReview={() => goToStep("intro")}
          onReplay={() => goToStep("video")}
        />
      ) : null}

      <LessonStructureStrip
        currentStep={currentStep}
        nextLabel={nextLabel}
        onBack={goBack}
        onNext={goNext}
        canNext={currentStepCanAdvance}
        canOpenStep={canOpenStep}
        onStep={goToStep}
      />
    </div>
  );
}
