import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function EditorBackButton() {
  return (
    <Link
      href="/projects"
      className="flex items-center gap-2 rounded-xl border border-border bg-card/60 px-3 py-1.5 text-sm shadow-sm backdrop-blur-sm transition-colors hover:bg-accent"
    >
      <ArrowLeft className="size-4" />
      Projects
    </Link>
  );
}
