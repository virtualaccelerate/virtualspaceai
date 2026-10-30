import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useTranslation } from "react-i18next";
import { MessageCircle, Settings2, Sparkle } from "lucide-react";
import { Button } from "@/components/ui/button";
import mascot from "@/assets/viey-mascot.png.asset.json";
import { getMyAssistant } from "@/lib/assistant.functions";
import { createConversation } from "@/lib/chat-history.functions";

type Assistant = { id: string; name: string; skills: string[] };

export function useOpenAssistantChat() {
  const navigate = useNavigate();
  const createConv = useServerFn(createConversation);
  return async (teamspaceId: string, name: string) => {
    const conv = await createConv({ data: { teamspace_id: teamspaceId, agent_id: "personal", title: name } });
    navigate({ to: "/app/c/$conversationId", params: { conversationId: conv.id } });
  };
}

export function AssistantHero({ teamspaceId }: { teamspaceId?: string }) {
  const { t } = useTranslation();
  const getA = useServerFn(getMyAssistant);
  const openChat = useOpenAssistantChat();
  const [assistant, setAssistant] = useState<Assistant | null | undefined>(undefined);
  const [opening, setOpening] = useState(false);
  useEffect(() => {
    if (!teamspaceId) return;
    getA({ data: { teamspace_id: teamspaceId } }).then((r) => setAssistant(r.assistant)).catch(() => setAssistant(null));
  }, [teamspaceId, getA]);

  return (
    <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/15 via-card to-card p-5 sm:p-7">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <img src={mascot.url} alt={t("assistantUi.heroTitle")} className="h-32 w-32 sm:h-40 sm:w-40 object-contain drop-shadow-xl shrink-0" />
        <div className="flex-1 min-w-0 text-center sm:text-left">
          {assistant ? (
            <>
              <h2 className="font-display text-2xl text-foreground">{assistant.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("assistantUi.heroLine")}</p>
              <div className="mt-3 flex flex-wrap justify-center sm:justify-start gap-1.5">
                {assistant.skills.map((s) => (
                  <span key={s} className="rounded-full bg-primary/15 text-primary px-2.5 py-1 text-[11px] font-medium">{t(`assistantUi.skills.${s}`)}</span>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap justify-center sm:justify-start gap-2">
                <Button loading={opening} disabled={!teamspaceId} onClick={async () => { setOpening(true); try { await openChat(teamspaceId!, assistant.name); } finally { setOpening(false); } }}>
                  <MessageCircle className="h-4 w-4" />{t("assistantUi.openChat")}
                </Button>
                <Button variant="outline" asChild><Link to="/app/assistant"><Settings2 className="h-4 w-4" />{t("assistantUi.settings")}</Link></Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl text-foreground">{t("assistantUi.heroTitle")}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t("assistantUi.heroLine")}</p>
              <div className="mt-4">
                <Button disabled={assistant === undefined && !!teamspaceId} asChild>
                  <Link to="/app/assistant" search={{ onboard: 1 }}><Sparkle className="h-4 w-4" />{t("assistantUi.create")}</Link>
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
