// dizisenkron.com henüz satın alınmadı — o ana kadar Vercel'in verdiği
// .vercel.app adresinde yayında olacak. NEXT_PUBLIC_SITE_URL o dönemde
// gerçek deploy adresine ayarlanır; alan adı alındığında bu env değişkeni
// kaldırılır (ya da dizisenkron.com'a çevrilir) ve buradaki varsayılana döner.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dizisenkron.com";
