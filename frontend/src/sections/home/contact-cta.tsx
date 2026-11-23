import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";

export function ContactCta() {
  const { settings } = useSiteSettings();

  return (
    <section className="border-t border-line py-20 sm:py-28" aria-labelledby="contact-cta-heading">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-20">
          <div>
            <div className="flex items-center justify-between gap-3 border-t border-line pt-5">
              <Eyebrow index="07">Contact</Eyebrow>
              <span className="type-meta text-faint">Contact / 07</span>
            </div>

            <h2
              id="contact-cta-heading"
              className="mt-7 max-w-4xl text-balance text-[clamp(2.7rem,6.2vw,5.8rem)] font-medium leading-[0.94] tracking-[-0.05em] text-paper"
            >
              Have a project, idea,
              <br className="hidden sm:block" /> or{" "}
              <span className="display-serif text-signal">problem?</span>
            </h2>

            <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-paper-dim sm:text-lg">
              Tell me what you are working on, what is in the way and what a good result looks
              like.
            </p>
          </div>

          <div className="lg:pb-1">
            <Link to="/contact" className={buttonStyles("primary", "lg", "w-full sm:w-auto")}>
              Get in touch
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>

            <dl className="mt-7 space-y-3 border-t border-line pt-5">
              <div className="flex items-center justify-between gap-4">
                <dt className="type-meta text-muted">Availability</dt>
                <dd className="text-right text-sm text-paper">
                  {settings?.availability || "Open to collaboration"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="type-meta text-muted">Based in</dt>
                <dd className="text-right text-sm text-paper">
                  {settings?.location || "Location not listed"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="type-meta text-muted">Response</dt>
                <dd className="text-right text-sm text-paper">Direct reply</dd>
              </div>
            </dl>
          </div>
        </div>
      </Container>
    </section>
  );
}
