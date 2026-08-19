import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, History, MessageSquarePlus, Bot, X } from "lucide-react";
import {
  listConversations,
  deleteConversation,
  type Conversation,
} from "@/lib/chat-history.functions";

export function SidebarChatHistory({ showLabels }: { showLabels: boolean }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const listConvs = useServerFn(listConversations);
  const removeConv = useServerFn(deleteConversation);

  const [open, setOpen] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const refresh = useCallback(async () => {
    try {
      setConversations(await listConvs());
    } catch {
      /* ignore */
    }
  }, [listConvs]);

  useEffect(() => {
    void refresh();
    const handler = () => void refresh();
    window.addEventListener("virtualspace:chats-changed", handler);
    return () => window.removeEventListener("virtualspace:chats-changed", handler);
  }, [refresh]);

  const activeId = location.pathname.startsWith("/app/c/")
    ? location.pathname.split("/app/c/")[1]?.split("/")[0]
    : undefined;

  const onDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!confirm(t("app.chat.confirmDelete", "Delete this chat?"))) return;
    try {
      await removeConv({ data: { id } });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) navigate({ to: "/app" });
    } catch {
      /* ignore */
    }
  };

  if (!showLabels) return null;

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-foreground hover:bg-muted transition"
      >
        <span className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 text-muted-foreground group-hover:text-foreground">
          <History className="h-[18px] w-[18px]" />
        </span>
        <span className="flex-1 text-left truncate">{t("app.chat.history", "Chat history")}</span>
        <span className="text-xs text-muted-foreground">{conversations.length}</span>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="ml-3 pl-2 border-l border-border max-h-72 overflow-y-auto space-y-0.5">
          {conversations.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground">
              {t("app.chat.noHistory", "No previous chats yet")}
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() =>
                  navigate({ to: "/app/c/$conversationId", params: { conversationId: c.id } })
                }
                className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13px] cursor-pointer hover:bg-accent/50 ${
                  c.id === activeId ? "bg-accent/60 text-foreground" : "text-foreground/80"
                }`}
              >
                {c.agent_id ? (
                  <Bot className="h-3.5 w-3.5 text-primary shrink-0" />
                ) : (
                  <MessageSquarePlus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className="flex-1 truncate">{c.title}</span>
                <button
                  onClick={(e) => void onDelete(c.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 p-0.5"
                  aria-label="delete"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
