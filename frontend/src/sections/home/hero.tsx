import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Download } from "lucide-react";
import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { usePageContent } from "@/app/ContentProvider";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/states";
import { InfoStrip } from "@/sections/home/info-strip";

const DISCIPLINES = [
  {
    index: "01",
    label: "Full-stack development",
    detail: "Products, APIs, and the systems that hold them together.",
  },
  {
    index: "02",
    label: "Data & analytics",
    detail: "Python, SQL, and analysis that supports real decisions.",
  },
  {
    index: "03",
    label: "Technology building",
    detail: "Communities, programmes, and technical initiatives.",
  },
];

export function Hero() {
  const { settings, error, reload } = useSiteSettings();
  const page = usePageContent("home");
  const reduceMotion = useReducedMotion();

  const intro =
    page?.intro ||
    page?.description ||
    settings?.hero_intro ||
    "I build software products, work with data, and turn ideas into working systems.";

  const location = settings?.location || "Ghana";
  const role = settings?.role_title || "Full-Stack Developer";

  return (
    <section className="relative border-b border-line" aria-labelledby="hero-heading">
      <Container>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
          <p className="type-meta flex items-center gap-2 text-muted">
            <span className="text-signal">PHILL</span>
            <span className="text-faint">/</span>
            <span>Philemon Melabah</span>
          </p>
          <p className="type-meta hidden items-center gap-2 text-faint sm:flex">
            <span className="size-1.5 bg-signal" aria-hidden="true" />
            Portfolio 001 — 2026
          </p>
        </div>

        <div className="grid grid-cols-1 gap-10 py-12 sm:py-14 lg:grid-cols-12 lg:gap-12 lg:py-16">
          <div className="lg:col-span-7 lg:flex lg:flex-col lg:justify-between">
            <div>
              <motion.p
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className="type-meta flex flex-wrap items-center gap-x-3 gap-y-2 text-muted"
              >
                <span>Selected work</span>
                <span className="text-faint">/</span>
                <span>Technical case studies</span>
                <span className="text-faint">/</span>
                <span className="text-signal">{settings?.availability || "Open to collaboration"}</span>
              </motion.p>

              <motion.h1
                id="hero-heading"
                initial={reduceMotion ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="mt-5 text-paper lg:mt-8"
              >
                <span className="type-display block font-medium uppercase">
                  {settings?.display_name || "Phill"}
                </span>
                <span className="mt-2 flex items-baseline gap-3 sm:mt-3">
                  <span className="display-serif text-[clamp(1.9rem,4.6vw,3.6rem)] leading-[0.95] text-signal">
                    Philemon Melabah
                  </span>
                  <span className="hidden h-px flex-1 bg-line-strong sm:block" aria-hidden="true" />
                </span>
              </motion.h1>

              <motion.p
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.14 }}
                className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted sm:mt-8"
              >
                <span>{role}</span>
                <span className="text-faint">/</span>
                <span>Data &amp; analytics</span>
                <span className="text-faint">/</span>
                <span>Technology builder</span>
              </motion.p>
            </div>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 lg:mt-12"
            >
              <p className="max-w-xl text-pretty text-base leading-relaxed text-paper-dim sm:text-lg">
                {intro}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/work" className={buttonStyles("primary", "lg")}>
                  Selected work
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>

                {settings?.cv_url ? (
                  <a href={settings.cv_url} download className={buttonStyles("secondary", "lg")}>
                    Download CV
                    <Download className="size-4" aria-hidden="true" />
                  </a>
                ) : (
                  <Link to="/about" className={buttonStyles("secondary", "lg")}>
                    About
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </Link>
                )}
              </div>

              {!settings?.cv_url ? (
                <p className="mt-3 font-mono text-[0.56rem] uppercase tracking-[0.13em] text-faint">
                  CV not uploaded yet. Available from the site settings record.
                </p>
              ) : null}

              {error ? (
                <div className="mt-7 max-w-lg">
                  <ErrorState
                    message={`Profile settings could not load: ${error}. Fallback copy is shown.`}
                    onRetry={reload}
                    className="p-5"
                  />
                </div>
              ) : null}
            </motion.div>
          </div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="group relative lg:col-span-5 lg:pl-6 xl:pl-12"
          >
            <figure className="relative">
              <PortfolioImage
                assetId="profile.portrait"
                priority
                aspect="portrait"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 80vw, 34vw"
                className="border border-line"
                imageClassName="grayscale-[0.35] contrast-[1.04] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                fallback={
                  <div
                    className="flex aspect-[4/5] items-end border border-line bg-surface p-6"
                    aria-hidden="true"
                  >
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-faint">
                      Portrait unavailable
                    </p>
                  </div>
                }
              />

              <span
                className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-line-strong"
                aria-hidden="true"
              />
              <span
                className="absolute -bottom-px left-6 size-2.5 bg-signal"
                aria-hidden="true"
              />

              <figcaption className="flex items-start justify-between gap-4 border-x border-b border-line bg-surface/70 px-4 py-3">
                <div>
                  <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                    Studio portrait
                  </p>
                  <p className="mt-1 text-xs text-paper-dim">
                    Philemon Melabah, {location}
                  </p>
                </div>
                <span className="type-meta shrink-0 text-faint">2026</span>
              </figcaption>
            </figure>

            <p className="type-meta mt-3 text-right text-faint">
              Fig. 01 / {role.toLowerCase()}
            </p>
          </motion.div>

          <div className="lg:col-span-12">
            <motion.dl
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-1 border-t border-line sm:grid-cols-3"
            >
              {DISCIPLINES.map((row) => (
                <div
                  key={row.index}
                  className="group border-b border-line px-1 py-5 transition-colors duration-200 hover:bg-surface/50 sm:border-b-0 sm:border-r sm:px-5 sm:first:pl-0 sm:last:border-r-0 sm:last:pr-0"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-sm font-medium tracking-tight text-paper transition-colors group-hover:text-signal-soft">
                      {row.label}
                    </dt>
                    <span className="type-meta text-faint">{row.index}</span>
                  </div>
                  <dd className="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-muted">
                    {row.detail}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </div>
        </div>

        <div className="pb-5">
          <a
            href="#selected-work"
            className="group inline-flex items-center gap-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-paper"
          >
            <span className="h-px w-8 bg-line-strong transition-all duration-300 group-hover:w-12 group-hover:bg-signal" />
            Selected work
            <ArrowDown className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </Container>

      <InfoStrip location={settings?.location ?? null} availability={settings?.availability ?? null} />
    </section>
  );
}
