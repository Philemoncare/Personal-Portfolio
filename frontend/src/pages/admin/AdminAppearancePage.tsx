import { Check, Monitor, Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";

import { AdminPanel } from "@/components/admin/form";
import { useTheme, type ThemeMode } from "@/app/ThemeProvider";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/utils/cn";

const OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  description: string;
  icon: typeof Sun;
  swatch: [string, string, string];
}> = [
  {
    mode: "dark",
    label: "Dark",
    description: "The default dark theme.",
    icon: Moon,
    swatch: ["#0a0a0b", "#15151a", "#ff5b3a"],
  },
  {
    mode: "light",
    label: "Light",
    description: "A lighter theme with the same layout.",
    icon: Sun,
    swatch: ["#f6f4ef", "#ffffff", "#d94a2b"],
  },
  {
    mode: "system",
    label: "System",
    description: "Matches your device setting.",
    icon: Monitor,
    swatch: ["#0a0a0b", "#f6f4ef", "#ff5b3a"],
  },
];

export default function AdminAppearancePage() {
  const { mode, resolved, setMode } = useTheme();

  return (
    <>
      <div className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-signal">Theme</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight text-paper sm:text-4xl">
            Appearance
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
            Choose how the site looks on this device.
          </p>
        </div>
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.14em] text-muted">
          Currently {resolved}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = mode === option.mode;
          return (
            <button
              key={option.mode}
              type="button"
              onClick={() => setMode(option.mode)}
              aria-pressed={active}
              className={cn(
                "group flex flex-col gap-4 border p-4 text-left transition-colors",
                active
                  ? "border-paper bg-ink-900/70"
                  : "border-line bg-ink-900/30 hover:border-line-strong",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.14em] text-paper">
                  <Icon className="size-4" aria-hidden="true" />
                  {option.label}
                </span>
                <span
                  className={cn(
                    "inline-flex size-5 items-center justify-center border",
                    active ? "border-signal text-signal" : "border-line text-transparent",
                  )}
                  aria-hidden="true"
                >
                  <Check className="size-3" />
                </span>
              </div>
              <div
                className="flex h-16 w-full overflow-hidden border border-line"
                aria-hidden="true"
              >
                {option.swatch.map((color, index) => (
                  <span
                    key={color + index}
                    className="flex-1"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <p className="text-xs leading-relaxed text-muted">{option.description}</p>
            </button>
          );
        })}
      </div>

      <AdminPanel title="About this setting" className="mt-6">
        <p className="max-w-2xl text-sm leading-relaxed text-paper-dim">
          Your choice is saved in this browser only. It does not change what visitors see.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Site-wide colours, such as the accent colour, are set in{" "}
          <Link to="/admin/settings" className="text-paper underline underline-offset-4">
            Settings
          </Link>{" "}
          and apply to everyone.
        </p>
        <div className="mt-5">
          <Link to="/" className={buttonStyles("secondary", "sm")}>
            View website
          </Link>
        </div>
      </AdminPanel>
    </>
  );
}
