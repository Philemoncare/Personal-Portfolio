import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { WorkMode } from "@/features/work-mode/WorkMode";
import { useAllProjects, useLeadershipEntries } from "@/hooks/useContent";

export function WorkModeSection() {
  const projects = useAllProjects();
  const leadership = useLeadershipEntries();

  return (
    <section
      className="border-t border-line py-20 sm:py-28"
      aria-labelledby="how-i-work-heading"
    >
      <Container>
        <SectionHeader
          index="02"
          eyebrow="How I work"
          title={
            <span id="how-i-work-heading">
              Four modes.{" "}
              <span className="display-serif text-signal">One practice.</span>
            </span>
          }
          description="Choose the lens that matches what you need to evaluate — engineering, analysis, leadership, or experimentation. The panel changes without reloading the page."
        />

        <WorkMode
          projects={projects.data?.items ?? []}
          leadership={leadership.data ?? []}
          loading={projects.loading || leadership.loading}
          error={projects.error?.detail ?? leadership.error?.detail ?? null}
          onRetry={() => {
            projects.reload();
            leadership.reload();
          }}
        />
      </Container>
    </section>
  );
}
