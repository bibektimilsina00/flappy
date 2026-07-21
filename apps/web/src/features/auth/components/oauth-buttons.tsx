"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getProviders, oauthLoginUrl } from "../services/auth-api";

const PROVIDERS = [
  { id: "google", label: "Continue with Google", icon: <GoogleMark /> },
  { id: "discord", label: "Continue with Discord", icon: <DiscordMark /> },
];

export function OAuthButtons() {
  const { data: configured } = useQuery({ queryKey: ["auth-providers"], queryFn: getProviders });
  const [notice, setNotice] = useState<string | null>(null);

  const onClick = (id: string, label: string) => {
    if (configured?.[id]) {
      window.location.href = oauthLoginUrl(id);
    } else {
      setNotice(`${label.replace("Continue with ", "")} sign-in isn't configured yet.`);
    }
  };

  return (
    <div className="space-y-2">
      {PROVIDERS.map((provider) => (
        <button
          key={provider.id}
          type="button"
          onClick={() => onClick(provider.id, provider.label)}
          className="flex w-full items-center justify-center gap-2.5 rounded-md border border-border bg-secondary/40 py-2 text-sm font-medium transition-colors hover:bg-accent"
        >
          {provider.icon}
          {provider.label}
        </button>
      ))}
      {notice ? <p className="text-center text-xs text-muted-foreground">{notice}</p> : null}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.88-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function DiscordMark() {
  return (
    <svg className="size-4" viewBox="0 0 24 24" fill="#5865F2" aria-hidden>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.885 3.3a.074.074 0 0 0-.079.037c-.34.607-.719 1.4-.984 2.02a18.27 18.27 0 0 0-5.487 0 12.6 12.6 0 0 0-1-2.02.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.68 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.08.08 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .079.009c.12.099.245.198.372.292a.077.077 0 0 1-.006.127c-.598.35-1.22.645-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028ZM8.02 15.331c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.956 2.42-2.157 2.42Zm7.975 0c-1.183 0-2.157-1.086-2.157-2.42 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.096 2.157 2.42 0 1.334-.946 2.42-2.157 2.42Z" />
    </svg>
  );
}
