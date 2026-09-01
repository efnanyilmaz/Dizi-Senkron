import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "E-postanı doğrula",
  robots: { index: false, follow: false },
};

export default function EPostaDogrulaLayout({ children }: { children: ReactNode }) {
  return children;
}
