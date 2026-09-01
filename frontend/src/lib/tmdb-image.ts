type PosterSize = "w185" | "w342" | "w500";
type BackdropSize = "w780" | "original";

export function posterUrl(path: string | null | undefined, size: PosterSize = "w342") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}

export function backdropUrl(path: string | null | undefined, size: BackdropSize = "w780") {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
