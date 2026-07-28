"use client";

import { Pause, Play } from "lucide-react";
import { useRef, useState } from "react";

function fmt(s: number): string {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

// Custom audio player for the audio node: centered label, circular play/pause,
// and a seekable scrubber with elapsed / total time.
export function AudioPlayer({ url }: { url: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const a = ref.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = ref.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    a.currentTime = ratio * duration;
    setCurrent(a.currentTime);
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-5 py-3">
      {/* biome-ignore lint/a11y/useMediaCaption: user-generated/uploaded audio */}
      <audio
        ref={ref}
        src={url}
        preload="metadata"
        className="hidden"
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
        onEnded={() => setPlaying(false)}
      />
      <div className="text-base font-medium">Audio</div>
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={toggle}
        className="grid size-14 place-items-center rounded-full bg-white text-black transition-transform hover:scale-105"
      >
        {playing ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
      </button>
      <div className="w-full">
        <div className="nodrag relative h-1 w-full cursor-pointer rounded-full bg-white/15" onClick={seek}>
          <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
          <span>{fmt(current)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
