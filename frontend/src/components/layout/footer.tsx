import { ArrowUpRight, Camera, Code2, Globe, Link2, Mail, MessageCircle, Phone } from "lucide-react";
import { Link } from "react-router-dom";

import { useSocialLinks } from "@/app/ContentProvider";
import { useSiteSettings } from "@/app/SiteSettingsProvider";
import { Wordmark } from "@/components/brand/wordmark";
import { Container } from "@/components/ui/container";
import { useProfile } from "@/hooks/useContent";

const INDEX_LINKS = [
  { label: "Work", to: "/work" },
  { label: "Data Lab", to: "/data-lab" },
  { label: "Build Lab", to: "/build-lab" },
  { label: "Leadership", to: "/leadership" },
  { label: "Experience", to: "/experience" },
  { label: "Articles", to: "/articles" },
  { label: "About", to: "/about" },
  { label: "Now", to: "/now" },
  { label: "Timeline", to: "/timeline" },
  { label: "Resume", to: "/resume" },
  { label: "Contact", to: "/contact" },
  { label: "Arcade 🎮", to: "/arcade" },
];

function profileRoles(title: string | null | undefined): string[] {
  if (!title) return [];
  return title
    .split(/[·/|,]/)
    .map((role) => role.trim())
    .filter(Boolean);
}

function socialIcon(platform: string) {
  switch (platform) {
    case "github":
      return Code2;
    case "linkedin":
      return Link2;
    case "email":
      return Mail;
    case "phone":
      return Phone;
    case "whatsapp":
      return MessageCircle;
    case "instagram":
      return Camera;
    default:
      return Globe;
  }
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function Footer() {
  const { settings } = useSiteSettings();
  const profile = useProfile();
  const socialLinks = useSocialLinks();
  const year = new Date().getFullYear();
  const displayName = profile.data?.display_name || settings?.display_name || "Philemon Melabah";
  const roles =
    profileRoles(profile.data?.professional_title).length > 0
      ? profileRoles(profile.data?.professional_title)
      : profileRoles(settings?.role_title);

  const configured = socialLinks
    .filter((link) => link.is_visible)
    .map((link) => ({
      label: link.handle ? `${link.label} · ${link.handle}` : link.label,
      icon: socialIcon(link.platform),
      href: link.url,
      external: isHttpUrl(link.url),
    }));

  const fallback = [
    {
      label: "Email",
      icon: Mail,
      href: profile.data?.email
        ? `mailto:${profile.data.email}`
        : settings?.email
          ? `mailto:${settings.email}`
          : null,
      external: false,
    },
    {
      label: "GitHub",
      icon: Code2,
      href: profile.data?.github_url ?? settings?.github_url ?? null,
      external: true,
    },
    {
      label: "LinkedIn",
      icon: Link2,
      href: profile.data?.linkedin_url ?? settings?.linkedin_url ?? null,
      external: true,
    },
  ].filter((social): social is typeof social & { href: string } => Boolean(social.href));

  const socials = configured.length > 0 ? configured : fallback;

  return (
    <footer className="mt-24 border-t border-line sm:mt-32">
      <Container className="py-12 sm:py-16">
        <div className="grid gap-12 lg:grid-cols-[1.35fr_0.8fr_0.9fr] lg:gap-16">
          <div>
            <Wordmark />

            <ul className="mt-7 space-y-1.5">
              {roles.map((role) => (
                <li
                  key={role}
                  className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted"
                >
                  {role}
                </li>
              ))}
            </ul>

            <p className="mt-7 max-w-sm text-pretty text-sm leading-relaxed text-muted">
              {settings?.footer_text ||
                "Software, data work and the systems behind them."}
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="type-meta text-muted">Pages</p>
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
            <p className="type-meta text-muted">Links</p>
            <ul className="mt-5 space-y-3 text-sm">
              {socials.map((social) => (
                <li key={social.label}>
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
                </li>
              ))}
              <li>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 text-paper-dim transition-colors hover:text-paper"
                >
                  Get in touch
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
                    Download resume
                  </a>
                </li>
              ) : (
                <li>
                  <Link
                    to="/resume"
                    className="inline-flex items-center gap-2 text-paper-dim transition-colors hover:text-paper"
                  >
                    Resume
                  </Link>
                </li>
              )}
            </ul>

            {socials.length === 0 ? (
              <p className="mt-5 max-w-xs text-xs leading-relaxed text-muted">
                No public social links yet. Use the contact form to get in touch.
              </p>
            ) : null}
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-line pt-6 font-mono text-[0.58rem] uppercase tracking-[0.15em] text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>{settings?.copyright_text || `© ${year} ${displayName}`}</p>
          <p>Software, data and technical projects</p>
        </div>
      </Container>
    </footer>
  );
}
