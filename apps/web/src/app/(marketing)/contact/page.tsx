import { Mail, MessageCircle, Users } from "lucide-react";
import type { Metadata } from "next";
import { BRAND } from "@/features/marketing/content";
import { Button, Container, Section, SectionHeading } from "@/features/marketing/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk to the team about Studio plans, partnerships, or support.",
};

const CHANNELS = [
  { icon: Mail, title: "Email us", desc: BRAND.email, href: `mailto:${BRAND.email}` },
  { icon: Users, title: "Studio & sales", desc: "For teams, seats, and volume credits.", href: `mailto:${BRAND.email}` },
  { icon: MessageCircle, title: "Community", desc: "Join the Discord for help and inspiration.", href: BRAND.social.discord },
];

const inputCls =
  "w-full rounded-lg border border-mk-border bg-mk-bg px-3 py-2.5 text-sm text-mk-fg outline-none transition-colors placeholder:text-mk-faint focus:border-mk-accent";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-mk-fg">{label}</span>
      {children}
    </label>
  );
}

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

          {/* Static placeholder form — wire to your email/CRM. */}
          <form className="rounded-2xl border border-mk-border bg-mk-surface/50 p-7">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input className={inputCls} placeholder="Jane Doe" />
              </Field>
              <Field label="Email">
                <input type="email" className={inputCls} placeholder="jane@studio.com" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Company">
                <input className={inputCls} placeholder="Optional" />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Message">
                <textarea rows={5} className={`${inputCls} resize-none`} placeholder="Tell us what you're building…" />
              </Field>
            </div>
            <Button href="#" className="mt-6 w-full">
              Send message
            </Button>
            <p className="mt-3 text-center text-xs text-mk-faint">This form is a placeholder — connect it to your email or CRM.</p>
          </form>
        </div>
      </Container>
    </Section>
  );
}
