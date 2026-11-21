import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { cn } from "@/utils/cn";

export function AdminPanel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-line bg-surface/70", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
            {title}
          </h2>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-xs leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted"
      >
        {label}
        {required ? <span className="text-signal">*</span> : null}
      </label>
      <div>{children}</div>
      {hint && !error ? <p className="text-[0.68rem] leading-relaxed text-faint">{hint}</p> : null}
      {error ? (
        <p className="text-[0.7rem] leading-relaxed text-error font-medium" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  "w-full h-10 border border-line bg-background px-3.5 py-2 font-sans text-sm text-paper placeholder:text-faint transition-colors focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal disabled:cursor-not-allowed disabled:opacity-50";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function TextArea(
  props: TextareaHTMLAttributes<HTMLTextAreaElement> & { rows?: number },
) {
  return (
    <textarea
      {...props}
      rows={props.rows ?? 4}
      className={cn(inputClass, "h-auto resize-none py-2.5 leading-relaxed", props.className)}
    />
  );
}

export function Select({
  options,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      {...props}
      className={cn(
        inputClass,
        "cursor-pointer font-mono text-[0.68rem] uppercase tracking-[0.08em] bg-background text-paper",
        props.className,
      )}
    >
      {options.map((option) => (
        <option
          key={option.value}
          value={option.value}
          className="bg-surface text-paper py-1"
        >
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 text-sm text-paper-dim select-none",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 rounded-none border border-line-strong bg-background accent-signal"
      />
      <span>
        {label}
        {hint ? <span className="mt-0.5 block text-[0.68rem] text-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center justify-between gap-4 select-none",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div>
        <span className="text-sm font-medium text-paper">{label}</span>
        {hint ? <span className="block text-[0.68rem] text-faint">{hint}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-signal",
          checked ? "bg-signal" : "bg-surface-raised border border-line-strong",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block size-4 transform bg-paper transition duration-200 ease-in-out",
            checked ? "translate-x-4 bg-ink-950" : "translate-x-0.5 bg-paper-dim",
          )}
        />
      </button>
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone =
    normalized === "published" || normalized === "active" || normalized === "success"
      ? "border-success/50 bg-success/10 text-success"
      : normalized === "draft" || normalized === "pending" || normalized === "warning"
        ? "border-warning/50 bg-warning/10 text-warning"
        : normalized === "failed" || normalized === "error"
          ? "border-error/50 bg-error/10 text-error"
          : "border-line bg-surface-raised text-faint";

  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 border px-2 py-0.5 font-mono text-[0.54rem] uppercase leading-none tracking-[0.14em]",
        tone,
      )}
    >
      {status}
    </span>
  );
}
