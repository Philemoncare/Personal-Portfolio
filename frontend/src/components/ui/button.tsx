import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "@/utils/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-45 select-none";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-signal text-ink-950 hover:bg-paper active:bg-paper/90",
  secondary:
    "border border-line-strong bg-surface text-paper hover:border-paper hover:bg-surface-raised active:bg-surface-hover",
  outline:
    "border border-line text-paper-dim hover:border-line-strong hover:text-paper active:bg-surface-hover",
  ghost: "text-paper-dim hover:bg-surface-hover hover:text-paper active:bg-surface-raised",
  danger: "border border-error/50 bg-error/10 text-error hover:bg-error hover:text-white",
  link: "p-0 text-signal underline-offset-4 hover:underline",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[0.62rem]",
  md: "h-10 px-4 text-[0.68rem]",
  lg: "h-12 px-6 text-[0.74rem]",
};

export function buttonStyles(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  if (variant === "link") {
    return cn(base, variants.link, className);
  }
  return cn(base, variants[variant], sizes[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  children?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading = false, disabled, className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={buttonStyles(variant, size, className)}
      {...props}
    >
      {loading ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
});
