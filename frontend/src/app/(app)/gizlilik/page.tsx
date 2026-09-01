export const metadata = { title: "Gizlilik ve KVKK" };

const sections = [
  {
    title: "Hangi verileri topluyoruz",
    body: "Hesap oluştururken görünen adını, e-posta adresini ve şifreni (geri döndürülemeyecek şekilde şifrelenerek) alırız. Bir gruba katıldığında izleme etkinliğin — hangi diziyi hangi bölümde bıraktığın, gönderdiğin sohbet mesajları, favori dizilerin — hizmeti çalıştırmak için saklanır. İletişim formunu kullanırsan adın, e-postan ve mesajın kayıt altına alınır.",
  },
  {
    title: "Çerezler ve oturum",
    body: "Giriş yaptığında tarayıcına yalnızca kimlik doğrulama amaçlı, teknik bir oturum çerezi yerleştirilir. Bu çerez reklam veya takip amacıyla kullanılmaz, tarayıcı tarafındaki betiklerce okunamaz ve en geç 7 gün içinde kendiliğinden geçersiz olur.",
  },
  {
    title: "Verileri nasıl kullanıyoruz",
    body: "Toplanan veriler yalnızca grup takibi, sohbet ve senkron izleme özelliklerini sağlamak için kullanılır. Dizi, bölüm ve video bilgileri TMDB, YouTube ve Dailymotion gibi üçüncü taraf servislerden çekilir; bu sorgular kişisel verini içermez. Verilerin hiçbiri pazarlama amacıyla üçüncü taraflarla paylaşılmaz veya satılmaz.",
  },
  {
    title: "Verilerinin kontrolü",
    body: "Profil sayfandan görünen adını, e-posta adresini ve şifreni istediğin zaman değiştirebilirsin. E-posta değişikliği, yeni adrese gönderilen bağlantı onaylanana kadar uygulanmaz. Hesabını ve ilişkili tüm verilerini (gruplar, mesajlar, favoriler) yine profil sayfandan kalıcı olarak silebilirsin; bu işlem geri alınamaz.",
  },
  {
    title: "KVKK kapsamında haklaların",
    body: "6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca; verilerinin işlenip işlenmediğini öğrenme, işlenmişse buna ilişkin bilgi talep etme, işlenme amacına uygun kullanılıp kullanılmadığını öğrenme, eksik veya yanlış işlenmişse düzeltilmesini isteme, kanuni şartlar çerçevesinde silinmesini veya yok edilmesini isteme haklarına sahipsin.",
  },
];

export default function GizlilikPage() {
  return (
    <main className="mx-auto w-full max-w-[820px] px-8 py-16">
      <div className="mb-3 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
        Yasal
      </div>
      <h1 className="mb-8 font-display text-4xl text-text-primary">Gizlilik ve KVKK</h1>

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
