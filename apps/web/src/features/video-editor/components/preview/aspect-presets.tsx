// Platform-oriented aspect presets for the preview aspect picker: each maps a
// social platform + orientation to concrete canvas dimensions, with its brand mark.
import type React from "react";
import type { OverlayKind } from "./platform-overlays";

type IconProps = { className?: string };

function YouTubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#ff0000" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M22.692 5.287c.372.373.64.836.778 1.345.793 3.19.61 8.23.016 11.544a3.02 3.02 0 0 1-2.124 2.124c-1.863.508-9.359.508-9.359.508s-7.496 0-9.358-.508A3.02 3.02 0 0 1 .52 18.176C-.277 15-.058 9.956.505 6.647A3.02 3.02 0 0 1 2.63 4.523C4.492 4.015 11.988 4 11.988 4s7.496 0 9.358.508c.509.138.973.406 1.346.779m-6.872 7.117-6.218 3.602V8.803z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.583 1A4.583 4.583 0 0 0 1 5.583v12.834A4.583 4.583 0 0 0 5.583 23h12.834A4.583 4.583 0 0 0 23 18.417V5.583A4.583 4.583 0 0 0 18.417 1zM19.333 7.71v2.72c-1.373.047-2.73-.318-3.895-1.048.02 1.647.036 3.295.037 4.942a4.4 4.4 0 0 1-2.253 3.63 4.42 4.42 0 0 1-4.723-.288 4.4 4.4 0 0 1-.837-6.257 4.42 4.42 0 0 1 4.088-1.647v2.634a1.83 1.83 0 0 0-2.19.526 1.82 1.82 0 0 0 .291 2.542 1.83 1.83 0 0 0 2.907-1.204V3.75l2.564.062v.196a3.9 3.9 0 0 0 1.017 2.702 3.9 3.9 0 0 0 2.864 1"
        clipRule="evenodd"
      />
    </svg>
  );
}

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden="true">
      <path
        d="M16.125 1H7.875C4.079 1 1 4.079 1 7.875v8.25C1 19.921 4.079 23 7.875 23h8.25C19.921 23 23 19.921 23 16.125v-8.25C23 4.079 19.921 1 16.125 1m4.813 15.125a4.813 4.813 0 0 1-4.813 4.813h-8.25a4.813 4.813 0 0 1-4.813-4.813v-8.25a4.813 4.813 0 0 1 4.813-4.813h8.25a4.813 4.813 0 0 1 4.813 4.813z"
        fill="url(#ig-grad)"
      />
      <path
        d="M12 6.5A5.5 5.5 0 1 0 12 17.5 5.5 5.5 0 0 0 12 6.5m0 8.938A3.438 3.438 0 1 1 12 8.562a3.438 3.438 0 0 1 0 6.876"
        fill="url(#ig-grad)"
      />
      <path d="M17.913 6.82a.733.733 0 1 0 0-1.466.733.733 0 0 0 0 1.466" fill="url(#ig-grad)" />
      <defs>
        <linearGradient id="ig-grad" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFC107" />
          <stop offset="0.507" stopColor="#F44336" />
          <stop offset="0.99" stopColor="#9C27B0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#0A66C2" aria-hidden="true">
      <path d="M19 0H5a5 5 0 0 0-5 5v14a5 5 0 0 0 5 5h14a5 5 0 0 0 5-5V5a5 5 0 0 0-5-5M8 19H5V8h3zM6.5 6.732c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764M20 19h-3v-5.604c0-3.368-4-3.113-4 0V19h-3V8h3v1.765c1.396-2.586 7-2.777 7 2.476z" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M14.285 10.172 23.223 0h-2.118l-7.761 8.832L7.148 0H0l9.371 13.355L0 24.02h2.117l8.192-9.329 6.543 9.329H24M2.879 1.563h3.254l14.969 20.972h-3.25z" />
    </svg>
  );
}

function FacebookIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#1877F2" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M24 12.069C24 5.409 18.632 0 12 0S0 5.41 0 12.069C0 18.099 4.389 23.095 10.129 24v-8.44H7.082V12.07h3.047V9.413c0-3.03 1.793-4.702 4.536-4.702 1.312 0 2.684.237 2.684.237v2.97H15.84c-1.489 0-1.96.934-1.96 1.889v2.262h3.331l-.529 3.492h-2.791V24C19.61 23.095 24 18.098 24 12.069"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SnapchatIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#FFFC00" aria-hidden="true">
      <path d="M12 1c1.221 0 2.338.29 3.322.86a5.7 5.7 0 0 1 1.427 1.165c.276.323.63.768.902 1.371.272.6.436 1.287.505 2.106.077.907.045 1.782.013 2.561 0 .023.02.04.044.03.28-.11.616-.239.97-.317q.21-.046.42-.047c.617 0 1.103.316 1.302.845.146.392.123.79-.064 1.152-.146.281-.39.541-.75.796-.109.079-.3.204-.522.35-.249.165-.653.432-.913.615a.55.55 0 0 0-.176.195c-.037.093-.044.162.004.348.08.269.26.756.64 1.334.315.485.707.937 1.166 1.35a8.8 8.8 0 0 0 2.014 1.34q.056.028.126.068s.457.236.544.543c.127.452-.213.877-.558 1.104-.566.371-1.255.57-1.655.68q-.168.044-.304.085c-.057.019-.2.075-.262.156-.078.102-.087.227-.115.369-.043.239-.141.533-.431.737-.32.223-.724.24-1.238.26-.536.021-1.203.046-1.968.304-.354.118-.676.32-1.046.552-.776.485-1.742 1.088-3.39 1.088-1.652 0-2.624-.605-3.405-1.093-.37-.23-.687-.429-1.035-.545-.764-.257-1.431-.283-1.968-.304-.514-.02-.918-.034-1.237-.26-.311-.217-.4-.542-.441-.786-.023-.12-.037-.23-.105-.318-.06-.076-.192-.13-.254-.15q-.14-.044-.315-.09c-.4-.11-.902-.237-1.511-.588-.736-.424-.786-.944-.708-1.201.096-.323.555-.55.555-.55l.114-.06a8.8 8.8 0 0 0 2.014-1.341 7 7 0 0 0 1.167-1.35 5.1 5.1 0 0 0 .644-1.348c.043-.174.036-.243 0-.334-.03-.077-.12-.149-.16-.183-.258-.186-.674-.46-.93-.627a25 25 0 0 1-.523-.35c-.358-.255-.605-.515-.748-.796a1.4 1.4 0 0 1-.064-1.152c.196-.53.682-.845 1.301-.845q.207 0 .42.047c.354.078.69.206.97.317a.03.03 0 0 0 .042-.03c-.03-.707-.064-1.658.014-2.56.068-.817.235-1.506.504-2.107a5.7 5.7 0 0 1 .902-1.37A5.6 5.6 0 0 1 8.674 1.86C9.656 1.29 10.774 1 12 1" />
    </svg>
  );
}

