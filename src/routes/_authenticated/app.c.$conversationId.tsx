import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/ChatPanel";

export const Route = createFileRoute("/_authenticated/app/c/$conversationId")({
  component: ThreadChat,
  head: () => ({
    meta: [
      { title: "Chat — Virtual Space" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ThreadChat() {
  const { conversationId } = Route.useParams();
  return <ChatPanel variant="full" conversationId={conversationId} key={conversationId} />;
}
