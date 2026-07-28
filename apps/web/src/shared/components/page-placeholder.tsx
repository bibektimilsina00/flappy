import type { LucideIcon } from "lucide-react";

// ponytail: stub for nav destinations that don't have a feature yet — renders inside
// the app shell so the sidebar links resolve instead of 404ing. Replace per-page as
// the real features land.
export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div className="max-w-md space-y-3">
        {Icon ? <Icon className="mx-auto size-8 text-muted-foreground" /> : null}
        <h1 className="text-2xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description ?? "This section is coming soon."}</p>
      </div>
    </div>
  );
}
