export type PauseKind = "workspace" | "provider" | "unknown";

export function classifySttPause(status: number, type?: string): PauseKind {
  if (status === 402) return "workspace";
  if (status === 403 && ["credit_limit_reached", "ai_disabled", "ai_gateway_disabled", "workspace_ai_disabled"].includes(type ?? "")) return "workspace";
  return "provider";
}

export async function recoverSttPause(input: {
  authorized: boolean;
  kind: PauseKind;
  confirmed: boolean;
  probe: () => Promise<void>;
  clear: () => Promise<void>;
}) {
  if (!input.authorized) throw new Error("Unauthorized");
  if (input.kind !== "workspace" && !input.confirmed) throw new Error("Confirm restored model access before resuming voice input.");
  if (input.kind === "workspace") await input.probe();
  await input.clear();
}