"use client";

import {
  Captions,
  ChevronDown,
  Eraser,
  Eye,
  Film,
  Image as ImageIcon,
  Languages,
  Maximize2,
  Mic,
  MicOff,
  Smile,
  Sparkles,
  Type,
  UserRound,
  Users,
  Video,
  Wand2,
} from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useGeneration } from "../../hooks/use-generation";
import type { CategoryId, Clip, VideoEditorAsset } from "../../types";
import { GenPanel } from "./ai-panel";
import { AssistantPanel } from "./assistant-panel";

type AiView = "Assistant" | "Image" | "Video";

// Tiles with a `mode` open the AI Playground modal on that generator; the rest
// are not wired yet.
const GEN_TILES: { label: string; icon: typeof Type; mode?: string }[] = [
  { label: "AI Video", icon: Video, mode: "text-to-video" },
  { label: "AI Image", icon: ImageIcon, mode: "text-to-image" },
  { label: "B-roll images", icon: ImageIcon, mode: "text-to-image" },
  { label: "AI Transitions", icon: Film },
  { label: "Characters", icon: Users, mode: "talking-video" },
  { label: "AI Voice", icon: Mic },
  { label: "AI Dubbing", icon: Languages },
];

export function AiToolsPanel({
  projectId,
  assets,
  selectedClip,
  setCategory,
  onOpenPlayground,
}: {
  projectId: string;
  assets: VideoEditorAsset[];
  selectedClip: Clip | null;
  setCategory: (c: CategoryId) => void;
  onOpenPlayground: (mode: string) => void;
}) {
  const [view, setView] = useState<AiView | null>(null);

  if (view) {
    return (
      <div className="flex min-h-0 flex-1 flex-col">
        <button
          type="button"
          onClick={() => setView(null)}
          className="mx-3 mb-2 flex items-center gap-1.5 self-start rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <ChevronDown className="size-3.5 rotate-90" /> AI Tools
        </button>
        <AiPanel
          tab={view}
          projectId={projectId}
          assets={assets}
          selectedClip={selectedClip}
          onGenerated={() => setCategory(view === "Video" ? "video" : "image")}
          gotoTab={(t) => setView(t as AiView)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 pb-2 select-none">
      {/* Generate — the headline action */}
      <section className="space-y-2.5">
        <SectionLabel icon={Sparkles}>Generate</SectionLabel>
        <button
          type="button"
          onClick={() => setView("Assistant")}
          className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-[#14b8a6] hover:bg-accent"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#14b8a6] text-white">
            <Sparkles className="size-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Generate with AI</span>
            <span className="block truncate text-[11px] text-muted-foreground">Describe it — we'll create it</span>
          </span>
          <ChevronDown className="ml-auto size-4 shrink-0 -rotate-90 text-muted-foreground" />
        </button>
        <div className="grid grid-cols-2 gap-2">
          {GEN_TILES.map((t) => (
            <GenTile key={t.label} icon={t.icon} label={t.label} soon={!t.mode} onClick={t.mode ? () => onOpenPlayground(t.mode ?? "text-to-video") : undefined} />
          ))}
        </div>
      </section>

      <div className="border-t border-border/60" />

      {/* Enhance — one-tap fixes */}
      <ToolSection title="Sound Good">
        <ToolToggle icon={Mic} label="Clean audio" ai />
        <ToolToggle icon={Eraser} label="Remove filler words" ai />
        <ToolToggle icon={MicOff} label="Remove silences" />
      </ToolSection>

      <ToolSection title="Look Good">
        <ToolToggle icon={Eye} label="Eye contact" ai />
        <ToolToggle icon={Maximize2} label="AI Background expand" />
        <ToolToggle icon={UserRound} label="Remove background" ai />
        <ToolToggle icon={Smile} label="Face filter" ai />
        <ToolToggle icon={Wand2} label="Green screen" />
        <ToolRow icon={Captions} label="Subtitles" />
      </ToolSection>
    </div>
  );
}

function AiPanel({
  tab,
  projectId,
  assets,
  selectedClip,
  onGenerated,
  gotoTab,
}: {
  tab: AiView;
  projectId: string;
  assets: VideoEditorAsset[];
  selectedClip: Clip | null;
  onGenerated: () => void;
  gotoTab: (t: string) => void;
}) {
  const gen = useGeneration(projectId);
  const [prompt, setPrompt] = useState("");

  const onGenRef = useRef(onGenerated);
  onGenRef.current = onGenerated;
  const prevStatus = useRef(gen.status);
  useEffect(() => {
    if (gen.status === "done" && prevStatus.current !== "done") onGenRef.current();
    prevStatus.current = gen.status;
  }, [gen.status]);

  if (tab === "Assistant") return <AssistantPanel prompt={prompt} setPrompt={setPrompt} gen={gen} gotoTab={gotoTab} />;
  return (
    <GenPanel
      key={tab}
      kind={tab === "Image" ? "image" : "video"}
      prompt={prompt}
      setPrompt={setPrompt}
      gen={gen}
      assets={assets}
      selectedClip={selectedClip}
    />
  );
}

function SectionLabel({ icon: Icon, children }: { icon?: typeof Type; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {Icon ? <Icon className="size-3.5 text-[#14b8a6]" /> : null}
      {children}
    </p>
  );
}

function GenTile({ icon: Icon, label, soon, onClick }: { icon: typeof Type; label: string; soon?: boolean; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={soon}
      className="group relative flex flex-col items-start gap-2 rounded-lg border border-border p-3 text-left transition-colors hover:border-[#14b8a6] hover:bg-accent disabled:opacity-50"
    >
      <Icon className="size-4 text-muted-foreground transition-colors group-hover:text-[#14b8a6]" />
      <span className="text-xs font-medium">{label}</span>
      {soon ? <span className="absolute right-2 top-2 text-[9px] text-muted-foreground">Soon</span> : null}
    </button>
  );
}

function ToolSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ToolToggle({ icon: Icon, label, ai }: { icon: typeof Type; label: string; ai?: boolean }) {
  const [on, setOn] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setOn((v) => !v)}
      className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-accent"
    >
      <span className="flex items-center gap-2 text-xs font-medium">
        <Icon className="size-4 text-muted-foreground" />
        {label}
        {ai ? <span className="rounded bg-[#14b8a6]/15 px-1 py-0.5 text-[9px] font-semibold text-[#14b8a6]">AI</span> : null}
      </span>
      <span className={`h-4 w-7 rounded-full p-0.5 transition-colors ${on ? "bg-[#14b8a6]" : "bg-secondary"}`}>
        <span className={`block size-3 rounded-full bg-white transition-transform ${on ? "translate-x-3" : "translate-x-0"}`} />
      </span>
    </button>
  );
}

function ToolRow({ icon: Icon, label }: { icon: typeof Type; label: string }) {
  return (
    <button type="button" className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-accent">
      <Icon className="size-4 text-muted-foreground" />
      {label}
    </button>
  );
}
