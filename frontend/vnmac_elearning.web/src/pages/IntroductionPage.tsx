import "./admin/public-content-editor.css";
import { FlowRichText } from "@/features/learning-flow/FlowRichText";
import { isRichText } from "@/features/learning-flow/richText";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CirclePlay, Pause, Play, RotateCcw, Sprout, Users, Volume2, VolumeX, X } from "lucide-react";
import { usePublicContent, paragraphs, type PublicContent } from "@/shared/lib/publicContent";
import { resolveApiUrl } from "@/shared/api/client";
import "./introduction.css";
import { RapportHeader } from "@/shared/ui/RapportHeader";
import "./rapport-home.css";
import "./rapport-reader.css";
import "./intro-player.css";

const watchedKey = "vnmac:introduction:v1:completed";
const videoUrl = `${import.meta.env.BASE_URL}media/introduction.mp4`;
const headings = new Set(["CRS và lĩnh vực Hành động bom mìn", "Giáo dục phòng tránh tai nạn bom mìn, vật nổ cho cộng đồng", "Giáo dục phòng tránh rủi ro gắn với thay đổi hành vi", "Tăng cường năng lực cho lực lượng cộng tác viên tại cộng đồng", "Khóa học trực tuyến giáo dục phòng tránh tai nạn bom mìn, vật nổ và thay đổi hành vi xã hội", "Mục tiêu khóa học", "Đối tượng tham gia", "Học tập linh hoạt – thực hành – dễ áp dụng", "Học để hành động an toàn"]);

function hasWatched(key: string) {
  try { return localStorage.getItem(key) === "true"; } catch { return false; }
}

function IntroductionVideo({ optional, onClose, source, storageKey }: { optional: boolean; onClose: () => void; source: string; storageKey: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const furthest = useRef(0);
  const [completed, setCompleted] = useState(optional);
  const [muted, setMuted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [touchControls, setTouchControls] = useState(false);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const element = dialog.current;
    const media = video.current;
    let disposed = false;
    element?.showModal();
    element?.focus({ preventScroll: true });
    // Browsers may require a gesture for audio; keep autoplay working if they do.
    void media?.play().catch(() => {
      if (disposed || !media) return;
      media.muted = true;
      setMuted(true);
      void media.play().catch(() => { if (!disposed) setPlaying(false); });
    });
    return () => {
      disposed = true;
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (!touchControls) return;
    const timer = window.setTimeout(() => setTouchControls(false), 3500);
    return () => window.clearTimeout(timer);
  }, [touchControls]);

  function finish() {
    const element = video.current;
    // Only a full, continuous viewing unlocks the first-visit dialog.
    if (!element || furthest.current < element.duration - 1) return;
    setCompleted(true);
    setProgress(100);
    try { localStorage.setItem(storageKey, "true"); } catch { /* Storage may be unavailable in private browsers. */ }
  }

  function togglePlayback() {
    if (video.current?.paused) void video.current.play().catch(() => setPlaying(false));
    else video.current?.pause();
  }

  function formatTime(value: number) {
    if (!Number.isFinite(value)) return "0:00";
    return `${Math.floor(value / 60)}:${Math.floor(value % 60).toString().padStart(2, "0")}`;
  }

  return <dialog ref={dialog} tabIndex={-1} className={`intro-dialog mascot-player ${touchControls ? "is-touch-controls" : ""}`} aria-label="Video chào mừng RAPPORT" onCancel={(event) => { event.preventDefault(); if (completed || failed) onClose(); }}
    onPointerDown={(event) => {
      if (event.pointerType !== "touch" || (event.target as HTMLElement).closest("button, input")) return;
      setTouchControls((visible) => !visible);
    }}>
    <button className="mascot-player-close" type="button" disabled={!completed && !failed} onClick={onClose} aria-label="Đóng video"><X size={22} /></button>
    <div className="mascot-player-stage">
        <video ref={video} src={source} autoPlay muted={muted} playsInline preload="auto" disablePictureInPicture controls={false}
          onLoadedMetadata={() => setDuration(video.current?.duration ?? 0)}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}
          onRateChange={() => { if (video.current) video.current.playbackRate = 1; }}
          onSeeking={() => { const el = video.current; if (el && !completed && Math.abs(el.currentTime - furthest.current) > 0.5) el.currentTime = furthest.current; }}
          onTimeUpdate={() => {
            const el = video.current;
            if (!el || el.seeking) return;
            if (!completed && el.currentTime > furthest.current + 1.5) { el.currentTime = furthest.current; return; }
            furthest.current = Math.max(furthest.current, el.currentTime);
            setElapsed(el.currentTime);
            setProgress(el.duration ? el.currentTime / el.duration * 100 : 0);
          }} onEnded={finish} />
      </div><div className="mascot-player-controls">
        <div className="mascot-player-timeline"><div role="progressbar" aria-label="Tiến độ xem video" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ width: `${progress}%` }} /></div>{completed && <input type="range" min={0} max={100} step={0.1} value={progress} aria-label="Tua video" onChange={(event) => { const el = video.current; if (el && Number.isFinite(el.duration)) { el.currentTime = Number(event.target.value) / 100 * el.duration; setProgress(Number(event.target.value)); } }} />}</div>
        <div className="mascot-player-toolbar"><button className="mascot-player-play" type="button" aria-label={playing ? "Tạm dừng" : "Phát video"} onClick={togglePlayback}>{playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}</button><button className="mascot-player-sound" type="button" aria-label={muted ? "Bật âm thanh" : "Tắt âm thanh"} aria-pressed={!muted} onClick={() => setMuted(!muted)}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button><span className="mascot-player-time">{formatTime(elapsed)} <span>/ {formatTime(duration)}</span></span>{completed && <button type="button" className="mascot-player-restart" aria-label="Xem lại từ đầu" onClick={() => { if (video.current) { video.current.currentTime = 0; void video.current.play().catch(() => setPlaying(false)); } }}><RotateCcw size={18} /></button>}</div>
      </div>
    {failed && <p role="alert" className="mascot-player-error">Không tải được video. Kiểm tra kết nối và <button type="button" onClick={() => { setFailed(false); furthest.current = 0; setElapsed(0); setProgress(0); video.current?.load(); void video.current?.play().catch(() => setPlaying(false)); }}>thử lại</button>.</p>}
  </dialog>;
}

