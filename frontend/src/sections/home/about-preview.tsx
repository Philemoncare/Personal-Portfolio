import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";

const FALLBACK_BIO =
  "I work on software, data and technical projects, and I help run the teams and communities behind them.";

export function AboutPreview() {
  const { settings } = useSiteSettings();

  return (
    <section className="border-t border-line py-20 sm:py-28" aria-labelledby="about-preview-heading">
      <Container>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-20">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
              <Eyebrow index="05">About</Eyebrow>
              <span className="type-meta text-faint">Profile / 05</span>
            </div>

            <h2
              id="about-preview-heading"
              className="mt-7 max-w-3xl text-balance text-[clamp(2.4rem,5.2vw,4.8rem)] font-medium leading-[0.96] tracking-[-0.045em] text-paper"
            >
              I build{" "}
              <span className="display-serif text-signal">software</span>, work with{" "}
              <span className="display-serif text-signal">data</span> and help teams ship.
            </h2>
          </div>

          <div className="lg:pb-1">
            <p className="max-w-xl text-pretty text-base leading-relaxed text-paper-dim sm:text-lg">
              {settings?.bio || FALLBACK_BIO}
            </p>

            {settings?.is_placeholder ? (
              <div className="mt-5 flex flex-wrap items-start gap-x-3 gap-y-2">
                <Badge tone="placeholder" className="shrink-0">
                  Not finished
                </Badge>
                <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">
                  The longer biography is still being written, so this preview is short for now.
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/about" className={buttonStyles("secondary", "sm")}>
                About me
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              <Link
                to="/now"
                className="inline-flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.15em] text-muted transition-colors hover:text-paper"
              >
                Now
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
