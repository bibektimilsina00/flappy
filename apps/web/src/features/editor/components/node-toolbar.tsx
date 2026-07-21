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
  Zap,
} from "lucide-react";
import { createPortal } from "react-dom";
import { type ReactNode, useEffect, useState } from "react";
import { useEditorActions } from "../editor-actions";
import { popupRegistry } from "../popup-registry";
import type { NodeKind } from "../constants";
import { Markdown } from "./markdown";

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
  const { setNodeData } = useEditorActions();
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const name = label ?? `${kind}-${id.slice(0, 6)}`;

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

  // Text formatting appends Markdown syntax to the node's text.
  const applyMd = (make: (t: string) => string) => setNodeData(id, { text: make(content) });
  const fmt = {
    h1: () => applyMd((t) => `${t}\n# Heading`),
    h2: () => applyMd((t) => `${t}\n## Heading`),
    h3: () => applyMd((t) => `${t}\n### Heading`),
    p: () => applyMd((t) => `${t}\n\nParagraph`),
    bold: () => applyMd((t) => `${t} **bold**`),
    italic: () => applyMd((t) => `${t} *italic*`),
    ul: () => applyMd((t) => `${t}\n- item`),
    ol: () => applyMd((t) => `${t}\n1. item`),
    hr: () => applyMd((t) => `${t}\n\n---\n`),
  };

  const actions = ACTIONS[kind];

  return (
    <div className="nodrag flex items-center gap-0.5 rounded-xl border border-white/10 bg-[#1e1e1e] px-1.5 py-1 shadow-2xl">
      {kind === "text" ? (
        <>
          <Btn icon={Heading1} label="Heading 1" onClick={fmt.h1} />
          <Btn icon={Heading2} label="Heading 2" onClick={fmt.h2} />
          <Btn icon={Heading3} label="Heading 3" onClick={fmt.h3} />
          <Btn icon={Pilcrow} label="Paragraph" onClick={fmt.p} />
          <Divider />
          <Btn icon={Bold} label="Bold" onClick={fmt.bold} />
          <Btn icon={Italic} label="Italic" onClick={fmt.italic} />
          <Divider />
          <Btn icon={List} label="Bullet list" onClick={fmt.ul} />
          <Btn icon={ListOrdered} label="Numbered list" onClick={fmt.ol} />
          <Btn icon={Minus} label="Divider" onClick={fmt.hr} />
        </>
      ) : null}

      {kind === "image" ? (
        <>
          <Btn icon={Pencil} label="Edit" />
          <Btn icon={Crop} label="Crop" />
          <Btn icon={Upload} label="Replace" />
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
                  onClick={() => setMenuOpen(false)}
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

      {kind !== "audio" ? <Btn icon={Maximize2} label="Expand" onClick={() => setExpanded(true)} /> : null}
      {kind !== "text" ? (
        <>
          <Btn icon={Download} label="Download" onClick={download} />
          <Btn icon={FolderPlus} label="Save to library" />
        </>
      ) : null}
      <Divider />
      <Btn icon={Diamond} label="Options" />

      {expanded ? <ExpandOverlay kind={kind} content={content} onClose={() => setExpanded(false)} /> : null}
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

function Divider() {
  return <span className="mx-1 h-5 w-px bg-white/10" />;
}

// Fullscreen preview — portalled to body to escape React Flow's transform.
function ExpandOverlay({ kind, content, onClose }: { kind: NodeKind; content: string; onClose: () => void }) {
  let body: ReactNode;
  if (kind === "image" || kind === "world") body = <img src={content} alt="" className="max-h-full max-w-full rounded-lg" />;
  else if (kind === "video") body = <video controls autoPlay src={content} className="max-h-full max-w-full rounded-lg" />;
  else body = (
    <div className="max-h-full w-[720px] max-w-full overflow-y-auto rounded-lg bg-[#1e1e1e] p-6">
      <Markdown>{content}</Markdown>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-10"
      onClick={onClose}
    >
      <div className="max-h-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        {body}
      </div>
    </div>,
    document.body,
  );
}
