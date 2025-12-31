// app/(client)/(protected)/messages/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { MessagesShell } from "../messages/_components/MessagesShell";
import { getClientConversations } from "./actions";
import { getServerUser } from "@/lib/auth/getServerUser";

export default async function MessagesPage() {
  const user = await getServerUser();
  if (!user) redirect("/sign-in");

  const conversations = await getClientConversations();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-lg font-semibold">Messages</h1>
          <p className="text-xs text-neutral-500">
            Secure communication with your tax team
          </p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden p-4">
        <MessagesShell conversations={conversations} viewerRole={user.role} />
      </div>
    </div>
  );
}
