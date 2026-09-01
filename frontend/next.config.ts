import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // "standalone" çıktısı kasıtlı olarak burada değil — bu proje Vercel'e
  // dağıtılıyor ve Vercel kendi build formatını kullanıyor; "standalone",
  // kendi sunucunda `node server.js` ile host edeceğin durumlar içindir
  // (Vercel dışında bir yere dağıtılırsa buraya geri eklenebilir).
  images: {
    remotePatterns: [new URL("https://image.tmdb.org/t/p/**")],
  },
};

export default nextConfig;
