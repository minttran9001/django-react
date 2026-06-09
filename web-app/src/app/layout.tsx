import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { getCurrentUser } from "@/lib/auth/server";
import { StoreProvider } from "@/providers/StoreProvider";
import { cn } from "@/lib/utils";

import "./globals.css";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
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
    <html lang="en" className="h-full">
      <body
        className={cn(
          "flex min-h-full flex-col bg-background font-sans antialiased",
          fontSans.variable,
        )}
        suppressHydrationWarning
      >
        <StoreProvider initialUser={user}>{children}</StoreProvider>
      </body>
    </html>
  );
}
