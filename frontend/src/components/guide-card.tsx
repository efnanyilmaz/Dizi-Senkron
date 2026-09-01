import type { ReactNode } from "react";

export function GuideCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-guide text-ink shadow-[0_30px_70px_-28px_rgba(0,0,0,0.6)]">
      <div className="h-[3px] bg-gradient-to-r from-signal via-sync to-signal" />
      <div className={className}>{children}</div>
    </div>
  );
}
