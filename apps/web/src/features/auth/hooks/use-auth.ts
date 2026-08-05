"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "@/stores/session";
import { loginSchema, registerSchema } from "../schemas/auth-schemas";
import * as authApi from "../services/auth-api";
import type { AuthResponse } from "../types";

export function useAuth() {
  const setAuth = useSession((s) => s.setAuth);
  const router = useRouter();

  const onSuccess = (data: AuthResponse) => {
    setAuth({ token: data.access_token, user: data.user });
    router.replace("/dashboard");
  };

  const loginMutation = useMutation({
    mutationFn: (vars: { email: string; password: string }) => {
      const validated = loginSchema.parse(vars);
      return authApi.login(validated.email, validated.password);
    },
    onSuccess,
  });

  const registerMutation = useMutation({
    mutationFn: (vars: { email: string; password: string; name: string }) => {
      const validated = registerSchema.parse(vars);
      return authApi.register(validated);
    },
    onSuccess,
  });

  return { loginMutation, registerMutation };
}
