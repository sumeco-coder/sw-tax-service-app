import { confirmUnsubscribeAction } from "../unsubscribe/action";

export const dynamic = "force-dynamic";

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token ?? "";

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="mx-auto max-w-md rounded-xl border bg-white p-6">
        <h1 className="text-xl font-bold text-gray-900">Unsubscribe</h1>
        <p className="mt-2 text-sm text-gray-600">
          Confirm to stop receiving marketing emails from SW Tax Service.
        </p>

        <form action={confirmUnsubscribeAction} className="mt-5 space-y-3">
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
          >
            Confirm unsubscribe
          </button>
        </form>
      </div>
    </main>
  );
}
