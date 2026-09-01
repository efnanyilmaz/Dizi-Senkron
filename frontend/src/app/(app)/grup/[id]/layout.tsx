import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Grup",
  robots: { index: false, follow: false },
};

export default function GrupLayout({ children }: { children: ReactNode }) {
  return children;
}
