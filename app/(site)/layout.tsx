// app/(site)/layout.tsx
import "@/app/globals.css";
import Script from "next/script";
import Navbar from "@/components/global/Navbar";
import Footer from "@/components/global/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const clarityId = process.env.CLARITY_ID;
  const gaId = process.env.GA_ID;

  // optional: only run tracking in production
  const isProd = process.env.NODE_ENV === "production";

  return (
    <>
      {/* =========================
          Microsoft Clarity (site only)
      ========================= */}
      {isProd && clarityId ? (
        <Script id="ms-clarity" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      ) : null}

      {/* =========================
          Google Analytics (GA4) (site only)
      ========================= */}
      {isProd && gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      ) : null}

      {/* Header */}
      <header className="border-b bg-white">
        <Navbar />
      </header>

      {/* Main */}
      <main>{children}</main>

      {/* Footer */}
      <Footer />
    </>
  );
}
