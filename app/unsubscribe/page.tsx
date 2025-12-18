// app/unsubscribe/page.tsx

type UnsubscribePageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function Page({ searchParams }: UnsubscribePageProps) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-xl font-semibold">Missing token</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This unsubscribe link is missing a token.
        </p>
      </div>
    );
  }

  // ... your unsubscribe logic here
  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="text-xl font-semibold">Unsubscribe</h1>
      <p className="mt-2 text-sm text-muted-foreground">Processing…</p>
    </div>
  );
}
