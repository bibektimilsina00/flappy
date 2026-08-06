import type { Clip } from "../types";

/** A per-frame modifier layered on top of a clip's static transform. */
export interface AnimMod {
  dx: number; // translate, as a fraction of canvas width
  dy: number; // translate, as a fraction of canvas height
  scale: number; // multiplied onto the clip scale
  rotate: number; // added degrees
  opacity: number; // multiplied onto the clip opacity
}

const IDENTITY: AnimMod = { dx: 0, dy: 0, scale: 1, rotate: 0, opacity: 1 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const easeOut = (p: number) => 1 - (1 - p) ** 3;
const easeOutBack = (p: number) => 1 + 2.7 * (p - 1) ** 3 + 1.7 * (p - 1) ** 2;
const TAU = Math.PI * 2;

// Entrance presets: p goes 0 (offscreen/hidden) -> 1 (settled). Mutates mod.
function applyIn(name: string, p: number, m: AnimMod) {
  switch (name) {
    case "Fade":
      m.opacity *= p;
      break;
    case "Float":
    case "Gentle float":
      m.dy += (1 - p) * (name === "Gentle float" ? 0.04 : 0.09);
      m.opacity *= p;
      break;
    case "Zoom In":
      m.scale *= 0.6 + 0.4 * p;
      m.opacity *= p;
      break;
    case "Ken Burns In":
      m.scale *= 0.85 + 0.15 * p;
      break;
    case "Drop":
      m.dy += (p - 1) * 0.14;
      m.opacity *= p;
      break;
    case "Slide":
    case "Slide bounce":
      m.dx += (p - 1) * 0.14;
      m.opacity *= p;
      break;
    case "Wipe":
      m.dx += (p - 1) * 0.1;
      m.opacity *= p;
      break;
    case "Pop":
      m.scale *= 0.4 + 0.6 * easeOutBack(p);
      m.opacity *= p;
      break;
    case "Bounce":
      m.dy += (p - 1) * 0.14 * (1 - Math.sin(p * Math.PI) * 0.4);
      m.opacity *= p;
      break;
    case "Spin":
      m.rotate += (p - 1) * 180;
      m.opacity *= p;
      break;
    default:
      break;
  }
}

// Exit presets: r goes 0 (settled) -> 1 (gone). Mutates mod.
function applyOut(name: string, r: number, m: AnimMod) {
  switch (name) {
    case "Fade":
      m.opacity *= 1 - r;
      break;
    case "Float":
      m.dy += r * 0.09;
      m.opacity *= 1 - r;
      break;
    case "Zoom Out":
      m.scale *= 1 - 0.4 * r;
      m.opacity *= 1 - r;
      break;
    case "Ken Burns Out":
      m.scale *= 1 + 0.15 * r;
      break;
    case "Drop":
      m.dy += r * 0.14;
      m.opacity *= 1 - r;
      break;
    case "Slide":
      m.dx += r * 0.14;
      m.opacity *= 1 - r;
      break;
    case "Wipe":
      m.dx += r * 0.1;
      m.opacity *= 1 - r;
      break;
    case "Pop":
      m.scale *= 1 - 0.6 * r;
      m.opacity *= 1 - r;
      break;
    case "Bounce":
      m.dy += r * 0.14;
      m.opacity *= 1 - r;
      break;
    case "Spin":
      m.rotate += r * 180;
      m.opacity *= 1 - r;
      break;
    default:
      break;
  }
}

// Continuous whole-clip zoom (progress 0..1 across the clip).
function applyZoom(name: string, prog: number, m: AnimMod) {
  switch (name) {
    case "Zoom In":
      m.scale *= 1 + 0.15 * prog;
      break;
    case "Zoom Out":
      m.scale *= 1.15 - 0.15 * prog;
      break;
    case "Ken Burns In":
      m.scale *= 1 + 0.12 * prog;
      m.dx += 0.03 * prog;
      break;
    case "Ken Burns Out":
      m.scale *= 1.12 - 0.12 * prog;
      m.dx -= 0.03 * prog;
      break;
    default:
      break;
  }
}

// Continuous loops driven by time-in-clip `t` (seconds).
function applyLoop(name: string, t: number, m: AnimMod) {
  const period = 1.6;
  const ph = (t / period) * TAU;
  switch (name) {
    case "Pulse":
      m.scale *= 1 + 0.05 * Math.sin(ph);
      break;
    case "Wobble":
      m.rotate += 5 * Math.sin(ph);
      break;
    case "Spin":
      m.rotate += (t / period) * 360;
      break;
    case "Float":
      m.dy += 0.03 * Math.sin(ph);
      break;
    case "Bounce":
      m.dy -= 0.05 * Math.abs(Math.sin(ph));
      break;
    case "Shake":
      m.dx += 0.02 * Math.sin(t * 22);
      break;
    default:
      break;
  }
}

/** Compute the animation modifier for a clip at the given playhead time. */
export function animate(clip: Clip, playhead: number): AnimMod {
  const a = clip.animations;
  if (!a) return IDENTITY;
  const t = playhead - clip.start;
  const dur = clip.duration || 0.001;
  if (t < 0 || t > dur) return IDENTITY;

  const m: AnimMod = { ...IDENTITY };
  const D = Math.min(0.6, dur / 3);

  if (a.in && a.in !== "None" && t < D) applyIn(a.in, easeOut(clamp01(t / D)), m);
  if (a.out && a.out !== "None" && t > dur - D) applyOut(a.out, easeOut(clamp01((t - (dur - D)) / D)), m);
  if (a.zoom && a.zoom !== "None") applyZoom(a.zoom, clamp01(t / dur), m);
  if (a.loop && a.loop !== "None") applyLoop(a.loop, t, m);

  return m;
}
