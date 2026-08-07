// ── Per-feature deep pages: real content + SEO. Drives /features/[slug]. ──

import type { BlogBlock } from "./blog";

export interface FeaturePage {
  slug: string;
  icon: string; // lucide name (see Icon component)
  title: string;
  tagline: string; // one-line summary (meta description + hero sub)
  tone: string;
  keywords: string[];
  content: BlogBlock[];
}

export const FEATURE_PAGES: FeaturePage[] = [
  {
    slug: "ai-clips",
    icon: "Scissors",
    title: "AI Clips",
    tagline: "Drop in a long video and get captioned, scored, vertical clips — ready to post.",
    tone: "teal",
    keywords: ["ai clips", "video repurposing", "auto captions", "short-form clips", "viral clips", "podcast clips"],
    content: [
      { type: "p", text: "AI Clips turns one long upload — a podcast, stream, or webinar — into a stack of short-form clips, without you scrubbing through the footage. It finds the moments, cuts them, captions them, and hands them back ready for TikTok, Reels, and Shorts." },
      { type: "h2", text: "Scored, not guessed" },
      { type: "p", text: "Every word is transcribed with timestamps, then read for hooks, complete thoughts, and punchlines. Each candidate clip gets a virality score with the reasoning shown, so you can trust the picks — or sort, tweak, and override them." },
      { type: "h2", text: "Vertical and captioned" },
      { type: "p", text: "Clips come back reframed to 9:16 with word-by-word captions burned in. Choose a caption template or design your own; the words stay locked to the audio frame for frame." },
      { type: "h2", text: "Straight to a schedule" },
      { type: "ul", items: ["Whisper-accurate, word-level transcripts", "Virality scores with visible reasoning", "Custom caption styles", "Bulk scheduling to a posting queue"] },
    ],
  },
  {
    slug: "node-canvas",
    icon: "Workflow",
    title: "Node canvas",
    tagline: "Wire prompts, images, and clips into a visual graph — your storyboard and render pipeline at once.",
    tone: "violet",
    keywords: ["node canvas", "ai video pipeline", "visual workflow", "text to image", "image to video"],
    content: [
      { type: "p", text: "The node canvas is where an idea becomes a sequence. A prompt becomes an image, an image becomes a video, and each edge passes that media to the next model. You see the whole flow before you commit to a final render." },
      { type: "h2", text: "Your storyboard is your pipeline" },
      { type: "p", text: "Branch an idea, compare two directions side by side, or reference an earlier shot downstream — all on the same board. Nothing is thrown away when you change your mind." },
      { type: "h2", text: "Media flows downstream" },
      { type: "p", text: "Connect a node's output to the next node's input and the media follows the wire. Reference images feed the models below them automatically, so a look you established up top stays consistent all the way down." },
      { type: "h2", text: "Every model in one graph" },
      { type: "p", text: "Swap the model on any node from a single menu without new accounts. Generations run in the cloud and stream back to the canvas while you keep building." },
    ],
  },
  {
    slug: "magnetic-timeline",
    icon: "Clapperboard",
    title: "Magnetic timeline",
    tagline: "A Final-Cut-style editor that never leaves a gap — frame-perfect trims that ripple.",
    tone: "teal",
    keywords: ["magnetic timeline", "video editor", "ripple edit", "frame accurate", "timeline editing"],
    content: [
      { type: "p", text: "When your shots are ready, they drop onto a real timeline — magnetic, frame-accurate, and on the same canvas as the models that made them. No export-and-import between generating and editing." },
      { type: "h2", text: "Gaps close themselves" },
      { type: "p", text: "Delete a clip and the ones after it slide left to fill the space. Insert one and the timeline makes room. You never scrub back to find a silent gap you forgot to close." },
      { type: "h2", text: "Frame-accurate everything" },
      { type: "p", text: "Trim the tail of a shot and everything downstream ripples to match — captions, voiceover, and overlays included. A cut that looks clean in the preview is clean in the export." },
      { type: "h2", text: "On the same canvas as your models" },
      { type: "p", text: "Generate a replacement shot and drop it straight into the cut. There's no round trip because it's all one project." },
    ],
  },
  {
    slug: "ai-models",
    icon: "Sparkles",
    title: "Every model, one place",
    tagline: "Text-to-image, text-to-video, image-to-video, and extend — switch models from a single menu.",
    tone: "indigo",
    keywords: ["ai video models", "text to video", "image to video", "model menu", "veo", "kling"],
    content: [
      { type: "p", text: "Riocut connects the leading text, image, and video models behind one menu, so you pick the right tool for each shot without juggling accounts or re-uploading between them." },
      { type: "h2", text: "One menu, every mode" },
      { type: "p", text: "Text to image, text to video, image to video, and extend — every mode is a click away on any node. Match the model to the motion instead of forcing one model to do everything." },
      { type: "h2", text: "Free to draft, premium to finish" },
      { type: "p", text: "Free-tier models are perfect for exploring an idea; premium models unlock when you need the extra quality for the final render. Draft fast, finish sharp." },
      { type: "h2", text: "New models, automatically" },
      { type: "p", text: "When a new model ships, it appears in your menu. No migration, no new subscription — the studio keeps up so you don't have to." },
    ],
  },
  {
    slug: "connected-clips",
    icon: "Layers",
    title: "Connected clips",
    tagline: "Captions, voiceover, and overlays stay attached to their shot — sync you set once, sync you keep.",
    tone: "teal",
    keywords: ["connected clips", "video captions", "subtitles", "caption sync", "karaoke captions"],
    content: [
      { type: "p", text: "A caption that lags the audio ruins a short — and it usually happens because a trim moved the shot but not the caption. Connected clips make that impossible." },
      { type: "h2", text: "Captions belong to the shot" },
      { type: "p", text: "In Riocut, captions, voiceover, and overlays are attached to the clip they describe. Move it, split it, or ripple a trim and they move with it." },
      { type: "h2", text: "Word-level timing" },
      { type: "p", text: "Word-level timestamps let captions highlight one word at a time in perfect step with the speaker — the karaoke effect that holds attention on muted feeds." },
      { type: "h2", text: "Style once, apply everywhere" },
      { type: "p", text: "Pick a caption template or design your own once, and it applies across every clip in the project." },
    ],
  },
  {
    slug: "ai-assistant",
    icon: "Wand2",
    title: "AI assistant",
    tagline: "Describe what you want in plain language — the assistant picks the model and generates in one click.",
    tone: "violet",
    keywords: ["ai assistant", "prompt to video", "plain language editing", "ai video generation"],
    content: [
      { type: "p", text: "Not sure which mode or model fits your idea? Describe it. The assistant translates plain language into the right generation and drops the result onto your canvas." },
      { type: "h2", text: "Describe it in plain language" },
      { type: "p", text: "\"A drone shot flying over neon Tokyo at night\" is enough. No mode-picking, no parameter hunting — just say what you want to see." },
      { type: "h2", text: "It picks the model for you" },
      { type: "p", text: "The assistant chooses the mode and model that suit the request, writes the prompt, and generates — then hands you a shot you can drop straight onto the timeline." },
      { type: "h2", text: "Refine on the canvas" },
      { type: "p", text: "Every result is a node you can branch, re-prompt, or feed into the next model. The assistant gets you started; the canvas lets you take it further." },
    ],
  },
  {
    slug: "built-for-speed",
    icon: "Gauge",
    title: "Built for speed",
    tagline: "Generations run in the cloud and stream back — keep editing while the next shot renders.",
    tone: "amber",
    keywords: ["fast ai video", "cloud rendering", "video generation speed", "parallel generation"],
    content: [
      { type: "p", text: "Iteration speed decides how good your final video gets. Riocut runs generations in the cloud and streams them back to your canvas, so you're never staring at a spinner." },
      { type: "h2", text: "Cloud generation, streamed back" },
      { type: "p", text: "Kick off a render and it processes on our infrastructure, not your laptop. Results arrive on the canvas the moment they're ready." },
      { type: "h2", text: "Keep working while it renders" },
      { type: "p", text: "Start the next shot, trim a clip, or write a caption while a generation is in flight. Nothing blocks the rest of your project." },
      { type: "h2", text: "Iterate at the speed of ideas" },
      { type: "p", text: "Fast feedback means you try ten directions instead of two — and the best video is almost always the one you iterated on the most." },
    ],
  },
];

export const getFeature = (slug: string) => FEATURE_PAGES.find((f) => f.slug === slug);
