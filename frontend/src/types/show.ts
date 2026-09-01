export type TmdbShow = {
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  firstAirYear: number | null;
};

export type NextEpisodeInfo = {
  airDate: string;
  seasonNumber: number;
  episodeNumber: number;
  name: string | null;
};

export type TmdbShowDetail = TmdbShow & {
  overview: string;
  genres: string[];
  numberOfSeasons: number | null;
  numberOfEpisodes: number | null;
  cast: { name: string; character: string; profilePath: string | null }[];
  nextEpisode: NextEpisodeInfo | null;
};

export type ShowDTO = {
  id: string;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number | null;
  tmdbId: number | null;
  totalSeasons?: number | null;
  totalEpisodes?: number | null;
};
