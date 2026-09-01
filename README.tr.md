# Dizi Senkron

🇬🇧 [English](README.md) | 🇹🇷 Türkçe

**Dizi Senkron**, bir diziyi birlikte takip eden arkadaş grupları için gerçek zamanlı bir izleme uygulaması — kimin nerede kaldığını gör, spoiler almadan sohbet et, YouTube bölümlerini senkron izle.

Tam yığın (full-stack) bir portfolyo projesi olarak başladı, Türk dizilerine odaklanıyor.

## Özellikler

- **Gruplar & davetler** — bir dizi etrafında grup kur, arkadaşlarını kısa bir kodla davet et ya da grubu herkese açık/keşfedilebilir yap; grup sahibi üyeleri moderatör yapabilir, moderatörler üyeleri atabilir ve sohbeti yönetebilir
- **İlerleme takibi** — herkesin hangi sezon/bölümde olduğu tek bakışta görünür; ilerleme çubuğu dizinin gerçek sezon başına bölüm sayısına göre ölçeklenir (TMDB'den çekilir, sabit bir tahmin değil); dizi hâlâ yayındaysa bir banner bir sonraki bölümün gerçek yayın tarihini gösterir
- **Spoiler'a duyarlı sohbet** — her gruba özel gerçek zamanlı sohbet (Socket.io); senin ilerlemenin ötesindeki mesajlar sen açığa çıkarana kadar bulanık gösterilir (aşağıdaki [Nasıl çalışır](#nasıl-çalışır) bölümüne bak); mesajlara emoji ile tepki ver, kendi mesajlarını düzenle/sil, kuralları çiğneyen bir mesajı moderatör incelemesi için bildir
- **Birlikte izle** — bölüm adına göre arama yap (dizinin resmi YouTube kanalına otomatik daraltılmış, sadece tam uzunluktaki bölümler — fragman, klip ya da alakasız sonuç yok) ve senkron izle: oynat/duraklat/ileri-geri sarma herkese anında yansır. YouTube'un gömülmesine izin vermediği bölümlerde Dailymotion aramasına ya da manuel "konumunu paylaş" moduna geçer
- **Grup anketleri** — sıradaki dizi için oy ver; grup sahibi ya da bir moderatör kazanan sonucu doğrudan uygulayabilir, tüm grubun dizisini değiştirip herkesin ilerlemesini sıfırlar
- **Keşfet kataloğu** — Türk dizilerinden oluşan derlenmiş bir akışa gözat, türe göre filtrele, ara (gerçekten bir yayın kanalında yayınlanmış dizilerle sınırlı — dijital-only ya da yabancı dil yanlış pozitifleri yok)
- **İletişim formu** — geri bildirim/hata bildirimi için herkese açık bir `/iletisim` sayfası, sunucu tarafında saklanır (ya da [SMTP kurulduğunda](#e-posta-gönderimi) e-posta olarak gider)
- **Kimlik doğrulama** — httpOnly çerezde JWT ile e-posta/şifre girişi, bcrypt ile hash'lenmiş şifreler, e-posta doğrulama, kendi kendine şifre/e-posta değiştirme, şifre sıfırlama ve hesap silme (aşağıdaki [E-posta gönderimi](#e-posta-gönderimi) bölümüne bak)

## Teknoloji yığını

**Frontend** — Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Framer Motion · Socket.io-client

**Backend** — Express 4 · Socket.io · Prisma ORM · PostgreSQL · Zod validasyonu · JWT kimlik doğrulama

**Dış API'ler** — [TMDB](https://www.themoviedb.org/documentation/api) (dizi verisi), [YouTube Data API v3](https://developers.google.com/youtube/v3) (bölüm arama & doğrulama), [Dailymotion](https://www.dailymotion.com/) (YouTube bir bölümü gömmeye izin vermediğinde yedek arama/gömme)

**Test** — Vitest (her iki tarafta da ayrıştırma/doğrulama mantığı için birim testleri)

## Başlarken

Docker yok — veritabanı her ortamda (yerel geliştirme dahil) [Neon](https://neon.tech) (yönetilen Postgres). Node.js 20+ gerekir.

### Ön koşullar

- Ücretsiz bir [Neon](https://neon.tech) projesi — bağlantı dizesini panelinden al. İki dal önerilir (Neon, git'in bir repo'yu dallandırması gibi veritabanını dallandırır): production için `main`, yerel çalışma için ayrı bir `dev` dalı — böylece yerelde test etmek gerçek veriye asla dokunmaz. Her dalın kendi bağlantı dizesi vardır.
- Ücretsiz bir [TMDB API anahtarı](https://www.themoviedb.org/settings/api)
- İsteğe bağlı, bir [YouTube Data API v3 anahtarı](https://console.cloud.google.com) (bölüm arama özelliğini açar)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # DATABASE_URL (Neon dev dalın), JWT_SECRET, TMDB_API_KEY doldur
npx prisma migrate deploy
npm run dev
```

`http://localhost:4000` üzerinde çalışır.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

`http://localhost:3000` üzerinde çalışır.

## Test & CI

```bash
cd backend && npm run typecheck && npm test
cd frontend && npm run typecheck && npm run lint && npm test
```

[GitHub Actions](.github/workflows/ci.yml) her push/PR'da aynı kontrolleri çalıştırır — frontend işinde orada `typecheck` yerine `npm run build` çalışır, çünkü Next.js'in route/param tipleri (`tsc --noEmit`'in ihtiyaç duyduğu) ancak bir build ya da `next dev` bir kere çalıştıktan sonra var olur, taze bir CI checkout'unda ise ikisi de yoktur.

## Nasıl çalışır

Bu projenin gerçekten çözmesi gereken, sadece bağlayıp geçilmeyen birkaç zor problem:

**Spoiler'a duyarlı sohbet.** Her mesaj, gönderildiği andaki gönderenin sezon/bölümünü saklar. Global bir "spoiler sınırı" yok — bunun yerine her mesaj, render anında *izleyicinin kendi* ilerlemesiyle karşılaştırılır: gönderen mesajı yazdığında senden ilerideyse, mesaj bulanık gösterilir ve tek yönlü açığa çıkarma uygulanır ("bir kere görünce geri alınamaz"). Aynı gruptaki, farklı bölümlerdeki iki kişi tamamen farklı bir sohbet görür — uygulamanın bütün amacı bu olduğu için, bu karşılaştırmanın yaklaşık değil doğru olması gerekiyordu.

**Gerçek zamanlı senkron, senkronlanamayan içerik için yedek planla.** Birlikte izleme durumu (hangi video, oynat/duraklat, an) grup başına bir Socket.io odası üzerinden yayılır. İşin ilginç kısmı gerçek Türk yayıncı içeriğiyle test ederken ortaya çıktı: resmi bölüm yüklemelerinin ciddi bir kısmında hak sahibi tarafından YouTube gömme kapatılmış, bu da o bölümler için gerçek senkron oynatmayı imkânsız kılıyor — etrafından dolaşılacak bir hata değil, gerçek bir içerik kısıtlaması. Uygulama bunu görmezden gelmek yerine gömülemeyen videoyu tespit eder, sonra ya Dailymotion'da arama yapar (yükleyicinin gömmeye açıkça izin verdiği yer) ya da gömülebilir bir kopya hiçbir yerde yoksa grubu "orijinal sitede izle, konumunu manuel paylaş" moduna geçirir — sessizce bozulmak yerine.

**Dizi verisi kendini onarır.** Erken bir aşamada, istemci tarafındaki bir test kısayolu poster/backdrop'u boş bir `Show` kaydı yazdı ve bir `Show`'a dokunan her uç nokta bu alanları sadece *oluşturma* anında doldurduğu için, o bozuk kayıt süresiz bozuk kaldı ve gerçek bir kullanıcının grup sayfasını sessizce bozdu. Çözüm tek seferlik bir yama değildi — bir `Show` kaydını oluşturan ya da ona dokunan her kod yolu (favorileme, izleme durumu işaretleme, grup oluşturma, anket sonucu uygulama) artık her dokunuşta poster/backdrop/puanı TMDB'den yeniden türetiyor, böylece tek bir kötü yazma kalıcı olamıyor. Paylaşılan bir `upsertShowFromTmdb` yardımcı fonksiyonu, istemcinin gönderdiğine güvenmek yerine bunu zorunlu kılıyor.

**E-posta değiştirme, hesabı sessizce ele geçirmek için kullanılamaz.** E-postanı değiştirmek önce mevcut şifreni gerektirir ve onay bağlantısı sadece *yeni* adrese gönderilir — o kutuyu kim kontrol ediyorsa bağlantıya tıklayana kadar hesaptaki e-posta gerçekte değişmez. Çalıntı bir oturumu olan bir saldırgan değişikliği isteyebilir, ama yeni posta kutusuna da sahip olmadan tamamlayamaz.

## E-posta gönderimi

E-posta doğrulama ve şifre sıfırlama, `SMTP_HOST`/`SMTP_USER`/`SMTP_PASS` ayarlandığında SMTP üzerinden gönderilir (`backend/src/lib/mailer.ts` — kurulum için `.env.example`'a bak; test için bir Gmail Uygulama Şifresi işe yarar, production için herhangi bir SMTP sağlayıcısı çalışır). Ayarlanmadığında (yerel geliştirmenin varsayılanı), `POST /auth/forgot-password` ve e-posta doğrulama uç noktaları, bağlantıyı e-posta göndermek yerine doğrudan API yanıtında döner ve frontend bunu "test modu" etiketiyle satır içinde gösterir — böylece bütün kimlik doğrulama akışı bir e-posta hesabı kurmadan test edilebilir.

## Dağıtım (Deployment)

Frontend ve backend kasıtlı olarak ayrı dağıtılır:

- **Frontend → [Vercel](https://vercel.com)** — Next.js için doğal bir uyum, ücretsiz katman.
- **Backend → kalıcı bir süreç tutan bir host** (ör. [Render](https://render.com), [Railway](https://railway.app), [Fly.io](https://fly.io)) — **Vercel değil**. Backend gerçek zamanlı Socket.io bağlantılarını (sohbet, birlikte izleme senkronu, canlı ilerleme) tutuyor; Vercel'in sunucusuz fonksiyonları bir WebSocket bağlantısını canlı tutamaz, bu yüzden backend'in Node'u kalıcı bir sunucu olarak çalıştıran bir host'a ihtiyacı var.

İkisi farklı domain'lerde yaşadığı için birkaç şeyin uyuşması gerekir:

- Backend env: `FRONTEND_URL`, dağıtılan frontend adresine ayarlanır (CORS ve Socket.io el sıkışması için kullanılır).
- Frontend env: `NEXT_PUBLIC_API_URL` ve `NEXT_PUBLIC_SOCKET_URL`, dağıtılan backend adresine ayarlanır; `NEXT_PUBLIC_SITE_URL`, frontend'in kendi adresine ayarlanır (SEO metadata'sı için — canonical URL'ler, sitemap, robots.txt).
- Oturum çerezi, `NODE_ENV=production` olduğunda otomatik olarak `SameSite=None; Secure`'a geçer (`backend/src/lib/auth.ts`'e bak) — bu, çerezin iki host arasındaki siteler-arası bir fetch isteğinde hayatta kalması için gerekli. Bunun çalışması için iki host'un da gerçekten HTTPS üzerinden servis vermesi gerekir — Vercel/Render/Railway/Fly.io'nun hepsi bunu varsayılan olarak yapar.

## Proje yapısı

```
backend/
  src/
    routes/        REST uç noktaları (auth, groups, shows, messages, favorites, youtube)
    socket/        Socket.io olay yöneticileri (sohbet, ilerleme, birlikte izleme senkronu)
    lib/           TMDB/YouTube/Dailymotion istemcileri, auth yardımcıları, mailer
    middleware/    auth koruması, rate limiting
    prisma/        schema.prisma — User, Show, WatchGroup, GroupMember, Message, MessageReport, MessageReaction, Favorite, Poll, ContactMessage

frontend/
  src/
    app/           Next.js App Router sayfaları
    components/    UI bileşenleri
    lib/           API istemcisi, socket istemcisi, küçük yardımcılar
```

## Notlar

Bu proje bir portfolyo/öğrenme projesi olarak başladı ve gerçek bir servis olarak yayına girebilir — TMDB/YouTube anahtarları her iki durumda da dizi verisi ve bölüm arama için gerekli, ve henüz yayında bir kopyası yok.

## Lisans

Tüm hakları saklıdır — bkz. [LICENSE](LICENSE). Yeniden kullanım, kopyalama ya da dağıtım için lisanslanmamıştır.

## Yazar

Efnan Yılmaz tarafından geliştirildi — [GitHub](https://github.com/efnanyilmaz) · [LinkedIn](https://linkedin.com/in/efnanyilmaz)
