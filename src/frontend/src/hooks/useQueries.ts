import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UsageEntry } from "../backend.d";
import { useAuth } from "../context/AuthContext";
import { useActor } from "./useActor";

export function useGetCredits(enabled = true) {
  const { actor, isFetching } = useActor();
  const { credentials } = useAuth();
  return useQuery<number>({
    queryKey: ["credits", credentials?.email],
    queryFn: async () => {
      if (!actor || !credentials) throw new Error("Not ready");
      const c = await actor.getCredits(
        credentials.email,
        credentials.passwordHash,
      );
      return Number(c);
    },
    enabled: !!actor && !isFetching && !!credentials && enabled,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
    refetchInterval: 30000,
  });
}

export function useGetUsageHistory() {
  const { actor, isFetching } = useActor();
  const { credentials } = useAuth();
  return useQuery<UsageEntry[]>({
    queryKey: ["usageHistory", credentials?.email],
    queryFn: async () => {
      if (!actor || !credentials) return [];
      return actor.getToolUsageHistory(
        credentials.email,
        credentials.passwordHash,
      );
    },
    enabled: !!actor && !isFetching && !!credentials,
  });
}

export function useUseTool() {
  const { actor } = useActor();
  const { credentials } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (toolName: string) => {
      if (!actor) throw new Error("Not connected");
      if (!credentials) throw new Error("Not logged in");
      // biome-ignore lint/correctness/useHookAtTopLevel: actor.useTool is a backend method, not a React hook
      await actor.useTool(
        toolName,
        credentials.email,
        credentials.passwordHash,
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credits"] });
      qc.invalidateQueries({ queryKey: ["usageHistory"] });
    },
  });
}
