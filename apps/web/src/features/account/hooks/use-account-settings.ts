"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { changePasswordSchema, profileNameSchema } from "../schemas/account-schemas";
import { changePassword, getMe, updateMe } from "../services/account-api";

export function useAccountSettings() {
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const updateNameMutation = useMutation({
    mutationFn: (rawName: string) => {
      const name = profileNameSchema.parse(rawName);
      return updateMe(name);
    },
    onSuccess: (updated) => {
      qc.setQueryData(["me"], updated);
      toast.success("Name updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: (raw: { current: string; next: string }) => {
      const validated = changePasswordSchema.parse(raw);
      return changePassword(validated.current, validated.next);
    },
    onSuccess: () => {
      toast.success("Password changed");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to change password");
    },
  });

  return {
    me: meQuery.data,
    isLoading: meQuery.isLoading,
    updateName: updateNameMutation.mutate,
    isUpdatingName: updateNameMutation.isPending,
    changePassword: changePasswordMutation.mutate,
    isChangingPassword: changePasswordMutation.isPending,
  };
}
