import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "SW Tax Service",
    template: "%s | SW Tax Service",
  },
  description: "Fast, secure online tax filing.",
  applicationName: "SW Tax Service",

  icons: {
    icon: [
      { url: "/favicon.ico" },
      {
        url: "/swtax-favicon-pack/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/swtax-favicon-pack/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/swtax-favicon-pack/favicon-48x48.png",
        sizes: "48x48",
        type: "image/png",
      },
    ],
    apple: "/swtax-favicon-pack/apple-touch-icon.png",
  },

  manifest: "/swtax-favicon-pack/site.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clarityId = process.env.CLARITY_ID;
  const gaId = process.env.GA_ID;

  return (
    <html lang="en">
      <head>
        {/* =========================
            Microsoft Clarity
        ========================= */}
        {clarityId ? (
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
            Google Analytics (GA4)
        ========================= */}
        {gaId ? (
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
      </head>
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          "antialiased",
          "min-h-dvh",
          "bg-slate-50",
          "text-slate-900",
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}
