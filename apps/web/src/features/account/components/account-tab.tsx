"use client";

import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/cn";
import { useSession } from "@/stores/session";
import { useAccountSettings } from "../hooks/use-account-settings";
import { Row, SectionLabel, inputCls } from "./settings-primitives";

export function AccountTab() {
  const { me, updateName, isUpdatingName, changePassword, isChangingPassword } =
    useAccountSettings();

  const setAuth = useSession((s) => s.setAuth);
  const token = useSession((s) => s.token);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [pw, setPw] = useState({ current: "", next: "" });

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateName(name.trim(), {
      onSuccess: (u) => {
        if (token) setAuth({ token, user: { id: u.id, email: u.email, name: u.name } });
        setEditing(false);
      },
    });
  };

  const handlePasswordSubmit = () => {
    changePassword(
      { current: pw.current, next: pw.next },
      {
        onSuccess: () => {
          setPw({ current: "", next: "" });
        },
      },
    );
  };

  return (
    <div>
      <SectionLabel>Profile</SectionLabel>
      <div className="flex items-center gap-4 py-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-blue-500 text-lg font-semibold text-white">
          {me?.name?.[0]?.toUpperCase() ?? "…"}
        </span>
        <div className="min-w-0">
          {editing ? (
            <form onSubmit={handleNameSubmit} className="flex items-center gap-2">
              {/* biome-ignore lint/a11y/noAutofocus: entering edit mode is deliberate */}
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
              <button
                type="submit"
                disabled={!name.trim() || isUpdatingName}
                className="rounded-lg bg-teal-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
              >
                {isUpdatingName ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
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
              disabled={!pw.current || pw.next.length < 8 || isChangingPassword}
              onClick={handlePasswordSubmit}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold transition-colors hover:bg-white/5 disabled:opacity-40"
            >
              {isChangingPassword ? <Loader2 className="size-4 animate-spin" /> : "Change password"}
            </button>
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
        hint="Email hello@riocut.com from your account email — deletion completes within 30 days."
      >
        <a
          href="mailto:hello@riocut.com?subject=Delete%20my%20account"
          className="rounded-lg border border-red-400/30 px-3.5 py-2 text-sm text-red-400 transition-colors hover:bg-red-400/10"
        >
          Request deletion
        </a>
      </Row>
    </div>
  );
}
