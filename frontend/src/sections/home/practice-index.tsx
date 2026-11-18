import { ArrowUpRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";

import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import {
  useExperienceEntries,
  useLeadershipEntries,
  useProfile,
} from "@/hooks/useContent";

export function PracticeIndex() {
  const leadership = useLeadershipEntries();
  const experience = useExperienceEntries();
  const profile = useProfile();

  const entries = [
    {
      label: "Build Lab",
      to: "/build-lab",
      detail: "Smaller builds, prototypes, and technical experiments.",
      meta: "Experiments",
    },
    {
      label: "Leadership",
      to: "/leadership",
      detail: "Technical community and program work with stated outcomes.",
      meta: leadership.loading
        ? "—"
        : `${leadership.data?.length ?? 0} published`,
    },
    {
      label: "Experience",
      to: "/experience",
      detail: "The professional record, kept separate from the profile.",
      meta: experience.loading
        ? "—"
        : `${experience.data?.length ?? 0} roles`,
    },
    {
      label: "Resume",
      to: "/resume",
      detail: "The online record, plus a managed PDF when one is published.",
      meta: profile.loading
        ? "—"
        : profile.data?.current_resume
          ? "PDF available"
          : "Online record",
    },
  ];

  return (
    <section className="border-t border-line py-16 sm:py-20" aria-labelledby="practice-index-heading">
      <Container>
        <div className="flex flex-col gap-4 border-t border-line pt-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Eyebrow>Practice index</Eyebrow>
            <h2
              id="practice-index-heading"
              className="mt-4 text-2xl font-medium tracking-tight text-paper sm:text-3xl"
            >
              The rest of the record.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted">
            Every section draws from its own published records. Nothing here is a marketing
            summary.
          </p>
        </div>

        <div className="mt-7 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {entries.map((entry) => (
            <Link
              key={entry.to}
              to={entry.to}
              className="group flex flex-col justify-between bg-ink-900 p-5 transition-colors hover:bg-ink-800/60 sm:p-6"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[0.54rem] uppercase tracking-[0.14em] text-signal">
                  {entry.meta}
                </span>
                <ArrowUpRight
                  className="size-3.5 text-muted transition-colors group-hover:text-paper"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-8">
                <p className="flex items-center gap-2 text-lg font-medium text-paper">
                  {entry.label}
                  {entry.label === "Resume" ? (
                    <FileText className="size-3.5 text-muted" aria-hidden="true" />
                  ) : null}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{entry.detail}</p>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
