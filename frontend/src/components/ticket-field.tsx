import type { InputHTMLAttributes } from "react";

export function TicketField({
  label,
  className = "",
  ...props
}: { label: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block font-mono text-xs tracking-[0.08em] text-text-muted uppercase">
        {label}
      </span>
      <input
        {...props}
        className="w-full border-b-2 border-screen-line bg-transparent pb-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint focus:border-signal"
      />
    </label>
  );
}
