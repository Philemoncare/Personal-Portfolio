import { ArrowUpRight, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";

import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiResource } from "@/hooks/useApiResource";
import { logout } from "@/services/auth.service";
import type { Admin } from "@/types/api";
import { formatDate } from "@/utils/format";

function maskPhone(value: string | null): string {
  if (!value) return "Not configured";
  if (value.length < 7) return "Configured";
  return `${value.slice(0, 3)}â€¢â€¢â€¢â€¢â€¢${value.slice(-3)}`;
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-4 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <dt className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">{label}</dt>
      <dd className="text-sm text-paper sm:text-right">{value}</dd>
    </div>
  );
}

export default function AdminAccountPage() {
  const contextAdmin = useOutletContext<Admin | undefined>();
  const navigate = useNavigate();
  const account = useApiResource<Admin>("/api/v1/auth/me");
  const admin = account.data ?? contextAdmin ?? null;

  if (account.loading && !admin) {
    return <LoadingState label="Loading account" rows={3} />;
  }

  if (account.error && !admin) {
    return <ErrorState message={account.error.detail} onRetry={account.reload} />;
  }

  if (!admin) {
    return <ErrorState message="The account could not be read." onRetry={account.reload} />;
  }

  const signOut = async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="space-y-8">
      <header className="border-b border-line pb-6">
        <p className="type-meta text-signal">Account</p>
        <h1 className="mt-3 text-2xl font-medium tracking-[-0.02em] text-paper">
          {admin.full_name || admin.email}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
          Identity, access level and session controls for this administrator.
        </p>
      </header>

      {admin.must_change_password ? (
        <div className="border border-signal/40 bg-signal/5 px-5 py-4">
          <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-signal">
            Password change required
          </p>
          <p className="mt-2 text-sm leading-relaxed text-paper-dim">
            This account was provisioned with a temporary password. Replace it before using the
            CMS.
          </p>
          <Link to="/change-password" className={buttonStyles("primary", "sm", "mt-4")}>
            Change password
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <section className="border border-line bg-ink-900/30 px-5 py-2 sm:px-6">
          <dl>
            <Row label="Email" value={admin.email} />
            <Row label="Verification phone" value={maskPhone(admin.phone)} />
            <Row
              label="Role"
              value={
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck className="size-3.5 text-signal" aria-hidden="true" />
                  {admin.role.replace("_", " ")}
                </span>
              }
            />
            <Row label="Status" value={admin.is_active ? "Active" : "Disabled"} />
            <Row
              label="Password changed"
              value={
                admin.password_changed_at
                  ? formatDate(admin.password_changed_at, { withDay: true })
                  : "Never recorded"
              }
            />
            <Row
              label="Last sign in"
              value={admin.last_login_at ? formatDate(admin.last_login_at, { withDay: true }) : "Not recorded"}
            />
            <Row label="Account created" value={formatDate(admin.created_at, { withDay: true })} />
          </dl>
        </section>

        <aside className="space-y-4">
          <div className="border border-line p-5">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
              Password
            </p>
            <p className="mt-3 text-sm leading-relaxed text-paper-dim">
              Changing the password signs out every other browser session.
            </p>
            <Link to="/change-password" className={buttonStyles("secondary", "sm", "mt-4 w-full")}>
              <KeyRound className="size-3.5" aria-hidden="true" />
              Change password
            </Link>
          </div>

          <div className="border border-line p-5">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted">
              Sessions &amp; activity
            </p>
            <p className="mt-3 text-sm leading-relaxed text-paper-dim">
              Review active sessions, revoke devices and inspect recent security events.
            </p>
            <Link to="/admin/security" className={buttonStyles("secondary", "sm", "mt-4 w-full")}>
              Open security
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>

          <button
            type="button"
            onClick={signOut}
            className={buttonStyles("ghost", "sm", "w-full border border-line")}
          >
            <LogOut className="size-3.5" aria-hidden="true" />
            Sign out
          </button>
        </aside>
      </div>
    </div>
  );
}
