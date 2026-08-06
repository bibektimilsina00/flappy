// Per-platform safe-zone overlays — approximate each app's real feed UI so you
// can see what gets covered. Sized in container-query units (cqw) so everything
// scales with the preview canvas. Preview-only (never burned into export).
import {
  BadgeCheck,
  BatteryFull,
  Bookmark,
  Camera,
  Cast,
  ChevronDown,
  Forward,
  Heart,
  MessageCircle,
  MoreHorizontal,
  MoreVertical,
  Music,
  Phone,
  Play,
  Plus,
  Repeat,
  Search,
  Send,
  Signal,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Wifi,
  X,
} from "lucide-react";
import type React from "react";

export type OverlayKind =
  | "tiktok"
  | "youtube-shorts"
  | "instagram-reel"
  | "instagram-story"
  | "linkedin"
  | "facebook-video"
  | "facebook-story";

export function PlatformOverlay({ kind }: { kind: OverlayKind }) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none text-white [container-type:inline-size]">
      {kind === "tiktok" ? (
        <TikTok />
      ) : kind === "youtube-shorts" ? (
        <YouTubeShorts />
      ) : kind === "instagram-reel" ? (
        <InstagramReel />
      ) : kind === "instagram-story" ? (
        <InstagramStory />
      ) : kind === "linkedin" ? (
        <LinkedIn />
      ) : kind === "facebook-video" ? (
        <FacebookVideo />
      ) : (
        <FacebookStory />
      )}
    </div>
  );
}

