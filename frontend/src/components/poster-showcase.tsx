"use client";

import { useRouter } from "next/navigation";
import { ContentRow } from "@/components/content-row";
import { PosterCard } from "@/components/poster-card";

const shows = [
  { tmdbId: 61867, title: "Medcezir", posterPath: "/gQw5nPY0Z0ZGN0yatzPwmdzNTQ7.jpg", year: 2013, voteAverage: 6.878 },
  { tmdbId: 34899, title: "Muhteşem Yüzyıl", posterPath: "/kryRPZTkCxtIc1bGMjIQgblnPe0.jpg", year: 2011, voteAverage: 8.142 },
  { tmdbId: 32519, title: "Ezel", posterPath: "/pHSjh4MINU2JnK7qQvjogQaX3wr.jpg", year: 2009, voteAverage: 8.4 },
  { tmdbId: 17635, title: "Aşk-ı Memnu", posterPath: "/xHulNzEqtgkTuwrRorBRXdGzHML.jpg", year: 2008, voteAverage: 6.7 },
  { tmdbId: 68388, title: "İçerde", posterPath: "/63v7p8t5sShiCGRLzePlgCu6TNj.jpg", year: 2016, voteAverage: 7.9 },
  { tmdbId: 110562, title: "Sadakatsiz", posterPath: "/47tPvMrNzquyC9GTrELfX9vRQNm.jpg", year: 2020, voteAverage: 8.119 },
  { tmdbId: 219446, title: "Aile", posterPath: "/7lnpFjzq3GsNq175HdhO9LOP1Jy.jpg", year: 2023, voteAverage: 7.6 },
  { tmdbId: 65555, title: "Kara Sevda", posterPath: "/wCo8QUccl6hBkCzOrm4AaLgc87J.jpg", year: 2015, voteAverage: 7.849 },
  { tmdbId: 85545, title: "Halka", posterPath: "/wBICp3TXly5OdsnUbyRp7eDXx7k.jpg", year: 2019, voteAverage: 8.889 },
  { tmdbId: 65556, title: "Çalıkuşu", posterPath: "/xUmwfInFrokwJJyhyZ8NuUozd1h.jpg", year: 2013, voteAverage: 7.5 },
];

export function PosterShowcase() {
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-[1180px] px-8">
      <ContentRow label="Dizi Senkron'da" title="Bu dizileri birlikte izleyebilirsin">
        {shows.map((show) => (
          <PosterCard
            key={show.tmdbId}
            title={show.title}
            posterPath={show.posterPath}
            year={show.year}
            voteAverage={show.voteAverage}
            onClick={() => router.push(`/dizi/${show.tmdbId}`)}
          />
        ))}
      </ContentRow>
    </div>
  );
}
