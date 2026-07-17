import { createFileRoute } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { ComingSoon } from "@/components/ComingSoon";

export const Route = createFileRoute("/_authenticated/app/financials")({
  component: () => (
    <ComingSoon
      title="Financials"
      description="Track budgets, invoices, and profitability across your teamspace."
      icon={Wallet}
    />
  ),
  head: () => ({ meta: [{ title: "Financials — Virtual Space" }, { name: "robots", content: "noindex" }] }),
});
