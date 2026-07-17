import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { Bot, ShieldAlert, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { createConversation } from "@/lib/chat-history.functions";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/agents")({
  component: AgentsPage,
  head: () => ({
    meta: [
      { title: "AI Agents — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type AgentDef = {
  id: string;
  icon: typeof Bot;
  titleKey: string;
  descKey: string;
  tag: string;
  available: boolean;
};

const AGENTS: AgentDef[] = [
  {
    id: "contracts",
    icon: ShieldAlert,
    titleKey: "app.agents.contracts.title",
    descKey: "app.agents.contracts.desc",
    tag: "@contracts",
    available: true,
  },
];

function AgentsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createConv = useServerFn(createConversation);
  const [teamspaceId, setTeamspaceId] = useState<string | undefined>();
  const [starting, setStarting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const { data: mem } = await supabase
        .from("teamspace_members")
        .select("teamspace_id")
        .eq("user_id", data.user.id)
        .limit(1)
        .maybeSingle();
      if (mem?.teamspace_id) setTeamspaceId(mem.teamspace_id);
    })();
  }, []);

  const startWithAgent = async (agent: AgentDef) => {
    setStarting(agent.id);
    try {
      const conv = await createConv({
        data: {
          teamspace_id: teamspaceId,
          agent_id: agent.id,
          title: t(agent.titleKey),
        },
      });
      navigate({ to: "/app/c/$conversationId", params: { conversationId: conv.id } });
    } finally {
      setStarting(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-display text-2xl text-foreground">
            {t("app.agents.title", "AI Agents")}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t("app.agents.subtitle", "Specialized AI agents you can call from any chat with @tag")}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-3 text-xs text-muted-foreground">
        <span className="text-foreground font-medium">
          {t("app.agents.howTitle", "How to use")}:
        </span>{" "}
        {t("app.agents.howBody", "Type an agent tag inside any chat (e.g. @contracts) — the agent will handle that message. Or click 'Open' to start a dedicated conversation with the agent.")}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {AGENTS.map((a) => (
          <div key={a.id} className="rounded-2xl border border-border bg-card p-5 flex flex-col">
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <a.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg text-foreground">{t(a.titleKey)}</h3>
                <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-mono font-semibold rounded bg-primary/15 text-primary px-1.5 py-0.5">
                  {a.tag}
                </div>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed flex-1">
              {t(a.descKey)}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => startWithAgent(a)}
                disabled={starting === a.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {starting === a.id
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <Sparkles className="h-3.5 w-3.5" />}
                {t("app.agents.open", "Open agent")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
              <Link
                to="/app"
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {t("app.agents.useInChat", "or use in any chat")}
              </Link>
            </div>
          </div>
        ))}

        <div className="rounded-2xl border border-dashed border-border/60 bg-card/30 p-5 flex flex-col items-center justify-center text-center min-h-[180px]">
          <Bot className="h-8 w-8 text-muted-foreground/60" />
          <div className="mt-2 text-sm text-muted-foreground">
            {t("app.agents.moreSoon", "More agents coming soon")}
          </div>
        </div>
      </div>
    </div>
  );
}
