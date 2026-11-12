import { ArrowUpRight, Download } from "lucide-react";
import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { Timeline } from "@/features/timeline/Timeline";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import type {
  Certificate,
  ExperienceEntry,
  SkillGroup,
  TimelineEntry,
} from "@/types/api";
import { formatDate, formatRange } from "@/utils/format";

const PRACTICE = [
  {
    title: "Build",
    body: "Full-stack applications and APIs with a bias toward clear boundaries, typed contracts, and maintainable code.",
  },
  {
    title: "Analyze",
    body: "Work with real data in Python and SQL, documenting assumptions and communicating the limits of the finding.",
  },
  {
    title: "Lead",
    body: "Technical programs and communities where coordination, mentoring, and clear communication are part of the work.",
  },
  {
    title: "Explore",
    body: "Prototype unfamiliar tools and approaches in a lab, then keep only what proves useful.",
  },
];

const PRINCIPLES = [
  {
    index: "01",
    title: "Clarity before cleverness",
    body: "A system that another person can understand is worth more than a clever system that only one person can maintain.",
  },
  {
    index: "02",
    title: "Evidence over assertion",
    body: "Claims about outcomes should be traceable to a test, a measurement, or a written record — not a percentage bar.",
  },
  {
    index: "03",
    title: "Design the whole path",
    body: "The interface, API, data model, and failure states are one product. Treating them separately produces seams.",
  },
];

