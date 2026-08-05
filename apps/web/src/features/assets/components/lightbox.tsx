"use client";

import { AudioLines, Download, X } from "lucide-react";
import { useEffect } from "react";
import type { LibraryAsset } from "../types";

export function Lightbox({ asset, onClose }: { asset: LibraryAsset; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop click-to-close
    // biome-ignore lint/a11y/useKeyWithClickEvents: Escape handled via keydown listener
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4 backdrop-blur-sm sm:p-8" onClick={onClose}>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <X className="size-5" />
      </button>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: inner container only stops propagation */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: inner container only stops propagation */}
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-full max-w-5xl flex-col items-center gap-4">
        {asset.kind === "image" ? (
          <img src={asset.url} alt={asset.name} className="max-h-[78vh] rounded-lg object-contain" />
        ) : asset.kind === "video" ? (
          // biome-ignore lint/a11y/useMediaCaption: user media preview
          <video src={asset.url} controls autoPlay className="max-h-[78vh] rounded-lg" />
        ) : (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-10">
            <AudioLines className="size-12 text-white/70" />
            {/* biome-ignore lint/a11y/useMediaCaption: user media preview */}
            <audio src={asset.url} controls autoPlay />
          </div>
        )}
        <div className="flex items-center gap-3 text-white">
          <span className="max-w-xs truncate text-sm">{asset.name}</span>
          <a
            href={asset.url}
            download
            className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white/20"
          >
            <Download className="size-4" /> Download
          </a>
        </div>
      </div>
    </div>
  );
}
