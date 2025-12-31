// app/(admin)/(protected)/messages/page.tsx
import { getAllClientConversations } from "./actions";
import { AdminMessagesShell } from "../messages/components/AdminMessagesShell";

export default async function AdminMessagesPage() {
  const conversations = await getAllClientConversations();

  return (
    <div className="h-[calc(100vh-4rem)]">
      <AdminMessagesShell conversations={conversations} />
    </div>
  );
}
