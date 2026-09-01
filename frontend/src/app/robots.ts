import type { MetadataRoute } from "next";

// Grup/profil/favoriler gibi sayfalar oturuma özel — arama sonuçlarında
// görünmelerinin bir anlamı yok, hatta davet/onay linkleri gibi token içeren
// yollar sızdırılmamalı. Katalog ve genel sayfalar taranabilir kalıyor.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/gruplarim",
        "/grup/",
        "/profil",
        "/favoriler",
        "/katil/",
        "/sifre-sifirla",
        "/e-posta-dogrula",
        "/e-posta-degistir-onayla",
      ],
    },
    sitemap: "https://dizisenkron.app/sitemap.xml",
  };
}
