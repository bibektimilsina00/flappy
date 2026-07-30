"use client";

import { Clock, Loader2, MessageSquareText, Send } from "lucide-react";
import { use, useEffect, useRef, useState } from "react";
import { addSharedComment, getSharedProject } from "@/features/video-editor/api";
import { Logo } from "@/features/marketing/wordmark";

type Shared = Awaited<ReturnType<typeof getSharedProject>>;
type Comment = NonNullable<Shared["comments"]>[number];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function WatchPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<Shared | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    getSharedProject(token)
      .then((d) => {
        setData(d);
        setComments(d.comments ?? []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "This link is invalid."));
  }, [token]);

  return (
    <div className="dark flex min-h-screen flex-col bg-[#0f0f0f] text-foreground">
      <header className="flex items-center gap-2.5 px-6 py-4">
        <Logo className="size-7" />
        <span className="text-[15px] font-bold tracking-tight">Riocut</span>
        {data ? <span className="ml-3 truncate text-sm text-muted-foreground">{data.title}</span> : null}
      </header>

      {error ? (
        <div className="grid flex-1 place-items-center px-6 text-center">
          <div>
            <p className="text-lg font-semibold">This link isn't available</p>
            <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          </div>
        </div>
      ) : !data ? (
        <div className="grid flex-1 place-items-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-10 lg:flex-row">
          <div className="min-w-0 flex-1">
            {/* biome-ignore lint/a11y/useMediaCaption: user-generated video */}
            <video ref={videoRef} controls src={data.video_url} className="max-h-[78vh] w-full rounded-xl bg-black" />
          </div>
          {data.mode === "review" ? (
            <ReviewSidebar
              token={token}
              comments={comments}
              onAdd={(c) => setComments((list) => [...list, c].sort((a, b) => a.at - b.at))}
              currentTime={() => videoRef.current?.currentTime ?? 0}
              seek={(t) => {
                if (videoRef.current) videoRef.current.currentTime = t;
              }}
            />
          ) : null}
        </main>
      )}
    </div>
  );
}

function ReviewSidebar({
  token,
  comments,
  onAdd,
  currentTime,
  seek,
}: {
  token: string;
  comments: Comment[];
  onAdd: (c: Comment) => void;
  currentTime: () => number;
  seek: (t: number) => void;
}) {
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(localStorage.getItem("riocut-review-name") ?? "");
  }, []);

  const submit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const at = currentTime();
      localStorage.setItem("riocut-review-name", name);
      const c = await addSharedComment(token, { author: name || "Anonymous", text: text.trim(), at });
      onAdd(c);
      setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not post the comment");
    } finally {
      setSending(false);
    }
  };

  return (
    <aside className="flex w-full shrink-0 flex-col rounded-xl border border-white/10 bg-[#161616] lg:w-96">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <MessageSquareText className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">Comments</span>
        <span className="text-xs text-muted-foreground">{comments.length}</span>
      </div>

      <div className="min-h-40 flex-1 space-y-3 overflow-y-auto p-4 [scrollbar-width:thin]">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet — pause where you have feedback and write it below.</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="rounded-lg bg-white/5 p-3">
              <div className="mb-1 flex items-center gap-2 text-xs">
                <span className="font-semibold">{c.author}</span>
                <button
                  type="button"
                  onClick={() => seek(c.at)}
                  className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Clock className="size-3" />
                  {fmt(c.at)}
                </button>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground/90">{c.text}</p>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-white/10 p-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="mb-2 w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder="Comment at the current time…"
            rows={2}
            className="min-h-10 flex-1 resize-none rounded-lg bg-white/5 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            aria-label="Send comment"
            disabled={sending || !text.trim()}
            onClick={() => void submit()}
            className="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-500 text-black transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </button>
        </div>
        {error ? <p className="mt-2 text-xs text-red-400">{error}</p> : null}
      </div>
    </aside>
  );
}
