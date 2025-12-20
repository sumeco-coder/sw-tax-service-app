import ComingSoon from "../_components/ComingSoon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BookkeepingPage() {
  return (
    <ComingSoon
      title="Bookkeeping"
      subtitle="We’re building streamlined monthly bookkeeping intake, reconciliations, and tax-ready reporting."
      tertiaryHref="/services"
      tertiaryLabel="Back to services"
    />
  );
}