export default function AboutPage() {
  const { settings, loading: settingsLoading, error: settingsError, reload: reloadSettings } =
    useSiteSettings();
  const skills = useApiResource<SkillGroup[]>("/api/v1/skills");
  const experience = useApiResource<ExperienceEntry[]>("/api/v1/experience");
  const timeline = useApiResource<TimelineEntry[]>("/api/v1/timeline");
  const certificates = useApiResource<Certificate[]>("/api/v1/certificates");

  useSeo({
    title: "About — Phill",
    description:
      settings?.bio ||
      "About Phill: full-stack developer, data and analytics enthusiast, and technology builder.",
    path: "/about",
  });

  const skillGroups = skills.data ?? [];
  const experienceEntries = experience.data ?? [];
  const timelineEntries = timeline.data ?? [];
  const certificateEntries = certificates.data ?? [];

  return (
    <>
      <PageIntro
        eyebrow="About"
        title={
          <>
            Developer first.{" "}
            <span className="display-serif text-signal">Systems always.</span>
          </>
        }
        description="A short professional profile: what I build, how I work, and the record behind it. Detailed case studies carry the technical depth."
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Base</span>
              <span className="text-paper">{settings?.location || "Not listed"}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Availability</span>
              <span className="text-paper">{settings?.availability || "Not listed"}</span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <section className="grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_20rem] lg:gap-20" aria-labelledby="who-heading">
          <div>
            <Eyebrow>Who I am</Eyebrow>
            <h2 id="who-heading" className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
              A builder across the stack — and across the problem.
            </h2>

            {settingsLoading ? (
              <div className="mt-8">
                <LoadingState rows={3} label="Loading profile" />
              </div>
            ) : null}

            {settingsError ? (
              <div className="mt-8">
                <ErrorState message={settingsError} onRetry={reloadSettings} />
              </div>
            ) : null}

            {!settingsLoading && settings?.bio ? (
              <div className="prose-copy mt-6">
                {settings.bio.split(/\n{2,}/).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            {!settingsLoading && !settings?.bio ? (
              <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
                The profile bio has not been added yet. It will be written here from the site
                settings in the admin panel.
              </p>
            ) : null}

            {settings?.is_placeholder ? (
              <div className="mt-6 flex items-start gap-3 border border-signal/25 bg-signal/5 p-4">
                <Badge tone="placeholder">Placeholder</Badge>
                <p className="text-xs leading-relaxed text-paper-dim">
                  Profile copy is still a placeholder. Verified biography, experience, and
                  education will replace it.
                </p>
              </div>
            ) : null}

            <div className="mt-8 flex flex-wrap gap-2">
              <Link to="/contact" className={buttonStyles("secondary", "sm")}>
                Contact
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
              {settings?.cv_url ? (
                <a href={settings.cv_url} download className={buttonStyles("secondary", "sm")}>
                  Download CV
                  <Download className="size-3.5" aria-hidden="true" />
                </a>
              ) : (
                <span className={buttonStyles("secondary", "sm", "cursor-not-allowed opacity-50")} aria-disabled="true">
                  CV pending
                </span>
              )}
            </div>
          </div>

          <aside className="h-fit border border-line bg-ink-800/40">
            <div className="border-b border-line px-5 py-3">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                Profile facts
              </p>
            </div>
            <dl className="divide-y divide-line">
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">Role</dt>
                <dd className="text-right text-sm text-paper">{settings?.role_title || "Full-Stack Developer"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">Location</dt>
                <dd className="text-right text-sm text-paper">{settings?.location || "Not listed"}</dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">Email</dt>
                <dd className="max-w-[11rem] break-words text-right text-sm text-paper">
                  {settings?.email || "Not published"}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">CV</dt>
                <dd className="text-right text-sm text-paper">
                  {settings?.cv_url ? "Available" : "Pending"}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="mt-20 border-t border-line pt-10" aria-labelledby="what-heading">
          <Eyebrow>What I build</Eyebrow>
          <h2 id="what-heading" className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Four kinds of work, one practice.
          </h2>
          <div className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PRACTICE.map((item) => (
              <div key={item.title} className="bg-ink-900 p-6">
                <h3 className="text-lg font-medium text-paper">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-line pt-10" aria-labelledby="how-heading">
          <Eyebrow>How I work</Eyebrow>
          <h2 id="how-heading" className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Working principles.
          </h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {PRINCIPLES.map((principle) => (
              <div key={principle.index} className="border-t border-line pt-5">
                <span className="font-mono text-[0.58rem] tracking-[0.16em] text-signal">
                  {principle.index}
                </span>
                <h3 className="mt-4 text-lg font-medium text-paper">{principle.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{principle.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 border-t border-line pt-10" aria-labelledby="technology-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Technology</Eyebrow>
              <h2 id="technology-heading" className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
                The working toolkit.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted">
              Grouped by how the tools are used, not by arbitrary percentage scores.
            </p>
          </div>

          <div className="mt-8">
            {skills.loading ? <LoadingState rows={2} label="Loading skills" /> : null}
            {!skills.loading && skills.error ? (
              <ErrorState message={skills.error.detail} onRetry={skills.reload} />
            ) : null}
            {!skills.loading && !skills.error && skillGroups.length === 0 ? (
              <EmptyState
                title="Skills have not been added yet"
                description="Add skill groups and skills from the admin panel. Proficiency is described in words, not percentages."
              />
            ) : null}
            {!skills.loading && !skills.error && skillGroups.length > 0 ? (
              <div className="grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-3">
                {skillGroups.map((group) => (
                  <div key={group.id} className="bg-ink-900 p-6">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.16em] text-muted">
                      {group.name}
                    </p>
                    <ul className="mt-4 flex flex-wrap gap-1.5">
                      {group.skills.map((skill) => (
                        <li
                          key={skill.id}
                          className="border border-line px-2 py-1 text-sm text-paper-dim"
                        >
                          {skill.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-20 border-t border-line pt-10" aria-labelledby="experience-heading">
          <Eyebrow>Experience</Eyebrow>
          <h2 id="experience-heading" className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Professional record.
          </h2>
          <div className="mt-8">
            {experience.loading ? <LoadingState rows={2} label="Loading experience" /> : null}
            {!experience.loading && experience.error ? (
              <ErrorState message={experience.error.detail} onRetry={experience.reload} />
            ) : null}
            {!experience.loading && !experience.error && experienceEntries.length === 0 ? (
              <EmptyState
                title="Experience entries are not published"
                description="Real roles will be listed with organization, period, and responsibility. This section stays closed until those records are confirmed."
              />
            ) : null}
            {!experience.loading && !experience.error && experienceEntries.length > 0 ? (
              <ol>
                {experienceEntries.map((entry) => (
                  <li key={entry.id} className="border-t border-line py-6 first:border-t-0 first:pt-0">
                    <div className="grid gap-3 sm:grid-cols-[14rem_1fr] sm:gap-8">
                      <div>
                        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                          {formatRange(entry.started_on, entry.ended_on, entry.is_current)}
                        </p>
                        {entry.location ? (
                          <p className="mt-1 text-xs text-faint">{entry.location}</p>
                        ) : null}
                      </div>
                      <div>
                        <h3 className="text-xl font-medium text-paper">{entry.title}</h3>
                        <p className="mt-1 text-sm text-signal-soft">{entry.organization}</p>
                        {entry.description ? (
                          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
                            {entry.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
        </section>

        <section className="mt-20 border-t border-line pt-10" aria-labelledby="timeline-heading">
          <Eyebrow>Timeline</Eyebrow>
          <h2 id="timeline-heading" className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            The chronology.
          </h2>
          <div className="mt-8">
            {timeline.loading ? <LoadingState rows={2} label="Loading timeline" /> : null}
            {!timeline.loading && timeline.error ? (
              <ErrorState message={timeline.error.detail} onRetry={timeline.reload} />
            ) : null}
            {!timeline.loading && !timeline.error ? (
              <Timeline entries={timelineEntries} />
            ) : null}
          </div>
        </section>

        {certificateEntries.length > 0 ? (
          <section className="mt-20 border-t border-line pt-10" aria-labelledby="certificates-heading">
            <Eyebrow>Certificates</Eyebrow>
            <h2 id="certificates-heading" className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
              Verified credentials.
            </h2>
            <ul className="mt-8 grid gap-px border border-line bg-line sm:grid-cols-2">
              {certificateEntries.map((certificate) => (
                <li key={certificate.id} className="bg-ink-900 p-6">
                  <h3 className="text-lg font-medium text-paper">{certificate.name}</h3>
                  <p className="mt-1 text-sm text-muted">{certificate.issuer}</p>
                  <p className="mt-3 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                    {formatDate(certificate.issued_on, { withDay: true })}
                  </p>
                  {certificate.credential_url ? (
                    <a
                      href={certificate.credential_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-paper hover:text-signal"
                    >
                      Verify credential
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <div className="mt-16 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            The current focus and availability live on the Now page and are updated as work
            changes.
          </p>
          <Link to="/now" className={buttonStyles("secondary", "sm")}>
            See what is happening now
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      </Container>
    </>
  );
}
