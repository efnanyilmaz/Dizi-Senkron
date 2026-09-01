import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vercel dışında bir yere (Railway, Render, kendi sunucun vb.) dağıtırken
  // build çıktısını küçük ve bağımsız tutar — sadece çalışma zamanında
  // gereken dosyaları bir araya toplar.
  output: "standalone",
  images: {
    remotePatterns: [new URL("https://image.tmdb.org/t/p/**")],
  },
};

export default nextConfig;
