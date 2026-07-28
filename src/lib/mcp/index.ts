import { auth, defineMcp } from "@lovable.dev/mcp-js";
import createTaskTool from "./tools/create-task";
import listTasksTool from "./tools/list-tasks";
import updateTaskTool from "./tools/update-task";
import listDocumentsTool from "./tools/list-documents";
import searchKnowledgeTool from "./tools/search-knowledge";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "virtual-space-mcp",
  title: "Virtual Space",
  version: "0.1.0",
  instructions:
    "Tools for Virtual Space, an AI virtual office. Use list_tasks / create_task / update_task to work with the signed-in user's task board, and list_documents / search_knowledge_base to read their knowledge base.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listTasksTool, createTaskTool, updateTaskTool, listDocumentsTool, searchKnowledgeTool],
});
