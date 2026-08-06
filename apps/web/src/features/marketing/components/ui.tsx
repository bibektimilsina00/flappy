import { Play } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8", className)}>{children}</div>;
}

export function Section({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <section id={id} className={cn("py-20 sm:py-28", className)}>
      {children}
    </section>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="text-sm font-semibold text-mk-accent">{children}</span>;
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  center = true,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  sub?: ReactNode;
  center?: boolean;
  action?: ReactNode;
}) {
  const heading = (
    <div className={cn("flex flex-col gap-3", center && "items-center text-center")}>
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="max-w-2xl text-balance text-3xl font-bold tracking-tight text-mk-fg sm:text-4xl md:text-[2.75rem] md:leading-[1.08]">
        {title}
      </h2>
      {sub ? <p className="max-w-2xl text-pretty text-base leading-relaxed text-mk-muted sm:text-lg">{sub}</p> : null}
    </div>
  );
  if (!action) return heading;
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
      {heading}
      <div className="shrink-0">{action}</div>
    </div>
  );
}

type ButtonProps = {
  href: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "md" | "lg";
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

export function Button({ href, variant = "primary", size = "md", className, children, ...rest }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 whitespace-nowrap";
  const sizes = { md: "px-4 py-2 text-sm", lg: "px-6 py-3 text-[15px]" };
  const variants = {
    primary: "bg-mk-accent text-mk-accentfg hover:bg-[#12a596]",
    secondary: "border border-mk-borders bg-transparent text-mk-fg hover:bg-mk-surface",
    ghost: "text-mk-muted hover:text-mk-fg",
  };
  const external = href.startsWith("http");
  const cls = cn(base, sizes[size], variants[variant], className);
  return external ? (
    <a href={href} className={cls} target="_blank" rel="noreferrer">
      {children}
    </a>
  ) : (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/** A clean, flat placeholder that reads like a product screenshot / video thumbnail. */
export function Placeholder({ label = "Media placeholder", ratio = "16 / 9", className }: { label?: string; ratio?: string; className?: string }) {
  return (
    <div
      style={{ aspectRatio: ratio }}
      className={cn("relative flex w-full items-center justify-center overflow-hidden rounded-2xl border border-mk-border bg-mk-surface", className)}
    >
      <div className="flex flex-col items-center gap-3 text-mk-faint">
        <span className="grid size-12 place-items-center rounded-full bg-mk-surface2 text-mk-fg">
          <Play className="size-5 translate-x-0.5" />
        </span>
        <span className="text-xs font-medium uppercase tracking-widest">{label}</span>
      </div>
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-mk-border bg-mk-surface p-6 transition-colors duration-200 hover:border-mk-borders", className)}>{children}</div>;
}
