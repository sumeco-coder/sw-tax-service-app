import Link from "next/link";
import ComingSoon from "../_components/ComingSoon";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function IndividualTaxFilingComingSoon() {
  return (
    <>
      <ComingSoon
        title="Individual Tax Filing"
        subtitle="We’re building a guided filing experience with document upload, checklist, and appointment scheduling."
        primaryHref="/waitlist"
        primaryLabel="Join the waitlist"
        secondaryHref="/tax-knowledge"
        secondaryLabel="Read tax tips"
      />

      <div className="-mt-10 pb-10 text-center">
        <Link href="/services" className="text-sm underline opacity-80 hover:opacity-100">
          Back to services
        </Link>
      </div>
    </>
  );
}
