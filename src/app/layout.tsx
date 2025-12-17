import { SmartCommandBar } from "@/components/dashboard/SmartCommandBar";
import QueryProvider from "@/providers/QueryProvider";
import SessionProvider from "@/providers/SessionProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NexusProcure - IT Procurement Management",
  description: "Manage your IT procurement process efficiently",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <SessionProvider>
            <Toaster position="top-center" />
            <SmartCommandBar />
            <main>{children}</main>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}