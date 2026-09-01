import type { ReactNode } from "react";

export function FilmstripFrame({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-lg border border-screen-line ${className}`}>
      <div className="sprocket-strip" />
      {children}
      <div className="sprocket-strip" />
    </div>
  );
}
