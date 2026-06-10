import { LandingHeader } from "@/components/landing/LandingHeader";
import { routeWithNoLayout } from "@/lib/routes";
import { getPathname } from "@/lib/routes/server";

function BodyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pb-16 pt-36">
        {children}
      </main>
    </div>
  );
}

export async function RootLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = await getPathname();
  const isAuthPage = routeWithNoLayout(pathname);

  return (
    <>
      <LandingHeader />
      {isAuthPage ? children : <BodyLayout>{children}</BodyLayout>}
    </>
  );
}
