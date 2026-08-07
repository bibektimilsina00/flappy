// ── Blog content: real articles + SEO metadata. One source of truth for the
// blog index and the /blog/[slug] pages. ──

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "ul"; items: string[] };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  date: string; // display, e.g. "Jul 2026"
  iso: string; // ISO 8601 for SEO / <time>
  tone: string;
  img: string;
  author: string;
  readMins: number;
  keywords: string[];
  content: BlogBlock[];
}

export const BLOG: BlogPost[] = [
  {
    slug: "ai-clips-one-video-into-a-week-of-content",
    title: "AI Clips: turn one video into a week of content",
    excerpt: "How the clipping engine scores moments, writes captions, and schedules your posting queue.",
    category: "Product",
    date: "Jul 2026",
    iso: "2026-07-22",
    tone: "teal",
    img: "https://images.pexels.com/photos/3816395/pexels-photo-3816395.jpeg",
    author: "The Riocut Team",
    readMins: 5,
    keywords: ["ai clips", "repurpose video", "short-form video", "viral clips", "auto captions", "content repurposing"],
    content: [
      { type: "p", text: "A single podcast, livestream, or webinar holds a whole week of short-form content. The catch is finding the ten seconds that actually land. Scrubbing an hour of footage for hooks is exactly the work most creators avoid — so the clips never get made. Riocut's AI Clips exists to remove that step entirely." },
      { type: "h2", text: "It reads your video like an editor" },
      { type: "p", text: "First, Riocut transcribes every word with word-level timestamps. Then it reads the transcript the way a seasoned editor would: looking for a strong hook in the opening line, a complete self-contained thought, an emotional beat, or a punchline that pays off. Each candidate becomes a clip with a virality score — and the reasoning is shown, so you're never guessing why a moment was chosen." },
      { type: "p", text: "You stay in control the whole time. Sort clips by score or by timeline order, nudge the in and out points, and drop anything that doesn't fit your feed." },
      { type: "h2", text: "Vertical, captioned, ready to post" },
      { type: "p", text: "Every clip comes back reframed to a 9:16 vertical crop with word-by-word captions burned in — the karaoke style that keeps viewers watching to the end. Choose from a large catalog of caption templates or design your own; the words stay locked to the audio, frame for frame, so nothing drifts out of sync." },
      { type: "h2", text: "From clip to calendar" },
      { type: "p", text: "Once you've picked your favorites, bulk-schedule them straight into a posting queue for TikTok, Reels, and Shorts. One long upload becomes a week of captioned, vertical, ready-to-post clips — without ever opening a separate editor." },
      { type: "ul", items: ["Whisper-accurate transcripts with word-level timing", "Virality scores with the reasoning shown", "Caption templates, or fully custom styles", "Bulk scheduling to a posting queue"] },
      { type: "p", text: "Paste a link and watch it happen. Your first video is free." },
    ],
  },
  {
    slug: "introducing-riocut-one-canvas-for-ai-video",
    title: "Introducing Riocut: one canvas for AI video",
    excerpt: "Why we fused a node-based generator and a real editor into a single workspace.",
    category: "Product",
    date: "Jul 2026",
    iso: "2026-07-15",
    tone: "violet",
    img: "https://images.pexels.com/photos/11063289/pexels-photo-11063289.jpeg",
    author: "The Riocut Team",
    readMins: 4,
    keywords: ["ai video editor", "node canvas", "ai video generation", "text to video", "image to video"],
    content: [
      { type: "p", text: "Making video with AI usually means juggling tools: one app to generate images, another to animate them, a third to cut everything together, and a fourth to add captions. Every hand-off costs a re-upload, a re-render, and a little more of your afternoon. Riocut collapses that stack into one workspace." },
      { type: "h2", text: "A canvas that thinks in media" },
      { type: "p", text: "At the center is a node canvas. A prompt becomes an image, an image becomes a video, and an edge passes that media downstream to the next model. You can see the whole sequence before you commit to a final render — branch an idea, swap a model, or reference an earlier shot without starting over." },
      { type: "h2", text: "Every model, one login" },
      { type: "p", text: "Riocut connects the leading text, image, and video models behind a single menu. Free-tier options are included so you can experiment, and premium models unlock when you need the extra quality. New models arrive without you lifting a finger." },
      { type: "h2", text: "Generate, then actually edit" },
      { type: "p", text: "When the canvas has produced your shots, they drop straight onto a real timeline — magnetic, frame-accurate, with connected captions and audio. There's no export-and-import dance between generating and editing, because it's all the same project." },
      { type: "p", text: "One canvas, from prompt to finished video. Start free and build your first sequence today." },
    ],
  },
  {
    slug: "how-the-magnetic-timeline-works",
    title: "How the magnetic timeline works",
    excerpt: "A look under the hood at frame-perfect, gap-free editing — and why it matters.",
    category: "Engineering",
    date: "Jul 2026",
    iso: "2026-07-08",
    tone: "teal",
    img: "",
    author: "The Riocut Team",
    readMins: 4,
    keywords: ["magnetic timeline", "video editing", "ripple edit", "frame accurate editing", "timeline editor"],
    content: [
      { type: "p", text: "A timeline should keep itself tidy. Most editors leave you patching gaps by hand every time you trim a clip — a few seconds here, a nudge there, and suddenly your cut is a frame off. Riocut's magnetic timeline is built so those chores disappear." },
      { type: "h2", text: "Gaps close themselves" },
      { type: "p", text: "When you delete a clip, the ones after it slide left to fill the space. When you insert one, the timeline makes room. Nothing is ever left floating over empty frames, and you never scrub back to discover a silent gap you forgot to close." },
      { type: "h2", text: "Trims that ripple" },
      { type: "p", text: "Trim the tail of a shot and everything downstream ripples to match — captions, voiceover, and overlays included. Because edits are frame-accurate, a cut that looks clean in the preview is clean in the export. No half-frames, no drift." },
      { type: "h2", text: "Everything stays attached" },
      { type: "p", text: "Captions, audio, and overlays are connected to the shot they belong to. Move the shot and they move with it. That's what keeps a fast edit from turning into a sync-fixing session an hour later." },
      { type: "p", text: "The result is an editor that feels like it's helping you keep pace, not fighting you for it." },
    ],
  },
  {
    slug: "image-to-video-from-a-still-to-a-shot",
    title: "Image-to-video: from a still to a shot",
    excerpt: "A step-by-step walkthrough of animating a single frame into moving footage.",
    category: "Tutorial",
    date: "Jun 2026",
    iso: "2026-06-24",
    tone: "indigo",
    img: "https://images.pexels.com/photos/149907/pexels-photo-149907.jpeg",
    author: "The Riocut Team",
    readMins: 5,
    keywords: ["image to video", "animate image", "ai video from photo", "keyframe interpolation", "start and end frame"],
    content: [
      { type: "p", text: "Image-to-video is the fastest way to get a believable shot: start from a still you already like, and let a model add motion. Done well, it looks cinematic. Done carelessly, it warps. Here's how to get the clean result every time." },
      { type: "h2", text: "Start with a strong frame" },
      { type: "p", text: "The video inherits everything from your source image — lighting, composition, subject. Generate or upload an image node on the canvas, get the framing right, then connect it to a video node. A clean, well-lit still gives the model far less to guess at." },
      { type: "h2", text: "Describe motion, not the scene" },
      { type: "p", text: "Your prompt should describe how things move, not re-describe what's in the frame. \"Slow push-in, gentle parallax, drifting particles\" gives the model a job; repeating the subject just invites it to redraw — and redrawing is where warping comes from." },
      { type: "h2", text: "Use two frames for control" },
      { type: "p", text: "For a predictable result, give the model a start frame and an end frame. It interpolates between the two, so the motion is a controlled morph rather than a hallucination. This is ideal for blooms, reveals, and simple camera moves." },
      { type: "ul", items: ["Keep motion slow and contained for the cleanest output", "Lower the motion strength if the subject distorts", "Keep clips short — 3 to 5 seconds loops best"] },
      { type: "p", text: "One still, one prompt, one connected node. That's a shot." },
    ],
  },
  {
    slug: "picking-the-right-ai-video-model",
    title: "Picking the right model for the job",
    excerpt: "Free vs premium, speed vs quality — a practical guide to the model menu.",
    category: "Guide",
    date: "Jun 2026",
    iso: "2026-06-12",
    tone: "amber",
    img: "https://images.pexels.com/photos/17483874/pexels-photo-17483874.png",
    author: "The Riocut Team",
    readMins: 4,
    keywords: ["ai video models", "choosing ai model", "veo", "kling", "text to video model", "ai model comparison"],
    content: [
      { type: "p", text: "More models isn't automatically better — the trick is matching the model to the shot. Riocut puts every option behind one menu so you can switch without leaving the canvas. Here's how to choose." },
      { type: "h2", text: "Draft on free, finish on premium" },
      { type: "p", text: "Free-tier models are perfect for exploring: block out your idea, test a few prompts, and settle on a composition without spending credits. When you've locked the shot, switch to a premium model for the final render and keep the parts that already work." },
      { type: "h2", text: "Match the model to the motion" },
      { type: "p", text: "Simple, contained motion — a slow push-in, a morph, atmospheric drift — runs cleanly on almost anything. Complex physics, fast action, or precise camera moves are where premium models earn their keep. If a cheap model warps your subject, that's a signal to step up, not to over-prompt." },
      { type: "h2", text: "Speed is a feature too" },
      { type: "p", text: "Iteration speed matters more than peak quality while you're still deciding. A fast model that returns in seconds lets you try ten ideas; a slow, pristine one lets you try two. Spend your patience on the final, not the sketch." },
      { type: "p", text: "Because switching models in Riocut is one click, you're never locked into a single trade-off — draft fast, finish sharp." },
    ],
  },
  {
    slug: "5-ad-formats-you-can-ship-in-an-afternoon",
    title: "5 ad formats you can ship in an afternoon",
    excerpt: "Templates and prompts for scroll-stopping product spots.",
    category: "Inspiration",
    date: "May 2026",
    iso: "2026-05-28",
    tone: "rose",
    img: "https://images.pexels.com/photos/9510886/pexels-photo-9510886.jpeg",
    author: "The Riocut Team",
    readMins: 4,
    keywords: ["video ad formats", "product ad", "ugc ads", "ai video ads", "social media ads", "ad templates"],
    content: [
      { type: "p", text: "You don't need a shoot to test a creative. With a product image and a prompt, you can generate a handful of ad angles in an afternoon and let the numbers pick the winner. Here are five formats that reliably perform." },
      { type: "h2", text: "1. The hero product spin" },
      { type: "p", text: "A single clean product shot with a slow rotation and a color-powder or liquid burst around it. Premium, ownable, and endlessly remixable by swapping the backdrop color." },
      { type: "h2", text: "2. The problem-then-product hook" },
      { type: "p", text: "Open on the frustration your product solves, cut hard to the product, and land on a one-line payoff. Riocut's clip scoring is great for finding that hook line in longer footage." },
      { type: "h2", text: "3. The three-benefit carousel" },
      { type: "p", text: "Three quick vertical scenes, one benefit each, connected captions calling out the value. Fast to assemble on the timeline and easy to localize by swapping the caption track." },
      { type: "h2", text: "4. The UGC-style testimonial" },
      { type: "p", text: "A talking-head clip with word-by-word captions reads as authentic and keeps viewers watching. Repurpose an existing review or interview and let AI Clips pull the strongest thirty seconds." },
      { type: "h2", text: "5. The lifestyle atmosphere loop" },
      { type: "p", text: "Image-to-video turns a single lifestyle still into a seamless ambient loop — perfect for a brand-mood spot or a store-screen background." },
      { type: "p", text: "Generate all five, schedule them, and let your feed tell you which to scale." },
    ],
  },
  {
    slug: "connected-clips-captions-that-never-drift",
    title: "Connected clips: captions that never drift",
    excerpt: "Keep overlays, subtitles, and audio locked to their shot as you edit.",
    category: "Tutorial",
    date: "May 2026",
    iso: "2026-05-14",
    tone: "teal",
    img: "https://images.pexels.com/photos/29505140/pexels-photo-29505140.jpeg",
    author: "The Riocut Team",
    readMins: 3,
    keywords: ["video captions", "subtitles", "karaoke captions", "connected clips", "caption sync"],
    content: [
      { type: "p", text: "Nothing ruins a short faster than captions that lag the audio. It usually happens for a boring reason: you trimmed a shot, and the caption track didn't follow. Riocut's connected clips make that impossible." },
      { type: "h2", text: "Captions belong to the shot" },
      { type: "p", text: "In Riocut, a caption isn't a separate track you have to babysit — it's attached to the clip it describes. Move the clip, split it, or ripple a trim, and the words move with it. The sync you set once is the sync you keep." },
      { type: "h2", text: "Word-level timing" },
      { type: "p", text: "Because transcripts carry word-level timestamps, captions can highlight one word at a time in perfect step with the speaker. That karaoke effect is what keeps retention high on muted feeds — and it stays accurate no matter how you cut." },
      { type: "h2", text: "Style without the busywork" },
      { type: "p", text: "Pick a caption template or design your own once, and it applies across every clip in the project. Overlays and voiceover follow the same rule: connected to their shot, so a fast edit never turns into a sync-fixing session." },
      { type: "p", text: "Edit freely. The captions keep up." },
    ],
  },
];

export const getPost = (slug: string) => BLOG.find((p) => p.slug === slug);
