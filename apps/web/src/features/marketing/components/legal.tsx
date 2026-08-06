import type { ReactNode } from "react";
import { Container, Section } from "./ui";

/** Shared shell for legal pages — write plain h2/p/ul inside, styling is applied here. */
export function Legal({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <Section className="pt-16 sm:pt-20">
      <Container className="max-w-3xl">
        <h1 className="text-4xl font-bold tracking-tight text-mk-fg">{title}</h1>
        <p className="mt-3 text-sm text-mk-muted">Last updated: {updated}</p>
        <div className="mt-10 space-y-9 [&_a]:font-medium [&_a]:text-mk-accent [&_a]:underline-offset-2 [&_a:hover]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-mk-fg [&_li]:mt-2 [&_li]:text-[15px] [&_li]:leading-relaxed [&_li]:text-mk-muted [&_p]:mt-3 [&_p]:text-[15px] [&_p]:leading-relaxed [&_p]:text-mk-muted [&_strong]:text-mk-fg [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6">
          {children}
        </div>
      </Container>
    </Section>
  );
}
