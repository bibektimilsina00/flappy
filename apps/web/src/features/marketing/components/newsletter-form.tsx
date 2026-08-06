"use client";

import { Loader2, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { newsletterSchema } from "../schemas/marketing-schemas";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = newsletterSchema.safeParse({ email });
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please enter a valid email");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Subscribed to the Riocut newsletter!");
      setEmail("");
    }, 600);
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <div className="relative flex-1">
        <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-mk-muted" />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Subscribe for product updates…"
          className="w-full rounded-lg border border-mk-border bg-mk-bg py-2 pl-9 pr-3 text-xs text-mk-fg outline-none focus:border-mk-accent"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-mk-accent px-4 py-2 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="size-3.5 animate-spin" /> : "Subscribe"}
      </button>
    </form>
  );
}
