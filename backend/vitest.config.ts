import { defineConfig } from "vitest/config";

// Varsayılan test deseni dist/ altındaki derlenmiş .test.js dosyalarını da
// bulup src/'deki aynı testleri ikinci kez çalıştırıyordu (build sonrası dist/
// içinde kalan .test.js kalıntılarından ötürü). Testleri sadece kaynağa
// bağlıyoruz.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
