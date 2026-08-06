"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  disconnectSocialAccount,
  listSocialAccounts,
  socialConnectUrl,
  socialProviders,
} from "@/features/clips";

export function useConnections() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const accountsQuery = useQuery({
    queryKey: ["social-accounts"],
    queryFn: listSocialAccounts,
  });

  const providersQuery = useQuery({
    queryKey: ["social-providers"],
    queryFn: socialProviders,
  });

  const connect = async (platform: string) => {
    setBusy(platform);
    try {
      const { url } = await socialConnectUrl(platform);
      window.location.href = url;
    } catch {
      setBusy(null);
    }
  };

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => disconnectSocialAccount(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["social-accounts"] }),
  });

  return {
    accounts: accountsQuery.data,
    providers: providersQuery.data,
    busy,
    connect,
    disconnect: disconnectMutation.mutate,
    isDisconnecting: disconnectMutation.isPending,
  };
}
