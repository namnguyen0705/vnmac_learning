import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MascotFigure } from "@/shared/ui/LearningCompanion";
import { MessageBanner } from "@/shared/ui/MessageBanner";
import introduction from "./part-one-introduction.json";

export function PartOneIntroduction({ onStart }: { onStart: () => void }) {
  const videoUrl = import.meta.env.VITE_PART1_INTRO_VIDEO_URL?.trim();
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="flow-card grid gap-4" aria-labelledby="part-one-introduction">
      <div className="flex flex-wrap items-center gap-4">
        <MascotFigure pose="welcome" className="w-24" />
        <div>
          <p className="text-sm font-medium text-blue-700">Giới thiệu Phần học số 1</p>
          <h1 id="part-one-introduction" className="text-2xl font-bold text-slate-950">{introduction.title}</h1>
        </div>
      </div>
      {videoUrl && !videoFailed ? (
        <video className="aspect-video w-full rounded-xl bg-slate-950" src={videoUrl} controls playsInline preload="metadata" aria-label="Video giới thiệu Phần học số 1" onError={() => setVideoFailed(true)} />
      ) : (
        <MessageBanner tone="warning">{videoFailed ? "Video giới thiệu hiện không tải được." : "Video hoạt họa 2D và lời đọc Mascot đang chờ bàn giao."}</MessageBanner>
      )}
      <p>Trong phần này, chúng ta sẽ cùng tìm hiểu 4 bài học.</p>
      <ul className="grid gap-2">
        {introduction.lessons.map(lesson => <li key={lesson} className="rounded-lg border border-slate-200 p-3">{lesson}</li>)}
      </ul>
      <p>{introduction.outcome}</p>
      <div><Button onClick={onStart}>VÀO BÀI HỌC SỐ 1</Button></div>
    </section>
  );
}
