import { Film, Image as ImageIcon, Music, Sparkles } from "lucide-react";

interface AssetThumbProps {
  kind: string;
  url?: string;
  className?: string;
}

export function AssetThumb({ kind, url, className = "size-10" }: AssetThumbProps) {
  if (url) {
    if (kind === "video") {
      return <video src={url} className={`${className} rounded-lg object-cover`} />;
    }
    if (kind === "image") {
      return <img src={url} alt="" className={`${className} rounded-lg object-cover`} />;
    }
  }

  const Icon = kind === "video" ? Film : kind === "audio" ? Music : kind === "image" ? ImageIcon : Sparkles;

  return (
    <div className={`${className} flex items-center justify-center rounded-lg border border-border bg-muted/60 text-muted-foreground`}>
      <Icon className="size-4" />
    </div>
  );
}
