import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Keşfet",
  description: "Türk dizilerini gözat, türe göre filtrele, arkadaşlarınla izleyeceğiniz diziyi seç.",
};

export default function KesfetLayout({ children }: { children: ReactNode }) {
  return children;
}
