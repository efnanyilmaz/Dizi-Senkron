import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";

// Bu grup, giriş/kayıt gibi odaklanmış auth akışları dışındaki tüm
// sayfaları kapsar — parantezli klasör adı URL'e yansımaz (route group).
// Footer burada tek bir yerden ekleniyor, her sayfa kendi return
// dallarında ayrı ayrı eklemek zorunda kalmıyor.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
