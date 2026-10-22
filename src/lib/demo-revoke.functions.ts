import { createServerFn } from "@tanstack/react-start";

/** Temporary, admin-protected remediation; removed after successful execution. */
export const revokeExposedDemo = createServerFn({ method: "POST" }).handler(async () => {
  const { requireApplicationAdmin } = await import("./application-admin.server");
  await requireApplicationAdmin();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let page = 1;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Could not locate demo account");
    const demo = data.users.find(u => u.email?.toLowerCase() === "demo@ai-virtualspace.com");
    if (demo) {
      const password = crypto.randomUUID() + crypto.randomUUID() + "Aa1!";
      const { error: failure } = await supabaseAdmin.auth.admin.updateUserById(demo.id, { password, ban_duration: "876000h" });
      if (failure) {
        console.error("Demo disable failed", failure.code, failure.status, failure.message);
        throw new Error("Could not disable demo account");
      }
      return { ok: true };
    }
    if (data.users.length < 1000) return { ok: true, absent: true };
    page++;
  }
});