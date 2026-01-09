import { redirect } from "next/navigation";

const ALLOWED = new Set([
  "dashboard",
  "documents",
  "messages",
  "invoices",
  "profile",
  "appointments",
  "dependents",
  "files",
  "questionnaire",
]);

export default function PortalAliasPage({
  params,
}: {
  params: { slug: string[] };
}) {
  const slug = params.slug ?? [];
  const first = slug[0];

  // If someone goes to /portal/unknown -> send to dashboard
  if (!first || !ALLOWED.has(first)) {
    redirect("/dashboard");
  }

  // Example:
  // /portal/documents -> /documents
  // /portal/invoices/123 -> /invoices/123
  redirect(`/${slug.join("/")}`);
}
