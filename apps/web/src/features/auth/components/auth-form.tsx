"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../hooks/use-auth";
import { OAuthButtons } from "./oauth-buttons";

export function AuthForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const { loginMutation, registerMutation } = useAuth();

  const pending = loginMutation.isPending || registerMutation.isPending;
  const error = loginMutation.error ?? registerMutation.error;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") loginMutation.mutate({ email, password });
    else registerMutation.mutate({ email, password, name });
  };

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-card p-6 shadow-xl"
    >
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground">Node-based AI video generation</p>
      </div>

      {mode === "register" ? (
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>

      {error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
      </Button>

      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <OAuthButtons />

      <p className="text-center text-sm text-muted-foreground">
        {mode === "login" ? "No account?" : "Already have an account?"}{" "}
        <button
          type="button"
          onClick={() => setMode(mode === "login" ? "register" : "login")}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {mode === "login" ? "Sign up" : "Sign in"}
        </button>
      </p>
    </form>
  );
}
