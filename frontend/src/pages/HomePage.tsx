import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { usePageSeo } from "@/app/ContentProvider";
import { AboutPreview } from "@/sections/home/about-preview";
import { ContactCta } from "@/sections/home/contact-cta";
import { CurrentlyBuilding } from "@/sections/home/currently-building";
import { DataPreview } from "@/sections/home/data-preview";
import { Hero } from "@/sections/home/hero";
import { PracticeIndex } from "@/sections/home/practice-index";
import { SelectedWork } from "@/sections/home/selected-work";
import { TimelinePreview } from "@/sections/home/timeline-preview";
import { WorkModeSection } from "@/sections/home/work-mode";

export default function HomePage() {
  const { settings } = useSiteSettings();

  usePageSeo("home", {
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
      <PracticeIndex />
      <AboutPreview />
      <TimelinePreview />
      <ContactCta />
    </>
  );
}
