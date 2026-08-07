"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { authToken } from "@/lib/auth-token";
import { upgradeTierSchema } from "../schemas/billing-schemas";
import { startUpgrade } from "../services/billing-api";

export function useUpgrade() {
  const upgradeMutation = useMutation({
    mutationFn: async (rawTier: string) => {
      if (!(await authToken())) {
        window.location.href = "/login";
        return;
      }
      const tier = upgradeTierSchema.parse(rawTier);
      const res = await startUpgrade(tier);
      window.location.href = res.checkout_url;
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      window.location.href = "/settings";
    },
  });

  return {
    startUpgrade: upgradeMutation.mutate,
    isUpgrading: upgradeMutation.isPending,
  };
}
