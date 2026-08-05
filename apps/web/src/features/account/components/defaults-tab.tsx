"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useWorkspacesSettings } from "../hooks/use-workspaces-settings";
import { Row, SectionLabel, inputCls } from "./settings-primitives";

const DEFAULT_FIELDS: { key: string; label: string; hint?: string; options: [string, string][] }[] = [
  { key: "ratio", label: "Ratio", options: [["9:16", "9:16"], ["1:1", "1:1"], ["16:9", "16:9"]] },
  { key: "quality", label: "Quality", hint: "1080p needs a paid plan", options: [["720p", "720p"], ["1080p", "1080p HD"]] },
  { key: "layout", label: "Layout", options: [["fit", "Fit (no crop)"], ["fill", "Fill (crop)"]] },
  {
    key: "caption_style",
    label: "Caption template",
    options: [["clean", "Clean"], ["bold", "Bold"], ["highlight", "Highlight"], ["beast", "Beast"], ["neon", "Neon"], ["mono", "Minimal"]],
  },
];

export function DefaultsTab() {
  const { workspace, updateWorkspace, isUpdatingWorkspace } = useWorkspacesSettings();
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);

  const current = draft ?? workspace?.preferences?.clip_defaults ?? {};
  const dirty =
    workspace !== undefined &&
    JSON.stringify(current) !== JSON.stringify(workspace.preferences?.clip_defaults ?? {});

  const handleSave = () => {
    updateWorkspace(
      { preferences: { clip_defaults: Object.fromEntries(Object.entries(current).filter(([, v]) => v)) } },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      },
    );
  };

  return (
    <div>
      <SectionLabel>Defaults</SectionLabel>
      {DEFAULT_FIELDS.map((f) => (
        <Row key={f.key} label={f.label} hint={f.hint}>
          <select
            value={current[f.key] ?? ""}
            onChange={(e) => setDraft({ ...current, [f.key]: e.target.value })}
            className={cn(inputCls, "w-56")}
          >
            <option value="">App default</option>
            {f.options.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Row>
      ))}
      <div className="py-3">
        <button
          type="button"
          disabled={!dirty || isUpdatingWorkspace}
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-40"
        >
          {isUpdatingWorkspace ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          Save defaults
        </button>
      </div>
    </div>
  );
}
