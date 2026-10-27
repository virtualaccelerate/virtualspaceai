import { createFileRoute } from "@tanstack/react-router";
import { ChatPanel } from "@/components/ChatPanel";

export const Route = createFileRoute("/_authenticated/app/c/$conversationId")({
  component: ThreadChat,
  head: () => ({
    meta: [
      { title: "Conversation — Virtual Space" },
      { name: "description", content: "Continue your Virtual Space AI conversation and manage suggested tasks." },
      { property: "og:title", content: "Conversation — Virtual Space" },
      { property: "og:description", content: "Continue your Virtual Space AI conversation and manage suggested tasks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function ThreadChat() {
  const { conversationId } = Route.useParams();
  return <ChatPanel variant="full" conversationId={conversationId} key={conversationId} />;
}
