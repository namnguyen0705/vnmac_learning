import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/app/auth";
import { ApiError, apiRequest, resolveApiUrl } from "@/shared/api/client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CirclePlay, LockKeyhole, CircleAlert, RotateCcw, X } from "lucide-react";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import { LearningCompanion, MascotFigure } from "@/shared/ui/LearningCompanion";
import { LoadingBlock } from "@/shared/ui/LoadingBlock";
import type { FlowAction, FlowItem, FlowSession } from "./types";
import "./flow.css";
import { FlowRichText } from "./FlowRichText";
import { comparableFlowText, withoutRepeatedHeading } from "./displayContent";
import { FlowAudioButton, stopFlowAudio } from "./FlowAudioButton";
import { FlowExamPlayer } from "./FlowExamPlayer";
import { minimumViewingSeconds } from "./flowTiming";
import { PartOneIntroduction } from "./PartOneIntroduction";

export function FlowPlayer({ lessonId }: { lessonId: string }) {
  const { session } = useAuth();
  const { courseId } = useParams();
  const client = useQueryClient();
  const userId = session?.user.id ?? "";
  const base = `/api/learning/learners/${encodeURIComponent(userId)}/lessons/${encodeURIComponent(lessonId)}/flow`;
  const [data, setData] = useState<FlowSession | null>(null);
  const [error, setError] = useState("");
  const [contentUpdated, setContentUpdated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stepsOpen, setStepsOpen] = useState(false);
  const [introDismissed, setIntroDismissed] = useState(false);
  const stepToggle = useRef<HTMLButtonElement>(null);
  const stepList = useRef<HTMLElement>(null);
  const inFlight = useRef(false);
  const live = useRef<FlowSession | null>(null);
  const generation = useRef(0);
  const accept = (value: FlowSession) => { live.current = value; setData(value); };

  useEffect(() => {
    const list = stepList.current;
    const toggle = stepToggle.current;
    if (!stepsOpen || !list || !toggle) return;

    const current = list.querySelector<HTMLButtonElement>('[aria-current="step"]');
    if (current) {
      list.scrollTop += current.getBoundingClientRect().top - list.getBoundingClientRect().top
        - (list.clientHeight - current.offsetHeight) / 2;
      current.focus({ preventScroll: true });
    }

    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !list.contains(event.target) && !toggle.contains(event.target)) {
        setStepsOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setStepsOpen(false);
      toggle.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [stepsOpen]);

  useEffect(() => {
    const controller = new AbortController();
    generation.current++;
    live.current = null; setData(null); setError("");
    if (userId && lessonId) void apiRequest<FlowSession>(base, { signal: controller.signal }).then(accept).catch(e => { if (!controller.signal.aborted) { setError(e.message); setContentUpdated(e instanceof ApiError && e.key === "flow.content_updated"); } });
    return () => { controller.abort(); generation.current++; };
  }, [base, lessonId, userId]);

  const load = async (reviewStep?: number, reviewItem = 0) => {
    if (inFlight.current) return;
    setError(""); setBusy(true); inFlight.current = true;
    try { accept(await apiRequest<FlowSession>(base + (reviewStep === undefined ? "" : `?reviewStep=${reviewStep}&reviewItem=${reviewItem}`))); }
    catch (e) { setError(e instanceof Error ? e.message : "Không tải được nội dung."); }
    finally { setBusy(false); inFlight.current = false; }
  };

  const act = async (action: FlowAction) => {
    const current = live.current;
    if (!current || inFlight.current || current.reviewing) return false;
    inFlight.current = true; setBusy(true); setError("");
    const turn = generation.current;
    try {
      const result = await apiRequest<FlowSession>(base, { method: "POST", body: { ...action, revision: current.revision, stepId: current.stepId, itemId: current.item.id } });
      if (turn !== generation.current) return false;
      accept(result);
      if (action.action !== "watch") {
        void client.invalidateQueries({ queryKey: ["learner", userId] });
        if (action.action === "answer" && result.policy !== "exam") feedbackSound(result.answer?.correct ?? false);
      }
      return true;
    } catch (e) {
      if (turn === generation.current) setError(e instanceof Error ? e.message : "Chưa lưu được tiến độ. Hãy thử lại.");
      return false;
    } finally { inFlight.current = false; setBusy(false); }
  };

  const restartUpdated = async () => {
    if (!window.confirm("Bắt đầu lại sẽ xóa tiến độ và kết quả của riêng bạn trong toàn bộ khóa học này để học nội dung mới. Bạn có muốn tiếp tục?")) return;
    setBusy(true);
    try {
      await apiRequest(base + "/restart-updated", { method: "POST" });
      await client.invalidateQueries({ queryKey: ["learner", userId] });
      window.location.assign("/app/courses");
    } catch (e) { setError(e instanceof Error ? e.message : "Chưa thể bắt đầu lại."); }
    finally { setBusy(false); }
  };
  if (!data && contentUpdated) return <MessageBanner tone="warning"><strong>Bài học đã được cập nhật</strong><p>Phiên học trước không còn tương thích. Bạn có thể bắt đầu lại theo nội dung mới. Thao tác này sẽ xóa tiến độ và kết quả của bạn trong toàn bộ khóa học hiện tại.</p><div className="mt-3 flex gap-3"><Button disabled={busy} onClick={() => void restartUpdated()}>Bắt đầu lại khóa học</Button><Button asChild variant="outline"><Link to="/app/courses">Về bài học</Link></Button></div></MessageBanner>;
  if (!data) return error ? <MessageBanner tone="error">{error} <Button onClick={() => void load()}>Tải lại</Button></MessageBanner> : <LoadingBlock label="Đang tải nội dung bài học..." />;
  if (courseId && courseId !== data.courseId) return <MessageBanner tone="error">Bài học không thuộc khóa học đang mở.</MessageBanner>;
  if (!introDismissed && !data.reviewing && data.item.id === "l1-start-intro") {
    return <div className="learning-flow learning-flow--player">
      <header className="flow-header"><Link to="/app/courses">← Về phần học</Link></header>
      <PartOneIntroduction onStart={() => setIntroDismissed(true)} />
    </div>;
  }
  const reviewIndex = data.steps.find(s => s.id === data.stepId)?.index;
  const currentStepNumber = data.steps.findIndex(step => step.id === data.stepId) + 1;
  return <div className="learning-flow learning-flow--player">
    <header className="flow-header">
      <Link to="/app/courses">← Về phần học</Link>
      <strong title={data.title}>{data.title}</strong><span>{data.progressPercent}%</span>
      {data.isSectionAssessment && <span>{data.assessmentAnsweredCount}/{data.assessmentQuestionCount} câu</span>}
      <progress aria-label="Tiến độ bài học" value={data.progressPercent} max={100} />
      <button ref={stepToggle} type="button" className="flow-mobile-position" aria-expanded={stepsOpen} aria-controls="flow-step-list" onClick={() => setStepsOpen(open => !open)}>
        <span>{currentStepNumber > 0 ? `${data.reviewing ? "Xem lại" : "Bước"} ${currentStepNumber}/${data.steps.length}` : "Nội dung bài học"}</span>
        {currentStepNumber > 0 && <strong>{data.stepTitle}</strong>}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
    </header>
    <div className="flow-layout">
      <nav ref={stepList} id="flow-step-list" data-open={stepsOpen} aria-label="Nội dung bài học" className="flow-nav" onClick={event => {
        if (stepsOpen && (event.target as Element).closest(".flow-step")) {
          setStepsOpen(false);
          stepToggle.current?.focus({ preventScroll: true });
        }
      }}>
        <div className="flow-nav-heading">Nội dung bài học</div>
        {data.steps.map((s, index) => <button className={`flow-step${s.completed ? " is-complete" : ""}`} key={s.id} disabled={busy || (!s.completed && s.id !== data.stepId)} aria-current={s.id === data.stepId ? "step" : undefined} title={s.completed ? `Xem lại: ${s.title}` : s.id === data.stepId ? `Đang học: ${s.title}` : `Chưa mở: ${s.title}`} onClick={() => void (s.completed ? load(s.index) : load())}><span className="flow-step-icon" aria-hidden="true">{s.completed ? <CheckCircle2 size={18} /> : s.id === data.stepId ? <CirclePlay size={18} /> : <LockKeyhole size={16} />}</span><span className="flow-step-label"><span className="flow-step-number">{index + 1}.</span> {s.title}</span></button>)}
        {!data.id.startsWith("p2-") && data.item.id !== "l3-return-sort" && <details className="flow-companion-guide" key={`${data.stepId}-${data.completed}`} open>
          <summary>Người bạn đồng hành</summary>
          <LearningCompanion celebration={data.completed} pose={data.completed ? "celebrate" : data.reviewing ? "guide" : data.policy === "quiz" ? "attention" : "guide"}><strong>{data.completed ? "Bạn đã hoàn thành!" : data.reviewing ? "Cùng ôn lại nhé" : data.policy === "quiz" ? "Làm từng câu một nhé" : data.item.kind === "video" ? "Cùng xem video" : ["choice", "classify", "sort", "hotspot"].includes(data.item.kind) ? "Đến lượt bạn thử sức" : "Quan sát và ghi nhớ"}</strong><p>{data.completed ? "Chọn nút bên dưới nội dung để đi tiếp hoặc xem lại các mục bên trái." : data.reviewing ? "Dùng Quay lại và Xem tiếp để ôn tập. Tiến độ của bạn được giữ nguyên." : data.policy === "quiz" ? "Xác nhận đáp án để xem phản hồi. Bạn có thể dừng đếm ngược nếu cần đọc thêm." : data.item.kind === "video" ? "Xem hết video để mở bước tiếp theo. Có thể bật hoặc tắt âm thanh." : ["choice", "classify", "sort", "hotspot"].includes(data.item.kind) ? "Làm theo hướng dẫn trong bài rồi nhấn Xác nhận. Mình sẽ cùng bạn xem phản hồi." : "Đọc nội dung và xem hình ảnh. Khi sẵn sàng, chọn Tiếp theo."}</p></LearningCompanion>
        </details>}
      </nav>
      <main className="flow-main">
        {error && <MessageBanner tone="error">{error} <button onClick={() => void load()}>Tải lại trạng thái</button></MessageBanner>}
        {data.exam && !data.reviewing && (data.policy === "exam" || data.stepId === "complete") ? <FlowExamPlayer data={data} busy={busy} onAction={act} reload={() => load()} /> : data.quizFinished && !data.completed && !data.reviewing ? <section className="flow-card flow-result flow-result--retry">
          <div className="flow-result-panel"><MascotFigure pose="encourage" className="mascot-figure--milestone" /><span className="flow-result-score">{data.correctCount}/{data.itemCount} câu đúng</span>
          <h1>{data.isSectionAssessment ? "CHƯA HOÀN THÀNH" : "Hãy thử lại nhé!"}</h1><p>{data.isSectionAssessment ? "Bạn chưa trả lời đúng 100% số câu hỏi." : "Bạn chưa trả lời đúng tất cả các câu hỏi."}</p>
          <p>{data.isSectionAssessment ? "Hãy làm lại bài kiểm tra để hoàn thành Phần học nhé." : `Hãy xem lại những nội dung cần ghi nhớ và làm lại toàn bộ bài kiểm tra gồm ${data.itemCount} câu.`}</p>
          <Button disabled={busy} onClick={() => void act({ action: "retry" })}><RotateCcw size={16} />{data.isSectionAssessment ? "LÀM LẠI" : "LÀM LẠI BÀI KIỂM TRA"}</Button></div>
        </section> : <FlowScreen key={`${data.stepId}-${data.item.id}-${data.reviewing}-${data.completed}`} data={data} busy={busy} onAction={act} />}
        {data.reviewing && <div className="flow-review-controls">
          <div className="flow-review-paging">
            <Button variant="outline" disabled={busy || data.itemIndex === 0} onClick={() => void load(reviewIndex, data.itemIndex - 1)}><ChevronLeft size={16} />Quay lại</Button>
            <span className="flow-review-position">{data.itemIndex + 1} / {data.itemCount}</span>
            <Button variant="outline" disabled={busy || data.itemIndex + 1 >= data.itemCount} onClick={() => void load(reviewIndex, data.itemIndex + 1)}>Xem tiếp<ChevronRight size={16} /></Button>
          </div>
          <Button className="flow-resume" disabled={busy} onClick={() => void load()}>{data.completed ? "Kết thúc xem lại" : "Tiếp tục học"}</Button>
        </div>}
      </main>
    </div>
  </div>;
}

export function FlowScreen({ data, busy, onAction }: { data: FlowSession; busy: boolean; onAction: (action: FlowAction) => Promise<boolean> }) {
  const item = data.item;
  const introduction = item.kind === "text" && data.itemIndex === 0 && data.steps[0]?.id === data.stepId;
  const completion = data.steps[data.steps.length - 1]?.id === data.stepId && item.kind === "text";
  const displayBody = withoutRepeatedHeading(item.body, item.title);
  const showNarration = item.narration && ![item.title, item.body, displayBody].some(value => comparableFlowText(value) === comparableFlowText(item.narration));
  const feedbackTitle = data.answer?.correct ? "Chính xác!" : "Chưa chính xác";
  const feedbackDetail = data.answer?.feedback?.trim();
  const showFeedbackDetail = feedbackDetail && comparableFlowText(feedbackDetail) !== comparableFlowText(feedbackTitle);
  const detailRepeatsStatus = Boolean(feedbackDetail && comparableFlowText(feedbackDetail).startsWith(comparableFlowText(feedbackTitle)));
  const [codes, setCodes] = useState<string[]>(data.answer?.codes ?? []);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const appliedScenario = item.id === "l3-return-sort";
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [loadedImages, setLoadedImages] = useState<string[]>([]);
  const [mediaError, setMediaError] = useState("");
  const [audioDone, setAudioDone] = useState(!item.audioUrl);
  const [videoDone, setVideoDone] = useState(false);
  const [endedPosition, setEndedPosition] = useState<number | null>(null);
  const [screenStartedAt] = useState(() => performance.now());
  const [clock, setClock] = useState(() => performance.now());
  const [loadedAt, setLoadedAt] = useState(0);
  const [muted, setMuted] = useState(false);
  const feedback = useRef<HTMLDivElement>(null);
  const [dismissedAnswer, setDismissedAnswer] = useState<FlowSession["answer"]>();
  useEffect(() => {
    if (!data.answer || data.reviewing || !feedback.current || window.matchMedia("(max-width: 800px)").matches) return;
    const panel = feedback.current.closest<HTMLElement>(".flow-screen-content");
    if (!panel) return;
    const target = feedback.current.getBoundingClientRect();
    const bounds = panel.getBoundingClientRect();
    if (target.bottom > bounds.bottom || target.top < bounds.top)
      panel.scrollTo({ top: panel.scrollTop + target.top - bounds.top - 16, behavior: "smooth" });
  }, [data.answer, data.reviewing]);
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const watchBusy = useRef(false);
  const lastPing = useRef(0);
  const endReported = useRef(false);
  const autoAdvanceAttempted = useRef(false);
  const [countdown, setCountdown] = useState(7);
  const [countdownPaused, setCountdownPaused] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const question = ["choice", "classify", "sort", "hotspot", "match", "group"].includes(item.kind);
  const lockedAnswer = Boolean(data.answer && (data.policy !== "practice" || data.answer.correct));
  const images = [item.imageUrl, ...item.options.map(x => x.imageUrl)].filter(Boolean);
  const imagesDone = images.every(url => loadedImages.includes(url!));
  // Start from receipt of this screen, using a monotonic local clock. Server and
  // browser wall clocks can differ; the API also requires at least one second.
  const elapsed = (clock - screenStartedAt) / 1000;
  const requiredSeconds = minimumViewingSeconds(item.durationSeconds);
  const ready = !data.blockedReason && !mediaError && (question
    ? Boolean(data.answer && (data.policy !== "practice" || data.answer.correct))
    : elapsed >= requiredSeconds && imagesDone && (!images.length || loadedAt > 0 && (clock - loadedAt) / 1000 >= requiredSeconds) && audioDone && (item.kind !== "video" || videoDone));

  useEffect(() => { const timer = window.setInterval(() => setClock(performance.now()), 250); return () => window.clearInterval(timer); }, []);
  useEffect(() => { if (imagesDone && images.length > 0 && !loadedAt) setLoadedAt(performance.now()); }, [imagesDone, images.length, loadedAt]);
  // Reading and gallery screens advance only on request. Answers allow time to read feedback.
  const slideshow = (item.kind === "gallery" || item.kind === "video") && item.autoAdvance;
  useEffect(() => {
    if (!slideshow || !ready || data.reviewing || busy || autoAdvanceAttempted.current) return;
    autoAdvanceAttempted.current = true;
    void onAction({ action: "advance" });
  }, [slideshow, ready, data.reviewing, busy, onAction]);
  useEffect(() => {
    if (data.id.startsWith("p2-") || appliedScenario || !question || !ready || !data.answer || data.reviewing || busy || countdownPaused || autoAdvanceAttempted.current) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) { setCountdownPaused(true); return; }
      if (countdown > 1) setCountdown(value => value - 1);
      else { autoAdvanceAttempted.current = true; void onAction({ action: "advance" }); }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [appliedScenario, question, ready, data.answer, data.reviewing, busy, countdownPaused, countdown, onAction]);

  useEffect(() => { if (data.answer && !data.answer.correct && data.policy === "practice" && (item.kind === "sort" && !appliedScenario || item.kind === "classify")) setCodes([]); }, [data.answer, data.policy, item.kind, appliedScenario]);
  const placeCard = (code: string, index: number) => {
    if (lockedAnswer || busy || data.reviewing || data.blockedReason) return;
    setCodes(current => { const next = current.filter(c => c !== code); next.splice(Math.min(index, next.length), 0, code); return next; });
    setSelectedCard(null);
  };
  const image = (url: string, alt: string) => <img src={resolveApiUrl(url)} alt={alt} onLoad={() => setLoadedImages(current => [...new Set([...current, url])])} onError={() => setMediaError("Không tải được hình ảnh. Vui lòng thử lại hoặc báo quản trị viên.")} />;
  const pick = (code: string) => { if (!lockedAnswer && !busy) setCodes(current => item.multiple ? current.includes(code) ? current.filter(c => c !== code) : [...current, code] : [code]); };
  const watch = async (position: number) => {
    if (watchBusy.current || busy || data.reviewing) return false;
    watchBusy.current = true;
    try { return await onAction({ action: "watch", positionSeconds: position }); }
    finally { watchBusy.current = false; lastPing.current = Date.now(); }
  };
  useEffect(() => {
    if (endedPosition === null || busy || watchBusy.current || endReported.current) return;
    endReported.current = true;
    if (data.reviewing) setVideoDone(true);
    else void watch(endedPosition).then(ok => { if (ok) setVideoDone(true); });
  }, [endedPosition, busy, data.reviewing, watch]);
  const submit = () => { setCountdown(7); setCountdownPaused(false); autoAdvanceAttempted.current = false; return onAction({ action: "answer", codes, ...(point ?? {}) }); };
  return <section className={`flow-card flow-card--${item.kind}${completion ? " flow-completion-screen" : ""}${!question && item.kind === "text" && data.itemIndex === 0 && data.steps[0]?.id === data.stepId ? " flow-intro-screen" : ""}`}>
    <div className="flow-screen-content">
    <div className="flow-screen-meta"><span>{data.policy === "quiz" ? `${data.answeredCount}/${data.itemCount} câu đã trả lời` : `${data.itemIndex + 1}/${data.itemCount}`}</span></div>
    {completion && <MascotFigure pose="celebrate" className="mascot-figure--milestone" />}
    {(introduction || !data.id.startsWith("p2-") && question && data.itemIndex === 0 && !data.answer && !data.reviewing) && !completion && !appliedScenario && <MascotFigure pose={introduction ? "welcome" : "guide"} className="mascot-figure--intro" />}
    <h1>{item.title}</h1>
    {completion && data.isSectionAssessment && <div className="flow-ticks" aria-label="Đã trả lời đúng 12 câu">{Array.from({ length: 12 }, (_, index) => <span key={index} style={{ animationDelay: `${index * 0.1}s` }} aria-hidden="true">✓</span>)}</div>}
    {displayBody && <FlowRichText value={displayBody} />}
    {showNarration && <div className="flow-transcript"><FlowRichText value={item.narration} /></div>}
    {data.blockedReason && <MessageBanner tone="warning">{data.blockedReason}</MessageBanner>}
    {mediaError && <MessageBanner tone="error">{mediaError}</MessageBanner>}
    {item.audioUrl && <audio ref={audio} controls autoPlay={!data.reviewing} preload="metadata" src={resolveApiUrl(item.audioUrl)} onPlay={() => { stopFlowAudio(); video.current?.pause(); }} onEnded={() => setAudioDone(true)} onError={() => setMediaError("Không tải được lời đọc.")} />}
    {item.kind === "video" && item.videoUrl && <div className="flow-video">
      <video ref={video} crossOrigin={item.captionUrl ? "anonymous" : undefined} src={resolveApiUrl(item.videoUrl)} playsInline controls autoPlay={!data.reviewing} muted={muted} onPlay={() => { stopFlowAudio(); setAutoplayBlocked(false); audio.current?.pause(); }}
        onLoadedMetadata={e => {
          const player = e.currentTarget;
          player.currentTime = data.reviewing ? 0 : data.lastPosition;
          if (!data.reviewing) void player.play().catch(() => { setAutoplayBlocked(true); });
        }}
        onError={() => setMediaError("Không tải được video. Nội dung chưa được ghi nhận hoàn thành.")}
        onSeeking={e => { if (!data.reviewing && e.currentTarget.currentTime > data.lastPosition + 6) e.currentTarget.currentTime = data.lastPosition; }}
        onTimeUpdate={e => { if (!data.reviewing && !e.currentTarget.seeking && !e.currentTarget.paused && Date.now() - lastPing.current >= 4500) void watch(e.currentTarget.currentTime); }}
        onEnded={e => setEndedPosition(Math.min(e.currentTarget.duration, item.durationSeconds))}>
        {item.captionUrl && <track kind="captions" srcLang="vi" label="Tiếng Việt" src={resolveApiUrl(item.captionUrl)} default />}
      </video>
      {autoplayBlocked && <Button variant="outline" onClick={() => { void video.current?.play().catch(() => setAutoplayBlocked(true)); }}>Phát video</Button>}
      <div className="flow-video-status"><span>Đã ghi nhận {Math.min(Math.round(item.durationSeconds), Math.round(data.watchedSeconds))}/{Math.round(item.durationSeconds)} giây</span><button onClick={() => setMuted(!muted)}>{muted ? "Bật âm thanh" : "Tắt âm thanh"}</button></div>
      {endedPosition !== null && !videoDone && !busy && <Button variant="outline" onClick={() => { endReported.current = false; setEndedPosition(null); if (video.current) { video.current.currentTime = Math.max(0, data.lastPosition - 2); void video.current.play(); } }}>Tiếp tục xem từ mốc đã lưu</Button>}
    </div>}
    <div className={`flow-activity${item.kind === "classify" ? " flow-activity--classify" : ""}`}>
    {item.imageUrl && item.kind !== "hotspot" && <div className="flow-image" draggable={item.kind === "classify" && !lockedAnswer} onDragStart={e => e.dataTransfer.setData("text/plain", item.id)}>{image(item.imageUrl, item.title)}</div>}
    {item.kind === "hotspot" && item.imageUrl && <div className="flow-hotspot" onClick={e => {
      if (lockedAnswer || busy || data.reviewing) return;
      const rect = e.currentTarget.getBoundingClientRect();
      setPoint({ x: 100 * (e.clientX - rect.left) / rect.width, y: 100 * (e.clientY - rect.top) / rect.height });
    }}>
      {image(item.imageUrl, item.title)}
      {data.answer?.correct && <svg className="flow-hotspot-highlight" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{item.options.filter(o => data.answer?.codes.includes(o.code)).map(o => o.polygon?.length ? <polygon key={o.code} points={o.polygon.map(p => `${p.x},${p.y}`).join(" ")} /> : <rect key={o.code} x={o.x - o.width / 2} y={o.y - o.height / 2} width={o.width} height={o.height} />)}</svg>}
      {item.options.map(option => <button key={option.code} disabled={lockedAnswer || busy || data.reviewing} aria-label={option.label} style={{ left: `${option.x}%`, top: `${option.y}%` }} onClick={e => { e.stopPropagation(); setPoint({ x: option.x, y: option.y }); }}>{option.label}</button>)}
      {point && <span className={`flow-pin ${data.answer ? data.answer.correct ? "correct" : "wrong" : ""}`} style={{ left: `${point.x}%`, top: `${point.y}%` }}>{data.answer ? data.answer.correct ? "✓" : "×" : "+"}</span>}
    </div>}
    {(item.kind === "choice" || item.kind === "classify") && <fieldset className={`flow-options ${item.kind === "classify" ? "flow-drop-targets" : ""}`} disabled={busy || lockedAnswer || data.reviewing || !!data.blockedReason}>
      <legend>{item.multiple ? "Có thể chọn nhiều đáp án. Chọn đầy đủ rồi nhấn Xác nhận." : item.kind === "classify" ? "Chọn nhóm phù hợp" : "Chọn một đáp án."}</legend>
      {item.options.map(option => <label key={option.code} className={codes.includes(option.code) ? "selected" : ""} onDragOver={e => { if (item.kind === "classify") e.preventDefault(); }} onDrop={e => { e.preventDefault(); if (e.dataTransfer.getData("text/plain") === item.id) pick(option.code); }}>
        <input type={item.multiple ? "checkbox" : "radio"} name={item.id} checked={codes.includes(option.code)} onChange={() => pick(option.code)} />
        {option.imageUrl && image(option.imageUrl, option.label)}<span>{item.kind === "choice" ? `${option.code}. ` : ""}{option.label}</span><FlowAudioButton url={option.audioUrl} label={`Nghe lựa chọn ${option.code}`} />
      </label>)}
    </fieldset>}
    </div>
    {(item.kind === "match" || item.kind === "group") && <fieldset className="flow-pairs" disabled={busy || lockedAnswer || data.reviewing || !!data.blockedReason}>
      <legend>{item.kind === "match" ? "Chọn ý phù hợp cho từng mục. Mỗi ý chỉ được nối một lần." : "Chọn nhóm cho từng câu nói."}</legend>
      {item.leftItems?.map(left => <label key={left.code}><span>{left.label}<FlowAudioButton url={left.audioUrl} label="Nghe mục cần ghép" /></span><select aria-label={`Chọn ý cho ${left.label}`} value={codes.find(c => c.startsWith(left.code + ":"))?.split(":")[1] ?? ""} onChange={e => setCodes(current => [...current.filter(c => !c.startsWith(left.code + ":")), ...(e.target.value ? [left.code + ":" + e.target.value] : [])])}><option value="">Chọn ý phù hợp</option>{item.options.map(o => <option key={o.code} value={o.code} disabled={item.kind === "match" && codes.some(c => c === c.split(":")[0] + ":" + o.code && !c.startsWith(left.code + ":"))}>{o.label}</option>)}</select></label>)}<div className="flow-pair-audio">{item.options.map(o => <FlowAudioButton key={o.code} url={o.audioUrl} label={`Nghe ${o.label}`} />)}</div>
    </fieldset>}
    {item.kind === "sort" && <div className="flow-sort">
      <p>Kéo từng hình vào Bước 1–4, hoặc chọn thẻ rồi chọn vị trí. Có thể dùng nút Thêm và nút đổi vị trí.</p>
      <div className="flow-sort-pool">{item.options.filter(o => !codes.includes(o.code)).map(o => <div draggable={!lockedAnswer && !data.reviewing} key={o.code} onDragStart={e => e.dataTransfer.setData("text/plain", o.code)}>{o.imageUrl && image(o.imageUrl, o.label)}<span>{o.label}</span><Button variant="outline" aria-pressed={selectedCard === o.code} disabled={busy || lockedAnswer || data.reviewing || !!data.blockedReason} onClick={() => setSelectedCard(o.code)}>Chọn thẻ</Button><Button variant="outline" disabled={busy || lockedAnswer || data.reviewing || !!data.blockedReason} onClick={() => placeCard(o.code, codes.length)}>Thêm</Button></div>)}</div>
      {item.options.map((_, i) => <div key={i} className="flow-sort-slot" onDragOver={e => e.preventDefault()} onDrop={e => {
        e.preventDefault(); const code = e.dataTransfer.getData("text/plain");
        if (!lockedAnswer && !busy && !data.reviewing && item.options.some(o => o.code === code)) { const next = codes.filter(c => c !== code); next.splice(Math.min(i, next.length), 0, code); setCodes(next); }
      }}><strong>Bước {i + 1}</strong><span>{item.options.find(o => o.code === codes[i])?.label ?? "Thả hình vào đây"}</span>
        {selectedCard && <button disabled={busy || lockedAnswer || data.reviewing || !!data.blockedReason} onClick={() => placeCard(selectedCard, i)}>Đặt thẻ vào bước {i + 1}</button>}
        {codes[i] && <><button disabled={busy || lockedAnswer || data.reviewing || i === 0} onClick={() => { const next = [...codes]; [next[i - 1], next[i]] = [next[i], next[i - 1]]; setCodes(next); }}>↑</button><button disabled={busy || lockedAnswer || data.reviewing} onClick={() => setCodes(codes.filter((_, j) => j !== i))}>Bỏ</button></>}
      </div>)}
    </div>}
    {data.answer && <div className={data.reviewing ? undefined : "flow-inline-feedback-audio"}><FlowAudioButton url={data.feedbackAudioUrl} label="Nghe giải thích" /></div>}
    {data.answer && !data.reviewing && <div ref={feedback} data-dismissed={dismissedAnswer === data.answer} className={`flow-mascot-feedback ${data.answer.correct ? "is-correct" : "is-wrong"}`}>
      <button className="flow-dismiss-feedback" type="button" aria-label="Đóng phản hồi" onClick={() => setDismissedAnswer(data.answer)}><X size={16} aria-hidden="true" /></button>
      <div className={`flow-feedback flow-mascot-bubble ${data.answer.correct ? "correct" : "wrong"}`} role="status" aria-live="polite">
        <span className="flow-feedback-icon" aria-hidden="true">{data.answer.correct ? <CheckCircle2 size={22} /> : <CircleAlert size={22} />}</span>
        <div>{!detailRepeatsStatus && <strong>{feedbackTitle}</strong>}{data.answer?.correctCodes && !data.answer.correct && <p>Đáp án đúng: {data.answer?.correctCodes.map(c => { const [left, right] = c.split(":"); return right ? `${item.leftItems?.find(l => l.code === left)?.label}: ${item.options.find(o => o.code === right)?.label}` : `${c}. ${item.options.find(o => o.code === c)?.label}`; }).join("; ")}</p>}{showFeedbackDetail ? <p>{feedbackDetail}</p> : detailRepeatsStatus && <strong>{feedbackDetail}</strong>}</div>
      </div>
      {data.feedbackAudioUrl && <div className="flow-feedback-audio"><FlowAudioButton url={data.feedbackAudioUrl} label="Nghe giải thích" /></div>}
      {!data.id.startsWith("p2-") && !appliedScenario && <MascotFigure pose={data.answer.correct ? "encourage" : "attention"} className="mascot-figure--feedback" />}
    </div>}
    </div>
    {!data.reviewing && <div className="flow-actions">
      {question && !lockedAnswer && !data.blockedReason && <Button disabled={busy || !imagesDone || !!mediaError || (item.kind === "hotspot" ? !point : !codes.length || item.kind === "sort" && codes.length !== item.options.length || ["match", "group"].includes(item.kind) && codes.length !== item.leftItems?.length)} onClick={() => void submit()}>{busy ? "Đang kiểm tra..." : appliedScenario ? "KIỂM TRA" : "XÁC NHẬN"}</Button>}
      {question && !data.id.startsWith("p2-") && !appliedScenario && ready && data.answer && <div className="flow-next-countdown" role="status"><span>{countdownPaused ? "Đã dừng tự chuyển" : `Tự chuyển sau ${countdown} giây`}</span><button type="button" onClick={() => setCountdownPaused(value => !value)}>{countdownPaused ? "Tiếp tục đếm" : "Dừng đếm"}</button></div>}
      {data.completed ? <Button asChild><Link to={data.nextUrl}>{data.nextLabel}</Link></Button> : ready && (!slideshow || data.reviewing) && <Button disabled={busy} onClick={() => void onAction({ action: "advance" })}>{busy ? "Đang lưu..." : item.actionLabel || (data.policy === "quiz" && data.itemIndex === data.itemCount - 1 ? "XEM KẾT QUẢ" : item.id.endsWith("-intro") ? "BẮT ĐẦU HỌC" : "TIẾP THEO")}</Button>}
      {!data.completed && !question && !ready && !data.blockedReason && !mediaError && <p>Hãy xem hết nội dung để tiếp tục.</p>}
    </div>}
  </section>;
}

function feedbackSound(correct: boolean) {
  try {
    const context = new AudioContext(); const oscillator = context.createOscillator(); const gain = context.createGain();
    oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = correct ? 740 : 220;
    gain.gain.setValueAtTime(.06, context.currentTime); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + .2);
    oscillator.start(); oscillator.stop(context.currentTime + .2); oscillator.onended = () => void context.close();
  } catch { /* Visual feedback remains available when the browser blocks audio. */ }
}


