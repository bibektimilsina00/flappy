"use client";

import { useMemo } from "react";

export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  const html = useMemo(() => {
    let raw = content
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    raw = raw.replace(/^### (.*$)/gim, '<h3 className="text-sm font-semibold mt-2 mb-1">$1</h3>');
    raw = raw.replace(/^## (.*$)/gim, '<h2 className="text-base font-semibold mt-3 mb-1">$1</h2>');
    raw = raw.replace(/^# (.*$)/gim, '<h1 className="text-lg font-bold mt-4 mb-2">$1</h1>');
    raw = raw.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    raw = raw.replace(/\*(.*?)\*/g, "<em>$1</em>");
    raw = raw.replace(/`([^`]+)`/g, '<code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">$1</code>');
    raw = raw.replace(/\n/g, "<br />");

    return raw;
  }, [content]);

  return (
    <div
      className={`prose prose-invert max-w-none text-xs leading-relaxed text-foreground/90 ${className}`}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: safe escaped markdown
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
