"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Compact Markdown rendering tuned for the small canvas node (GFM: tables,
// task lists, strikethrough). Styled per-element rather than via a prose plugin
// so sizing fits the node.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground/90">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="mb-1 mt-3 text-base font-semibold first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1 mt-2 text-sm font-medium first:mt-0">{children}</h3>,
          p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5">{children}</ol>,
          li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-sky-400 underline underline-offset-2">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-white/20 pl-3 text-muted-foreground">{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-white/10" />,
          code: ({ className, children }) =>
            /language-/.test(className ?? "") ? (
              <code className="font-mono text-[12px]">{children}</code>
            ) : (
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[12px]">{children}</code>
            ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-md bg-black/40 p-3 text-[12px] [scrollbar-width:thin]">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-[13px]">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border border-white/10 px-2 py-1 text-left font-medium">{children}</th>,
          td: ({ children }) => <td className="border border-white/10 px-2 py-1">{children}</td>,
          img: ({ src, alt }) => <img src={typeof src === "string" ? src : ""} alt={alt ?? ""} className="my-2 max-w-full rounded" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
