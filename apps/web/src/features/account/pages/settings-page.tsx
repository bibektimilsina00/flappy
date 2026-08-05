"use client";

import { useSession } from "@/stores/session";
import { AccountTab } from "../components/account-tab";
import { BillingTab } from "../components/billing-tab";
import { ConnectionsTab } from "../components/connections-tab";
import { DefaultsTab } from "../components/defaults-tab";
import { WorkspacesTab } from "../components/workspaces-tab";

const HEADERS: Record<string, { title: string; sub: string }> = {
  account: { title: "General", sub: "Manage your profile and account security." },
  billing: { title: "Billing", sub: "Your plan, credits, and usage." },
  connections: { title: "Social accounts", sub: "Connect platforms to publish clips directly." },
  defaults: { title: "Clip defaults", sub: "Pre-filled settings for every new clip job." },
  workspaces: { title: "Workspaces", sub: "Switch, create, and manage teams and members." },
};

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
        ) : tab === "workspaces" ? (
          <WorkspacesTab />
        ) : (
          <AccountTab />
        )}
      </div>
    </div>
  );
}
