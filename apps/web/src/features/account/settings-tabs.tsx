"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Crown, Loader2, Pencil, Unlink, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import {
  cancelSubscription,
  changePassword,
  getMe,
  getSpend,
  getUsage,
  getWorkspace,
  updateMe,
  updateWorkspace,
} from "@/features/account/api";
import { useBalance } from "@/features/billing";
import {
  disconnectSocialAccount,
  listSocialAccounts,
  socialConnectUrl,
  socialProviders,
} from "@/features/clips/api";
import { cn } from "@/lib/cn";
import { useSession } from "@/stores/session";

const PLATFORM_NAMES: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  instagram: "Instagram",
  facebook: "Facebook",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
};

const HEADERS: Record<string, { title: string; sub: string }> = {
  account: { title: "General", sub: "Manage your profile and account security." },
  billing: { title: "Billing", sub: "Your plan, credits, and usage." },
  connections: { title: "Social accounts", sub: "Connect platforms to publish clips directly." },
  defaults: { title: "Clip defaults", sub: "Pre-filled settings for every new clip job." },
};

// Rendered inside the app shell; the MAIN sidebar swaps to settings nav
// (see app-sidebar.tsx) — this is just the active tab's content.
export function SettingsContent({ tab }: { tab: string }) {
  const clear = useSession((s) => s.clear);
  const h = HEADERS[tab] ?? HEADERS.account;

  return (
    <div className="mx-auto w-full max-w-3xl px-8 py-10">
      {/* top-right quick links */}
      <div className="flex items-center justify-end gap-6 text-sm text-muted-foreground">
        <a href="/dashboard" className="transition-colors hover:text-foreground">
          Home page
        </a>
        <a
          href="/login"
          onClick={() => clear()}
          className="transition-colors hover:text-foreground"
        >
          Sign out
        </a>
      </div>

      <h1 className="mt-4 text-2xl font-bold tracking-tight">{h.title}</h1>
      <p className="mt-1.5 text-[15px] text-muted-foreground">{h.sub}</p>

      <div className="mt-4">
        {tab === "billing" ? (
          <BillingTab />
        ) : tab === "connections" ? (
          <ConnectionsTab />
        ) : tab === "defaults" ? (
          <DefaultsTab />
        ) : (
          <AccountTab />
        )}
      </div>
    </div>
  );
}

// ── flat-section primitives (reference style) ────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-10 border-b border-white/[0.08] pb-2.5 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 py-4">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

const inputCls =
  "rounded-lg border border-white/10 bg-[#141414] px-3.5 py-2 text-sm outline-none focus:border-teal-400/50";

