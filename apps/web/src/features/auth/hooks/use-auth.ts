import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "@/stores/session";
import * as authApi from "../services/auth-api";
import type { AuthResponse } from "../services/auth-api";

export function useAuth() {
  const setAuth = useSession((s) => s.setAuth);
  const router = useRouter();

  const onSuccess = (data: AuthResponse) => {
    setAuth({ token: data.access_token, user: data.user });
    router.replace("/dashboard");
  };

  const loginMutation = useMutation({
    mutationFn: (vars: { email: string; password: string }) =>
      authApi.login(vars.email, vars.password),
    onSuccess,
  });

  const registerMutation = useMutation({
    mutationFn: (vars: { email: string; password: string; name: string }) =>
      authApi.register(vars),
    onSuccess,
  });

  return { loginMutation, registerMutation };
}
