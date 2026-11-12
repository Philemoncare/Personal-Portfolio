import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";

export function PageIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="border-b border-line">
      <Container className="py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:gap-16">
          <div>
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="mt-6 max-w-4xl text-balance text-[clamp(2.8rem,6.5vw,6rem)] font-medium leading-[0.93] tracking-[-0.045em] text-paper">
              {title}
            </h1>
            {description ? (
              <p className="mt-6 max-w-2xl text-pretty text-base leading-relaxed text-paper-dim">
                {description}
              </p>
            ) : null}
          </div>
          {aside ? <div className="lg:pb-1">{aside}</div> : null}
        </div>
      </Container>
    </section>
  );
}
