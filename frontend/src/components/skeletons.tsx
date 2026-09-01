// İçerik gelene kadar sayfanın boş görünmemesi için — gerçek kartlarla aynı
// boyutta, hafifçe nabız atan (animate-pulse) yer tutucular. Veri gelince bu
// bileşenler gerçek kartlarla değiştirilir, sayfa aniden zıplamaz.

export function PosterCardSkeleton() {
  return (
    <div className="w-[150px] shrink-0">
      <div className="aspect-[2/3] w-full animate-pulse rounded-md border border-screen-line bg-screen-glow" />
    </div>
  );
}

export function PosterGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="flex flex-wrap gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <PosterCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PosterRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <PosterCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function HeroBannerSkeleton() {
  return (
    <div className="relative mb-10 h-[360px] animate-pulse overflow-hidden rounded-lg border border-screen-line bg-screen-glow max-[700px]:h-[300px]" />
  );
}

export function TicketCardSkeleton() {
  return (
    <div className="h-[208px] w-[270px] shrink-0 animate-pulse rounded-lg border border-screen-line bg-screen-glow" />
  );
}

export function TicketRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <TicketCardSkeleton key={i} />
      ))}
    </div>
  );
}
