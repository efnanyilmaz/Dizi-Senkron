export const metadata = { title: "Kullanım Koşulları" };

const sections = [
  {
    title: "Hizmetin kapsamı",
    body: "Dizi Senkron, arkadaş gruplarının bir diziyi birlikte takip etmesini, bölüm ilerlemesini paylaşmasını ve spoiler vermeden sohbet etmesini sağlayan bir topluluk hizmetidir. Hizmeti kullanarak bu koşulları kabul etmiş sayılırsın.",
  },
  {
    title: "Hesap sorumluluğu",
    body: "Hesabına ait şifreyi gizli tutmak ve hesabın üzerinden yapılan tüm işlemlerden sorumlu olmak sana aittir. Şüpheli bir etkinlik fark edersen şifreni hemen değiştirmeni öneririz; bize bildirilen ya da tarafımızca fark edilen ciddi ihlallerde hesabını askıya alma hakkımız saklıdır.",
  },
  {
    title: "Kabul edilebilir kullanım",
    body: "Grup sohbetinde taciz, nefret söylemi, spoiler zorlaması veya telif hakkı ihlali içeren paylaşımlar yasaktır. Grup içindeki ihlallerde grubun sahibi veya moderatörleri ilgili üyeyi gruptan çıkarabilir ya da mesajını silebilir; platformu ilgilendiren bir sorunu iletişim formundan bize bildirebilirsin.",
  },
  {
    title: "İçerik ve fikri mülkiyet",
    body: "Dizi, bölüm ve oyuncu bilgileri ile posterler TMDB'den; video içerikleri YouTube ve Dailymotion'dan alınır — bunların telif hakları ilgili yapımcılara ve platformlara aittir. Grup sohbetinde paylaştığın mesajlar sana aittir; bunları paylaşarak grup üyelerinin görebileceğini kabul edersin.",
  },
  {
    title: "Hesabını sonlandırma",
    body: "Hesabını ve ilişkili tüm verilerini profil sayfandan dilediğin zaman kalıcı olarak silebilirsin. Bize bildirilen ya da tarafımızca fark edilen ciddi ihlallerde hesabını da kapatabiliriz.",
  },
  {
    title: "Değişiklikler",
    body: "Bu koşullar zaman zaman güncellenebilir; önemli değişikliklerde seni bilgilendirmeye çalışırız.",
  },
];

export default function KullanimKosullariPage() {
  return (
    <main className="mx-auto w-full max-w-[820px] px-8 py-16">
      <div className="mb-3 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
        Yasal
      </div>
      <h1 className="mb-8 font-display text-4xl text-text-primary">Kullanım Koşulları</h1>

      <div className="space-y-8">
        {sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-2 font-display text-xl text-text-primary">{section.title}</h2>
            <p className="text-[15px] leading-relaxed text-text-secondary">{section.body}</p>
          </section>
        ))}
      </div>

      <p className="mt-12 font-mono text-xs text-text-muted">
        Sorularınız için: <a href="mailto:dizisenkron@gmail.com" className="text-text-muted hover:text-text-primary">dizisenkron@gmail.com</a>
      </p>
    </main>
  );
}
