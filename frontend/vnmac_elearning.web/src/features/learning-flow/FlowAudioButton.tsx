import { useEffect, useRef, useState } from "react";
import { resolveApiUrl } from "@/shared/api/client";

let activeAudio: HTMLAudioElement | null = null;
export function stopFlowAudio() { activeAudio?.pause(); }
export function FlowAudioButton({ url, label }: { url?: string | null; label: string }) {
  const player = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => () => { player.current?.pause(); }, [url]);
  if (!url) return null;
  return <span className="flow-audio-replay"><button type="button" aria-label={label} onClick={e => {
    e.preventDefault(); e.stopPropagation(); setError(false);
    activeAudio?.pause();
    document.querySelectorAll<HTMLMediaElement>(".learning-flow audio, .learning-flow video").forEach(media => media.pause());
    player.current = new Audio(resolveApiUrl(url)); activeAudio = player.current;
    void player.current.play().catch(() => setError(true));
  }}>▶ {label}</button>{error && <span role="status">Chưa phát được âm thanh. Hãy thử lại.</span>}</span>;
}
