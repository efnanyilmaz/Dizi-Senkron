import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Hesap oluştur",
  description: "Hesabını oluştur, ilk grubunu kur, arkadaşların katılsın.",
};

export default function KayitLayout({ children }: { children: ReactNode }) {
  return children;
}
