import { ArrowUpRight, Code2, Link2, Mail } from "lucide-react";
import { Link } from "react-router-dom";

import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui/container";

const INDEX_LINKS = [
  { label: "Work", to: "/work" },
  { label: "Data Lab", to: "/data-lab" },
  { label: "Build Lab", to: "/build-lab" },
  { label: "Leadership", to: "/leadership" },
  { label: "About", to: "/about" },
  { label: "Now", to: "/now" },
  { label: "Contact", to: "/contact" },
];

const ROLE_AREAS = ["Full-Stack Developer", "Data & Analytics", "Technology Builder"];

export function Footer() {
  const { settings } = useSiteSettings();
  const year = new Date().getFullYear();

  const socials = [
    {
      label: "Email",
      icon: Mail,
      href: settings?.email ? `mailto:${settings.email}` : null,
      external: false,
    },
    {
      label: "GitHub",
      icon: Code2,
      href: settings?.github_url ?? null,
      external: true,
    },
    {
      label: "LinkedIn",
      icon: Link2,
      href: settings?.linkedin_url ?? null,
      external: true,
    },
  ];

  return (
    <footer className="mt-24 border-t border-line sm:mt-32">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.8fr_0.9fr] lg:gap-16">
          <div>
            <Wordmark />

            <ul className="mt-7 space-y-1.5">
              {ROLE_AREAS.map((role) => (
                <li
                  key={role}
                  className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted"
                >
                  {role}
                </li>
              ))}
            </ul>

            <p className="mt-7 max-w-sm text-pretty text-sm leading-relaxed text-muted">
              A personal technology practice: software products, data work, and the systems that
              connect them.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="type-meta text-faint">Index</p>
            <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
              {INDEX_LINKS.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-paper-dim transition-colors hover:text-paper"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="type-meta text-faint">Elsewhere</p>
            <ul className="mt-5 space-y-3 text-sm">
              {socials.map((social) => (
                <li key={social.label}>
                  {social.href ? (
                    <a
                      href={social.href}
                      {...(social.external
                        ? { target: "_blank", rel: "noreferrer noopener" }
                        : {})}
                      className="inline-flex items-center gap-2 text-paper-dim transition-colors hover:text-paper"
                    >
                      <social.icon className="size-3.5" aria-hidden="true" />
                      {social.label}
                      {social.external ? (
                        <ArrowUpRight className="size-3" aria-hidden="true" />
                      ) : null}
                    </a>
                  ) : (
                    <span className="flex items-center justify-between gap-4 text-muted">
                      <span className="inline-flex items-center gap-2">
                        <social.icon className="size-3.5" aria-hidden="true" />
                        {social.label}
                      </span>
                      <span className="type-meta text-faint">Not linked</span>
                    </span>
                  )}
                </li>
              ))}
              <li>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 text-paper-dim transition-colors hover:text-paper"
                >
                  Start a conversation
                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </li>
              {settings?.cv_url ? (
                <li>
                  <a
                    href={settings.cv_url}
                    className="inline-flex items-center gap-2 text-paper-dim transition-colors hover:text-paper"
                    download
                  >
                    Download CV
                  </a>
                </li>
              ) : (
                <li className="flex items-center justify-between gap-4 text-muted">
                  <span>CV</span>
                  <span className="type-meta text-faint">Pending upload</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 font-mono text-[0.58rem] uppercase tracking-[0.15em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Philemon Melabah</p>
          <p>React / TypeScript / FastAPI / SQLAlchemy</p>
        </div>
      </Container>
    </footer>
  );
}
