import type { ReactNode } from "react";
import "./learning-companion.css";

export type MascotPose = "welcome" | "guide" | "encourage" | "attention" | "celebrate";

export function MascotFigure({ pose = "guide", className = "" }: { pose?: MascotPose; className?: string }) {
  return <span className={`mascot-figure ${className}`} aria-hidden="true"><img src={`${import.meta.env.BASE_URL}media/mascot/${pose}.png`} alt="" decoding="async" /></span>;
}

export function LearningCompanion({ children, celebration = false, pose }: { children: ReactNode; celebration?: boolean; pose?: MascotPose }) {
  return <div className={`learning-companion learning-companion--full${celebration ? " learning-companion--celebrate" : ""}`}>
    <MascotFigure pose={pose ?? (celebration ? "celebrate" : "guide")} />
    <div className="learning-companion-message">{children}</div>
  </div>;
}
