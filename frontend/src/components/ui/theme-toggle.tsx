import { Laptop, Moon, Sun } from "lucide-react";
import { useState, useRef, useEffect } from "react";

import { useTheme, type ThemeMode } from "@/app/ThemeProvider";
import { cn } from "@/utils/cn";

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, setMode } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: Array<{ value: ThemeMode; label: string; icon: typeof Sun }> = [
    { value: "dark", label: "Dark", icon: Moon },
    { value: "light", label: "Light", icon: Sun },
    { value: "system", label: "System", icon: Laptop },
  ];

  const currentOption = options.find((o) => o.value === mode) || options[0];
  const CurrentIcon = currentOption.icon;

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Current theme: ${currentOption.label}. Click to switch theme.`}
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center border border-line-strong bg-surface text-paper transition-colors hover:border-paper hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-signal"
      >
        <CurrentIcon className="size-4" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 z-50 mt-1.5 w-32 border border-line bg-surface p-1 shadow-overlay"
        >
          {options.map((option) => {
            const Icon = option.icon;
            const isSelected = mode === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMode(option.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-2.5 py-1.5 font-mono text-[0.62rem] uppercase tracking-[0.14em] transition-colors",
                  isSelected
                    ? "bg-surface-raised text-paper font-semibold"
                    : "text-muted hover:bg-surface-hover hover:text-paper",
                )}
              >
                <Icon className="size-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
