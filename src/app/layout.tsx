import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/providers/SessionProvider";
import QueryProvider from "@/providers/QueryProvider";
import { Toaster } from "react-hot-toast";

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
            <main>{children}</main>
          </SessionProvider>
        </QueryProvider>
      </body>
    </html>
  );
}