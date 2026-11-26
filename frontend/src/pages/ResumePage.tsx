import { ArrowUpRight, Download, FileText, Printer } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { PageIntro } from "@/components/layout/PageIntro";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { ErrorState } from "@/components/ui/states";
import { PageSkeleton } from "@/components/ui/skeletons";
import {
  useFeaturedProjects,
  useLeadershipEntries,
  useProfile,
} from "@/hooks/useContent";
import { useApiResource } from "@/hooks/useApiResource";
import { usePageContent, usePageSeo } from "@/app/ContentProvider";
import type { Certificate, ExperienceEntry, SkillGroup } from "@/types/api";
import { formatDate, formatRange } from "@/utils/format";
import { formatFileSize } from "@/utils/identity";

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-14 border-t border-line pt-9" aria-labelledby={id}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="mt-4 text-2xl font-medium tracking-tight text-paper sm:text-3xl">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="max-w-2xl text-sm leading-relaxed text-muted">{children}</p>;
}

export default function ResumePage() {
  const profile = useProfile();
  const experience = useApiResource<ExperienceEntry[]>("/api/v1/experience");
  const leadership = useLeadershipEntries();
  const projects = useFeaturedProjects(4);
  const skills = useApiResource<SkillGroup[]>("/api/v1/skills");
  const certificates = useApiResource<Certificate[]>("/api/v1/certificates");

  const person = profile.data;
  const resume = person?.current_resume ?? null;
  const page = usePageContent("resume");

  usePageSeo("resume", {
    title: person ? `Resume | ${person.display_name}` : "Resume | Philemon Melabah",
    description:
      person?.short_bio ||
      "Experience, selected projects, leadership, skills and certificates, plus a PDF version when available.",
    path: "/resume",
  });

  if (profile.loading && !person) {
    return <PageSkeleton label="Loading resume" />;
  }

  if (profile.error && !person) {
    return (
      <Container className="py-20">
        <ErrorState
          message="We couldn't load the resume. Please try again in a moment."
          onRetry={profile.reload}
        />
      </Container>
    );
  }

  const experienceEntries = experience.data ?? [];
  const leadershipEntries = leadership.data ?? [];
  const projectEntries = projects.data?.items ?? [];
  const skillGroups = skills.data ?? [];
  const certificateEntries = certificates.data ?? [];

  return (
    <>
      <PageIntro
        eyebrow={page?.eyebrow || "Resume"}
        title={
          page?.title ? (
            page.title
          ) : (
            <>
              Experience, projects{" "}
              <span className="display-serif text-signal">and skills.</span>
            </>
          )
        }
        description={
          page?.description ||
          "An online resume built from the same information used across this site. A PDF version is available when it has been uploaded."
        }
        aside={
          <div className="border-t border-line pt-4 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
            <div className="flex items-center justify-between gap-6">
              <span>Name</span>
              <span className="text-right text-paper">{person?.display_name ?? "Not listed"}</span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>Role</span>
              <span className="text-right text-paper">
                {person?.professional_title ?? "Not listed"}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between gap-6">
              <span>PDF</span>
              <span className="text-right text-paper">
                {profile.loading && !person ? "..." : resume ? "Available" : "Not uploaded"}
              </span>
            </div>
          </div>
        }
      />

      <Container className="py-12 sm:py-16">
        <div className="flex flex-col gap-4 border border-line bg-ink-800/40 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted">
              PDF resume
            </p>
            {resume ? (
              <>
                <p className="mt-2 text-base font-medium text-paper">{resume.title}</p>
                <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.12em] text-faint">
                  {resume.version_label} / {formatFileSize(resume.file_size)} /{" "}
                  {resume.published_at ? `Published ${formatDate(resume.published_at)}` : "Published"}
                </p>
              </>
            ) : (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-paper-dim">
                No PDF has been uploaded yet. The online resume below is still available.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {resume ? (
              <a href={resume.download_url} className={buttonStyles("primary", "md")} download>
                <Download className="size-4" aria-hidden="true" />
                Download PDF
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => window.print()}
              className={buttonStyles("secondary", "md")}
            >
              <Printer className="size-4" aria-hidden="true" />
              Print this page
            </button>
          </div>
        </div>

        {profile.error ? (
          <div className="mt-8">
            <ErrorState
              message="We couldn't refresh the profile. The last loaded details are still shown."
              onRetry={profile.reload}
            />
          </div>
        ) : null}

        <div className="mt-10 max-w-3xl">
          <p className="text-2xl font-medium tracking-tight text-paper sm:text-3xl">
            {person?.name ?? "Profile"}
          </p>
          <p className="mt-1 text-sm text-signal-soft">
            {person?.professional_title ?? "Role not listed"}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[0.56rem] uppercase tracking-[0.13em] text-muted">
            {person?.location ? <span>{person.location}</span> : null}
            {person?.email ? (
              <a
                href={`mailto:${person.email}`}
                className="underline decoration-line underline-offset-4 hover:text-paper"
              >
                {person.email}
              </a>
            ) : null}
            {person?.website_url ? (
              <a
                href={person.website_url}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-paper"
              >
                Website
              </a>
            ) : null}
            {person?.github_url ? (
              <a
                href={person.github_url}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-paper"
              >
                GitHub
              </a>
            ) : null}
            {person?.linkedin_url ? (
              <a
                href={person.linkedin_url}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-paper"
              >
                LinkedIn
              </a>
            ) : null}
          </div>
          {person?.short_bio ? (
            <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-paper-dim">
              {person.short_bio}
            </p>
          ) : null}
          {!person ? (
            <p className="mt-4 text-sm text-muted">
              The profile has not been added yet, so this header is limited to the resume.
            </p>
          ) : null}
        </div>

        <Section id="resume-experience" eyebrow="Experience" title="Where I have worked">
          {experience.loading ? <p className="text-sm text-muted">Loading experience...</p> : null}
          {!experience.loading && experience.error ? (
            <ErrorState message="We couldn't load the experience." onRetry={experience.reload} />
          ) : null}
          {!experience.loading && !experience.error && experienceEntries.length === 0 ? (
            <EmptyLine>
              No experience has been added yet.
            </EmptyLine>
          ) : null}
          {experienceEntries.length > 0 ? (
            <ol>
              {experienceEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-t border-line py-5 first:border-t-0 first:pt-0"
                >
                  <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
                    <div>
                      <p className="font-mono text-[0.56rem] uppercase tracking-[0.13em] text-muted">
                        {formatRange(entry.started_on, entry.ended_on, entry.is_current)}
                      </p>
                      {entry.location ? (
                        <p className="mt-1 text-xs text-faint">{entry.location}</p>
                      ) : null}
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-paper">{entry.title}</h3>
                      <p className="mt-0.5 text-sm text-signal-soft">{entry.organization}</p>
                      {entry.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                          {entry.description}
                        </p>
                      ) : null}
                      {entry.slug ? (
                        <Link
                          to={`/experience/${entry.slug}`}
                          className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.54rem] uppercase tracking-[0.13em] text-paper-dim hover:text-paper"
                        >
                          Read more
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </Section>

        <Section id="resume-projects" eyebrow="Projects" title="Selected projects">
          {projects.loading ? <p className="text-sm text-muted">Loading projects...</p> : null}
          {!projects.loading && projects.error ? (
            <ErrorState message="We couldn't load the projects." onRetry={projects.reload} />
          ) : null}
          {!projects.loading && !projects.error && projectEntries.length === 0 ? (
            <EmptyLine>No featured projects yet.</EmptyLine>
          ) : null}
          {projectEntries.length > 0 ? (
            <ul className="border-t border-line">
              {projectEntries.map((project) => (
                <li key={project.id} className="border-b border-line py-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <div>
                      <Link
                        to={`/work/${project.slug}`}
                        className="text-base font-medium text-paper hover:text-signal-soft"
                      >
                        {project.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                        {project.category.name}
                        {project.year ? ` / ${project.year}` : ""}
                      </p>
                    </div>
                    {project.summary ? (
                      <p className="max-w-xl text-sm leading-relaxed text-muted">
                        {project.summary}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <Section id="resume-leadership" eyebrow="Leadership" title="Roles and community work">
          {leadership.loading ? <p className="text-sm text-muted">Loading leadership...</p> : null}
          {!leadership.loading && leadership.error ? (
            <ErrorState message="We couldn't load the leadership entries." onRetry={leadership.reload} />
          ) : null}
          {!leadership.loading && !leadership.error && leadershipEntries.length === 0 ? (
            <EmptyLine>No leadership entries yet.</EmptyLine>
          ) : null}
          {leadershipEntries.length > 0 ? (
            <ol>
              {leadershipEntries.map((entry) => (
                <li
                  key={entry.id}
                  className="border-t border-line py-5 first:border-t-0 first:pt-0"
                >
                  <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-8">
                    <div>
                      <p className="font-mono text-[0.56rem] uppercase tracking-[0.13em] text-muted">
                        {formatRange(entry.started_on, entry.ended_on)}
                      </p>
                      <p className="mt-1 text-xs text-faint">{entry.organization}</p>
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-paper">{entry.title}</h3>
                      {entry.description ? (
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
                          {entry.description}
                        </p>
                      ) : null}
                      {entry.outcome ? (
                        <p className="mt-2 max-w-2xl border-l border-signal pl-3 text-sm leading-relaxed text-paper-dim">
                          {entry.outcome}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          ) : null}
        </Section>

        <Section id="resume-skills" eyebrow="Skills" title="Tools and skills">
          {skills.loading ? <p className="text-sm text-muted">Loading skills...</p> : null}
          {!skills.loading && skills.error ? (
            <ErrorState message="We couldn't load the skills." onRetry={skills.reload} />
          ) : null}
          {!skills.loading && !skills.error && skillGroups.length === 0 ? (
            <EmptyLine>No skills have been added yet.</EmptyLine>
          ) : null}
          {skillGroups.length > 0 ? (
            <dl className="grid gap-px border border-line bg-line sm:grid-cols-2">
              {skillGroups.map((group) => (
                <div key={group.id} className="bg-ink-900 p-5">
                  <dt className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
                    {group.name}
                  </dt>
                  <dd className="mt-3 flex flex-wrap gap-1.5">
                    {group.skills.map((skill) => (
                      <span
                        key={skill.id}
                        className="border border-line px-2 py-1 text-sm text-paper-dim"
                      >
                        {skill.name}
                        {skill.proficiency_label ? (
                          <span className="ml-1.5 text-[0.6rem] text-faint">
                            {skill.proficiency_label}
                          </span>
                        ) : null}
                      </span>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Section>

        <Section id="resume-certificates" eyebrow="Certificates" title="Certificates">
          {certificates.loading ? <p className="text-sm text-muted">Loading certificates...</p> : null}
          {!certificates.loading && certificates.error ? (
            <ErrorState message="We couldn't load the certificates." onRetry={certificates.reload} />
          ) : null}
          {!certificates.loading && !certificates.error && certificateEntries.length === 0 ? (
            <EmptyLine>No certificates yet.</EmptyLine>
          ) : null}
          {certificateEntries.length > 0 ? (
            <ul className="grid gap-px border border-line bg-line sm:grid-cols-2">
              {certificateEntries.map((certificate) => (
                <li key={certificate.id} className="bg-ink-900 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-medium text-paper">{certificate.name}</h3>
                    {certificate.issued_on ? (
                      <Badge tone="muted">{formatDate(certificate.issued_on)}</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-muted">{certificate.issuer}</p>
                  {certificate.credential_url ? (
                    <a
                      href={certificate.credential_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1.5 font-mono text-[0.54rem] uppercase tracking-[0.13em] text-paper-dim hover:text-paper"
                    >
                      View credential
                      <ArrowUpRight className="size-3" aria-hidden="true" />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        <div className="mt-16 flex flex-col gap-5 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-sm leading-relaxed text-muted">
            Want to talk? Use the contact form to get in touch.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/contact" className={buttonStyles("primary", "sm")}>
              Contact
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
            <Link to="/experience" className={buttonStyles("secondary", "sm")}>
              <FileText className="size-3.5" aria-hidden="true" />
              Experience
            </Link>
          </div>
        </div>
      </Container>
    </>
  );
}
