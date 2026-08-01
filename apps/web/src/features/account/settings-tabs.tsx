"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Crown, KeyRound, Link2, Loader2, ShieldAlert, Unlink, Zap } from "lucide-react";
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

const TITLES: Record<string, string> = {
  account: "Account",
  billing: "Billing & Usage",
  connections: "Connected accounts",
  defaults: "Clip defaults",
};

// Rendered inside the app shell; the MAIN sidebar swaps to settings nav
// (see app-sidebar.tsx) — this is just the active tab's content.
export function SettingsContent({ tab }: { tab: string }) {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{TITLES[tab] ?? "Settings"}</h1>
      <div className="mt-8">
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[#161616] p-6">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

// ── Account ──────────────────────────────────────────────────────────────────
function AccountTab() {
  const qc = useQueryClient();
  const setAuth = useSession((s) => s.setAuth);
  const token = useSession((s) => s.token);
  const { data: me } = useQuery({ queryKey: ["me"], queryFn: getMe });

  const [name, setName] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const rename = useMutation({
    mutationFn: (n: string) => updateMe(n),
    onSuccess: (u) => {
      qc.setQueryData(["me"], u);
      if (token) setAuth({ token, user: { id: u.id, email: u.email, name: u.name } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
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

  const shownName = name ?? me?.name ?? "";
  const dirty = me !== undefined && shownName.trim() !== me.name;

  return (
    <div className="space-y-4">
      <Section title="Profile">
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="text-xs text-muted-foreground">Name</span>
            <div className="mt-1 flex gap-2">
              <input
                value={shownName}
                onChange={(e) => setName(e.target.value)}
                className="w-full max-w-sm rounded-xl border border-white/10 bg-[#101010] px-3.5 py-2 text-sm outline-none focus:border-teal-400/50"
              />
              <button
                type="button"
                disabled={!dirty || rename.isPending}
                onClick={() => rename.mutate(shownName.trim())}
                className="rounded-xl bg-teal-400 px-4 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-40"
              >
                {rename.isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : "Save"}
              </button>
            </div>
          </label>
          <div>
            <span className="text-xs text-muted-foreground">Email</span>
            <p className="mt-1 text-sm">{me?.email ?? "…"}</p>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Sign-in method</span>
            <p className="mt-1 text-sm capitalize">{me?.auth_provider ?? "…"}</p>
          </div>
        </div>
      </Section>

      {me?.auth_provider === "password" ? (
        <Section title="Password">
          <div className="mt-4 max-w-sm space-y-3">
            <input
              type="password"
              placeholder="Current password"
              value={pw.current}
              onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#101010] px-3.5 py-2 text-sm outline-none focus:border-teal-400/50"
            />
            <input
              type="password"
              placeholder="New password (min 8 characters)"
              value={pw.next}
              onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#101010] px-3.5 py-2 text-sm outline-none focus:border-teal-400/50"
            />
            <button
              type="button"
              disabled={!pw.current || pw.next.length < 8 || passwd.isPending}
              onClick={() => passwd.mutate()}
              className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              {passwd.isPending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              Change password
            </button>
            {pwMsg ? (
              <p className={cn("text-xs", pwMsg.ok ? "text-teal-300" : "text-red-400")}>{pwMsg.text}</p>
            ) : null}
          </div>
        </Section>
      ) : null}

      <WorkspaceSection />

      <Section title="Danger zone">
        <p className="mt-3 flex items-start gap-2 text-sm text-muted-foreground">
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-red-400/70" />
          <span>
            To permanently delete your account and all data, email{" "}
            <a href="mailto:hello@riocut.studio?subject=Delete%20my%20account" className="text-foreground underline underline-offset-2">
              hello@riocut.studio
            </a>{" "}
            from your account email — deletion completes within 30 days.
          </span>
        </p>
      </Section>
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
    <Section title="Workspace">
      <label className="mt-4 block">
        <span className="text-xs text-muted-foreground">Workspace name</span>
        <div className="mt-1 flex gap-2">
          <input
            value={shown}
            onChange={(e) => setName(e.target.value)}
            className="w-full max-w-sm rounded-xl border border-white/10 bg-[#101010] px-3.5 py-2 text-sm outline-none focus:border-teal-400/50"
          />
          <button
            type="button"
            disabled={!dirty || rename.isPending}
            onClick={() => rename.mutate(shown.trim())}
            className="rounded-xl bg-teal-400 px-4 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-40"
          >
            {rename.isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : "Save"}
          </button>
        </div>
      </label>
      <p className="mt-2 text-xs text-muted-foreground/70">Shown in the sidebar and on shared projects.</p>
    </Section>
  );
}

// ── Billing & Usage ──────────────────────────────────────────────────────────
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
    <div className="space-y-4">
      <Section title="Plan">
        <div className="mt-3 flex items-start justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[15px] font-semibold capitalize">
              {isPaid ? <Crown className="size-4 text-amber-300" /> : null}
              {plan.replace("_", " ")}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Zap className="size-3.5 text-teal-300" />
              {balance ? `${Math.floor(balance.balance)} credits` : "…"}
            </p>
          </div>
          {!isPaid ? (
            <a
              href="/pricing"
              className="flex items-center gap-2 rounded-xl bg-teal-400 px-5 py-2.5 text-sm font-semibold text-black transition-colors hover:bg-teal-300"
            >
              <Crown className="size-4" /> Upgrade
            </a>
          ) : null}
        </div>
        {isPaid ? (
          <div className="mt-4 border-t border-white/[0.06] pt-4">
            <p className="text-sm text-muted-foreground">
              Receipts arrive by email from Dodo Payments. Credits top up automatically each
              billing cycle.
            </p>
            <CancelButton />
          </div>
        ) : null}
      </Section>

      <Section title="Usage">
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Today", spend?.today],
              ["This week", spend?.week],
              ["This month", spend?.month],
              ["All time", spend?.total],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="rounded-xl border border-white/[0.06] bg-[#101010] p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {v === undefined ? "…" : `$${v.toFixed(2)}`}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground/70">
          Real provider spend across generations and clip jobs.
        </p>
      </Section>

      <UsageLedger />
    </div>
  );
}

function CancelButton() {
  const [confirming, setConfirming] = useState(false);
  const [done, setDone] = useState(false);
  const cancel = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => setDone(true),
  });

  if (done)
    return (
      <p className="mt-3 text-sm text-teal-300">
        Cancelled — your plan and credits stay active until the end of this billing period.
      </p>
    );
  return (
    <div className="mt-3 flex items-center gap-3">
      {confirming ? (
        <>
          <span className="text-sm text-muted-foreground">Cancel at the end of this period?</span>
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => cancel.mutate()}
            className="flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:bg-red-400/10"
          >
            {cancel.isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Yes, cancel
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Keep plan
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-red-400"
        >
          Cancel subscription
        </button>
      )}
      {cancel.isError ? (
        <span className="text-xs text-red-400">
          {cancel.error instanceof Error ? cancel.error.message : "Failed"}
        </span>
      ) : null}
    </div>
  );
}

const USAGE_LABELS: Record<string, string> = {
  "clips-ingest": "Clip job — ingest & transcribe",
  "clips-select": "Clip job — AI moment selection",
  "clips-render": "Clip job — rendering",
};

function UsageLedger() {
  const { data: usage } = useQuery({ queryKey: ["usage"], queryFn: getUsage });

  return (
    <Section title="Credit history">
      {usage === undefined ? (
        <p className="mt-3 text-sm text-muted-foreground">…</p>
      ) : usage.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No charges yet — run your first job.</p>
      ) : (
        <ul className="mt-3 divide-y divide-white/[0.06]">
          {usage.map((u, i) => (
            <li key={`${u.created_at}-${i}`} className="flex items-baseline gap-3 py-2.5">
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
      )}
    </Section>
  );
}

// ── Clip defaults ────────────────────────────────────────────────────────────
const DEFAULT_FIELDS: { key: string; label: string; options: [string, string][] }[] = [
  { key: "ratio", label: "Ratio", options: [["9:16", "9:16"], ["1:1", "1:1"], ["16:9", "16:9"]] },
  { key: "quality", label: "Quality", options: [["720p", "720p"], ["1080p", "1080p HD"]] },
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
    <Section title="Defaults for new clip jobs">
      <p className="mt-2 text-xs text-muted-foreground/70">
        Pre-filled on the configure step for every new job — you can still change them per job.
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {DEFAULT_FIELDS.map((f) => (
          <label key={f.key} className="block">
            <span className="text-xs text-muted-foreground">{f.label}</span>
            <select
              value={current[f.key] ?? ""}
              onChange={(e) => setDraft({ ...current, [f.key]: e.target.value })}
              className="mt-1 w-full rounded-xl border border-white/10 bg-[#101010] px-3 py-2 text-sm outline-none focus:border-teal-400/50"
            >
              <option value="">App default</option>
              {f.options.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <button
        type="button"
        disabled={!dirty || save.isPending}
        onClick={() => save.mutate(Object.fromEntries(Object.entries(current).filter(([, v]) => v)))}
        className="mt-5 flex items-center gap-2 rounded-xl bg-teal-400 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-teal-300 disabled:opacity-40"
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
        Save defaults
      </button>
    </Section>
  );
}

// ── Connected accounts ───────────────────────────────────────────────────────
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
    <div className="space-y-4">
      <Section title="Connected">
        {accounts === undefined ? (
          <p className="mt-3 text-sm text-muted-foreground">…</p>
        ) : accounts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nothing connected yet — link an account below to publish clips directly.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-white/[0.06]">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center gap-3 py-3">
                {a.avatar_url ? (
                  // biome-ignore lint/a11y/useAltText: avatar
                  <img src={a.avatar_url} className="size-8 rounded-full object-cover" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-full bg-white/5 text-xs font-semibold uppercase">
                    {(PLATFORM_NAMES[a.platform] ?? a.platform)[0]}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{PLATFORM_NAMES[a.platform] ?? a.platform}</p>
                  {a.username ? <p className="truncate text-xs text-muted-foreground">{a.username}</p> : null}
                </div>
                <button
                  type="button"
                  disabled={disconnect.isPending}
                  onClick={() => disconnect.mutate(a.id)}
                  className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-red-400/40 hover:text-red-400"
                >
                  <Unlink className="size-3.5" /> Disconnect
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Connect a platform">
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {connectable.map(([platform]) => (
            <button
              key={platform}
              type="button"
              disabled={busy !== null}
              onClick={() => void connect(platform)}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#101010] px-4 py-3 text-sm font-medium transition-colors hover:border-teal-400/40 disabled:opacity-60"
            >
              {PLATFORM_NAMES[platform] ?? platform}
              {busy === platform ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4 text-muted-foreground" />}
            </button>
          ))}
        </div>
        {pending.length ? (
          <p className="mt-3 text-xs text-muted-foreground/70">
            Coming soon: {pending.map(([p]) => PLATFORM_NAMES[p] ?? p).join(", ")}
          </p>
        ) : null}
      </Section>
    </div>
  );
}
