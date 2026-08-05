"use client";

export function RenameInput({ initial, onCommit }: { initial: string; onCommit: (v: string) => void }) {
  return (
    <input
      // biome-ignore lint/a11y/noAutofocus: inline rename should focus immediately
      autoFocus
      defaultValue={initial}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => onCommit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit(e.currentTarget.value);
        else if (e.key === "Escape") onCommit(initial);
      }}
      className="min-w-0 flex-1 bg-transparent text-sm font-medium text-foreground outline-none"
    />
  );
}
