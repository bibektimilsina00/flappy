"use client";

import {
  Bold,
  ChevronDown,
  Crop,
  Diamond,
  Download,
  FolderPlus,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  type LucideIcon,
  Maximize2,
  Minus,
  Pencil,
  Pilcrow,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { createPortal } from "react-dom";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { uploadAsset } from "@/features/projects";
import { useCanvasActions } from "../canvas-actions";
import { useSetNodeOutput } from "../execution-status";
import { popupRegistry } from "../popup-registry";
import type { NodeKind } from "../constants";
import type { FormatOp } from "../lib/format-markdown";
import { useTextFormat } from "../lib/text-format-context";
import { AudioPlayer } from "./audio-player";
import { ImageActionModal, type ImageAction } from "./image-action-modal";
import { ImageCropModal } from "./image-crop-modal";
import { Markdown } from "./markdown";
import { PrecisionEdit } from "./precision-edit";
import { VideoActionModal, type VideoAction } from "./video-action-modal";

// Per-kind "Actions" dropdown items (AI operations — wired later).
const ACTIONS: Partial<Record<NodeKind, string[]>> = {
  image: [
    "Extract from grid",
    "Light tune",
    "Expand image",
    "Three-view diagram",
    "Multi-angle views",
    "Change angle",
    "Image 1, 9-frame deduction",
    "Storyboard 25-grid",
  ],
  video: ["Extract frame", "Reframe video", "Trim video", "Super resolution"],
};

function triggerDownload(href: string, name: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = name;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function NodeToolbar({
  id,
  kind,
  content,
  label,
}: {
  id: string;
  kind: NodeKind;
  content: string; // media URL, or text for text nodes
  label?: string;
}) {
  const applyFormat = useTextFormat();
  const { setNodeData } = useCanvasActions();
  const setNodeOutput = useSetNodeOutput();
  const fileRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [imageModal, setImageModal] = useState<null | "crop" | "edit">(null);
  const [imageAction, setImageAction] = useState<ImageAction | null>(null);
  const [videoAction, setVideoAction] = useState<VideoAction | null>(null);
  const name = label ?? `${kind}-${id.slice(0, 6)}`;

  // Crop / precision-edit / replace all result in a new stored image → pin it as
  // the node's asset (upload_key persists; seed output shows it immediately).
  const applyImage = (result: { key: string; url: string }) => {
    setNodeData(id, { upload_key: result.key });
    setNodeOutput(id, result.url);
    setImageModal(null);
  };
  const onReplaceFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { key, url } = await uploadAsset(file);
      applyImage({ key, url });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Upload failed");
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    return popupRegistry.register(() => setMenuOpen(false));
  }, [menuOpen]);

  const download = () => {
    if (kind === "text") {
      const url = URL.createObjectURL(new Blob([content], { type: "text/markdown" }));
      triggerDownload(url, name.endsWith(".md") ? name : `${name}.md`);
      URL.revokeObjectURL(url);
    } else {
      triggerDownload(content, name);
    }
  };

  const actions = ACTIONS[kind];

  return (
    <div className="nodrag flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#1e1e1e] px-1.5 py-1 shadow-2xl">
      {kind === "text" ? (
        <>
          <FmtBtn icon={Heading1} label="Heading 1" op="h1" apply={applyFormat} />
          <FmtBtn icon={Heading2} label="Heading 2" op="h2" apply={applyFormat} />
          <FmtBtn icon={Heading3} label="Heading 3" op="h3" apply={applyFormat} />
          <FmtBtn icon={Pilcrow} label="Paragraph" op="p" apply={applyFormat} />
          <Divider />
          <FmtBtn icon={Bold} label="Bold" op="bold" apply={applyFormat} />
          <FmtBtn icon={Italic} label="Italic" op="italic" apply={applyFormat} />
          <Divider />
          <FmtBtn icon={List} label="Bullet list" op="ul" apply={applyFormat} />
          <FmtBtn icon={ListOrdered} label="Numbered list" op="ol" apply={applyFormat} />
          <FmtBtn icon={Minus} label="Divider" op="hr" apply={applyFormat} />
        </>
      ) : null}

      {kind === "image" ? (
        <>
          <Btn icon={Pencil} label="Edit" onClick={() => setImageModal("edit")} />
          <Btn icon={Crop} label="Crop" onClick={() => setImageModal("crop")} />
          <Btn icon={Upload} label="Replace" onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              void onReplaceFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Divider />
        </>
      ) : null}

      {actions ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-foreground/90 transition-colors hover:bg-accent"
          >
            <Zap className="size-4" />
            Actions
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
          {menuOpen ? (
            <div
              data-popup
              className="absolute left-0 top-full z-[110] mt-1 w-64 rounded-xl border border-white/10 bg-[#1e1e1e] p-1.5 shadow-2xl"
            >
              {actions.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (kind === "image") setImageAction(a as ImageAction);
                    else if (kind === "video") setVideoAction(a as VideoAction);
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm text-foreground/90 transition-colors hover:bg-accent"
                >
                  <Diamond className="size-4 text-muted-foreground" />
                  {a}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {actions ? <Divider /> : null}

      <Btn icon={Maximize2} label="Expand" onClick={() => setExpanded(true)} />
      {kind !== "text" ? (
        <>
          <Btn icon={Download} label="Download" onClick={download} />
          <Btn icon={FolderPlus} label="Save to library" />
        </>
      ) : null}
      <Divider />
      <Btn icon={Diamond} label="Options" />

      {expanded ? <ExpandOverlay kind={kind} content={content} onClose={() => setExpanded(false)} /> : null}
      {imageModal === "crop" ? (
        <ImageCropModal src={content} onDone={applyImage} onClose={() => setImageModal(null)} />
      ) : null}
      {imageModal === "edit" ? (
        <PrecisionEdit src={content} onDone={applyImage} onClose={() => setImageModal(null)} />
      ) : null}
      {imageAction ? (
        <ImageActionModal action={imageAction} sourceId={id} src={content} onClose={() => setImageAction(null)} />
      ) : null}
      {videoAction ? (
        <VideoActionModal action={videoAction} sourceId={id} src={content} onClose={() => setVideoAction(null)} />
      ) : null}
    </div>
  );
}

function Btn({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

// Formatting button: preventDefault on mousedown so the click doesn't collapse
// the current text selection (in the textarea or the rendered view).
function FmtBtn({
  icon: Icon,
  label,
  op,
  apply,
}: {
  icon: LucideIcon;
  label: string;
  op: FormatOp;
  apply: ((op: FormatOp) => void) | null;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => apply?.(op)}
      className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4" />
    </button>
  );
}

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}

// Fullscreen preview — portalled to body to escape React Flow's transform.
function ExpandOverlay({ kind, content, onClose }: { kind: NodeKind; content: string; onClose: () => void }) {
  let body: ReactNode;
  if (kind === "image" || kind === "world") body = <img src={content} alt="" className="size-full object-contain" />;
  else if (kind === "video") body = <video controls autoPlay src={content} className="size-full object-contain" />;
  else if (kind === "audio") body = (
    <div className="grid size-full place-items-center p-8">
      <div className="w-[560px] max-w-full">
        <AudioPlayer url={content} />
      </div>
    </div>
  );
  else body = (
    <div className="size-full overflow-y-auto p-8 [scrollbar-width:thin]">
      <Markdown>{content}</Markdown>
    </div>
  );

  return createPortal(
    // `dark` re-enters the app's dark theme scope — the portal lands on
    // document.body, outside the .dark wrapper, so themed text would go black.
    <div
      className="dark fixed inset-0 z-[200] grid place-items-center bg-black/80"
      onClick={onClose}
    >
      <div
        className="relative h-[90vh] w-[90vw] overflow-hidden rounded-xl bg-[#1e1e1e]"
        onClick={(e) => e.stopPropagation()}
      >
        {body}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-black/50 text-white/80 transition-colors hover:bg-black/70 hover:text-white"
        >
          <X className="size-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
