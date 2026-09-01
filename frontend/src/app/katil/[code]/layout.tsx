import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Davete katıl",
  robots: { index: false, follow: false },
};

export default function KatilLayout({ children }: { children: ReactNode }) {
  return children;
}
