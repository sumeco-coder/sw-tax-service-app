// app/(admin)/admin/(protected)/messages/page.tsx
import { AdminMessagesShell } from "./components/AdminMessagesShell";
import { getAllClientConversations } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage() {
  const conversations = await getAllClientConversations();

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
        <p className="text-sm text-muted-foreground">
          View and reply to client conversations.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <AdminMessagesShell conversations={conversations as any} />
      </div>
    </div>
  );
}
