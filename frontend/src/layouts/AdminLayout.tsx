import {
  ArrowUpRight,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  NavLink,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { useSeo } from "@/hooks/useSeo";
import { apiRequest } from "@/services/api";
import type { Admin } from "@/types/api";
import { cn } from "@/utils/cn";

const ADMIN_NAV = [
  { label: "Dashboard", to: "/admin", end: true, icon: LayoutDashboard },
  { label: "Projects", to: "/admin/projects", end: false, icon: FileText },
  { label: "Case studies", to: "/admin/case-studies", end: false, icon: FileText },
  { label: "Data Lab", to: "/admin/data", end: false, icon: FlaskConical },
];

function RequireAdmin() {
  const location = useLocation();
  const auth = useApiResource<Admin>("/api/v1/auth/me");

  if (auth.loading) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24">
        <LoadingState label="Checking administrator session" rows={2} />
      </div>
    );
  }

  if (!auth.data) {
    if (auth.error && auth.error.status !== 401 && auth.error.status !== 403) {
      return (
        <div className="mx-auto max-w-2xl px-5 py-24">
          <ErrorState message={auth.error.detail} onRetry={auth.reload} />
        </div>
      );
    }
    return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet context={auth.data} />;
}

export function AdminLayout() {
  const admin = useOutletContext<Admin | undefined>();
  const navigate = useNavigate();

  useSeo({
    title: "Admin — Phill",
    description: "Private portfolio administration.",
    noIndex: true,
  });

  const signOut = async () => {
    try {
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
    } finally {
      navigate("/admin/login", { replace: true });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <header className="border-b border-line">
        <Container className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-center gap-2.5">
              <span className="text-base font-semibold tracking-[-0.02em] text-paper">PHILL</span>
              <span className="size-1.5 bg-signal" aria-hidden="true" />
              <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted">
                Admin
              </span>
            </Link>
            <span className="hidden h-4 w-px bg-line-strong sm:block" aria-hidden="true" />
            <span className="hidden items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted sm:inline-flex">
              <ShieldCheck className="size-3" aria-hidden="true" />
              Private area
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="hidden font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted transition-colors hover:text-paper sm:inline-flex"
            >
              View site
              <ArrowUpRight className="ml-1.5 size-3.5" aria-hidden="true" />
            </Link>
            <span className="hidden max-w-48 truncate text-xs text-muted lg:block">
              {admin?.email}
            </span>
            <button type="button" onClick={signOut} className={buttonStyles("secondary", "sm")}>
              <LogOut className="size-3.5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </Container>
      </header>

      <main className="flex-1">
        <Container className="py-8 sm:py-12">
          <nav aria-label="Admin sections" className="mb-8 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-line pb-4">
            <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-faint">
              Workspace
            </span>
            {ADMIN_NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] transition-colors",
                    isActive ? "text-paper" : "text-muted hover:text-paper",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={cn("size-1", isActive ? "bg-signal" : "bg-transparent")}
                      aria-hidden="true"
                    />
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
            <Link
              to="/work"
              className="ml-auto inline-flex items-center gap-1.5 font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted hover:text-paper"
            >
              Public work
              <ArrowUpRight className="size-3" aria-hidden="true" />
            </Link>
          </nav>
          <Outlet />
        </Container>
      </main>
    </div>
  );
}

export function AdminRoute() {
  return <RequireAdmin />;
}
