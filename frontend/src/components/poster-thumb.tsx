import Image from "next/image";
import { posterUrl } from "@/lib/tmdb-image";

export function PosterThumb({
  title,
  posterPath,
  width,
  height,
  className = "",
}: {
  title: string;
  posterPath: string | null | undefined;
  width: number;
  height: number;
  className?: string;
}) {
  const src = posterUrl(posterPath, width > 100 ? "w342" : "w185");

  if (src) {
    return (
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        className={`rounded-sm object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width, height }}
      title={title}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm border border-screen-line bg-screen-glow ${className}`}
    >
      <svg
        width={Math.round(Math.min(width, height) * 0.42)}
        height={Math.round(Math.min(width, height) * 0.42)}
        viewBox="0 0 24 24"
        className="text-text-faint"
      >
        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.5" />
        <circle cx="12" cy="6.8" r="2" fill="currentColor" />
        <circle cx="16.6" cy="14.6" r="2" fill="currentColor" />
        <circle cx="7.4" cy="14.6" r="2" fill="currentColor" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
      </svg>
    </div>
  );
}
