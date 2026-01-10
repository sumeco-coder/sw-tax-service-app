// app/(admin)/admin/(protected)/messages/loading.tsx
export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-6">
      <div className="space-y-2">
        <div className="h-7 w-40 rounded-md bg-muted" />
        <div className="h-4 w-80 rounded-md bg-muted" />
      </div>
      <div className="flex-1 rounded-3xl border bg-background/60" />
    </div>
  );
}
