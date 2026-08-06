"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Baseline,
  Blend,
  Bold,
  ChevronDown,
  Circle,
  Copy,
  Droplet,
  Film,
  FlipHorizontal,
  FlipVertical,
  Gauge,
  Gem,
  Italic,
  Layers,
  Maximize,
  Minimize,
  MoreHorizontal,
  MoveHorizontal,
  Orbit,
  Palette,
  Replace,
  RotateCw,
  SlidersHorizontal,
  Sparkles,
  Squircle,
  Sun,
  Trash2,
  Unlink,
  UserSquare,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useInspector } from "../inspector/hooks/use-inspector";
import type { Clip, VideoEditorDoc } from "../../types";
import { usePopover } from "./hooks/use-popover";

const ACCENT = "#14b8a6";
const SPEEDS = [0.5, 1, 1.5, 2] as const;

// Floating quick-tools bar shown over the preview when a clip is selected
// (mirrors VEED's floating component bar). Volume, Speed and the overflow menu
// are wired to real clip ops; the rest are visual stubs pointing at the inspector.
export function ClipToolbar({
  clip,
  doc,
  startGesture,
  preview,
  endGesture,
  onOpenAnimations,
  onOpenTransitions,
  onGenerateVideo,
  onDelete,
  onDuplicate,
}: {
  clip: Clip;
  doc: VideoEditorDoc;
  startGesture: () => void;
  preview: (d: VideoEditorDoc) => void;
  endGesture: (changed?: boolean) => void;
  onOpenAnimations: () => void;
  onOpenTransitions: () => void;
  onGenerateVideo: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}) {
  const insp = useInspector({ clip, doc, startGesture, preview, endGesture });
  const isAudio = clip.kind === "audio";
  const isImage = clip.kind === "image";
  const isText = clip.kind === "text";
  const variant = isImage ? "image" : isAudio ? "audio" : isText ? "text" : undefined;

  if (isText) {
    return (
      <div className="pointer-events-auto flex items-center rounded-xl border border-border bg-card p-1 shadow-lg">
        <Group>
          <button type="button" className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground" title="Text color">
            <span className="size-4 rounded border border-border bg-white" />
          </button>
          <button type="button" className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
            Roboto <ChevronDown className="size-3.5" />
          </button>
          <button type="button" className="flex h-8 items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground">
            48 <ChevronDown className="size-3.5" />
          </button>
        </Group>
        <Group border>
          <Tool icon={Sun} onClick={onOpenTransitions} />
          <Tool icon={Orbit} onClick={onOpenAnimations} />
        </Group>
        <Group border>
          <Tool icon={UserSquare} />
        </Group>
        <div className="border-l border-border pl-1">
          <MorePopover variant="text" opacity={clip.transform.opacity} onOpacity={insp.updateOpacity} g={insp.gestureProps} onCopy={onDuplicate} onDelete={onDelete} />
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto flex items-center rounded-xl border border-border bg-card p-1 shadow-lg">
      {isImage ? (
        <>
          <Group>
            <Tool icon={Film} label="Generate Video" brand onClick={onGenerateVideo} />
          </Group>
          <Group border>
            <Tool icon={Blend} label="Transitions" onClick={onOpenTransitions} />
            <Tool icon={Orbit} label="Animation" onClick={onOpenAnimations} />
            <Tool icon={SlidersHorizontal} label="Adjust" />
          </Group>
        </>
      ) : (
        <>
          {isAudio ? null : (
            <Group>
              <Tool icon={Orbit} label="Animation" onClick={onOpenAnimations} />
              <Tool icon={Blend} label="Transitions" onClick={onOpenTransitions} />
            </Group>
          )}
          <Group border={!isAudio}>
            <VolumePopover value={clip.volume} onInput={insp.updateVolume} g={insp.gestureProps} />
            <SpeedPopover value={clip.speed} onSelect={insp.updateSpeed} />
          </Group>
        </>
      )}
      <div className="border-l border-border pl-1">
        <MorePopover
          variant={variant}
          opacity={clip.transform.opacity}
          onOpacity={insp.updateOpacity}
          g={insp.gestureProps}
          onCopy={onDuplicate}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}

function Group({ children, border }: { children: React.ReactNode; border?: boolean }) {
  return <div className={cn("flex items-center gap-0.5 px-1", border && "border-l border-border")}>{children}</div>;
}

function Tool({ icon: Icon, label, onClick, active, brand }: { icon: typeof Zap; label?: string; onClick?: () => void; active?: boolean; brand?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active || brand}
      style={brand ? { backgroundColor: ACCENT } : undefined}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-lg px-2 text-sm font-medium transition-colors",
        brand ? "text-white hover:opacity-90" : active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      {label}
    </button>
  );
}

// ── volume ──────────────────────────────────────────────────
function VolumePopover({ value, onInput, g }: { value: number; onInput: (v: number) => void; g: Gesture }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <Tool icon={Volume2} active={open} onClick={() => setOpen((v) => !v)} />
      {open ? (
        <Panel className="w-56" up>
          <div className="flex items-center gap-2.5">
            <Volume2 className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={value}
              onPointerDown={g.onPointerDown}
              onPointerUp={g.onPointerUp}
              onChange={(e) => onInput(Number(e.target.value))}
              className="h-1 min-w-0 flex-1 accent-[#14b8a6]"
            />
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.round(value * 100)}%</span>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

// ── speed ───────────────────────────────────────────────────
function SpeedPopover({ value, onSelect }: { value: number; onSelect: (v: number) => void }) {
  const { open, setOpen, ref } = usePopover();
  return (
    <div ref={ref} className="relative">
      <Tool icon={Gauge} active={open} onClick={() => setOpen((v) => !v)} />
      {open ? (
        <Panel className="w-40" up>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Speed</p>
          <div className="grid grid-cols-4 gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSelect(s)}
                className={cn(
                  "rounded-md py-1.5 text-xs font-medium transition-colors",
                  Math.abs(value - s) < 0.001 ? "bg-[#14b8a6] text-white" : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                {s}x
              </button>
            ))}
          </div>
        </Panel>
      ) : null}
    </div>
  );
}

// ── overflow (⋯) ────────────────────────────────────────────
function MorePopover({
  variant,
  opacity,
  onOpacity,
  g,
  onCopy,
  onDelete,
}: {
  variant?: "audio" | "image" | "text";
  opacity: number;
  onOpacity: (v: number) => void;
  g: Gesture;
  onCopy: () => void;
  onDelete: () => void;
}) {
  const { open, setOpen, ref } = usePopover();
  const close = () => setOpen(false);
  const copyItem = (
    <Item
      icon={Copy}
      label="Copy"
      onClick={() => {
        onCopy();
        close();
      }}
    />
  );
  const deleteItem = (
    <Item
      icon={Trash2}
      label="Delete"
      danger
      onClick={() => {
        onDelete();
        close();
      }}
    />
  );

  if (variant === "text") {
    return (
      <div ref={ref} className="relative">
        <Tool icon={MoreHorizontal} active={open} onClick={() => setOpen((v) => !v)} />
        {open ? (
          <Panel className="w-60" align="right" up>
            <div className="flex items-center gap-1">
              <IconItem icon={Bold} title="Bold" />
              <IconItem icon={Italic} title="Italic" />
              <span className="mx-1 h-6 w-px bg-border" />
              <IconItem icon={AlignLeft} title="Align left" />
              <IconItem icon={AlignCenter} title="Align center" />
              <IconItem icon={AlignRight} title="Align right" />
            </div>
            <Divider />
            <Item icon={Baseline} label="Line Height" chevron />
            <Item icon={MoveHorizontal} label="Letter Spacing" chevron />
            <Divider />
            {copyItem}
            <Item icon={Layers} label="Order" chevron />
            <Item icon={Palette} label="Save to Brand Kit" />
            <Divider />
            <Item icon={SlidersHorizontal} label="Properties" />
            <Item icon={RotateCw} label="Adjust Timing" chevron />
            {deleteItem}
          </Panel>
        ) : null}
      </div>
    );
  }

  if (variant === "audio") {
    return (
      <div ref={ref} className="relative">
        <Tool icon={MoreHorizontal} active={open} onClick={() => setOpen((v) => !v)} />
        {open ? (
          <Panel className="w-56" align="right" up>
            {copyItem}
            <Divider />
            <Item icon={RotateCw} label="Adjust Timing" chevron />
            <Item icon={Replace} label="Replace Audio" />
            <Item icon={Wand2} label="Save to Brand Kit" upgrade />
            {deleteItem}
          </Panel>
        ) : null}
      </div>
    );
  }

  if (variant === "image") {
    return (
      <div ref={ref} className="relative">
        <Tool icon={MoreHorizontal} active={open} onClick={() => setOpen((v) => !v)} />
        {open ? (
          <Panel className="w-60" align="right" up>
            <div className="flex items-center gap-1">
              <IconItem icon={FlipVertical} title="Flip vertical" />
              <IconItem icon={FlipHorizontal} title="Flip horizontal" />
              <span className="mx-1 h-6 w-px bg-border" />
              <IconItem icon={Minimize} title="Fit to canvas" />
              <IconItem icon={Maximize} title="Fill canvas" />
            </div>
            <Divider />
            <div className="flex items-center gap-2.5 px-2.5 py-1.5">
              <Droplet className="size-[18px] shrink-0 text-muted-foreground" />
              <span className="flex-1 text-sm">Opacity</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={opacity}
                onPointerDown={g.onPointerDown}
                onPointerUp={g.onPointerUp}
                onChange={(e) => onOpacity(Number(e.target.value))}
                className="h-1 w-20 accent-[#14b8a6]"
              />
            </div>
            <Item icon={Squircle} label="Round Corners" chevron />
            <Divider />
            {copyItem}
            <Item icon={Layers} label="Order" chevron />
            <Divider />
            <Item icon={RotateCw} label="Adjust Timing" chevron />
            <Item icon={Replace} label="Replace Image" />
            <Item icon={Wand2} label="Save to Brand Kit" upgrade />
            {deleteItem}
          </Panel>
        ) : null}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <Tool icon={MoreHorizontal} active={open} onClick={() => setOpen((v) => !v)} />
      {open ? (
        <Panel className="w-60" align="right" up>
          <div className="flex items-center gap-1">
            <IconItem icon={FlipVertical} title="Flip vertical" />
            <IconItem icon={FlipHorizontal} title="Flip horizontal" />
            <span className="mx-1 h-6 w-px bg-border" />
            <IconItem icon={Minimize} title="Fit to canvas" />
            <IconItem icon={Maximize} title="Fill canvas" />
          </div>
          <Divider />
          <div className="flex items-center gap-2.5 px-2.5 py-1.5">
            <Droplet className="size-[18px] shrink-0 text-muted-foreground" />
            <span className="flex-1 text-sm">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={opacity}
              onPointerDown={g.onPointerDown}
              onPointerUp={g.onPointerUp}
              onChange={(e) => onOpacity(Number(e.target.value))}
              className="h-1 w-20 accent-[#14b8a6]"
            />
          </div>
          <Item icon={Squircle} label="Round Corners" chevron />
          <Divider />
          <Item icon={Circle} label="Filters" />
          <Item icon={Sparkles} label="Effects" />
          <Item icon={SlidersHorizontal} label="Adjust" />
          <Divider />
          <Item
            icon={Copy}
            label="Copy"
            onClick={() => {
              onCopy();
              close();
            }}
          />
          <Item icon={Layers} label="Order" chevron />
          <Divider />
          <Item icon={RotateCw} label="Adjust Timing" chevron />
          <Item icon={Replace} label="Replace Video" />
          <Item icon={Unlink} label="Detach Audio" />
          <Item icon={Wand2} label="Save to Brand Kit" upgrade />
          <Item
            icon={Trash2}
            label="Delete"
            danger
            onClick={() => {
              onDelete();
              close();
            }}
          />
        </Panel>
      ) : null}
    </div>
  );
}

// ── shared bits ─────────────────────────────────────────────
type Gesture = ReturnType<typeof useInspector>["gestureProps"];

function Panel({ children, className, align, up }: { children: React.ReactNode; className?: string; align?: "right"; up?: boolean }) {
  return (
    <div
      className={cn(
        "absolute z-50 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card p-2 shadow-2xl [scrollbar-width:thin]",
        up ? "bottom-full mb-2" : "top-full mt-2",
        align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 h-px bg-border" />;
}

function IconItem({ icon: Icon, title }: { icon: typeof Zap; title: string }) {
  return (
    <button
      type="button"
      title={title}
      className="grid h-9 flex-1 place-items-center rounded-lg bg-secondary/50 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-[18px]" />
    </button>
  );
}

function Item({
  icon: Icon,
  label,
  chevron,
  upgrade,
  danger,
  onClick,
}: {
  icon: typeof Zap;
  label: string;
  chevron?: boolean;
  upgrade?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors",
        danger ? "text-muted-foreground hover:bg-red-500/15 hover:text-red-400" : "text-foreground hover:bg-accent",
      )}
    >
      <Icon className="size-[18px] shrink-0 text-muted-foreground" />
      <span className="flex-1 text-left">{label}</span>
      {upgrade ? (
        <span className="grid size-4 shrink-0 place-items-center rounded bg-gradient-to-br from-amber-300 to-amber-500 text-black">
          <Gem className="size-2.5 fill-current" />
        </span>
      ) : null}
      {chevron ? <span className="shrink-0 text-muted-foreground">›</span> : null}
    </button>
  );
}
