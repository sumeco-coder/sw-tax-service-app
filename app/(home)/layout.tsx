// app/(site)/layout.tsx
import "@/app/globals.css";
import Navbar from "@/components/global/Navbar";
import Footer from "@/components/global/Footer";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* your existing top navbar/header goes here */}
      <header className="border-b bg-white">
        <Navbar />
      </header>
      <main>{children}</main>
      <Footer />
    </>
  );
}
