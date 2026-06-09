import { ContentBanner } from "@/components/landing/ContentBanner";
import { LandingHeader } from "@/components/landing/LandingHeader";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between">
      <LandingHeader />
      <ContentBanner />
    </div>
  );
}