const sceneUrl = `${import.meta.env.BASE_URL}media/rapport-design-reference.png`;
const sceneDescriptions = ["Minh họa lực lượng chuyên môn khảo sát tại khu vực đồi núi", "Minh họa buổi giáo dục cộng đồng tại Việt Nam", "Minh họa người dân tại một vùng quê Việt Nam", "Minh họa giáo dục và gắn kết cộng đồng"];

const photoRegions = [[490, 62, 429, 292], [440, 374, 429, 268], [53, 755, 400, 293], [480, 1417, 439, 227], [521, 1082, 349, 239]];
function Scene({ scene, label }: { scene: number; label: string }) {
  const [x, y, width, height] = photoRegions[scene];
  return <svg role="img" aria-label={label} className="rapport-scene" viewBox={`${x} ${y} ${width} ${height}`} preserveAspectRatio="xMidYMid slice">
    <image href={sceneUrl} width={919} height={1712} />
  </svg>;
}

function SourceText({ paragraphs }: { paragraphs: string[] }) {
  if (paragraphs.some(isRichText)) return <FlowRichText className="rapport-source-text public-editor-copy" value={paragraphs.join("\n\n")} />;
  return <div className="rapport-source-text">{paragraphs.map((paragraph, index) => headings.has(paragraph.trim()) ? <h3 key={index}>{paragraph}</h3> : <p key={index}>{paragraph}</p>)}</div>;
}

