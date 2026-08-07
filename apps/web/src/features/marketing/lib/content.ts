// ── Single source of truth for all marketing copy. Rename the brand here. ──
export const BRAND = {
  name: "Riocut",
  tagline: "Prompt to finished video, on one canvas.",
  appUrl: "/login", // "Start free" / "Sign in" → the app's auth entry
  email: "hello@riocut.com",
  social: { x: "#", youtube: "#", discord: "#" },
};

// Top-nav items. `menu` renders a bento hover mega-menu with an optional `featured` card;
// a plain `href` (no menu) is a direct link.
export type NavMenuItem = { icon: string; title: string; desc?: string; href: string };
export type NavFeatured = { title: string; desc?: string; visual: string; href: string; badge?: string };
export type NavItem = { label: string; href?: string; featured?: NavFeatured; menu?: NavMenuItem[] };

export const NAV: NavItem[] = [
  {
    label: "Features",
    featured: { title: "AI Clips", desc: "One long video in, ten captioned viral clips out.", visual: "canvas", href: "/features", badge: "New" },
    menu: [
      { icon: "Scissors", title: "AI Clips", desc: "Long video → shorts", href: "/features" },
      { icon: "Workflow", title: "Node canvas", desc: "Chain models visually", href: "/features" },
      { icon: "Clapperboard", title: "Video editor", desc: "Magnetic timeline", href: "/features" },
      { icon: "Image", title: "Text to image", desc: "Stills from a prompt", href: "/features" },
      { icon: "Video", title: "Text to video", desc: "Words into footage", href: "/features" },
      { icon: "Film", title: "Image to video", desc: "Animate a still", href: "/features" },
      { icon: "Wand2", title: "Extend video", desc: "Continue a clip", href: "/features" },
      { icon: "Sparkles", title: "AI assistant", desc: "Describe it, generate it", href: "/features" },
    ],
  },
  { label: "Showcase", href: "/#showcase" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
  { label: "About", href: "/about" },
];

export const HERO = {
  eyebrow: "AI video studio",
  title: "The all-in-one AI video studio",
  accent: "AI video", // highlighted in accent colour within the title
  subtitle: "Generate footage, cut it on a real timeline, and turn long videos into ready-to-post viral clips — all in one studio.",
  primary: { label: "Try online for free", href: "/login" },
  secondary: { label: "Watch the demo", href: "#showcase" },
  note: "No credit card required",
};

export const LOGOS = ["Northwind", "Lumen", "Acme Studios", "Vertex", "Monarch", "Foundry"];

export const STATS = [
  { value: "40+", label: "AI models, one interface" },
  { value: "1080p", label: "HD export resolution" },
  { value: "<60s", label: "First frame to first cut" },
  { value: "1→10", label: "Long video to viral clips" },
];

export const FEATURES = [
  { icon: "Scissors", visual: "bars", title: "AI Clips", desc: "Drop in a long video. Riocut transcribes every word, finds the strongest moments, and cuts captioned vertical clips with virality scores." },
  { icon: "Workflow", visual: "canvas", title: "Node canvas", desc: "Wire prompts, images, and clips into a visual graph. Every node is a model call; every edge passes media downstream." },
  { icon: "Clapperboard", visual: "timeline", title: "Magnetic timeline", desc: "A Final-Cut-style editor that never leaves a gap. Insert makes room, delete closes it, trims ripple — frame-perfect." },
  { icon: "Sparkles", visual: "nodes", title: "Every model, one place", desc: "Text-to-image, text-to-video, image-to-video, and extend — switch models from a single menu without new accounts." },
  { icon: "Layers", visual: "waveform", title: "Connected clips", desc: "Captions, voiceover, and overlays stay attached to their shot. Move the shot and everything moves with it." },
  { icon: "Wand2", visual: "scene", title: "AI assistant", desc: "Describe what you want in plain language. The assistant picks the mode and model, then generates in one click." },
  { icon: "Gauge", visual: "bars", title: "Built for speed", desc: "Generations run in the cloud and stream back to your canvas. Keep editing while the next shot renders." },
];

export const STEPS = [
  { n: "01", title: "Describe your shot", desc: "Type a prompt or drop a reference image. Pick a model — or let the assistant choose one for you." },
  { n: "02", title: "Generate on the canvas", desc: "Each node produces a frame or a clip. Chain them: image → video, then extend the video for a longer take." },
  { n: "03", title: "Cut it on the timeline", desc: "Drag clips onto the magnetic timeline, trim to the beat, layer captions and audio, and preview instantly." },
  { n: "04", title: "Export and ship", desc: "Render a clean MP4 in the aspect ratio you need — vertical for social, wide for the big screen." },
];

export const MODES = [
  { tag: "T→I", title: "Text to Image", desc: "Generate stills and keyframes from a prompt." },
  { tag: "T→V", title: "Text to Video", desc: "Turn a description into moving footage." },
  { tag: "I→V", title: "Image to Video", desc: "Animate any still into a living shot." },
  { tag: "V→V", title: "Extend Video", desc: "Continue a clip for a longer, seamless take." },
];

export const TOOL_TABS = [
  {
    n: "01",
    label: "Generate",
    title: "Every model, one canvas",
    desc: "Turn a prompt or a still into footage. Chain text, image, and video models and let media flow between them.",
    bullets: ["Text to image & video", "Image to video", "Extend any clip", "Swap models instantly"],
    media: "Generation on the canvas", img: "https://images.pexels.com/photos/38220710/pexels-photo-38220710.jpeg",
  },
  {
    n: "02",
    label: "Edit",
    title: "A magnetic timeline",
    desc: "Cut, trim, and arrange on a Final-Cut-style timeline that never leaves an accidental gap.",
    bullets: ["Gap-free magnetic edits", "Frame-accurate trims", "Split & ripple", "Multi-track layers"],
    media: "Timeline editing", img: "https://images.pexels.com/photos/17115909/pexels-photo-17115909.jpeg",
  },
  {
    n: "03",
    label: "Repurpose",
    title: "Long video in, viral clips out",
    desc: "Paste a link or upload a video. The AI reads the transcript, picks the moments with hooks, and hands back captioned, face-framed clips — scored and scheduled.",
    bullets: ["AI moment selection + virality scores", "Word-by-word animated captions", "Vertical 9:16 reframing", "Auto-schedule the posting queue"],
    media: "AI clipping", img: "https://images.pexels.com/photos/6878702/pexels-photo-6878702.jpeg",
  },
  {
    n: "04",
    label: "Enhance",
    title: "Assistant & connected clips",
    desc: "Describe what you want in plain language, and keep captions, audio, and overlays locked to their shot.",
    bullets: ["Prompt-to-shot assistant", "Connected captions & audio", "Voiceover & music", "One-click presets"],
    media: "AI assistant", img: "https://images.pexels.com/photos/16229745/pexels-photo-16229745.jpeg",
  },
  {
    n: "05",
    label: "Export",
    title: "Ship it anywhere",
    desc: "Render a clean MP4 in the exact ratio you need — vertical for social, wide for the screen, in crisp 1080p HD.",
    bullets: ["9:16 · 1:1 · 16:9", "1080p HD", "No watermark on paid plans", "Fast cloud render"],
    media: "Export & share", img: "https://images.pexels.com/photos/8488289/pexels-photo-8488289.jpeg",
  },
];

export const FEATURE_ROWS = [
  {
    eyebrow: "Node canvas",
    title: "Your storyboard and render pipeline, together.",
    desc: "Wire a prompt into an image, an image into a video, then extend the shot — each node is a model call, each edge passes media downstream. Build the whole sequence visually before you ever open the editor.",
    bullets: ["Chain text, image & video models", "Reference images flow downstream", "Swap models from one menu", "Runs in the cloud, streams back"],
    media: "mock" as const,
    reverse: false,
  },
  {
    eyebrow: "Magnetic timeline",
    title: "Cut like a pro, without the learning curve.",
    desc: "A Final-Cut-style timeline that keeps itself tidy. Insert makes room, delete closes the gap, trims ripple — all frame-perfect. Captions, voiceover, and overlays stay locked to their shot.",
    bullets: ["Gap-free magnetic editing", "Frame-accurate trims & splits", "Connected captions & audio", "Instant preview, clean export"],
    media: { tone: "slate", label: "Timeline editor", play: true, img: "https://images.pexels.com/photos/29272604/pexels-photo-29272604.jpeg" } as const,
    reverse: true,
  },
  {
    eyebrow: "AI Clips",
    title: "One long video. Ten viral clips.",
    desc: "Riocut listens to every word of your podcast or stream, scores each moment for hook strength and completeness, then renders vertical clips with karaoke captions and a posting schedule. Review, tweak a caption, and ship.",
    bullets: ["Whisper-accurate transcripts, word by word", "Virality scores with the reasoning shown", "Caption templates — or design your own", "Bulk schedule straight to a posting queue"],
    media: { tone: "teal", label: "AI clipping", play: true, img: "https://images.pexels.com/photos/4319926/pexels-photo-4319926.jpeg" } as const,
    reverse: false,
  },
  {
    eyebrow: "AI assistant",
    title: "Describe it in a sentence. Ship it.",
    desc: "Not sure which model to use? Tell the assistant what you want. It picks the mode and model, writes the prompt, and generates — then hands you a clip you can drop straight onto the timeline.",
    bullets: ["Plain-language prompts", "Auto-selects the right model", "One-click generate", "Refine on the canvas"],
    media: { tone: "violet", label: "AI assistant", play: false, img: "1620712943543-bcc4688e7485" } as const,
    reverse: true,
  },
];

export const MODELS = ["Google Veo", "Kling", "Seedance", "Hailuo", "Flux", "SDXL", "Runway", "Luma", "Ideogram", "Recraft", "Pika", "Wan"];

export const COMPARE = {
  old: {
    title: "The old way",
    points: ["Generate in one app, export, re-import to edit", "Juggle a dozen model subscriptions", "Manual timelines that leave gaps", "Scrubbing hour-long footage for clip-worthy moments", "Wait on a render farm", "Watermarks on anything free"],
  },
  now: {
    title: "With Riocut",
    points: ["Generate and edit on one canvas", "Every model behind a single login", "A magnetic timeline that's always clean", "AI finds, cuts, and captions the viral moments", "Cloud renders that stream back to you", "Clean exports at your resolution"],
  },
};

// Blog posts moved to ./blog (full article content + SEO). Re-exported via the barrel.

export const USE_CASES = [
  { icon: "Megaphone", title: "Ads & promos", desc: "Spin up scroll-stopping product spots in an afternoon, not a week.", img: "https://images.pexels.com/photos/8747310/pexels-photo-8747310.jpeg" },
  { icon: "Music", title: "Music & lyric videos", desc: "Visualize a track with generated scenes cut to the beat.", img: "https://images.pexels.com/photos/13230484/pexels-photo-13230484.jpeg" },
  { icon: "GraduationCap", title: "Explainers", desc: "Script, storyboard, and animate a concept end-to-end.", img: "https://images.pexels.com/photos/18999279/pexels-photo-18999279.jpeg" },
  { icon: "Clapperboard", title: "Short films", desc: "Pre-viz or produce entire scenes from a single canvas.", img: "https://images.pexels.com/photos/30396798/pexels-photo-30396798.jpeg" },
  { icon: "Store", title: "Social content", desc: "Batch vertical clips for every platform from one project.", img: "https://images.pexels.com/photos/6964949/pexels-photo-6964949.jpeg" },
  { icon: "Music", title: "Podcast clipping", desc: "Every episode becomes a stack of captioned, scored shorts.", img: "https://images.pexels.com/photos/6919954/pexels-photo-6919954.jpeg" },
  { icon: "Newspaper", title: "News & recaps", desc: "Turn a headline into a narrated, illustrated segment.", img: "https://images.pexels.com/photos/35755252/pexels-photo-35755252.jpeg" },
];

export const TESTIMONIALS = [
  { quote: "I pasted a 25-minute episode and got eight scored clips with captions burned in. Two of them outperformed everything we posted last month.", name: "Lena Torres", role: "Podcast Producer" },
  { quote: "The canvas plus timeline combo is the first tool that feels like an actual studio, not a toy. We cut our promo turnaround from a week to a day.", name: "Maya Okafor", role: "Creative Director, Lumen" },
  { quote: "I chained an image model into a video model, extended the shot, and cut it — without leaving one tab. That never used to be possible.", name: "Dre Santos", role: "Motion Designer, Freelance" },
  { quote: "The magnetic timeline alone sold me. It behaves exactly like Final Cut but sits right next to the models generating the footage.", name: "Priya Nair", role: "Editor, Monarch Media" },
  { quote: "We produce a week of social content in a single session now. The model menu means we never shop around for tools again.", name: "Jonas Weber", role: "Head of Content, Vertex" },
  { quote: "The assistant is genuinely useful — I describe a scene, it picks a model and generates. It's like having a producer who never sleeps.", name: "Aisha Rahman", role: "Content Creator" },
  { quote: "Extend-video is my secret weapon. I generate a five-second shot and stretch it into a full sequence without a single seam.", name: "Marco Bianchi", role: "Filmmaker, Foundry" },
];

export const PRICING = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Everything you need to try the full pipeline.",
    cta: "Start free",
    highlight: false,
    features: ["100 free credits every month", "AI Clips from uploads & links (TikTok, Vimeo & more)", "Sources up to 30 minutes", "Canvas + timeline editor (free models)", "720p exports with watermark"],
  },
  {
    name: "Plus",
    price: "$12",
    period: "per month",
    blurb: "Best for occasional clipping and posting.",
    cta: "Get Plus",
    highlight: false,
    features: ["1,200 credits every month", "YouTube link import", "AI video generation (standard models)", "Sources up to 1 hour", "1080p HD, no watermark"],
  },
  {
    name: "Pro",
    price: "$28",
    period: "per month",
    blurb: "For creators shipping video every week.",
    cta: "Go Pro",
    highlight: true,
    features: ["Everything in Plus", "3,200 credits every month", "Premium models (Veo, Kling & more)", "Sources up to 2 hours", "Auto-schedule & direct publishing", "Email support"],
  },
  {
    name: "Ultra",
    price: "$76",
    period: "per month",
    blurb: "Built for daily, high-volume production.",
    cta: "Go Ultra",
    highlight: false,
    features: ["Everything in Pro", "10,000 credits every month", "Highest generation priority", "Early access to new models"],
  },
  {
    name: "Studio",
    price: "$140+",
    period: "per month",
    blurb: "For series, films, and ads — sized S to MAX.",
    cta: "Pick a size",
    highlight: false,
    features: ["From 20,000 credits every month", "Everything in Ultra", "Volume pricing (S / M / L / XL / MAX)", "Invoice support", "Dedicated support"],
  },
];

