import { useSession } from "@tanstack/react-start/server";

/** Uses the same encrypted application-admin session as the admin console. */
export async function requireApplicationAdmin() {
  const password = process.env.ADMIN_SESSION_SECRET;
  if (!password) throw new Error("Unauthorized");
  const session = await useSession<{ admin?: boolean }>({
    password, name: "vs-admin", maxAge: 60 * 60 * 12,
    cookie: { httpOnly: true, secure: true, sameSite: "none", path: "/" },
  });
  if (session.data.admin !== true) throw new Error("Unauthorized");
}