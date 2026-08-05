"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { changePassword, getMe, updateMe } from "../services/account-api";

export function useAccountSettings() {
  const qc = useQueryClient();

  const meQuery = useQuery({
    queryKey: ["me"],
    queryFn: getMe,
  });

  const updateNameMutation = useMutation({
    mutationFn: (name: string) => updateMe(name),
    onSuccess: (updated) => {
      qc.setQueryData(["me"], updated);
      toast.success("Name updated");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to update name");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ current, next }: { current: string; next: string }) =>
      changePassword(current, next),
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
