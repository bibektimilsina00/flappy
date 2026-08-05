import { AudioPlayer } from "./audio-player";

interface AssetPreviewProps {
  kind: string;
  url: string;
}

// Renders a generated/uploaded asset in a node.
export function AssetPreview({ kind, url }: AssetPreviewProps) {
  if (kind === "audio") {
    return <AudioPlayer url={url} />;
  }
  if (kind === "video") {
    return <video controls src={url} className="block w-full" />;
  }
  return (
    // biome-ignore lint/a11y/useAltText: generated placeholder asset
    <img src={url} alt="" className="block w-full" />
  );
}
