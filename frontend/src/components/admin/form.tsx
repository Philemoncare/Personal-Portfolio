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
    <section className={cn("border border-line bg-ink-900/60", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line px-5 py-4">
        <div>
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted">{description}</p>
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
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="flex items-center gap-2 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted"
      >
        {label}
        {required ? <span className="text-signal">*</span> : null}
      </label>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-2 text-[0.68rem] leading-relaxed text-faint">{hint}</p> : null}
    </div>
  );
}

const inputClass =
  "w-full border border-line bg-ink-950 px-3 py-2.5 font-sans text-sm text-paper placeholder:text-faint focus:border-line-strong focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal";

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
      className={cn(inputClass, "leading-relaxed", props.className)}
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
    <select {...props} className={cn(inputClass, "font-mono text-[0.68rem] uppercase tracking-[0.08em]", props.className)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
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
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-paper-dim">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[#ff4e1f]"
      />
      <span>
        {label}
        {hint ? <span className="mt-0.5 block text-[0.68rem] text-faint">{hint}</span> : null}
      </span>
    </label>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "published"
      ? "border-success/50 text-success"
      : status === "archived"
        ? "border-line text-faint"
        : "border-warning/50 text-warning";
  return (
    <span
      className={cn(
        "inline-flex w-fit border px-2 py-1 font-mono text-[0.54rem] uppercase leading-none tracking-[0.14em]",
        tone,
      )}
    >
      {status}
    </span>
  );
}
