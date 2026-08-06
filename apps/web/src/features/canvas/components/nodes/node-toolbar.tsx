"use client";

import {
  Bold,
  ChevronDown,
  Crop,
  Diamond,
  Download,
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
import { popupRegistry } from "../../lib/popup-registry";
import type { NodeKind } from "../../lib/constants";
import type { FormatOp } from "../../lib/format-markdown";
import { useTextFormat } from "../../lib/text-format-context";
import { AudioPlayer } from "../shared/audio-player";
import { ImageActionModal, type ImageAction } from "../modals/image-action-modal/image-action-modal";
import { ImageCropModal } from "../modals/image-crop-modal";
import { Markdown } from "../shared/markdown";
import { PrecisionEdit } from "../modals/precision-edit/precision-edit";
import { VideoActionModal, type VideoAction } from "../modals/video-action-modal/video-action-modal";

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
  content?: string;
  label?: string;
}) {
  const applyFormat = useTextFormat();
  const { setNodeData } = useCanvasActions();
  const setOutput = useSetNodeOutput();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [imageModal, setImageModal] = useState<"crop" | "edit" | null>(null);
  const [imageAction, setImageAction] = useState<ImageAction | null>(null);
  const [videoAction, setVideoAction] = useState<VideoAction | null>(null);

  const name = label || `${kind}-${id.slice(0, 4)}`;

  const applyImage = (result: { key: string; url: string }) => {
    setOutput(id, result.url);
    setNodeData(id, { src: result.url });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadAsset(file);
      setOutput(id, res.url);
      setNodeData(id, { src: res.url });
    } catch {
      // handled globally
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    return popupRegistry.register(() => setMenuOpen(false));
  }, [menuOpen]);

  const download = () => {
    if (!content) return;
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
          <Btn icon={Bold} label="Bold" onClick={() => applyFormat?.("bold")} />
          <Btn icon={Italic} label="Italic" onClick={() => applyFormat?.("italic")} />
          <Btn icon={Heading1} label="H1" onClick={() => applyFormat?.("h1")} />
          <Btn icon={Heading2} label="H2" onClick={() => applyFormat?.("h2")} />
          <Btn icon={Heading3} label="H3" onClick={() => applyFormat?.("h3")} />
          <Btn icon={List} label="Bullet List" onClick={() => applyFormat?.("ul")} />
          <Btn icon={ListOrdered} label="Numbered List" onClick={() => applyFormat?.("ol")} />
          <Divider />
        </>
      ) : null}

      {kind === "image" ? (
        <>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
          <Btn icon={Upload} label="Upload replacement" onClick={() => fileInputRef.current?.click()} />
          <Btn icon={Crop} label="Crop" onClick={() => setImageModal("crop")} />
          <Btn icon={Pencil} label="Precision edit" onClick={() => setImageModal("edit")} />
        </>
      ) : null}

      {actions ? (
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
          >
            Actions <ChevronDown className="size-3" />
          </button>
          {menuOpen ? (
            <div className="absolute top-full left-0 z-50 mt-1.5 w-48 rounded-xl border border-white/10 bg-[#1e1e1e] p-1 shadow-2xl">
              {actions.map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    if (kind === "image") setImageAction(act as ImageAction);
                    else if (kind === "video") setVideoAction(act as VideoAction);
                  }}
                  className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-white/10 hover:text-white"
                >
                  {act}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {actions ? <Divider /> : null}

      <Btn icon={Maximize2} label="Expand" onClick={() => setExpanded(true)} />
      {kind !== "text" ? <Btn icon={Download} label="Download" onClick={download} /> : null}

      {content && expanded ? <ExpandOverlay kind={kind} content={content} onClose={() => setExpanded(false)} /> : null}
      {content && imageModal === "crop" ? (
        <ImageCropModal nodeId={id} src={content} onCommit={(_id, url) => applyImage({ key: "", url })} onClose={() => setImageModal(null)} />
      ) : null}
      {content && imageModal === "edit" ? (
        <PrecisionEdit src={content} onDone={applyImage} onClose={() => setImageModal(null)} />
      ) : null}
      {content && imageAction ? (
        <ImageActionModal action={imageAction} sourceId={id} src={content} onClose={() => setImageAction(null)} />
      ) : null}
      {content && videoAction ? (
        <VideoActionModal action={videoAction} sourceId={id} src={content} onClose={() => setVideoAction(null)} />
      ) : null}
    </div>
  );
}

function Btn({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-white/10 hover:text-white"
    >
      <Icon className="size-3.5" />
    </button>
  );
}

function Divider() {
  return <div className="mx-1 h-3.5 w-px bg-white/10" />;
}

function ExpandOverlay({ kind, content, onClose }: { kind: NodeKind; content: string; onClose: () => void }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <X className="size-5" />
        </button>
        {kind === "text" ? (
          <Markdown content={content} className="p-4 text-sm" />
        ) : kind === "audio" ? (
          <div className="p-6"><AudioPlayer url={content} /></div>
        ) : kind === "video" ? (
          <video controls src={content} className="max-h-[80vh] rounded-xl" />
        ) : (
          <img src={content} alt="" className="max-h-[80vh] rounded-xl object-contain" />
        )}
      </div>
    </div>,
    document.body,
  );
}
