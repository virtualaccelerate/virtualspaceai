import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronRight, MessageSquare, MessageSquarePlus, Bot, Trash2 } from "lucide-react";
import {
  listConversations,
  deleteConversation,
  createConversation,
  type Conversation,
} from "@/lib/chat-history.functions";

interface SidebarChatCtx {
  showLabels: boolean;
  conversations: Conversation[];
  activeId?: string;
  creating: boolean;
  onNewChat: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const Ctx = createContext<SidebarChatCtx | null>(null);

export function SidebarChatProvider({
  showLabels,
  children,
}: {
  showLabels: boolean;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const listConvs = useServerFn(listConversations);
  const removeConv = useServerFn(deleteConversation);
  const createConv = useServerFn(createConversation);
  const [creating, setCreating] = useState(false);
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

  const onNewChat = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const conv = await createConv({ data: { title: t("app.chat.newChat", "New chat") } });
      setConversations((prev) => [conv, ...prev]);
      window.dispatchEvent(new Event("virtualspace:chats-changed"));
      navigate({ to: "/app/c/$conversationId", params: { conversationId: conv.id } });
    } catch {
      /* ignore */
    } finally {
      setCreating(false);
    }
  };

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

  return (
    <Ctx.Provider value={{ showLabels, conversations, activeId, creating, onNewChat, onDelete }}>
      {children}
    </Ctx.Provider>
  );
}

function useSidebarChat(): SidebarChatCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("SidebarChatProvider missing");
  return ctx;
}

export function NewChatButton() {
  const { showLabels, onNewChat, creating } = useSidebarChat();
  const { t } = useTranslation();

  if (!showLabels) {
    return (
      <button
        onClick={onNewChat}
        disabled={creating}
        title={t("app.chat.newChat", "New chat")}
        aria-label={t("app.chat.newChat", "New chat")}
        className="w-full group flex items-center justify-center rounded-lg px-2.5 py-2 text-sm text-primary hover:bg-primary/10 transition disabled:opacity-50"
      >
        <span className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 bg-primary/15">
          <MessageSquarePlus className="h-[18px] w-[18px]" />
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onNewChat}
      disabled={creating}
      className="w-full group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium text-primary hover:bg-primary/10 transition disabled:opacity-50"
    >
      <span className="h-8 w-8 rounded-md flex items-center justify-center shrink-0 bg-primary/15">
        <MessageSquarePlus className="h-[18px] w-[18px]" />
      </span>
      <span className="flex-1 text-left truncate">{t("app.chat.newChat", "New chat")}</span>
    </button>
  );
}

export function ChatsNavItem() {
  const { showLabels, conversations, activeId, onDelete } = useSidebarChat();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const onChatRoute = location.pathname === "/app" || location.pathname.startsWith("/app/c/");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (onChatRoute) setOpen(true);
  }, [onChatRoute]);

  if (!showLabels) {
    return (
      <Link
        to="/app"
        title={t("app.nav.chat", "Chats")}
        className="w-full block"
      >
        <div
          className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition ${
            onChatRoute ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted"
          }`}
        >
          <span
            className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
              onChatRoute ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
            }`}
          >
            <MessageSquare className="h-[18px] w-[18px]" />
          </span>
        </div>
      </Link>
    );
  }

  return (
    <>
      <div
        className={`group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition cursor-pointer ${
          onChatRoute ? "bg-primary/15 text-primary" : "text-foreground hover:bg-muted"
        }`}
        onClick={() => {
          setOpen(true);
          navigate({ to: "/app" });
        }}
      >
        <span
          className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
            onChatRoute ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="truncate">{t("app.nav.chat", "Chats")}</div>
        </div>
        <span className="text-xs text-muted-foreground">{conversations.length}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          aria-label={open ? "collapse" : "expand"}
          className="p-0.5 text-muted-foreground hover:text-foreground"
        >
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
      </div>

      {open && (
        <div className="ml-4 pl-2 border-l border-border max-h-72 overflow-y-auto space-y-0.5">
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
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
