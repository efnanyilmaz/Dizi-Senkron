import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Hesap ayarları",
  robots: { index: false, follow: false },
};

export default function ProfilLayout({ children }: { children: ReactNode }) {
  return children;
}
