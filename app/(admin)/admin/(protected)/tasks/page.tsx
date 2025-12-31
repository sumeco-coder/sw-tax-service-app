// app/(admin)/admin/(protected)/tasks/page.tsx
import AdminTasksPanel from "../_components/AdminTasksPanel";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminTasksPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#202030]">Client Tasks</h1>
        <p className="mt-1 text-sm text-[#202030]/70">
          Search a client and create “Missing info” tasks that show on their dashboard.
        </p>
      </div>

      <AdminTasksPanel />
    </div>
  );
}
