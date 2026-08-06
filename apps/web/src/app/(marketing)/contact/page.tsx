import { Mail, MessageCircle, Users } from "lucide-react";
import type { Metadata } from "next";
import { BRAND, ContactForm, Container, Section, SectionHeading } from "@/features/marketing";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the team about Studio plans, partnerships, or support.",
};

const CHANNELS = [
  { icon: Mail, title: "Email us", desc: BRAND.email, href: `mailto:${BRAND.email}` },
  { icon: Users, title: "Studio & sales", desc: "For teams, seats, and volume credits.", href: `mailto:${BRAND.email}` },
  { icon: MessageCircle, title: "Community", desc: "Join the Discord for help and inspiration.", href: BRAND.social.discord },
];

export default function ContactPage() {
  return (
    <Section className="pt-16 sm:pt-20">
      <Container>
        <SectionHeading
          eyebrow="Contact"
          title="Let's talk."
          sub="Questions about plans, a partnership, or press? Pick a channel below or drop us a note — we usually reply within a day."
        />

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="flex flex-col gap-4">
            {CHANNELS.map((c) => (
              <a
                key={c.title}
                href={c.href}
                className="flex items-start gap-4 rounded-2xl border border-mk-border bg-mk-surface/50 p-6 transition-colors hover:border-mk-borders"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-mk-border bg-mk-bg text-mk-accent">
                  <c.icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold text-mk-fg">{c.title}</span>
                  <span className="block text-sm text-mk-muted">{c.desc}</span>
                </span>
              </a>
            ))}
          </div>

          <ContactForm />
        </div>
      </Container>
    </Section>
  );
}
