"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useBalance } from "@/features/billing";
import { cancelSubscription, getSpend, getUsage } from "../services/account-api";

export function useBillingSettings() {
  const qc = useQueryClient();
  const balanceQuery = useBalance();

  const spendQuery = useQuery({
    queryKey: ["spend"],
    queryFn: getSpend,
  });

  const usageQuery = useQuery({
    queryKey: ["usage"],
    queryFn: getUsage,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace"] });
      toast.success("Subscription canceled — active until billing period ends");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Failed to cancel subscription");
    },
  });

  return {
    balance: balanceQuery.data,
    spend: spendQuery.data,
    usage: usageQuery.data ?? [],
    cancelSubscription: cancelMutation.mutate,
    isCanceling: cancelMutation.isPending,
  };
}
