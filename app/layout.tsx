import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";
import { Toaster } from "@/components/ui/sonner";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
});

export const metadata: Metadata = {
  title: "ניהול חדרי אירוח",
  description: "מערכת פנימית לניהול חדרי אירוח",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="he" dir="rtl" className={rubik.variable}>
      <body className="font-[family-name:var(--font-rubik)] bg-gray-50 text-gray-900 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <div className="max-w-6xl mx-auto p-6 md:p-8">{children}</div>
          </main>
        </div>
        <Toaster position="bottom-right" richColors dir="rtl" />
      </body>
    </html>
  );
}
