import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "E-posta değişikliğini onayla",
  robots: { index: false, follow: false },
};

export default function EPostaDegistirOnaylaLayout({ children }: { children: ReactNode }) {
  return children;
}