// A generic outline-rectangle icon shaped to the given aspect (portrait/landscape/square).
export function RatioIcon({ w, h, className }: { w: number; h: number; className?: string }) {
  const MAX = 14;
  let rw = MAX;
  let rh = MAX;
  if (w >= h) rh = Math.max(4, Math.round((h / w) * MAX));
  else rw = Math.max(4, Math.round((w / h) * MAX));
  const x = (16 - rw) / 2;
  const y = (16 - rh) / 2;
  return (
    <svg viewBox="0 0 16 16" className={className} fill="none" aria-hidden="true">
      <rect x={x} y={y} width={rw} height={rh} rx="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export interface RatioPreset {
  label: string;
  ratio: string;
  w: number;
  h: number;
}

// Generic (platform-agnostic) canvas ratios.
export const RATIO_PRESETS: RatioPreset[] = [
  { label: "Tall Portrait", ratio: "9:16", w: 1080, h: 1920 },
  { label: "Portrait", ratio: "4:5", w: 1080, h: 1350 },
  { label: "Square", ratio: "1:1", w: 1080, h: 1080 },
  { label: "Boxy Landscape", ratio: "4:3", w: 1440, h: 1080 },
  { label: "Landscape", ratio: "5:4", w: 1350, h: 1080 },
  { label: "Wide Landscape", ratio: "16:9", w: 1920, h: 1080 },
];

export interface AspectPreset {
  key: string;
  platform: string;
  ratio: string;
  w: number;
  h: number;
  overlay?: OverlayKind; // platform safe-zone overlay to render on the preview
  Icon: (props: IconProps) => React.ReactElement;
}

export const ASPECT_PRESETS: AspectPreset[] = ([
  { platform: "YouTube", ratio: "16:9", w: 1920, h: 1080, Icon: YouTubeIcon },
  { platform: "YouTube Short", ratio: "9:16", w: 1080, h: 1920, overlay: "youtube-shorts", Icon: YouTubeIcon },
  { platform: "TikTok", ratio: "9:16", w: 1080, h: 1920, overlay: "tiktok", Icon: TikTokIcon },
  { platform: "Instagram Reel", ratio: "9:16", w: 1080, h: 1920, overlay: "instagram-reel", Icon: InstagramIcon },
  { platform: "Instagram Reel Ultra Wide", ratio: "32:9", w: 1920, h: 540, overlay: "instagram-reel", Icon: InstagramIcon },
  { platform: "Instagram Story", ratio: "9:16", w: 1080, h: 1920, overlay: "instagram-story", Icon: InstagramIcon },
  { platform: "Instagram Post", ratio: "1:1", w: 1080, h: 1080, Icon: InstagramIcon },
  { platform: "LinkedIn", ratio: "9:16", w: 1080, h: 1920, overlay: "linkedin", Icon: LinkedInIcon },
  { platform: "LinkedIn", ratio: "1:1", w: 1080, h: 1080, Icon: LinkedInIcon },
  { platform: "X (Twitter)", ratio: "1:1", w: 1080, h: 1080, Icon: XIcon },
  { platform: "X (Twitter)", ratio: "3:4", w: 1080, h: 1440, Icon: XIcon },
  { platform: "Facebook Video", ratio: "9:16", w: 1080, h: 1920, overlay: "facebook-video", Icon: FacebookIcon },
  { platform: "Facebook Story", ratio: "9:16", w: 1080, h: 1920, overlay: "facebook-story", Icon: FacebookIcon },
  { platform: "Facebook Post", ratio: "1:1", w: 1080, h: 1080, Icon: FacebookIcon },
  { platform: "Snapchat", ratio: "9:16", w: 1080, h: 1920, Icon: SnapchatIcon },
] as Omit<AspectPreset, "key">[]).map((p) => ({ ...p, key: `${p.platform} ${p.ratio}` }));

export interface ResolvedAspect {
  key: string;
  name: string;
  ratio: string;
  w: number;
  h: number;
  isPlatform: boolean;
  overlay: OverlayKind | null;
  Icon: (props: IconProps) => React.ReactElement;
}

// Resolve which preset a canvas maps to — an explicit pick if given, else the
// first preset matching the current ratio (custom labels take priority).
export function resolveAspect(pickedKey: string | null, ratio: number): ResolvedAspect | null {
  const asCustom = (c: RatioPreset): ResolvedAspect => ({
    key: `custom ${c.ratio}`,
    name: c.label,
    ratio: c.ratio,
    w: c.w,
    h: c.h,
    isPlatform: false,
    overlay: null,
    Icon: (props: IconProps) => <RatioIcon w={c.w} h={c.h} {...props} />,
  });
  const asPlatform = (p: AspectPreset): ResolvedAspect => ({
    key: p.key,
    name: p.platform,
    ratio: p.ratio,
    w: p.w,
    h: p.h,
    isPlatform: true,
    overlay: p.overlay ?? null,
    Icon: p.Icon,
  });

  if (pickedKey) {
    const p = ASPECT_PRESETS.find((x) => x.key === pickedKey);
    if (p) return asPlatform(p);
    const c = RATIO_PRESETS.find((x) => `custom ${x.ratio}` === pickedKey);
    if (c) return asCustom(c);
  }
  const match = (w: number, h: number) => Math.abs(w / h - ratio) < 0.01;
  const c = RATIO_PRESETS.find((x) => match(x.w, x.h));
  if (c) return asCustom(c);
  const p = ASPECT_PRESETS.find((x) => match(x.w, x.h));
  return p ? asPlatform(p) : null;
}
