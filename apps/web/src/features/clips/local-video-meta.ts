// Read a local video file's duration, dimensions, and a poster frame entirely
// in the browser (before upload), so the configure step can show a thumbnail
// and length instantly. Best-effort: metadata is reliable; the thumbnail
// degrades to null if a frame can't be decoded.
export async function extractVideoMetadata(file: File): Promise<{
  duration: number;
  width: number;
  height: number;
  thumbnail: string | null;
}> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Could not read this video file."));
    });

    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    const width = video.videoWidth;
    const height = video.videoHeight;

    // Grab a frame a moment in (10% or 1s, whichever is smaller) as the poster.
    let thumbnail: string | null = null;
    try {
      const at = duration > 0 ? Math.min(1, duration * 0.1) : 0;
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("seek failed"));
        video.currentTime = at;
      });
      const scale = width ? Math.min(1, 640 / width) : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((width || 320) * scale));
      canvas.height = Math.max(1, Math.round((height || 180) * scale));
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        thumbnail = canvas.toDataURL("image/jpeg", 0.7);
      }
    } catch {
      // thumbnail is optional — metadata below is what matters
    }

    return { duration, width, height, thumbnail };
  } finally {
    URL.revokeObjectURL(url);
  }
}