// ── shared ──────────────────────────────────────────────────
function StatusBar() {
  return (
    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[6cqw] pt-[3cqw] text-[4.5cqw] font-semibold">
      <span>9:41</span>
      <div className="flex items-center gap-[1.5cqw]">
        <Signal className="size-[4.4cqw]" />
        <Wifi className="size-[4.4cqw]" />
        <BatteryFull className="size-[6cqw]" />
      </div>
    </div>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return <div className="absolute bottom-[9cqw] right-[3.5cqw] flex flex-col items-center gap-[4.5cqw]">{children}</div>;
}

function RailItem({ icon, label }: { icon: React.ReactNode; label?: string }) {
  return (
    <div className="flex flex-col items-center gap-[1cqw]">
      {icon}
      {label ? <span className="text-[3cqw] font-semibold">{label}</span> : null}
    </div>
  );
}

function Avatar({ className = "size-[9cqw]" }: { className?: string }) {
  return <span className={`shrink-0 rounded-full bg-white/30 ${className}`} />;
}

// ── TikTok ──────────────────────────────────────────────────
function TikTok() {
  return (
    <>
      <StatusBar />
      <div className="absolute inset-x-0 top-[10cqw] flex items-center justify-between px-[6cqw]">
        <span className="text-[3.6cqw] font-semibold">LIVE</span>
        <div className="flex items-center gap-[5cqw] text-[4.6cqw]">
          <span className="font-semibold text-white/55">Following</span>
          <div className="relative font-bold">
            For you
            <span className="absolute -bottom-[2.5cqw] left-1/2 h-[0.7cqw] w-[7cqw] -translate-x-1/2 rounded-full bg-white" />
          </div>
        </div>
        <Search className="size-[5.8cqw]" />
      </div>
      <Rail>
        <div className="relative mb-[1cqw]">
          <div className="size-[11cqw] rounded-full border border-white/70 bg-white/25" />
          <div className="absolute -bottom-[2cqw] left-1/2 grid size-[5cqw] -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55]">
            <Plus className="size-[3.2cqw]" strokeWidth={3} />
          </div>
        </div>
        <RailItem icon={<Heart className="size-[8.5cqw] fill-white" />} label="145.1K" />
        <RailItem icon={<MessageCircle className="size-[8.5cqw] fill-white text-transparent" />} label="942" />
        <RailItem icon={<Bookmark className="size-[8cqw] fill-[#f5c518] text-[#f5c518]" />} label="6180" />
        <RailItem icon={<Forward className="size-[8.5cqw] fill-white" />} label="28.1K" />
        <div className="mt-[1cqw] grid size-[10cqw] place-items-center rounded-full bg-gradient-to-br from-neutral-600 to-black">
          <Music className="size-[4cqw]" />
        </div>
      </Rail>
      <div className="absolute inset-x-[5cqw] bottom-[4cqw] space-y-[2cqw] pr-[18cqw]">
        <span className="inline-block rounded-[1cqw] bg-white px-[2cqw] py-[0.6cqw] text-[3cqw] font-semibold text-black">Your friend</span>
        <div className="flex items-center gap-[1.5cqw] text-[4.6cqw] font-bold">
          Tiktok <BadgeCheck className="size-[4.2cqw] fill-[#20d5ec] text-black" />
        </div>
        <p className="text-[3.6cqw] leading-snug">
          This a TikTok video with a long description of the video content. <span className="font-semibold">#tiktok #viral</span>…{" "}
          <span className="font-semibold">more</span>
        </p>
        <p className="text-[3.4cqw] text-white/70">See translation</p>
      </div>
    </>
  );
}

// ── YouTube Shorts ──────────────────────────────────────────
function YouTubeShorts() {
  return (
    <>
      <StatusBar />
      <div className="absolute right-[5cqw] top-[10cqw] flex items-center gap-[5cqw]">
        <Cast className="size-[5.4cqw]" />
        <Search className="size-[5.4cqw]" />
        <MoreVertical className="size-[5.4cqw]" />
      </div>
      <Rail>
        <RailItem icon={<ThumbsUp className="size-[8cqw]" />} label="248" />
        <RailItem icon={<ThumbsDown className="size-[8cqw]" />} label="Dislike" />
        <RailItem icon={<MessageCircle className="size-[8cqw]" />} label="25" />
        <RailItem icon={<Forward className="size-[8cqw]" />} label="Share" />
        <RailItem icon={<Repeat className="size-[8cqw]" />} label="Remix" />
        <div className="size-[9cqw] rounded-[1.5cqw] bg-white/25" />
      </Rail>
      <div className="absolute inset-x-[5cqw] bottom-[4cqw] space-y-[2.5cqw] pr-[16cqw]">
        <div className="flex items-center gap-[2.5cqw]">
          <Avatar className="size-[8cqw]" />
          <span className="text-[4cqw] font-medium">@youtube</span>
          <span className="rounded-full bg-white px-[3cqw] py-[1cqw] text-[3.6cqw] font-semibold text-black">Subscribe</span>
        </div>
        <div className="flex items-center gap-[1.5cqw] text-[4cqw]">
          <Play className="size-[3.4cqw] fill-white" /> Playlist 1
        </div>
        <p className="text-[4cqw] font-bold leading-snug">Youtube shorts interface #youtube #shorts #viral</p>
      </div>
    </>
  );
}

// ── Instagram Reel ──────────────────────────────────────────
function InstagramReel() {
  return (
    <>
      <StatusBar />
      <div className="absolute inset-x-0 top-[10cqw] flex items-center justify-between px-[6cqw]">
        <span className="text-[6cqw] font-bold">Reels</span>
        <Camera className="size-[6cqw]" />
      </div>
      <Rail>
        <RailItem icon={<Heart className="size-[8cqw]" />} label="30.2K" />
        <RailItem icon={<MessageCircle className="size-[8cqw]" />} label="671" />
        <RailItem icon={<Send className="size-[8cqw]" />} label="1,054" />
        <RailItem icon={<MoreHorizontal className="size-[7cqw]" />} />
        <div className="mt-[1cqw] size-[9cqw] rounded-[2cqw] bg-white/25" />
      </Rail>
      <div className="absolute inset-x-[5cqw] bottom-[4cqw] space-y-[2cqw] pr-[16cqw]">
        <div className="flex items-center gap-[2.5cqw]">
          <Avatar />
          <div className="leading-tight">
            <div className="text-[4cqw] font-semibold">instagram</div>
            <div className="flex items-center gap-[1cqw] text-[3.4cqw]">
              <Music className="size-[3cqw]" /> Music
            </div>
          </div>
          <span className="rounded-[1.5cqw] border border-white/80 px-[3cqw] py-[1cqw] text-[3.6cqw] font-semibold">Follow</span>
        </div>
        <p className="text-[3.8cqw]">This is an Instagram reel</p>
        <div className="flex items-center gap-[1.5cqw] text-[3.5cqw]">
          <span className="size-[3.5cqw] rounded-full bg-white/40" /> Liked by <span className="font-semibold">riocut</span> and 30,240 others
        </div>
      </div>
    </>
  );
}

// ── Instagram Story ─────────────────────────────────────────
function InstagramStory() {
  return (
    <>
      <div className="absolute inset-x-[3cqw] top-[3cqw] flex gap-[1cqw]">
        <div className="h-[0.8cqw] flex-1 rounded-full bg-white/40">
          <div className="h-full w-2/5 rounded-full bg-white" />
        </div>
      </div>
      <div className="absolute inset-x-[4cqw] top-[7cqw] flex items-center justify-between">
        <div className="flex items-center gap-[2.5cqw]">
          <Avatar />
          <span className="text-[4cqw] font-semibold">
            instagram <span className="font-normal text-white/70">15h</span>
          </span>
        </div>
        <div className="flex items-center gap-[4cqw]">
          <MoreHorizontal className="size-[5.5cqw]" />
          <X className="size-[6cqw]" />
        </div>
      </div>
    </>
  );
}

// ── LinkedIn ────────────────────────────────────────────────
function LinkedIn() {
  return (
    <>
      <StatusBar />
      <div className="absolute right-[5cqw] top-[10cqw]">
        <MoreHorizontal className="size-[5.5cqw]" />
      </div>
      <Rail>
        <RailItem icon={<ThumbsUp className="size-[8cqw]" />} label="2.1K" />
        <RailItem icon={<MessageCircle className="size-[8cqw]" />} label="146" />
        <RailItem icon={<Forward className="size-[8cqw]" />} label="0" />
        <RailItem icon={<Bookmark className="size-[8cqw]" />} />
      </Rail>
      <div className="absolute inset-x-[5cqw] bottom-[7cqw] space-y-[1.5cqw] pr-[16cqw]">
        <div className="flex items-center gap-[2.5cqw]">
          <Avatar />
          <span className="text-[4.2cqw] font-bold">Linkedin</span>
          <span className="rounded-full border border-white/80 px-[2.5cqw] py-[0.6cqw] text-[3.4cqw] font-semibold">Follow</span>
        </div>
        <div className="text-[3.4cqw] text-white/70">1,814 followers</div>
        <p className="text-[3.8cqw]">
          This is a Linkedin video <span className="float-right text-white/70">…more</span>
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-[2cqw] px-[3cqw]">
        <div className="h-[0.8cqw] w-full overflow-hidden rounded-full bg-white/25">
          <div className="h-full w-1/4 rounded-full bg-white" />
        </div>
      </div>
    </>
  );
}

// ── Facebook Video ──────────────────────────────────────────
function FacebookVideo() {
  return (
    <>
      <StatusBar />
      <div className="absolute inset-x-0 top-[10cqw] flex items-center justify-between px-[5cqw]">
        <div className="flex items-center gap-[3cqw]">
          <X className="size-[6cqw]" />
          <span className="text-[5cqw] font-bold">Reels</span>
          <ChevronDown className="size-[4cqw]" />
        </div>
        <div className="flex items-center gap-[4cqw]">
          <Search className="size-[5.4cqw]" />
          <Camera className="size-[5.4cqw]" />
          <span className="size-[5.4cqw] rounded-full border border-white" />
        </div>
      </div>
      <Rail>
        <RailItem icon={<ThumbsUp className="size-[8cqw] fill-white text-black" />} label="37.9K" />
        <RailItem icon={<MessageCircle className="size-[8cqw]" />} label="61" />
        <RailItem icon={<Forward className="size-[8cqw]" />} label="768" />
        <RailItem
          icon={
            <span className="grid size-[8cqw] place-items-center rounded-full border border-white">
              <Phone className="size-[4cqw] fill-white" />
            </span>
          }
          label="Send"
        />
        <MoreHorizontal className="size-[6cqw]" />
      </Rail>
      <div className="absolute inset-x-[5cqw] bottom-[4cqw] space-y-[2cqw] pr-[16cqw]">
        <div className="flex items-center gap-[2.5cqw]">
          <Avatar className="size-[8cqw]" />
          <span className="text-[4cqw] font-semibold">Facebook</span>
          <Camera className="size-[3.6cqw]" />
        </div>
        <p className="text-[3.8cqw]">This is a Facebook video</p>
        <div className="flex items-center gap-[1.5cqw] text-[3.5cqw]">
          <Music className="size-[3.5cqw]" /> Soundtrack
        </div>
      </div>
    </>
  );
}

// ── Facebook Story ──────────────────────────────────────────
function FacebookStory() {
  return (
    <>
      <div className="absolute inset-x-[3cqw] top-[3cqw]">
        <div className="h-[0.8cqw] w-full overflow-hidden rounded-full bg-white/40">
          <div className="h-full w-1/3 rounded-full bg-white" />
        </div>
      </div>
      <div className="absolute inset-x-[4cqw] top-[7cqw] flex items-start justify-between">
        <div className="flex items-center gap-[2.5cqw]">
          <Avatar />
          <div className="leading-tight">
            <div className="text-[4cqw] font-bold">
              Facebook <span className="font-normal text-white/70">22h</span>
            </div>
            <div className="flex items-center gap-[1cqw] text-[3.4cqw]">
              <Sparkles className="size-[3cqw]" /> FILTER By creators <ChevronDown className="size-[3cqw]" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-[4cqw]">
          <MoreHorizontal className="size-[5.5cqw]" />
          <X className="size-[6cqw]" />
        </div>
      </div>
      <div className="absolute inset-x-0 bottom-[4cqw] flex justify-center gap-[3cqw]">
        {["Feline fun!", "Aww 😇", "😍💕"].map((t) => (
          <span key={t} className="rounded-full bg-white/20 px-[3.5cqw] py-[1.5cqw] text-[3.4cqw]">
            {t}
          </span>
        ))}
      </div>
    </>
  );
}
