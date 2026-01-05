// app/(client)/layout.tsx
export const dynamic = "force-dynamic";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
