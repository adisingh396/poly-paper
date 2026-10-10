import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { UserProvider } from "@/components/UserProvider";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap"
});

// Applied before paint to avoid a theme flash; defaults to dark, honors saved choice.
const themeInit = `(function(){try{var t=localStorage.getItem('pp-theme');if(t!=='light'&&t!=='dark'){t='dark';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;

export const metadata: Metadata = {
  title: "PolyPaper — Prediction Market Paper Trading",
  description:
    "Paper-trade live prediction markets with real market data and a virtual $1,000 balance. No real money."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-pk-surface font-sans text-pk-content-primary antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
        <UserProvider>
          <Header />
          <main className="min-h-[60vh]">{children}</main>
          <SiteFooter />
        </UserProvider>
      </body>
    </html>
  );
}
