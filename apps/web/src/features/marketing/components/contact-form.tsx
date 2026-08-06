"use client";

import { Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { contactFormSchema, type ContactFormData } from "../schemas/marketing-schemas";

export function ContactForm() {
  const [form, setForm] = useState<ContactFormData>({
    name: "",
    email: "",
    subject: "General Inquiry",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactFormSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0]?.message ?? "Please fill out all fields correctly.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      toast.success("Thank you! Your message has been sent. We'll respond shortly.");
      setForm({ name: "", email: "", subject: "General Inquiry", message: "" });
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-mk-border bg-mk-surface/60 p-6 backdrop-blur-md">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-mk-muted">Your Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Jane Doe"
            className="w-full rounded-lg border border-mk-border bg-mk-bg px-3.5 py-2.5 text-xs text-mk-fg outline-none focus:border-mk-accent"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-mk-muted">Email Address</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="jane@company.com"
            className="w-full rounded-lg border border-mk-border bg-mk-bg px-3.5 py-2.5 text-xs text-mk-fg outline-none focus:border-mk-accent"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-mk-muted">Subject</label>
        <select
          value={form.subject}
          onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
          className="w-full rounded-lg border border-mk-border bg-mk-bg px-3.5 py-2.5 text-xs text-mk-fg outline-none focus:border-mk-accent"
        >
          <option value="General Inquiry">General Inquiry</option>
          <option value="Studio Plan Inquiry">Studio Plan Inquiry</option>
          <option value="Partnership & Sponsorship">Partnership & Sponsorship</option>
          <option value="Technical Support">Technical Support</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-mk-muted">Message</label>
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          placeholder="Tell us how we can help you…"
          className="w-full resize-none rounded-lg border border-mk-border bg-mk-bg px-3.5 py-2.5 text-xs text-mk-fg outline-none focus:border-mk-accent"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-mk-accent px-4 py-3 text-xs font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        {submitting ? "Sending message…" : "Send Message"}
      </button>
    </form>
  );
}
