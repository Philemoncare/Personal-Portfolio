import { cn } from "@/utils/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2.5 font-mono text-[0.7rem] font-medium uppercase tracking-[0.16em] transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-signal text-ink-950 hover:bg-paper",
  secondary: "border border-line-strong text-paper hover:border-paper hover:bg-paper hover:text-ink-950",
  ghost: "text-paper-dim hover:text-paper",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5",
  md: "h-11 px-5",
  lg: "h-13 px-6",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(base, variants[variant], sizes[size], className);
}
