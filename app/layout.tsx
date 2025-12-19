// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "SW Tax Service",
  description: "Fast, secure online tax filing.",

  icons: {
    icon: [
      { url: "/swtax-favicon-pack/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/swtax-favicon-pack/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/swtax-favicon-pack/favicon-48x48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/swtax-favicon-pack/apple-touch-icon.png",
  },
  manifest: "/swtax-favicon-pack/site.webmanifest",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={[
          geistSans.variable,
          geistMono.variable,
          "antialiased",
          "min-h-dvh",
          "bg-slate-50",        // ✅ page background
          "text-slate-900"      // ✅ default text color
        ].join(" ")}
      >
        {children}
      </body>
    </html>
  );
}