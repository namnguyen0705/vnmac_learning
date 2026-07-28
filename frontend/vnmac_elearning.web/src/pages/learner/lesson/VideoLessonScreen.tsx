import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Flag, Play, ShieldCheck, Target, Users, Volume2 } from "lucide-react";
import { LearnerPanel } from "../../../shared/ui/learner-ui";
import type { CourseLesson, LessonContentStep } from "../../../shared/types/api";
import { HazardScene, ObjectiveRow } from "./LessonVisuals";
import { formatVideoTime } from "./lessonUtils";

export function VideoLessonScreen({
  checkpoints,
  coreMessage,
  initialWatched,
  legacyVideo,
  step,
  title,
  onReadyChange,
  onWatchedToEnd,
}: {
  checkpoints: string[];
  coreMessage: string;
  initialWatched: boolean;
  legacyVideo?: CourseLesson["videoContent"];
  step?: LessonContentStep;
  title: string;
  onReadyChange: (isReady: boolean) => void;
  onWatchedToEnd: (payload: { watchPercent: number; watchTimeMinutes: number; lastPositionSeconds: number }) => void;
}) {
  const screenTitle = step?.title?.trim() || "XEM VIDEO";
  const sidebarTitle = step?.explanationTitle?.trim() || step?.subtitle?.trim() || "NỘI DUNG CHÍNH";
  const videoUrl = step?.mediaUrl?.trim() || legacyVideo?.videoUrl?.trim() || "";
  const posterUrl = step?.posterUrl?.trim() || legacyVideo?.posterUrl?.trim() || undefined;
  const captionUrl = step?.captionUrl?.trim() || legacyVideo?.captionsUrl?.trim() || undefined;
  const captionText =
    step?.body?.trim() ||
    legacyVideo?.intro?.trim() ||
    "Tại nhiều khu vực, vẫn còn tồn tại các vật nổ do chiến tranh để lại như bom, mìn, đạn pháo.";
  const rightImageUrl = step?.objectiveImageUrl?.trim() || "";
  const rightImageAlt = step?.objectiveImageAlt?.trim() || sidebarTitle;
  const warningText = step?.alertText?.trim() || "Hãy luôn cảnh giác! Khi không chắc chắn, hãy coi là nguy hiểm.";
  const warningSplitIndex = warningText.indexOf("!");
  const warningTitle = warningSplitIndex > 0 ? warningText.slice(0, warningSplitIndex + 1) : "Hãy luôn cảnh giác!";
  const warningBody = warningSplitIndex > 0 ? warningText.slice(warningSplitIndex + 1).trim() : warningText;
  const hasSidebarList = checkpoints.length > 0;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasWatchedToEnd, setHasWatchedToEnd] = useState(initialWatched || !videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgressPercent, setVideoProgressPercent] = useState(initialWatched || !videoUrl ? 100 : 0);
  const [videoSeconds, setVideoSeconds] = useState(0);
  const [videoDurationSeconds, setVideoDurationSeconds] = useState(0);
  const [furthestAllowedSecond, setFurthestAllowedSecond] = useState(0);

  useEffect(() => {
    const isReady = initialWatched || !videoUrl;
    setHasWatchedToEnd(isReady);
    setIsPlaying(false);
    setVideoProgressPercent(isReady ? 100 : 0);
    setVideoSeconds(0);
    setVideoDurationSeconds(0);
    setFurthestAllowedSecond(0);
    onReadyChange(isReady);
  }, [initialWatched, onReadyChange, videoUrl]);

  useEffect(() => {
    onReadyChange(hasWatchedToEnd);
  }, [hasWatchedToEnd, onReadyChange]);

  const toggleVideoPlayback = () => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      void video.play();
      return;
    }

    video.pause();
  };

  const handleVideoLoaded = (event: SyntheticEvent<HTMLVideoElement>) => {
    const duration = Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0;
    setVideoDurationSeconds(duration);
  };

  const handleVideoTimeUpdate = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const currentTime = Number.isFinite(video.currentTime) ? video.currentTime : 0;

    setVideoSeconds(currentTime);
    setVideoDurationSeconds(duration);
    setVideoProgressPercent(duration > 0 ? Math.min(100, Math.round((currentTime / duration) * 100)) : 0);
    if (!hasWatchedToEnd) {
      setFurthestAllowedSecond((current) => Math.max(current, currentTime));
    }
  };

  const handleVideoSeeking = (event: SyntheticEvent<HTMLVideoElement>) => {
    if (hasWatchedToEnd) {
      return;
    }

    const video = event.currentTarget;
    if (video.currentTime > furthestAllowedSecond + 1) {
      video.currentTime = furthestAllowedSecond;
    }
  };

  const handleVideoEnded = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    const duration = Number.isFinite(video.duration) ? video.duration : videoDurationSeconds;
    const position = Math.max(0, Math.round(duration));

    setIsPlaying(false);
    setHasWatchedToEnd(true);
    setVideoProgressPercent(100);
    setVideoSeconds(duration);
    setFurthestAllowedSecond(duration);
    onWatchedToEnd({
      watchPercent: 100,
      watchTimeMinutes: Math.max(1, Math.ceil(duration / 60)),
      lastPositionSeconds: position,
    });
  };

  return (
    <section className="official-video-screen">
      <div className="official-video-main">
        <div className="official-video-head">
          <h1>{screenTitle}</h1>
        </div>

        <div className="official-video-frame">
          {videoUrl ? (
            <video
              className="official-video-element"
              controls={hasWatchedToEnd}
              poster={posterUrl}
              ref={videoRef}
              src={videoUrl}
              onClick={!hasWatchedToEnd ? toggleVideoPlayback : undefined}
              onEnded={handleVideoEnded}
              onLoadedMetadata={handleVideoLoaded}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              onSeeking={handleVideoSeeking}
              onTimeUpdate={handleVideoTimeUpdate}
            >
              {captionUrl ? <track default kind="captions" src={captionUrl} srcLang="vi" /> : null}
            </video>
          ) : (
            <>
              <HazardScene variant="video" />
              <div className="official-video-controls">
                <Play className="size-5 fill-current" />
                <Volume2 className="size-5" />
                <div className="official-video-time-track">
                  <span />
                </div>
                <small>01:25 / 02:45</small>
                <span className="official-cc">CC</span>
              </div>
            </>
          )}
          {videoUrl && !hasWatchedToEnd ? (
            <div className="official-video-gate-controls">
              <button type="button" onClick={toggleVideoPlayback}>
                <Play className={cn("size-5", isPlaying && "opacity-60")} />
                {isPlaying ? "Đang phát" : "Phát video"}
              </button>
              <div className="official-video-watch-track">
                <span style={{ width: `${videoProgressPercent}%` }} />
              </div>
              <small>{formatVideoTime(videoSeconds)} / {formatVideoTime(videoDurationSeconds)}</small>
            </div>
          ) : null}
          {captionText ? <div className="official-video-caption">{captionText}</div> : null}
        </div>

        <div className="official-message-line">
          <ShieldCheck className="size-5" />
          <strong>THÔNG ĐIỆP QUAN TRỌNG</strong>
          <span>{coreMessage || title}</span>
        </div>
      </div>

      <LearnerPanel className="official-video-sidebar">
        <h2>{sidebarTitle}</h2>
        {rightImageUrl ? <img alt={rightImageAlt} className="official-video-side-image" src={rightImageUrl} /> : null}
        {hasSidebarList ? (
          <div className="official-video-points">
            {checkpoints.slice(0, 5).map((item, index) => (
              <ObjectiveRow
                icon={[ShieldCheck, Flag, Target, CheckCircle2, Users][index] ?? ShieldCheck}
                key={item}
                title={item}
              />
            ))}
          </div>
        ) : null}
        <div className="official-warning-note">
          <AlertTriangle className="size-7" />
          <div>
            <strong>{warningTitle}</strong>
            <span>{warningBody}</span>
          </div>
        </div>
      </LearnerPanel>
    </section>
  );
}
