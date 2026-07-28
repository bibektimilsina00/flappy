import { createContext, useContext } from "react";
import type { FormatOp } from "./format-markdown";

// Lets the (generic) node toolbar drive the active text node's Markdown
// formatting, applied to the current selection in either view or edit mode.
export const TextFormatContext = createContext<((op: FormatOp) => void) | null>(null);

export const useTextFormat = () => useContext(TextFormatContext);
