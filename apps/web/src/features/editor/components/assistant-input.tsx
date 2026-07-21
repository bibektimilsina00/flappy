"use client";

import { ArrowUp, Mic, Paperclip, Plus } from "lucide-react";
import { useState } from "react";

export function AssistantInput() {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text) return;
    // ponytail: wire to the assistant/copilot backend later.
    console.log("assistant:", text);
    setValue("");
  };

  return (
    <div className="rounded-2xl border border-border bg-background p-3">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder="Send message to assistant"
        className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
      <div className="mt-2 flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1">
          <button aria-label="Add" className="rounded p-1 hover:text-foreground">
            <Plus className="size-4" />
          </button>
          <button aria-label="Attach" className="rounded p-1 hover:text-foreground">
            <Paperclip className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button aria-label="Voice" className="rounded p-1 hover:text-foreground">
            <Mic className="size-4" />
          </button>
          <button
            onClick={submit}
            aria-label="Send"
            className="flex size-7 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