// ── Account (General) ────────────────────────────────────────────────────────
function AccountTab() {
  const qc = useQueryClient();
  const setAuth = useSession((s) => s.setAuth);
  const token = useSession((s) => s.token);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const rename = useMutation({
    mutationFn: (n: string) => updateMe(n),
    onSuccess: (u) => {
      qc.setQueryData(["me"], u);
      if (token) setAuth({ token, user: { id: u.id, email: u.email, name: u.name } });
      setEditing(false);
    },
  });

  const [pw, setPw] = useState({ current: "", next: "" });
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const passwd = useMutation({
    mutationFn: () => changePassword(pw.current, pw.next),
    onSuccess: () => {
      setPw({ current: "", next: "" });
      setPwMsg({ ok: true, text: "Password updated." });
    },
    onError: (e) => setPwMsg({ ok: false, text: e instanceof Error ? e.message : "Failed" }),
  });

  return (
    <div>
      <SectionLabel>Profile</SectionLabel>
      <div className="flex items-center gap-4 py-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-500 text-lg font-semibold text-white">
          {me?.name?.[0]?.toUpperCase() ?? "…"}
        </span>
        <div className="min-w-0">
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (name.trim()) rename.mutate(name.trim());
              }}
              className="flex items-center gap-2"
            >
              {/* biome-ignore lint/a11y/noAutofocus: entering edit mode is deliberate */}
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              <button
                type="submit"
                disabled={!name.trim() || rename.isPending}
                className="rounded-lg bg-teal-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
              >
                {rename.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
              </button>
            </form>
          ) : (
            <p className="flex items-center gap-2 text-[17px] font-semibold">
              {me?.name ?? "…"}
              <button
                type="button"
                aria-label="Edit name"
                onClick={() => {
                  setName(me?.name ?? "");
                  setEditing(true);
                }}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <Pencil className="size-3.5" />
              </button>
            </p>
          )}
          <p className="truncate text-sm text-muted-foreground">{me?.email ?? "…"}</p>
        </div>
      </div>

      <WorkspaceSection />

      {me?.auth_provider === "password" ? (
        <>
          <SectionLabel>Security</SectionLabel>
          <Row label="Current password">
            <input
              type="password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              className={cn(inputCls, "w-64")}
            />
          </Row>
          <Row label="New password" hint="At least 8 characters">
            <input
              type="password"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              className={cn(inputCls, "w-64")}
            />
          </Row>
          <div className="flex items-center gap-3 py-2">
            <button
              type="button"
              disabled={!pw.current || pw.next.length < 8 || passwd.isPending}
              onClick={() => passwd.mutate()}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              {passwd.isPending ? <Loader2 className="size-4 animate-spin" /> : "Change password"}
            </button>
            {pwMsg ? (
              <span className={cn("text-xs", pwMsg.ok ? "text-teal-300" : "text-red-400")}>{pwMsg.text}</span>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <SectionLabel>Security</SectionLabel>
          <Row label="Sign-in method" hint="Managed by your identity provider">
            <span className="text-sm capitalize text-muted-foreground">{me?.auth_provider ?? "…"}</span>
          </Row>
        </>
      )}

      <SectionLabel>Privacy</SectionLabel>
      <Row
        label="Delete account"
        hint="Email hello@riocut.studio from your account email — deletion completes within 30 days."
      >
        <a
          href="mailto:hello@riocut.studio?subject=Delete%20my%20account"
          className="rounded-lg border border-red-400/30 px-3.5 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10"
        >
          Request deletion
        </a>
      </Row>
    </div>
  );
}

