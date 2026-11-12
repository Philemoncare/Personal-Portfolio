import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { useSeo } from "@/hooks/useSeo";
import { AboutPreview } from "@/sections/home/about-preview";
import { ContactCta } from "@/sections/home/contact-cta";
import { CurrentlyBuilding } from "@/sections/home/currently-building";
import { DataPreview } from "@/sections/home/data-preview";
import { Hero } from "@/sections/home/hero";
import { SelectedWork } from "@/sections/home/selected-work";
import { TimelinePreview } from "@/sections/home/timeline-preview";
import { WorkModeSection } from "@/sections/home/work-mode";

export default function HomePage() {
  const { settings } = useSiteSettings();

  useSeo({
    title: settings?.seo_title || "Phill — Full-Stack Developer",
    description:
      settings?.seo_description ||
      "Full-stack developer working across software products, data, and technology leadership.",
    path: "/",
  });

  return (
    <>
      <Hero />
      <SelectedWork />
      <WorkModeSection />
      <CurrentlyBuilding />
      <DataPreview />
      <AboutPreview />
      <TimelinePreview />
      <ContactCta />
    </>
  );
}
