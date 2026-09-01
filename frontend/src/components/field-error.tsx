export function FieldError({ children }: { children: string }) {
  return (
    <p
      role="alert"
      className="mt-1 inline-flex items-start gap-1.5 rounded-sm border border-dashed border-danger/50 px-2 py-1 font-mono text-[11px] leading-relaxed tracking-[0.04em] text-danger normal-case"
    >
      <span aria-hidden>✕</span>
      {children}
    </p>
  );
}