function WorkspaceSection() {
  const qc = useQueryClient();
  const { data: ws } = useQuery({ queryKey: ["workspace"], queryFn: getWorkspace });
  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const rename = useMutation({
    mutationFn: (n: string) => updateWorkspace({ name: n }),
    onSuccess: (w) => {
      qc.setQueryData(["workspace"], w);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });
  const shown = name ?? ws?.name ?? "";
  const dirty = ws !== undefined && shown.trim() !== ws.name;

  return (
    <>
      <SectionLabel>Workspace</SectionLabel>
      <Row label="Workspace name" hint="Shown in the sidebar and to invited teammates">
        <div className="flex gap-2">
          <input
            value={shown}
            onChange={(e) => setName(e.target.value)}
            className={cn(inputCls, "w-56")}
          />
          <button
            type="button"
            disabled={!dirty || rename.isPending}
            onClick={() => rename.mutate(shown.trim())}
            className="rounded-lg bg-teal-400 px-3.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-40"
          >
            {rename.isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : "Save"}
          </button>
        </div>
      </Row>
    </>
  );
}

// ── Billing ──────────────────────────────────────────────────────────────────
function BillingTab() {
  const { data: balance, refetch } = useBalance();
  const { data: spend } = useQuery({ queryKey: ["spend"], queryFn: getSpend });
  const plan = balance?.plan ?? "free";
  const isPaid = plan !== "free";

  // Back from Dodo checkout: poll while the webhook flips the plan.
  useEffect(() => {
    if (!window.location.search.includes("checkout=done")) return;
    let n = 0;
    const t = setInterval(() => {
      void refetch();
      if (++n >= 24) clearInterval(t);
    }, 5000);
    return () => clearInterval(t);
  }, [refetch]);

  return (
    <div>
      <SectionLabel>Plan</SectionLabel>
      <Row label="Current plan" hint={isPaid ? "Receipts arrive by email from Dodo Payments" : undefined}>
        <span className="flex items-center gap-2 text-sm font-semibold capitalize">
          {isPaid ? <Crown className="size-4 text-amber-300" /> : null}
          {plan.replace("_", " ")}
          {!isPaid ? (
            <a
              href="/pricing"
              className="ml-3 rounded-lg bg-teal-400 px-3.5 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-teal-300"
            >
              Upgrade
            </a>
          ) : null}
        </span>
      </Row>
      <Row label="Credits">
        <span className="flex items-center gap-1.5 text-sm font-medium tabular-nums">
          <Zap className="size-3.5 text-teal-300" />
          {balance ? Math.floor(balance.balance).toLocaleString() : "…"}
        </span>
      </Row>
      {isPaid ? (
        <Row label="Cancel subscription" hint="Access and credits stay until the end of the billing period">
          <CancelButton />
        </Row>
      ) : null}

      <SectionLabel>Usage</SectionLabel>
      <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
        {(
          [
            ["Today", spend?.today],
            ["This week", spend?.week],
            ["This month", spend?.month],
            ["All time", spend?.total],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="rounded-xl border border-white/[0.06] bg-[#141414] p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {v === undefined ? "…" : `$${v.toFixed(2)}`}
            </p>
          </div>
        ))}
      </div>

      <SectionLabel>Credit history</SectionLabel>
      <UsageLedger />
    </div>
  );
}

function CancelButton() {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const cancel = useMutation({ mutationFn: cancelSubscription, onSuccess: () => setDone(true) });

  if (done) return <span className="text-sm text-teal-300">Cancelled at period end</span>;
  if (confirming)
    return (
      <span className="flex items-center gap-2">
        <button
          type="button"
          disabled={cancel.isPending}
          onClick={() => cancel.mutate()}
          className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/10"
        >
          {cancel.isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Keep plan
        </button>
        {cancel.isError ? (
          <span className="text-xs text-red-400">
            {cancel.error instanceof Error ? cancel.error.message : "Failed"}
          </span>
        ) : null}
      </span>
    );
  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-red-400"
    >
      Cancel…
    </button>
  );
}

const USAGE_LABELS: Record<string, string> = {
  "clips-ingest": "Clip job — ingest & transcribe",
  "clips-select": "Clip job — AI moment selection",
  "clips-render": "Clip job — rendering",
};

function UsageLedger() {
  const { data: usage } = useQuery({ queryKey: ["usage"], queryFn: getUsage });

  if (usage === undefined) return <p className="py-4 text-sm text-muted-foreground">…</p>;
  if (usage.length === 0)
    return <p className="py-4 text-sm text-muted-foreground">No charges yet — run your first job.</p>;
  return (
    <ul className="divide-y divide-white/[0.06]">
      {usage.map((u, i) => (
        <li key={`${u.created_at}-${i}`} className="flex items-baseline gap-3 py-3">
          <span className="w-28 shrink-0 text-xs tabular-nums text-muted-foreground">
            {new Date(u.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
            {new Date(u.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">
            {USAGE_LABELS[u.label] ?? (u.kind === "clips" ? u.label : `Generation — ${u.kind}`)}
          </span>
          <span className="shrink-0 text-sm font-medium tabular-nums text-foreground/90">
            −{u.credits % 1 === 0 ? u.credits : u.credits.toFixed(1)}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Clip defaults ────────────────────────────────────────────────────────────
const DEFAULT_FIELDS: { key: string; label: string; hint?: string; options: [string, string][] }[] = [
  { key: "ratio", label: "Ratio", options: [["9:16", "9:16"], ["1:1", "1:1"], ["16:9", "16:9"]] },
  { key: "quality", label: "Quality", hint: "1080p needs a paid plan", options: [["720p", "720p"], ["1080p", "1080p HD"]] },
  { key: "layout", label: "Layout", options: [["fit", "Fit (no crop)"], ["fill", "Fill (crop)"]] },
  {
    key: "caption_style",
    label: "Caption template",
    options: [["clean", "Clean"], ["bold", "Bold"], ["highlight", "Highlight"], ["beast", "Beast"], ["neon", "Neon"], ["mono", "Minimal"]],
  },
];

function DefaultsTab() {
  const qc = useQueryClient();
  const { data: ws } = useQuery({ queryKey: ["workspace"], queryFn: getWorkspace });
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: (d: Record<string, string>) => updateWorkspace({ preferences: { clip_defaults: d } }),
    onSuccess: (w) => {
      qc.setQueryData(["workspace"], w);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  const current = draft ?? ws?.preferences?.clip_defaults ?? {};
  const dirty =
    ws !== undefined &&
    JSON.stringify(current) !== JSON.stringify(ws.preferences?.clip_defaults ?? {});

  return (
    <div>
      <SectionLabel>Defaults</SectionLabel>
      {DEFAULT_FIELDS.map((f) => (
        <Row key={f.key} label={f.label} hint={f.hint}>
          <select
            value={current[f.key] ?? ""}
            onChange={(e) => setDraft({ ...current, [f.key]: e.target.value })}
            className={cn(inputCls, "w-56")}
          >
            <option value="">App default</option>
            {f.options.map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </Row>
      ))}
      <div className="py-3">
        <button
          type="button"
          disabled={!dirty || save.isPending}
          onClick={() => save.mutate(Object.fromEntries(Object.entries(current).filter(([, v]) => v)))}
          className="flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-40"
        >
          {save.isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
          Save defaults
        </button>
      </div>
    </div>
  );
}

// ── Connections ──────────────────────────────────────────────────────────────
function ConnectionsTab() {
  const qc = useQueryClient();
  const { data: accounts } = useQuery({ queryKey: ["social-accounts"], queryFn: listSocialAccounts });
  const { data: providers } = useQuery({ queryKey: ["social-providers"], queryFn: socialProviders });
  const [busy, setBusy] = useState<string | null>(null);

  const connect = async (platform: string) => {
    setBusy(platform);
    try {
      const { url } = await socialConnectUrl(platform);
      window.location.href = url;
    } catch {
      setBusy(null);
    }
  };

  const disconnect = useMutation({
    mutationFn: (id: string) => disconnectSocialAccount(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["social-accounts"] }),
  });

  const connectable = Object.entries(providers ?? {}).filter(([, ok]) => ok);
  const pending = Object.entries(providers ?? {}).filter(([, ok]) => !ok);

  return (
    <div>
      <SectionLabel>Connected</SectionLabel>
      {accounts === undefined ? (
        <p className="py-4 text-sm text-muted-foreground">…</p>
      ) : accounts.length === 0 ? (
        <p className="py-4 text-sm text-muted-foreground">
          Nothing connected yet — link an account below to publish clips directly.
        </p>
      ) : (
        accounts.map((a) => (
          <Row key={a.id} label={PLATFORM_NAMES[a.platform] ?? a.platform} hint={a.username ?? undefined}>
            <button
              type="button"
              disabled={disconnect.isPending}
              onClick={() => disconnect.mutate(a.id)}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-400"
            >
              <Unlink className="size-3.5" /> Disconnect
            </button>
          </Row>
        ))
      )}

      <SectionLabel>Connect a platform</SectionLabel>
      {connectable.map(([platform]) => (
        <Row key={platform} label={PLATFORM_NAMES[platform] ?? platform}>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void connect(platform)}
            className="rounded-lg border border-white/15 px-3.5 py-1.5 text-xs font-medium transition-colors hover:border-teal-400/40 disabled:opacity-60"
          >
            {busy === platform ? <Loader2 className="size-3.5 animate-spin" /> : "Connect"}
          </button>
        </Row>
      ))}
      {pending.length ? (
        <p className="py-3 text-xs text-muted-foreground/70">
          Coming soon: {pending.map(([p]) => PLATFORM_NAMES[p] ?? p).join(", ")}
        </p>
      ) : null}
    </div>
  );
}
