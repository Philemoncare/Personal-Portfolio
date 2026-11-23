import { Container } from "@/components/ui/container";
import { cn } from "@/utils/cn";

export function InfoStrip({
  location,
  availability,
}: {
  location: string | null;
  availability: string | null;
}) {
  const items = [
    { label: "Based in", value: location || "Not listed" },
    { label: "Focus", value: "Full-stack development" },
    { label: "Also", value: "Data and analytics" },
    {
      label: "Availability",
      value: availability || "Open to collaboration",
      accent: true,
    },
  ];

  return (
    <div className="border-t border-line bg-background">
      <Container>
        <dl className="grid grid-cols-2 divide-x divide-line lg:grid-cols-4">
          {items.map((item, index) => (
            <div
              key={item.label}
              className={cn(
                "flex flex-col gap-2 px-4 py-4 first:pl-0 sm:px-6 lg:px-8",
                index === 0 && "pl-0",
                index % 2 === 0 && "border-b border-line lg:border-b-0",
              )}
            >
              <dt className="type-meta text-faint">{item.label}</dt>
              <dd
                className={cn(
                  "flex items-start gap-2 text-[0.7rem] font-medium uppercase tracking-[0.12em] text-paper-dim",
                  item.accent && "text-paper",
                )}
              >
                {item.accent ? (
                  <span
                    className="mt-[0.28em] size-1.5 shrink-0 bg-signal"
                    aria-hidden="true"
                  />
                ) : null}
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </Container>
    </div>
  );
}
