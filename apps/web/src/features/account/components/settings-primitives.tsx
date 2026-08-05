import type React from "react";

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 border-b border-white/[0.08] pb-2.5 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export const inputCls =
  "rounded-lg border border-white/10 bg-[#141414] px-3.5 py-2 text-sm outline-none focus:border-teal-400/50";
