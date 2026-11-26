import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Eyebrow } from "@/components/ui/eyebrow";
import { useSeo } from "@/hooks/useSeo";

export default function NotFoundPage() {
  useSeo({
    title: "Page not found | Philemon Melabah",
    description: "The requested page could not be found.",
    noIndex: true,
  });

  return (
    <Container className="flex min-h-[60vh] flex-col justify-center py-20">
      <Eyebrow>404</Eyebrow>
      <p className="mt-8 text-[clamp(6rem,20vw,16rem)] font-medium leading-none tracking-[-0.06em] text-ink-700">
        404
      </p>
      <h1 className="mt-4 max-w-2xl text-3xl font-medium tracking-tight text-paper sm:text-4xl">
        This page does not exist.
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
        Check the address, or go back to the projects page to keep browsing.
      </p>
      <div className="mt-8 flex flex-wrap gap-2">
        <Link to="/work" className={buttonStyles("primary", "md")}>
          Browse projects
          <ArrowUpRight className="size-4" aria-hidden="true" />
        </Link>
        <Link to="/" className={buttonStyles("secondary", "md")}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back home
        </Link>
      </div>
    </Container>
  );
}
