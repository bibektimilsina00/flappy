"use client";

import { ArrowUp, Mic, Paperclip, Plus } from "lucide-react";
import { useState } from "react";

export function AssistantInput({
  onSend,
  disabled,
}: {
  onSend: (text: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");

  const submit = () => {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
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
        className="max-h-32 w-full resize-none bg-transparent text-sm outline-none [field-sizing:content] placeholder:text-muted-foreground"
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
            disabled={disabled}
            aria-label="Send"
            className="flex size-7 items-center justify-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
