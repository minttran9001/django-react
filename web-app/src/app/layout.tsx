import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { getCurrentUser } from "@/lib/auth/server";
import { StoreProvider } from "@/providers/StoreProvider";

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
  title: "Django React App",
  description: "Next.js frontend for Django REST API",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        suppressHydrationWarning
      >
        <StoreProvider initialUser={user}>{children}</StoreProvider>
      </body>
    </html>
  );
}