function IntroductionReader({ index, onChange, onClose, settings }: { index: number; onChange: (index: number) => void; onClose: () => void; settings: PublicContent }) {
  const labels = settings.sections.map(s => s.label);
  const content = settings.sections.map(s => ({ title: s.title, paragraphs: paragraphs(s.body) }));
  const dialog = useRef<HTMLDialogElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const pressedOutside = useRef(false);
  const closeStarted = useRef(false);
  const closeTimer = useRef<number>();
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element?.showModal();
    return () => {
      window.clearTimeout(closeTimer.current);
      element?.close();
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (body.current) body.current.scrollTop = 0;
    title.current?.focus({ preventScroll: true });
  }, [index]);

  function isOutside(event: { clientX: number; clientY: number }) {
    const bounds = dialog.current?.getBoundingClientRect();
    return Boolean(bounds && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom));
  }

  function requestClose() {
    if (closeStarted.current) return;
    closeStarted.current = true;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }
    setClosing(true);
    closeTimer.current = window.setTimeout(onClose, 150);
  }

  function changeSection(next: number) {
    if (!closeStarted.current) onChange(next);
  }

  return <dialog ref={dialog} className={`rapport-reader${closing ? " is-closing" : ""}`} aria-labelledby="rapport-reader-title"
    onCancel={(event) => { event.preventDefault(); requestClose(); }}
    onPointerDown={(event) => { pressedOutside.current = isOutside(event); }}
    onClick={(event) => { if (pressedOutside.current && isOutside(event)) requestClose(); pressedOutside.current = false; }}>
    <header className="rapport-reader-header"><div><p>GIỚI THIỆU · 0{index + 1}</p><h2 ref={title} tabIndex={-1} id="rapport-reader-title">{labels[index]}</h2></div><button type="button" className="rapport-reader-close" onClick={requestClose} disabled={closing} aria-label="Đóng nội dung chi tiết"><X size={23} /></button></header>
    <div ref={body} className="rapport-reader-body" tabIndex={0} role="region" aria-label={`Nội dung đầy đủ về ${labels[index]}`}><div key={index} className="rapport-reader-content"><h3 className="rapport-reader-document-title">{content[index].title}</h3><SourceText paragraphs={content[index].paragraphs} /></div></div>
    <footer className="rapport-reader-footer"><div className="rapport-reader-position">0{index + 1} / 04</div><div className="rapport-reader-navigation">{index > 0 && <button type="button" disabled={closing} onClick={() => changeSection(index - 1)}><ArrowLeft size={16} />Mục trước</button>}{index < content.length - 1 ? <button type="button" disabled={closing} className="rapport-reader-next" onClick={() => changeSection(index + 1)}>Tiếp theo: {labels[index + 1]}<ArrowRight size={16} /></button> : <button type="button" disabled={closing} className="rapport-reader-next" onClick={requestClose}>Quay lại trang giới thiệu<ArrowRight size={16} /></button>}</div></footer>
  </dialog>;
}

const summaries = [
  "Trung tâm Hành động Bom mìn Quốc gia Việt Nam",
  "Vì cộng đồng an toàn và phát triển bền vững",
  "Tăng cường giáo dục phòng tránh bom mìn",
  "Trang bị kiến thức, bảo vệ bản thân và cộng đồng",
];
const milestones = [
  ["2014", "Thành lập VNMAC"],
  ["2045", "Mục tiêu khắc phục hậu quả bom mìn"],
  ["Toàn quốc", "Điều phối và hợp tác"],
];

