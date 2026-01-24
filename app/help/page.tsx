export const dynamic = "force-static";

export default function HelpPage() {
  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold">Help</h1>
          <p className="text-muted-foreground">
            Quick answers and ways to contact SW Tax Service support.
          </p>
        </header>

        <section className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Common links</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <a className="underline" href="/sign-in">Client sign in</a>
            </li>
            <li>
              <a className="underline" href="/sign-up">Create an account</a>
            </li>
            <li>
              <a className="underline" href="/tax-calculator">Tax calculator</a>
            </li>
          </ul>
        </section>

        <section className="rounded-2xl border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Need help?</h2>
          <p className="text-muted-foreground">
            If you’re having trouble uploading documents, viewing invoices, or checking your return status,
            please contact support.
          </p>

          <div className="space-y-1">
            <p>
              <span className="font-medium">Email:</span>{" "}
              <a className="underline" href="mailto:support@swtaxservice.com">
                support@swtaxservice.com
              </a>
            </p>
            <p>
              <span className="font-medium">Hours:</span> Mon–Fri, 9am–5pm (local)
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
