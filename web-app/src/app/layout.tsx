import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { RootLayoutShell } from "@/components/layout/RootLayoutShell";
import { getCurrentUser } from "@/lib/auth/server";
import { StoreProvider } from "@/providers/StoreProvider";
import { cn } from "@/lib/utils";

import "./globals.css";
import { prefetchNecessaryData } from "@/lib/api/serverComponentApi";
import { UserGeoCoordinatesProvider } from "@/providers/UserGeoCoordinatesContext";

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Court Booking",
  description: "Court booking platform",
};



export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, necessaryData] = await Promise.all([getCurrentUser(), prefetchNecessaryData()]);
  return (
    <html lang="en" className="h-full">
      <body
        className={cn(
          "flex min-h-full flex-col bg-background font-sans antialiased",
          fontSans.variable,
        )}
        suppressHydrationWarning
      >
        <StoreProvider initialUser={user ?? null} necessaryData={necessaryData ?? []}>
          <UserGeoCoordinatesProvider>
            <RootLayoutShell>{children}</RootLayoutShell>
          </UserGeoCoordinatesProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