export const FAQ = [
  { q: "How does AI clipping work?", a: "Paste a link or upload a video up to 30 minutes. Riocut transcribes it word by word, an AI picks the most engaging self-contained moments, and each one renders as a vertical clip with animated captions and a virality score explaining the pick. You can trim, restyle captions, bulk-schedule, or open any clip in the full editor." },
  { q: "What is Riocut, exactly?", a: "A single workspace for AI video: a node canvas where you generate footage by chaining models, and a magnetic timeline where you cut it together. Both share one media pool." },
  { q: "Which AI models can I use?", a: "Text-to-image, text-to-video, image-to-video, and video-extend models from leading providers — all selectable from one menu. Free-tier models are included; premium models unlock on Pro." },
  { q: "Do I need any editing experience?", a: "No. The assistant can pick the model and generate for you, and the timeline is magnetic — it keeps everything gap-free automatically. Power users still get frame-level control." },
  { q: "How do credits work?", a: "Each generation costs credits based on the model. Free plans get a monthly allowance; Pro adds premium models and a bigger balance. You only spend credits when you generate." },
  { q: "Can I export for social platforms?", a: "Yes — export vertical (9:16), square (1:1), or widescreen (16:9) MP4s. Paid plans remove the watermark and unlock 1080p HD." },
  { q: "Is my work private?", a: "Your projects and generated media are private to your workspace. Studio plans add SSO and admin controls for teams." },
];

export const FOOTER = [
  {
    title: "Product",
    links: [
      { label: "AI Clips", href: "/features" },
      { label: "Canvas", href: "/features" },
      { label: "Video editor", href: "/features" },
      { label: "Templates", href: "/#showcase" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "AI tools",
    links: [
      { label: "Video repurposing", href: "/features" },
      { label: "Text to image", href: "/features" },
      { label: "Text to video", href: "/features" },
      { label: "Image to video", href: "/features" },
      { label: "Extend video", href: "/features" },
      { label: "AI assistant", href: "/features" },
    ],
  },
  {
    title: "Editing",
    links: [
      { label: "Magnetic timeline", href: "/features" },
      { label: "Trim & split", href: "/features" },
      { label: "Connected clips", href: "/features" },
      { label: "1080p export", href: "/features" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "#" },
      { label: "Help center", href: "#" },
      { label: "Changelog", href: "#" },
      { label: "Roadmap", href: "#" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Careers", href: "#" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
      { label: "Data deletion", href: "/data-deletion" },
    ],
  },
];
