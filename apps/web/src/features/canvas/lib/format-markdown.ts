export type FormatOp = "h1" | "h2" | "h3" | "p" | "bold" | "italic" | "ul" | "ol" | "hr";

const INLINE: Partial<Record<FormatOp, [string, string]>> = {
  bold: ["**", "**"],
  italic: ["*", "*"],
};
const HEAD: Partial<Record<FormatOp, string>> = { h1: "# ", h2: "## ", h3: "### ", p: "" };

// Strip any existing block prefix (heading / bullet / ordered) so ops replace
// rather than stack.
const stripPrefix = (line: string) => line.replace(/^(\s*)(#{1,6}\s+|[-*]\s+|\d+\.\s+)/, "$1");

/**
 * Apply a Markdown formatting op to `text` over the source range [start, end).
 * Inline ops wrap the selection; block ops rewrite the whole overlapping line(s).
 * Returns the new text and the selection range to restore.
 */
export function applyMarkdown(
  text: string,
  start: number,
  end: number,
  op: FormatOp,
): { text: string; start: number; end: number } {
  const inline = INLINE[op];
  if (inline) {
    const [l, r] = inline;
    const sel = text.slice(start, end) || "text";
    const out = text.slice(0, start) + l + sel + r + text.slice(end);
    return { text: out, start: start + l.length, end: start + l.length + sel.length };
  }

  // Block-level: expand to the full line(s) the range overlaps.
  const from = text.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  let to = text.indexOf("\n", end);
  if (to === -1) to = text.length;
  const block = text.slice(from, to);

  let out: string;
  if (op === "h1" || op === "h2" || op === "h3" || op === "p") {
    const prefix = HEAD[op] ?? "";
    out = block
      .split("\n")
      .map((line) => (line.trim() ? prefix + stripPrefix(line) : line))
      .join("\n");
  } else if (op === "ul") {
    out = block
      .split("\n")
      .map((line) => (line.trim() ? "- " + stripPrefix(line) : line))
      .join("\n");
  } else if (op === "ol") {
    let n = 0;
    out = block
      .split("\n")
      .map((line) => (line.trim() ? `${++n}. ` + stripPrefix(line) : line))
      .join("\n");
  } else {
    // hr
    out = `${block}\n\n---`;
  }

  return { text: text.slice(0, from) + out + text.slice(to), start: from, end: from + out.length };
}
