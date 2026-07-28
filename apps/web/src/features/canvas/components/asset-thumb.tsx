import { AudioLines } from "lucide-react";
import type { AssetItem } from "../hooks/use-assets";

export function AssetThumb({ asset, className }: { asset: AssetItem; className?: string }) {
  if (asset.kind === "video") {
    // biome-ignore lint/a11y/useMediaCaption: library thumbnail
    return <video src={asset.url} muted className={className ?? "w-full rounded-lg"} />;
  }
  if (asset.kind === "audio") {
    return (
      <div className={`grid place-items-center bg-secondary ${className ?? "h-24 w-full rounded-lg"}`}>
        <AudioLines className="size-6 text-muted-foreground" />
      </div>
    );
  }
  // biome-ignore lint/a11y/useAltText: library thumbnail
  return <img src={asset.url} className={className ?? "w-full rounded-lg"} />;
}
