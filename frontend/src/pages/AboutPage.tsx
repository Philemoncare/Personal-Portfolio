import { ArrowUpRight, Download, FileText } from "lucide-react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { PortfolioImage } from "@/components/media/PortfolioImage";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { PageSkeleton } from "@/components/ui/skeletons";
import { Timeline } from "@/features/timeline/Timeline";
import {
  useFeaturedProjects,
  useLeadershipEntries,
  useProfile,
  useTimelineEntries,
} from "@/hooks/useContent";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import { formatFileSize } from "@/utils/identity";

function Paragraphs({ value }: { value: string }) {
  return (
    <div className="space-y-4">
      {value
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} className="max-w-2xl text-pretty text-base leading-relaxed text-paper-dim">
            {paragraph}
          </p>
        ))}
    </div>
  );
}

function NarrativeSection({
  id,
  eyebrow,
  title,
  body,
  placeholder,
}: {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  placeholder: string;
}) {
  return (
    <section className="border-t border-line pt-10" aria-labelledby={id}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
        {title}
      </h2>
      {body.trim() ? (
        <div className="mt-6">
          <Paragraphs value={body} />
        </div>
      ) : (
        <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted">{placeholder}</p>
      )}
    </section>
  );
}

export default function AboutPage() {
  const profile = useProfile();
  const projects = useFeaturedProjects(3);
  const timeline = useTimelineEntries();
  const leadership = useLeadershipEntries();

  const person = profile.data;
  const page = usePageContent("about");

  usePageSeo("about", {
    title: person
      ? `About ${person.display_name} | ${person.professional_title ?? "Portfolio"}`
      : "About | Portfolio",
    description:
      person?.short_bio ||
      "A professional profile: what I build, how I work, and the direction of the practice.",
    path: "/about",
    image: person?.profile_image ?? null,
    imageAlt: person ? `${person.display_name} profile` : null,
  });

  if (profile.loading && !person) {
    return <PageSkeleton label="Loading profile" />;
  }

  if (profile.error && !person) {
    return (
      <Container className="py-20">
        <ErrorState
          message="The profile could not be loaded. The API may be unavailable — try again in a moment."
          onRetry={profile.reload}
        />
      </Container>
    );
  }

  if (!person) {
    return (
      <Container className="py-20">
        <EmptyState
          title="Profile not configured yet"
          description="The site owner has not published a profile. Public work and contact are still available."
          action={
            <Link to="/work" className={buttonStyles("secondary", "sm")}>
              See the work index
            </Link>
          }
        />
      </Container>
    );
  }

  const featured = projects.data?.items ?? [];
  const timelineEntries = timeline.data ?? [];
  const leadershipEntries = leadership.data ?? [];
  const hasInterests = Boolean(person.personal_interests?.trim());

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "About"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              {person.display_name}.{" "}
              <span className="display-serif text-signal">
                {person.professional_title ?? "Building systems."}
              </span>
            </>
          )
        }
        description={
          page?.description ||
          person.short_bio ||
          "A short professional introduction. The longer story, working approach, and current direction are below."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Base</span>
              <span className="text-right text-paper">{person.location || "Not listed"}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Availability</span>
              <span className="text-right text-paper">
                {person.availability || "Not listed"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Current focus</span>
              <Link to="/now" className="text-paper underline decoration-line underline-offset-4 hover:text-signal">
                Now
              </Link>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.55fr)_20rem] lg:gap-20">
          <div>
            <section aria-labelledby="story-heading">
              <Eyebrow>The longer story</Eyebrow>
              <h2
                id="story-heading"
                className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl"
              >
                More than a stack.
              </h2>
              <div className="mt-6">
                {person.long_bio?.trim() ? (
                  <Paragraphs value={person.long_bio} />
                ) : (
                  <p className="max-w-xl text-sm leading-relaxed text-muted">
                    The longer biography has not been written yet. The short introduction above is
                    the confirmed profile copy.
                  </p>
                )}
              </div>
              {person.is_placeholder ? (
                <div className="mt-6 flex items-start gap-3 border border-signal/25 bg-signal/5 p-4">
                  <Badge tone="placeholder">Placeholder</Badge>
                  <p className="text-xs leading-relaxed text-paper-dim">
                    Some profile copy is still a placeholder. Confirmed details replace it from the
                    admin panel; nothing here is invented.
                  </p>
                </div>
              ) : null}
            </section>

            <div className="mt-12 space-y-12">
              <NarrativeSection
                id="build-heading"
                eyebrow="What I build"
                title="Products, systems, and analyses."
                body={person.what_i_build ?? ""}
                placeholder="No summary of the work has been published yet. The work index and Data Lab carry the actual records."
              />
              <NarrativeSection
                id="work-heading"
                eyebrow="How I work"
                title="Method over improvisation."
                body={person.how_i_work ?? ""}
                placeholder="The working approach has not been written yet. Case studies and project records show the process in detail."
              />
              <NarrativeSection
                id="direction-heading"
                eyebrow="Current direction"
                title="Where the work is heading."
                body={person.current_direction ?? ""}
                placeholder="The current direction has not been published. The Now page holds the live snapshot instead."
              />
            </div>

            {hasInterests ? (
              <section className="mt-12 border-t border-line pt-10" aria-labelledby="interests-heading">
                <Eyebrow>Beyond work</Eyebrow>
                <h2
                  id="interests-heading"
                  className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl"
                >
                  Genuine interests.
                </h2>
                <div className="mt-6 max-w-2xl border-l border-signal pl-5">
                  <Paragraphs value={person.personal_interests ?? ""} />
                </div>
              </section>
            ) : null}
          </div>

          <aside className="h-fit space-y-6 lg:sticky lg:top-24">
            <figure className="group border border-line">
              <PortfolioImage
                assetId={person.profile_image ? undefined : "profile.portrait.square"}
                src={person.profile_image ?? undefined}
                aspect="square"
                sizes="(max-width: 1024px) 40vw, 320px"
                imageClassName="grayscale-[0.25] transition-transform duration-700 ease-out group-hover:scale-[1.02]"
              />
              <figcaption className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
                <span className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
                  {person.name || person.display_name}
                </span>
                <span className="type-meta text-faint">{person.location || "Ghana"}</span>
              </figcaption>
            </figure>

            <div className="border border-line bg-ink-800/40">
              <div className="border-b border-line px-5 py-3">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted">
                  Profile record
                </p>
              </div>
              <dl className="divide-y divide-line">
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Role
                  </dt>
                  <dd className="text-right text-sm text-paper">
                    {person.professional_title || "Not listed"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Email
                  </dt>
                  <dd className="max-w-[12rem] break-words text-right text-sm text-paper">
                    {person.email ? (
                      <a
                        href={`mailto:${person.email}`}
                        className="underline decoration-line underline-offset-4 hover:text-signal"
                      >
                        {person.email}
                      </a>
                    ) : (
                      "Not published"
                    )}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Resume
                  </dt>
                  <dd className="text-right text-sm text-paper">
                    {person.current_resume ? "Available" : "Not published"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4 px-5 py-4">
                  <dt className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-muted">
                    Profile updated
                  </dt>
                  <dd className="text-right text-sm text-paper">
                    {new Date(person.updated_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                    })}
                  </dd>
                </div>
              </dl>
            </div>

            {person.current_resume ? (
              <a
                href={person.current_resume.download_url}
                className={buttonStyles("primary", "md", "w-full")}
                download
              >
                <Download className="size-4" aria-hidden="true" />
                Download resume
              </a>
            ) : null}

            <div className="space-y-3 border border-line p-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                Go deeper
              </p>
              {[
                { label: "Work index", to: "/work" },
                { label: "Data Lab", to: "/data-lab" },
                { label: "Build Lab", to: "/build-lab" },
                { label: "Leadership", to: "/leadership" },
                { label: "Experience", to: "/experience" },
                { label: "Resume", to: "/resume" },
                { label: "Timeline", to: "/timeline" },
              ].map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="flex items-center justify-between gap-3 text-sm text-paper-dim transition-colors hover:text-paper"
                >
                  {link.label}
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-20 border-t border-line pt-10" aria-labelledby="about-work-heading">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Eyebrow>Selected work</Eyebrow>
              <h2
                id="about-work-heading"
                className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl"
              >
                The work behind the profile.
              </h2>
            </div>
            <Link to="/work" className={buttonStyles("secondary", "sm")}>
              Full work index
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          {projects.loading ? (
            <p className="mt-6 text-sm text-muted">Loading selected work…</p>
          ) : null}
          {!projects.loading && projects.error ? (
            <div className="mt-6">
              <ErrorState
                message="Selected work could not be loaded. The rest of the profile is still available."
                onRetry={projects.reload}
              />
            </div>
          ) : null}
          {!projects.loading && !projects.error && featured.length === 0 ? (
            <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
              No featured projects are published yet. The{" "}
              <Link to="/work" className="text-paper underline decoration-line underline-offset-4">
                work index
              </Link>{" "}
              will list them once they are available.
            </p>
          ) : null}
          {featured.length > 0 ? (
            <ul className="mt-8 border-t border-line">
              {featured.map((project, index) => (
                <li key={project.id} className="border-b border-line">
                  <Link
                    to={`/work/${project.slug}`}
                    className="group grid gap-3 py-6 transition-colors hover:bg-surface/40 sm:grid-cols-[3rem_minmax(0,1fr)_10rem] sm:items-baseline sm:gap-6 sm:px-2"
                  >
                    <span className="font-mono text-[0.58rem] tracking-[0.16em] text-signal">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-xl font-medium tracking-tight text-paper transition-colors group-hover:text-signal-soft">
                        {project.title}
                      </h3>
                      {project.summary ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                          {project.summary}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2 sm:justify-end">
                      <Badge tone="muted">{project.category.name}</Badge>
                      {project.year ? <Badge tone="outline">{project.year}</Badge> : null}
                      <ArrowUpRight
                        className="size-3.5 text-muted transition-colors group-hover:text-paper"
                        aria-hidden="true"
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section
          className="mt-20 grid gap-8 border-t border-line pt-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:gap-16"
          aria-labelledby="record-heading"
        >
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <Eyebrow>Timeline</Eyebrow>
                <h2
                  id="record-heading"
                  className="mt-5 text-3xl font-medium tracking-tight text-paper sm:text-4xl"
                >
                  The chronology.
                </h2>
              </div>
              <Link to="/timeline" className={buttonStyles("secondary", "sm")}>
                Full timeline
                <ArrowUpRight className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-8">
              {timeline.loading ? (
                <p className="text-sm text-muted">Loading timeline…</p>
              ) : null}
              {!timeline.loading && timeline.error ? (
                <ErrorState
                  message="The timeline could not be loaded."
                  onRetry={timeline.reload}
                />
              ) : null}
              {!timeline.loading && !timeline.error ? (
                <Timeline
                  entries={timelineEntries.slice(0, 5)}
                  showFilters={false}
                  emptyTitle="Timeline entries are not published yet"
                  emptyDescription="Milestones appear once they are confirmed and published."
                />
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="border border-line bg-ink-800/40 p-6">
              <FileText className="size-4 text-signal" aria-hidden="true" />
              <p className="mt-4 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                Experience
              </p>
              <p className="mt-2 text-sm leading-relaxed text-paper-dim">
                The professional record is kept separate from this profile so roles and dates stay
                accurate.
              </p>
              <Link
                to="/experience"
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper hover:text-signal"
              >
                View experience
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            <div className="border border-line bg-ink-800/40 p-6">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                Leadership
              </p>
              <p className="mt-2 text-sm leading-relaxed text-paper-dim">
                {leadershipEntries.length > 0
                  ? `${leadershipEntries.length} published ${
                      leadershipEntries.length === 1 ? "entry" : "entries"
                    } with responsibility, contribution, and outcome.`
                  : "No leadership entries are published yet. The section stays open rather than padded with invented roles."}
              </p>
              <Link
                to="/leadership"
                className="mt-4 inline-flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper hover:text-signal"
              >
                View leadership
                <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
            </div>

            {person.current_resume ? (
              <div className="border border-line bg-ink-800/40 p-6">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
                  Managed resume
                </p>
                <p className="mt-2 text-sm text-paper">{person.current_resume.title}</p>
                <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-faint">
                  {person.current_resume.version_label} /{" "}
                  {formatFileSize(person.current_resume.file_size)} / PDF
                </p>
                <a
                  href={person.current_resume.download_url}
                  className={buttonStyles("secondary", "sm", "mt-4")}
                  download
                >
                  Download PDF
                  <Download className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-16 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            The current focus is maintained on the Now page, and the professional record is
            available as an online resume and a managed PDF.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/resume" className={buttonStyles("secondary", "sm")}>
              Online resume
              <FileText className="size-3.5" aria-hidden="true" />
            </Link>
            <Link to="/contact" className={buttonStyles("primary", "sm")}>
              Start a conversation
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
