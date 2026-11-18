import {
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CalendarClock,
  ChevronRight,
  FileDown,
  FileText,
  FlaskConical,
  FolderGit2,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Palette,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";

import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { useAuth } from "@/auth/useAuth";
import { buttonStyles } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useSeo } from "@/hooks/useSeo";
import type { Admin } from "@/types/api";
import { cn } from "@/utils/cn";

const ADMIN_NAV = [
  {
    group: "Main",
    items: [{ label: "Dashboard", to: "/admin", end: true, icon: LayoutDashboard }],
  },
  {
    group: "Content",
    items: [
      { label: "Projects", to: "/admin/projects", end: false, icon: FolderGit2 },
      { label: "Case studies", to: "/admin/case-studies", end: false, icon: BookOpen },
      { label: "Data Lab", to: "/admin/data", end: false, icon: FlaskConical },
      { label: "Leadership", to: "/admin/leadership", end: false, icon: Users },
      { label: "Experience", to: "/admin/experience", end: false, icon: Briefcase },
      { label: "Timeline", to: "/admin/timeline", end: false, icon: CalendarClock },
      { label: "Now", to: "/admin/now", end: false, icon: Sparkles },
      { label: "Articles", to: "/admin/pages", end: false, icon: FileText },
    ],
  },
  {
    group: "Media",
    items: [{ label: "Media Library", to: "/admin/media", end: false, icon: ImageIcon }],
  },
  {
    group: "Communication",
    items: [
      { label: "Messages", to: "/admin/messages", end: false, icon: Mail },
      { label: "Social Channels", to: "/admin/social-links", end: false, icon: Share2 },
    ],
  },
  {
    group: "Security",
    items: [
      { label: "Profile", to: "/admin/profile", end: false, icon: User },
      { label: "Security", to: "/admin/security", end: false, icon: KeyRound },
      { label: "Sessions", to: "/admin/security/sessions", end: false, icon: ShieldCheck },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Settings", to: "/admin/settings", end: false, icon: Settings },
      { label: "Appearance", to: "/admin/appearance", end: false, icon: Palette },
      { label: "Resume", to: "/admin/resume", end: false, icon: FileDown },
      { label: "Account", to: "/admin/account", end: false, icon: UserCog },
    ],
  },
];

function RequireAdmin() {
  return <ProtectedRoute />;
}

export function AdminLayout() {
  const admin = useOutletContext<Admin | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut: endSession } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useSeo({
    title: "Admin — Phill",
    description: "Private portfolio administration.",
    noIndex: true,
  });

  const signOut = async () => {
    try {
      await endSession();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  // Determine current section label for breadcrumb
  let activeLabel = "Dashboard";
  for (const group of ADMIN_NAV) {
    for (const item of group.items) {
      if (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)) {
        activeLabel = item.label;
      }
    }
  }

  const renderNav = () => (
    <nav aria-label="Admin navigation" className="space-y-6">
      {ADMIN_NAV.map((group) => (
        <div key={group.group}>
          <p className="px-3 mb-2 font-mono text-[0.52rem] uppercase tracking-[0.2em] text-faint">
            {group.group}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-2.5 px-3 py-2 text-xs transition-colors rounded-none font-sans",
                        isActive
                          ? "bg-surface-raised font-medium text-paper border-l-2 border-l-signal"
                          : "text-paper-dim hover:bg-surface-hover hover:text-paper",
                      )
                    }
                  >
                    <Icon className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface flex-col justify-between lg:flex">
        <div className="p-5 overflow-y-auto max-h-screen sticky top-0">
          <Link to="/admin" className="flex items-center gap-2.5 px-3 mb-6">
            <span className="text-base font-semibold tracking-[-0.02em] text-paper">PHILL</span>
            <span className="size-1.5 bg-signal" aria-hidden="true" />
            <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
              Control Center
            </span>
          </Link>

          {renderNav()}
        </div>

        <div className="p-4 border-t border-line bg-surface-raised/40 sticky bottom-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-paper">
                {admin?.full_name || admin?.email || "Administrator"}
              </p>
              <p className="font-mono text-[0.54rem] uppercase tracking-[0.12em] text-muted">
                Private Access
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-line bg-surface/90 backdrop-blur-md px-4 sm:px-8">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex size-9 items-center justify-center border border-line text-paper lg:hidden"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-4" /> : <Menu className="size-4" />}
            </button>

            <div className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
              <Link to="/admin" className="hover:text-paper">
                Admin
              </Link>
              <ChevronRight className="size-3 text-faint" />
              <span className="text-paper font-medium truncate">{activeLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper"
            >
              View Site
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>

            <div className="hidden lg:block">
              <ThemeToggle />
            </div>

            <button
              type="button"
              onClick={signOut}
              className={buttonStyles("secondary", "sm")}
            >
              <LogOut className="size-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen ? (
          <div className="fixed inset-0 top-16 z-40 bg-background/95 backdrop-blur-md p-6 overflow-y-auto lg:hidden">
            {renderNav()}
            <div className="mt-8 border-t border-line pt-6 flex items-center justify-between">
              <ThemeToggle />
              <Link
                to="/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.14em] text-paper"
              >
                View Site
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>
        ) : null}

        {/* Page Container */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 max-w-[1440px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function AdminRoute() {
  return <RequireAdmin />;
}
