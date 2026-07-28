import { MonitorPlay } from "lucide-react";

const isVideo = (url: string) => /\.(mp4|webm|mov|m4v|mkv)(\?|#|$)/i.test(url);

// Fills its (overflow-hidden, centered) container: the project's thumbnail — an image,
// a video's first frame, or a placeholder icon when the project has no media yet.
export function ProjectThumb({ src, iconClassName }: { src?: string | null; iconClassName?: string }) {
  if (src) {
    if (isVideo(src)) {
      // #t=0.1 nudges the browser to show a frame instead of a black poster.
      // biome-ignore lint/a11y/useMediaCaption: thumbnail
      return <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />;
    }
    // biome-ignore lint/a11y/useAltText: project thumbnail
    return <img src={src} className="size-full object-cover" />;
  }
  return <MonitorPlay className={iconClassName ?? "size-5 text-muted-foreground/50"} />;
}
