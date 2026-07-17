import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/ChatPanel";

export const Route = createFileRoute("/_authenticated/app/")({
  component: HomeChat,
  head: () => ({
    meta: [
      { title: "Home — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function HomeChat() {
  return <ChatPanel variant="full" />;
}
