"use client";

import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

export const CLIPS_PREVIEW_VIDEO =
  "https://videos.pexels.com/video-files/37874094/16069089_3840_2160_25fps.mp4";

// Centred play badge that pops in once the clips have fanned out.
function PlayDot() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <span className="grid size-11 animate-in place-items-center rounded-full bg-black/35 backdrop-blur-sm duration-300 fade-in-0 zoom-in-75">
        <Play className="size-5 translate-x-0.5 fill-white text-white" />
      </span>
    </div>
  );
}

// Looping hero animation: one 16:9 video reframes to a 9:16 portrait, then fans
// out into three tilted clips — "one video → many clips" — then loops. After the
// clips settle, a play badge pops onto each card, one by one. Shared by the app
// clips screen and the marketing site so the two never drift apart.
export function ClipsFanAnimation({ className, glow = true }: { className?: string; glow?: boolean }) {
  // 0 = landscape source, 1 = reframed portrait, 2 = fanned-out clips
  const [stage, setStage] = useState(0);
  // how many of the three play badges have appeared (only during the fanned stage)
  const [plays, setPlays] = useState(0);

  useEffect(() => {
    // Non-even dwell per stage (ms): short landscape + portrait, then a long
    // hold on the fanned clips (extended so the badges can appear one by one).
    const dwell = [1800, 1300, 5600][stage];
    const t = setTimeout(() => setStage((s) => (s + 1) % 3), dwell);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 2) {
      setPlays(0);
      return;
    }
    // once the cards have fanned out, reveal the play badges left → centre → right
    const timers = [
      setTimeout(() => setPlays(1), 950),
      setTimeout(() => setPlays(2), 1300),
      setTimeout(() => setPlays(3), 1650),
    ];
    return () => timers.forEach(clearTimeout);
  }, [stage]);

  const clip =
    "absolute overflow-hidden rounded-[20px] border-[5px] border-white/90 bg-black shadow-2xl shadow-black/50 transition-all duration-700 ease-out";

  return (
    <div className={cn("relative grid h-[440px] w-full place-items-center", className)}>
      {glow ? <div className="pointer-events-none absolute size-[480px] rounded-full bg-teal-500/10 blur-[130px]" /> : null}

      {/* left clip — slides out only when fanned */}
      <div
        className={cn(clip, stage === 2 ? "opacity-100" : "opacity-0")}
        style={{
          width: 182,
          height: 324,
          zIndex: 10,
          transform: stage === 2 ? "translateX(-225px) rotate(-9deg)" : "translateX(0) scale(0.9)",
        }}
      >
        <video src={CLIPS_PREVIEW_VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
        {plays >= 1 ? <PlayDot /> : null}
      </div>

      {/* right clip */}
      <div
        className={cn(clip, stage === 2 ? "opacity-100" : "opacity-0")}
        style={{
          width: 182,
          height: 324,
          zIndex: 10,
          transform: stage === 2 ? "translateX(225px) rotate(9deg)" : "translateX(0) scale(0.9)",
        }}
      >
        <video src={CLIPS_PREVIEW_VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
        {plays >= 3 ? <PlayDot /> : null}
      </div>

      {/* centre hero — 16:9 landscape → 9:16 portrait → smaller fanned clip */}
      <div
        className="relative z-20 overflow-hidden rounded-[24px] border-[6px] border-white/90 bg-black shadow-2xl shadow-black/50 transition-all duration-700 ease-out"
        style={{
          width: stage === 0 ? 440 : stage === 1 ? 232 : 182,
          height: stage === 0 ? 248 : stage === 1 ? 412 : 324,
          transform: stage === 2 ? "translateY(-6px) rotate(1deg)" : "none",
        }}
      >
        <video src={CLIPS_PREVIEW_VIDEO} className="size-full object-cover" autoPlay muted loop playsInline />
        {plays >= 2 ? <PlayDot /> : null}
      </div>
    </div>
  );
}
