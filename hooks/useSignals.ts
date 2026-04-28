import { useQuery } from "@tanstack/react-query";
import { fetchSignals, NetworkError } from "@/lib/api";

export function useSignals() {
  return useQuery({
    queryKey: ["signals"],
    queryFn: fetchSignals,
    retry: (failureCount, error) =>
      error instanceof NetworkError ? failureCount < 2 : false,
  });
}
