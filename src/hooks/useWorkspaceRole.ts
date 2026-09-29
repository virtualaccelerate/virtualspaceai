import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { loadMyRole } from "@/lib/team.functions";
import { getActiveTeamspaceId } from "@/lib/active-teamspace";

/** Role of the signed-in user in the active workspace (owner / admin / member). */
export function useWorkspaceRole() {
  const load = useServerFn(loadMyRole);
  const query = useQuery({
    queryKey: ["workspace-role"],
    queryFn: async () => {
      const teamspaceId = await getActiveTeamspaceId();
      return load({ data: { teamspace_id: teamspaceId ?? null } });
    },
    staleTime: 60_000,
  });

  return {
    role: query.data?.role ?? null,
    isManager: Boolean(query.data?.is_manager),
    loading: query.isLoading,
  };
}
