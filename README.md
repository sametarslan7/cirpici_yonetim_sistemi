# Çırpıcı Vardiya ve Mesai Planlama Sistemi

Çırpıcı Sporcu Sağlığı ve Performans Merkezi için haftalık vardiya talebi,
yönetici onayı ve mesai raporlama sistemi.

## Ekip

- **Yönetici:** Mahsum Akikol (şifre: `6134`)
- **Eski Ekip (talep girer):** Beren Ersan, Nurhan Elif Meriç, Nur Sena Öztürk, Berke Ünay, Mertcan Kara
- **Yeni Ekip (sabit, giriş yapmaz):** Duhan Batıkan, Minel, Bora

## Yerelde Çalıştırma

```bash
npm install
npm run db:migrate   # veritabanı şemasını oluşturur (ilk kurulumda)
npm run db:seed      # 9 kişiyi veritabanına ekler
npm run dev
```

Tarayıcıda [http://localhost:3000](http://localhost:3000) adresine gidin.

## Ortam Değişkenleri (`.env`)

| Değişken | Açıklama |
|---|---|
| `DATABASE_URL` | Veritabanı bağlantısı. Yerelde SQLite (`file:./dev.db`), canlıda Postgres. |
| `SESSION_SECRET` | Oturum çerezini şifrelemek için en az 32 karakterlik gizli anahtar. |
| `MANAGER_PASSWORD` | Mahsum hocanın giriş şifresi. |

## Canlıya Alma (Vercel)

Yerelde geliştirme SQLite ile yapılıyor. Vercel'in sunucusuz ortamı kalıcı
dosya sistemi sağlamadığı için canlıda gerçek bir Postgres veritabanı
gerekiyor:

1. Vercel projesinde **Marketplace**'ten bir Postgres entegrasyonu ekleyin
   (ör. Neon).
2. `prisma/schema.prisma` içindeki `datasource db` bloğunda `provider`
   değerini `"postgresql"` yapın.
3. Vercel'in verdiği `DATABASE_URL`'i proje ortam değişkenlerine ekleyin
   (`vercel env pull .env.local` ile yerele de çekebilirsiniz).
4. `npx prisma migrate deploy` ile şemayı canlı veritabanına uygulayın.
5. `npm run db:seed` ile 9 kişiyi (bir defalığına) ekleyin.

## Sistem Mantığı (Özet)

- **Talep döngüsü:** Talepler Pazar günü, bir sonraki hafta (Pzt-Cmt) için
  girilir. Mahsum hoca aynı gün onaylar/reddeder.
- **Eski ekip:** Her gün 3 seçenek — 08:00-17:00, 11:00-20:00, 08:00-20:00
  (+3 saat ekstra mesai). Bir günde en fazla 1 kişi 11:00-20:00 seçebilir.
  Haftada 1 kişi Cumartesi (08:00-17:00) çalışır (sistem rotasyonla önerir)
  ve o hafta içinden 1 gün izinli olur.
- **Yeni ekip:** Sabit saatler (hafta içi 11:00-20:00, Cumartesi 08:00-17:00,
  Pazar izinli). Hafta içi 1 gün izin rotasyonu sistem tarafından önerilir,
  Mahsum hoca yönetici panelinden değiştirebilir.
- **Çizelge & PDF:** `/cizelge` sayfası o haftanın onaylı çizelgesini
  gösterir, `PDF İndir` butonu aynı veriyi PDF olarak indirir. Geçmiş
  haftalar da tarih parametresiyle (`?week=YYYY-AA-GG`) görülebilir; veriler
  silinmez.
- **Aylık rapor:** `/rapor` sayfası her eski ekip elemanının o ay kaç kez
  3 saatlik ekstra mesai ve Cumartesi yaptığını gösterir (mesai ücreti
  hesaplaması için).
