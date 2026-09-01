import type { ReactNode } from "react";

function Notch({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={`absolute -top-1.5 h-3 w-3 rounded-full bg-screen ${
        side === "left" ? "-left-1.5" : "-right-1.5"
      }`}
    />
  );
}

export function UtilityPanel({
  label,
  children,
  className = "",
  id,
  noPadding = false,
  tone = "default",
}: {
  label: string;
  children: ReactNode;
  className?: string;
  id?: string;
  noPadding?: boolean;
  tone?: "default" | "danger";
}) {
  const isDanger = tone === "danger";
  return (
    <div
      id={id}
      className={`overflow-hidden rounded-lg border bg-screen-glow ${isDanger ? "border-danger/40" : "border-screen-line"} ${className}`}
    >
      <div
        className={`relative border-b border-dashed px-5 py-3 ${isDanger ? "border-danger/30" : "border-screen-line"}`}
      >
        <Notch side="left" />
        <Notch side="right" />
        <span
          className={`font-mono text-xs tracking-[0.08em] uppercase ${isDanger ? "text-danger" : "text-text-muted"}`}
        >
          {label}
        </span>
      </div>
      <div className={noPadding ? "" : "px-5 py-4"}>{children}</div>
    </div>
  );
}
