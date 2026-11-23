import {
  Activity,
  BarChart3,
  Calendar,
  Download,
  Eye,
  Globe,
  Globe2,
  Laptop,
  Layers,
  RefreshCw,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { useState } from "react";

import { AdminPanel } from "@/components/admin/form";
import { buttonStyles } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useApiQuery } from "@/hooks/useApiQuery";
import { analyticsService } from "@/services/analytics.service";
import type { AnalyticsPeriod } from "@/services/analytics.service";
import type { TrendBucket } from "@/types/api";
import { cn } from "@/utils/cn";
import { relativeTime } from "@/utils/format";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "default",
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: typeof Users;
  tone?: "default" | "signal" | "accent";
}) {
  return (
    <div className="flex flex-col justify-between border border-line bg-ink-800/40 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
          {title}
        </span>
        <span
          className={cn(
            "p-1.5 border border-line",
            tone === "signal" && "bg-signal/10 text-signal border-signal/30",
            tone === "accent" && "bg-accent/10 text-accent border-accent/30",
            tone === "default" && "bg-ink-950 text-paper-dim",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-semibold tracking-tight text-paper sm:text-3xl">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function TrendChart({ buckets, period }: { buckets: TrendBucket[]; period: AnalyticsPeriod }) {
  const maxViews = Math.max(...buckets.map((b) => b.page_views), 1);
  const totalViews = buckets.reduce((sum, b) => sum + b.page_views, 0);

  if (totalViews === 0) {
    return (
      <div className="flex min-h-[12rem] flex-col items-center justify-center border border-dashed border-line p-8 text-center">
        <BarChart3 className="size-8 text-muted" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-paper-dim">No visitor data yet.</p>
        <p className="mt-1 text-xs text-muted">
          Visit public pages on your website to start seeing real traffic trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span className="font-mono uppercase tracking-[0.14em]">
          {period === "today" ? "Hourly Traffic (24 Hours)" : period === "12m" ? "Monthly Visits" : "Daily Traffic"}
        </span>
        <span>Peak: {maxViews.toLocaleString()} views</span>
      </div>
      <div className="flex h-44 items-end gap-1.5 border-b border-line pb-2 sm:gap-2">
        {buckets.map((bucket, i) => {
          const heightPercent = Math.max((bucket.page_views / maxViews) * 100, 4);
          return (
            <div
              key={i}
              className="group relative flex flex-1 flex-col items-center justify-end h-full"
            >
              <div
                style={{ height: `${heightPercent}%` }}
                className={cn(
                  "w-full transition-all duration-200 group-hover:bg-signal",
                  bucket.page_views > 0 ? "bg-accent/80" : "bg-line/40",
                )}
              />
              <div className="pointer-events-none absolute -top-12 z-20 hidden w-max rounded border border-line bg-ink-950 p-2 font-mono text-[0.62rem] text-paper shadow-lg group-hover:block">
                <p className="font-bold text-signal">{bucket.label}</p>
                <p>{bucket.page_views.toLocaleString()} page views</p>
                <p>{bucket.unique_visitors.toLocaleString()} unique visitors</p>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between font-mono text-[0.56rem] uppercase tracking-[0.14em] text-faint">
        <span>{buckets[0]?.label}</span>
        <span>{buckets[Math.floor(buckets.length / 2)]?.label}</span>
        <span>{buckets[buckets.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>("30d");

  const overview = useApiQuery(
    (signal) => analyticsService.overview(period, signal),
    [period],
  );
  const trends = useApiQuery(
    (signal) => analyticsService.trends(period, signal),
    [period],
  );
  const pages = useApiQuery(
    (signal) => analyticsService.pages(period, 15, signal),
    [period],
  );
  const sources = useApiQuery(
    (signal) => analyticsService.sources(period, signal),
    [period],
  );
  const devices = useApiQuery(
    (signal) => analyticsService.devices(period, signal),
    [period],
  );
  const locations = useApiQuery(
    (signal) => analyticsService.locations(period, signal),
    [period],
  );
  const recent = useApiQuery((signal) => analyticsService.recent(20, signal), []);

  const handleRefresh = () => {
    overview.reload();
    trends.reload();
    pages.reload();
    sources.reload();
    devices.reload();
    locations.reload();
    recent.reload();
  };

  const hasData = (overview.data?.total_visitors ?? 0) > 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">
            Control Center
          </p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Visitor Analytics & Traffic
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Real privacy-first traffic analysis collected anonymously across your public portfolio.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border border-line bg-ink-950 p-1">
            {(["today", "7d", "30d", "12m"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={cn(
                  "px-3 py-1 font-mono text-[0.64rem] uppercase tracking-[0.14em] transition-colors",
                  period === p
                    ? "bg-accent/20 text-accent font-semibold"
                    : "text-muted hover:text-paper",
                )}
              >
                {p === "today" ? "Today" : p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "12 Months"}
              </button>
            ))}
          </div>

          <a
            href={analyticsService.exportUrl(period, "csv")}
            download
            className={buttonStyles("outline", "sm")}
            title="Export CSV"
          >
            <Download className="size-3.5" aria-hidden="true" />
            CSV
          </a>
          <button
            type="button"
            onClick={handleRefresh}
            className={buttonStyles("outline", "sm")}
            title="Refresh Data"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Top Metrics Cards */}
      {overview.loading ? (
        <LoadingState rows={1} label="Loading traffic metrics" />
      ) : overview.error ? (
        <ErrorState message={overview.error.message} onRetry={overview.reload} />
      ) : overview.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            title="Unique Visitors"
            value={overview.data.unique_visitors}
            subtitle={`Individual visitors (${period})`}
            icon={Users}
            tone="signal"
          />
          <StatCard
            title="Visits"
            value={overview.data.total_visits}
            subtitle={`Browsing sessions (${period})`}
            icon={Activity}
          />
          <StatCard
            title="Page Views"
            value={overview.data.page_views}
            subtitle={`Pages requested (${period})`}
            icon={Eye}
            tone="accent"
          />
          <StatCard
            title="Active Now"
            value={overview.data.active_now}
            subtitle="Active in last 5 mins"
            icon={TrendingUp}
            tone={overview.data.active_now > 0 ? "signal" : "default"}
          />
          <StatCard
            title="Total Visitors"
            value={overview.data.total_visitors}
            subtitle="All time unique visitors"
            icon={Globe}
          />
        </div>
      ) : null}

      {!hasData && !overview.loading ? (
        <div className="border border-line bg-ink-800/40 p-6 text-center">
          <p className="text-base font-medium text-paper">No visitor data yet.</p>
          <p className="mt-1 text-sm text-muted">
            The analytics system is active. Visit any public page (e.g. Home, Work, About) to record real visitor metrics.
          </p>
        </div>
      ) : null}

      {/* Trend Graph */}
      <AdminPanel
        title="Traffic Trend"
        description="Visitor page views and session activity over time."
      >
        {trends.loading ? (
          <LoadingState rows={2} label="Loading traffic chart" />
        ) : trends.error ? (
          <ErrorState message={trends.error.message} onRetry={trends.reload} />
        ) : trends.data ? (
          <TrendChart buckets={trends.data.buckets} period={period} />
        ) : null}
      </AdminPanel>

      {/* Breakdown Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Most Viewed Pages */}
        <AdminPanel
          title="Most Viewed Pages"
          description="Public pages with the highest traffic."
        >
          {pages.loading ? (
            <LoadingState rows={3} label="Loading page statistics" />
          ) : pages.data?.items.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="pb-2 font-mono uppercase tracking-[0.14em]">Page Path</th>
                    <th className="pb-2 text-right font-mono uppercase tracking-[0.14em]">Views</th>
                    <th className="pb-2 text-right font-mono uppercase tracking-[0.14em]">Uniques</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {pages.data.items.map((page) => (
                    <tr key={page.path} className="group hover:bg-ink-800/40">
                      <td className="py-2.5 pr-2">
                        <code className="font-mono text-paper group-hover:text-signal">{page.path}</code>
                        {page.title ? (
                          <p className="truncate text-[0.68rem] text-muted">{page.title}</p>
                        ) : null}
                      </td>
                      <td className="py-2.5 text-right font-mono text-paper font-medium">
                        {page.views.toLocaleString()}
                      </td>
                      <td className="py-2.5 text-right font-mono text-muted">
                        {page.unique_visitors.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted">No page view records for this period.</p>
          )}
        </AdminPanel>

        {/* Traffic Sources */}
        <AdminPanel
          title="Traffic Sources"
          description="Referral origins for public visitors."
        >
          {sources.loading ? (
            <LoadingState rows={3} label="Loading traffic sources" />
          ) : sources.data?.items.length ? (
            <div className="space-y-3">
              {sources.data.items.map((src) => (
                <div key={src.source} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-paper">{src.source}</span>
                    <span className="font-mono text-muted">
                      {src.count.toLocaleString()} ({src.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full border border-line bg-ink-950">
                    <div
                      className="h-full bg-signal/80 transition-all duration-300"
                      style={{ width: `${src.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">No referrer data available yet.</p>
          )}
        </AdminPanel>

        {/* Devices & OS */}
        <AdminPanel
          title="Device & Operating System"
          description="Aggregated client environment metrics."
        >
          {devices.loading ? (
            <LoadingState rows={3} label="Loading device metrics" />
          ) : devices.data ? (
            <div className="space-y-5 text-xs">
              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                  Device Types
                </p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {devices.data.device_types.map((dev) => (
                    <div
                      key={dev.name}
                      className="flex items-center justify-between border border-line bg-ink-950 p-2.5"
                    >
                      <span className="flex items-center gap-1.5 text-paper">
                        {dev.name === "Mobile" ? (
                          <Smartphone className="size-3.5 text-signal" />
                        ) : (
                          <Laptop className="size-3.5 text-accent" />
                        )}
                        {dev.name}
                      </span>
                      <span className="font-mono text-muted">{dev.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                  Browsers
                </p>
                <div className="flex flex-wrap gap-2">
                  {devices.data.browsers.map((b) => (
                    <span
                      key={b.name}
                      className="border border-line bg-ink-800/60 px-2.5 py-1 font-mono text-[0.68rem] text-paper-dim"
                    >
                      {b.name}: <strong className="text-paper">{b.percentage}%</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-muted">
                  Operating Systems
                </p>
                <div className="flex flex-wrap gap-2">
                  {devices.data.os_list.map((o) => (
                    <span
                      key={o.name}
                      className="border border-line bg-ink-800/60 px-2.5 py-1 font-mono text-[0.68rem] text-paper-dim"
                    >
                      {o.name}: <strong className="text-paper">{o.percentage}%</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">No device metrics recorded.</p>
          )}
        </AdminPanel>

        {/* Geographic Analytics */}
        <AdminPanel
          title="Geographic Analytics"
          description="Coarse regional distribution of website traffic."
        >
          {locations.loading ? (
            <LoadingState rows={3} label="Loading location data" />
          ) : locations.data?.items.length ? (
            <div className="space-y-3">
              {locations.data.items.map((loc) => (
                <div key={loc.country} className="flex items-center justify-between border border-line bg-ink-950 p-2.5 text-xs">
                  <span className="flex items-center gap-2 text-paper">
                    <Globe2 className="size-3.5 text-signal" />
                    {loc.country}
                  </span>
                  <span className="font-mono text-muted">
                    {loc.count.toLocaleString()} visits ({loc.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted">Location data unavailable.</p>
          )}
        </AdminPanel>
      </div>

      {/* Recent Visits Activity Log */}
      <AdminPanel
        title="Recent Visitor Stream"
        description="Anonymous real-time log of recent page visits."
      >
        {recent.loading ? (
          <LoadingState rows={3} label="Loading recent activity" />
        ) : recent.data?.items.length ? (
          <div className="divide-y divide-line border border-line">
            {recent.data.items.map((visit) => (
              <div
                key={visit.id}
                className="flex flex-wrap items-center justify-between gap-3 bg-ink-800/20 p-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[0.68rem] font-bold text-signal">
                    {visit.path}
                  </span>
                  <span className="border border-line bg-ink-950 px-1.5 py-0.5 font-mono text-[0.58rem] text-muted">
                    {visit.device_type}
                  </span>
                  <span className="text-paper-dim">{visit.referrer_source}</span>
                </div>
                <div className="flex items-center gap-4 text-muted">
                  <span>{visit.country}</span>
                  <span className="font-mono text-[0.64rem] text-faint">
                    {relativeTime(visit.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted">No recent visitor activity logged yet.</p>
        )}
      </AdminPanel>
    </div>
  );
}
