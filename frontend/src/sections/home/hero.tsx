import { motion, useReducedMotion } from "framer-motion";
import { ArrowDown, ArrowRight, ArrowUpRight, Download } from "lucide-react";
import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState } from "@/components/ui/states";
import { InfoStrip } from "@/sections/home/info-strip";

const IDENTITY_ROWS = [
  {
    index: "01",
    label: "Build",
    detail: "Full-stack products, APIs, and application systems.",
  },
  {
    index: "02",
    label: "Data",
    detail: "Python, SQL, and analysis that supports decisions.",
  },
  {
    index: "03",
    label: "Lead",
    detail: "Technical communities, initiatives, and programmes.",
  },
];

export function Hero() {
  const { settings, error, reload } = useSiteSettings();
  const reduceMotion = useReducedMotion();

  const intro =
    settings?.hero_intro ||
    "I build software products, work with data, and turn ideas into working systems.";

  return (
    <section className="relative overflow-hidden border-b border-line" aria-labelledby="hero-heading">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle at 78% 18%, rgba(255, 78, 31, 0.07), transparent 26rem)",
        }}
      />

      <Container className="relative">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line py-4">
          <p className="type-meta flex items-center gap-2 text-muted">
            <span className="text-signal">PHILL</span>
            <span className="text-faint">/</span>
            <span>Philemon Melabah</span>
          </p>
          <p className="type-meta hidden text-faint sm:block">Digital practice / 2026</p>
        </div>

        <div className="grid gap-12 py-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-20 lg:py-20">
          <div>
            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="type-meta text-muted"
            >
              Portfolio / Selected work / Open to collaboration
            </motion.p>

            <motion.h1
              id="hero-heading"
              initial={reduceMotion ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="mt-7 text-paper"
            >
              <span className="type-display block font-medium uppercase">Full-stack</span>
              <span className="display-serif -mt-1 block text-[clamp(3.9rem,11vw,9.25rem)] leading-[0.88] text-signal sm:-mt-2">
                developer
                <span
                  className="ml-2 inline-block size-2.5 bg-signal align-baseline sm:size-4"
                  aria-hidden="true"
                />
              </span>
            </motion.h1>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="type-meta mt-6 text-muted sm:mt-7"
            >
              Data &amp; analytics <span className="mx-2 text-signal">/</span>
              Technology builder
            </motion.p>

            <motion.p
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-paper-dim sm:text-lg"
            >
              {intro}
            </motion.p>

            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link to="/work" className={buttonStyles("primary", "lg")}>
                Explore my work
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
                  More about me
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              )}
            </motion.div>

            {!settings?.cv_url ? (
              <p className="mt-3 font-mono text-[0.56rem] uppercase tracking-[0.13em] text-faint">
                CV not uploaded yet — available from the site settings record.
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

            <a
              href="#selected-work"
              className="group mt-12 inline-flex items-center gap-3 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted transition-colors hover:text-paper"
            >
              <span className="h-px w-8 bg-line-strong transition-all duration-300 group-hover:w-12 group-hover:bg-signal" />
              Selected work
              <ArrowDown className="size-3.5" aria-hidden="true" />
            </a>
          </div>

          <motion.aside
            initial={reduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative self-end border border-line bg-surface/60 lg:mb-2"
            aria-label="Profile index"
          >
            <span
              className="absolute -left-px -top-px size-2 border-l border-t border-signal"
              aria-hidden="true"
            />
            <span
              className="absolute -right-px -top-px size-2 border-r border-t border-signal"
              aria-hidden="true"
            />
            <span
              className="absolute -bottom-px -left-px size-2 border-b border-l border-signal"
              aria-hidden="true"
            />
            <span
              className="absolute -bottom-px -right-px size-2 border-b border-r border-signal"
              aria-hidden="true"
            />

            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <span className="type-meta text-muted">Profile index</span>
              <span className="type-meta text-signal">001—003</span>
            </div>

            <div>
              {IDENTITY_ROWS.map((row) => (
                <div
                  key={row.index}
                  className="group border-b border-line px-5 py-5 transition-colors duration-200 hover:bg-surface-raised/60"
                >
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-medium tracking-tight text-paper transition-colors group-hover:text-signal-soft">
                      {row.label}
                    </p>
                    <span className="type-meta text-muted">{row.index}</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted">{row.detail}</p>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4">
              <span className="type-meta text-muted">Role</span>
              <span className="text-right text-xs text-paper-dim">
                {settings?.role_title || "Full-Stack Developer"}
              </span>
            </div>
          </motion.aside>
        </div>
      </Container>

      <InfoStrip location={settings?.location ?? null} availability={settings?.availability ?? null} />
    </section>
  );
}
