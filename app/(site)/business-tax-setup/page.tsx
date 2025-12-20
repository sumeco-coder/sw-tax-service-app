import ComingSoon from "../_components/ComingSoon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function BusinessTaxSetupPage() {
  return (
    <ComingSoon
      title="Business Tax Setup"
      subtitle="We’re building a clean setup flow for entities, bookkeeping alignment, and tax-ready organization."
      tertiaryHref="/services"
      tertiaryLabel="Back to services"
    />
  );
}
