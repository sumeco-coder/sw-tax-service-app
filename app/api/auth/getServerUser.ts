import { getServerRole } from "@/lib/auth/roleServer";

export async function getServerUser() {
  const r = await getServerRole();
  if (!r?.sub) return null;

  // prefer idToken email but your function already returns email
  return { sub: r.sub as string, email: (r.email ?? "") as string, role: r.role };
}
