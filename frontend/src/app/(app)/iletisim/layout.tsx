import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Geri bildirim gönder ya da bir sorunu bildir.",
};

export default function IletisimLayout({ children }: { children: ReactNode }) {
  return children;
}
