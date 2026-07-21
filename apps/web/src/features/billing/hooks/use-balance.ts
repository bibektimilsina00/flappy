import { useQuery } from "@tanstack/react-query";
import { getBalance } from "../services/billing-api";

export function useBalance() {
  return useQuery({ queryKey: ["balance"], queryFn: getBalance });
}
