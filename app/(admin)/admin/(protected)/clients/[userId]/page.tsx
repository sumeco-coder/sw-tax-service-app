//app/(admin)/admin/(protected)/clients/[userId]/page.tsx
import { redirect } from "next/navigation";


export default function AdminClientPage({
  params,
}: {
  params: { userId: string };
}) {
  return redirect(`/admin/clients/${params.userId}/documents`);
}