export function IntroductionPage() {
  const { content: settings, isPending } = usePublicContent();
  const source = settings.videoUrl ? resolveApiUrl(settings.videoUrl) : videoUrl;
  const storageKey = `${watchedKey}:${source}`;
  const [showVideo, setShowVideo] = useState(false);
  const [replay, setReplay] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [readingIndex, setReadingIndex] = useState<number | null>(null);
  useEffect(() => { if (!isPending) setShowVideo(settings.videoEnabled && !hasWatched(storageKey)); }, [isPending, settings.videoEnabled, storageKey]);

  const section = settings.sections[activeIndex];
  const next = (activeIndex + 1) % settings.sections.length;
  const heroImage = settings.heroImageUrl ? resolveApiUrl(settings.heroImageUrl) : `${import.meta.env.BASE_URL}media/rapport-hero-landscape.png`;

  return <div className="rapport-home">
    <div className="rapport-home-hero">
      <img className="rapport-home-hero-photo" src={heroImage} alt="" />
      <RapportHeader />
      <div className="rapport-home-lead rapport-home-width">
        <h1>{settings.heroTitle}</h1>
        <p>{settings.heroDescription}</p>
        <div className="rapport-home-actions">
          <Link className="intro-primary" to="/login">Tham gia khóa học <ArrowRight size={18} /></Link>
          {settings.videoEnabled && <button className="rapport-home-outline" type="button" aria-label="Xem video giới thiệu" onClick={() => { setReplay(true); setShowVideo(true); }}><CirclePlay size={23} aria-hidden="true" /><span>Xem video giới thiệu</span></button>}
        </div>
      </div>
    </div>

    <main id="gioi-thieu">
      <div className="rapport-home-width">
        <h2 className="rapport-home-overline">Cùng tìm hiểu về chúng tôi</h2>
        <div className="rapport-home-topics" role="group" aria-label="Chủ đề giới thiệu">
          {settings.sections.map((item, index) => <button key={index} type="button" aria-pressed={activeIndex === index} aria-controls="rapport-home-topic" onClick={() => setActiveIndex(index)}>
            <span className="rapport-home-number" aria-hidden="true">0{index + 1}</span>
            <strong>{item.label}</strong>
            <span>{summaries[index]}</span>
          </button>)}
        </div>
        <section id="rapport-home-topic" aria-labelledby="rapport-home-topic-title">
          <div className="rapport-home-story">
            <div className="rapport-home-copy">
              <p className="rapport-home-kicker">{activeIndex === 0 ? summaries[0] : section.label}</p>
              <h2 id="rapport-home-topic-title" tabIndex={-1}>{section.heading}</h2>
              <SourceText paragraphs={paragraphs(section.preview)} />
            <button className="rapport-home-read-more" type="button" aria-haspopup="dialog" onClick={() => setReadingIndex(activeIndex)}><BookOpen size={16} /> Đọc đầy đủ về {section.label}</button>
            </div>
            <figure className="rapport-home-figure">
              {section.imageUrl ? <img src={resolveApiUrl(section.imageUrl)} alt={section.label} /> : <Scene scene={[1, 2, 4, 3][activeIndex]} label={sceneDescriptions[activeIndex]} />}
            </figure>
          </div>

          {activeIndex === 0 && <>
            <dl className="rapport-home-stats">
              {milestones.map(([value, label]) => <div key={value}><dt>{value}</dt><dd>{label}</dd></div>)}
            </dl>
            <div className="rapport-home-details">
              <article><Users size={29} aria-hidden="true" /><div><h3>Vai trò và nhiệm vụ</h3><p>VNMAC có vai trò tham mưu cho Thủ tướng Chính phủ về chủ trương, chính sách, chiến lược và chương trình khắc phục hậu quả bom mìn. Đồng thời, Trung tâm điều phối, hướng dẫn, kiểm tra và thúc đẩy hoạt động khảo sát, rà phá bom mìn, hỗ trợ nạn nhân và tuyên truyền, giáo dục phòng tránh tai nạn bom mìn, vật nổ trên toàn quốc.</p></div></article>
              <article><Sprout size={29} aria-hidden="true" /><div><h3>Hợp tác và phát triển</h3><p>VNMAC tăng cường hợp tác với các bộ, ngành, địa phương và các tổ chức trong nước, quốc tế để huy động nguồn lực, chia sẻ kinh nghiệm và ứng dụng các phương pháp tiên tiến trong khắc phục hậu quả bom mìn, hướng tới xây dựng cộng đồng an toàn, phát triển bền vững và không còn bom mìn, vật nổ.</p></div></article>
            </div>
          </>}
          <div className="rapport-home-links">
            <button type="button" onClick={() => {
              setActiveIndex(next);
              document.getElementById("gioi-thieu")?.scrollIntoView();
              document.getElementById("rapport-home-topic-title")?.focus({ preventScroll: true });
            }}>{activeIndex === settings.sections.length - 1 ? "Quay lại" : "Tiếp theo"} · {settings.sections[next].label} <ArrowRight size={16} /></button>
          </div>
        </section>
      </div>

      <section className="rapport-home-cta">
        <div className="rapport-home-width">
          <div><h2>{settings.sections[3].heading}</h2><p>Trang bị kiến thức, bảo vệ bản thân, gia đình và cộng đồng khỏi nguy cơ bom mìn, vật nổ.</p></div>
          <Link className="rapport-home-outline" to="/login">Tham gia khóa học <ArrowRight size={17} /></Link>
        </div>
      </section>
    </main>
    {showVideo && <IntroductionVideo source={source} storageKey={storageKey} optional={replay || !settings.videoRequired} onClose={() => setShowVideo(false)} />}
    {readingIndex !== null && <IntroductionReader settings={settings} index={readingIndex} onChange={setReadingIndex} onClose={() => setReadingIndex(null)} />}
  </div>;
}
