import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/ChatPanel";

export const Route = createFileRoute("/_authenticated/app/")({
  component: HomeChat,
  head: () => ({
    meta: [
      { title: "AI Assistant — Virtual Space" },
      { name: "description", content: "Chat with the Virtual Space AI assistant in your workspace." },
      { property: "og:title", content: "AI Assistant — Virtual Space" },
      { property: "og:description", content: "Chat with the Virtual Space AI assistant in your workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function HomeChat() {
  return <ChatPanel variant="full" />;
}
