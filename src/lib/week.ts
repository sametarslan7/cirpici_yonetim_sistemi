// Tarih yardımcıları. Karışıklık olmasın diye her tarihi UTC gece yarısı
// (00:00) olarak tutuyoruz; sunucunun saat dilimi farkı sonucu etkilemez.

export const WEEKDAY_NAMES_TR = [
  "Pazartesi",
  "Salı",
  "Çarşamba",
  "Perşembe",
  "Cuma",
  "Cumartesi",
  "Pazar",
] as const;

export function toUTCMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/** Verilen tarihin ait olduğu haftanın Pazartesi'sini döndürür. */
export function getMonday(d: Date): Date {
  const utc = toUTCMidnight(d);
  const day = utc.getUTCDay(); // 0=Pazar, 1=Pazartesi ... 6=Cumartesi
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(utc, diff);
}

/**
 * Talepler normalde Pazar günü, bir sonraki haftayı hedefleyerek girilir.
 * Bu yüzden varsayılan/asıl talep haftası içinde bulunduğumuz haftanın
 * bir sonrakidir. (İçinde bulunulan hafta için de talep girilebilir,
 * bkz. [[getCurrentWeekStart]]/[[getSeasonWeekStarts]].)
 */
export function getUpcomingWeekStart(now: Date = new Date()): Date {
  return addDays(getMonday(now), 7);
}

/** İçinde bulunduğumuz haftanın Pazartesi'si. */
export function getCurrentWeekStart(now: Date = new Date()): Date {
  return getMonday(now);
}

export const MONTH_NAMES_TR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/**
 * Kullanıcıların talep/mesai saati girebileceği sezonun tüm haftalarının
 * Pazartesi günleri: `now`'un yılına ait 1 Eylül'ü kapsayan haftadan
 * başlar, 31 Aralık'ı kapsayan haftada biter. Üstteki hafta sekmelerinde
 * (bkz. [[WeekTabs]]) yana doğru kaydırılabilir şekilde listelenir.
 */
export function getSeasonWeekStarts(now: Date = new Date()): Date[] {
  const year = toUTCMidnight(now).getUTCFullYear();
  const firstMonday = getMonday(new Date(Date.UTC(year, 8, 1)));
  const lastMonday = getMonday(new Date(Date.UTC(year, 11, 31)));
  const weeks: Date[] = [];
  for (let d = firstMonday; d.getTime() <= lastMonday.getTime(); d = addDays(d, 7)) {
    weeks.push(d);
  }
  return weeks;
}

/**
 * Hafta sekmelerinde gösterilecek {başlangıç, etiket} listesi. İçinde
 * bulunulan hafta "Bu Hafta", bir sonraki hafta "Gelecek Hafta" olarak
 * etiketlenir; sezonun diğer haftaları ait oldukları ayın adıyla gösterilir.
 */
export function getSeasonWeekTabs(now: Date = new Date()): { start: Date; label: string }[] {
  const currentISO = formatISODate(getCurrentWeekStart(now));
  const upcomingISO = formatISODate(getUpcomingWeekStart(now));
  return getSeasonWeekStarts(now).map((start) => {
    const iso = formatISODate(start);
    const label =
      iso === currentISO
        ? "Bu Hafta"
        : iso === upcomingISO
          ? "Gelecek Hafta"
          : MONTH_NAMES_TR[start.getUTCMonth()];
    return { start, label };
  });
}

/** Verilen ISO tarihin (o anki `now`'a göre) girilebilir sezon
 * haftalarından biri olup olmadığını kontrol eder — form submit'lerinde
 * sunucu taraflı doğrulama için kullanılır. */
export function isRequestableWeekStart(iso: string, now: Date = new Date()): boolean {
  return getSeasonWeekStarts(now).some((d) => formatISODate(d) === iso);
}

/** Pazartesi'den Cumartesi'ye kadar 6 günlük tarih dizisi. */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 6 }, (_, i) => addDays(weekStart, i));
}

export function formatISODate(d: Date): string {
  return toUTCMidnight(d).toISOString().slice(0, 10);
}

export function parseISODate(s: string): Date {
  return new Date(`${s}T00:00:00.000Z`);
}

export function formatTRDate(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getUTCFullYear()}`;
}

export function formatWeekRangeTR(weekStart: Date): string {
  const saturday = addDays(weekStart, 5);
  return `${formatTRDate(weekStart)} - ${formatTRDate(saturday)}`;
}

export function isSameDate(a: Date, b: Date): boolean {
  return formatISODate(a) === formatISODate(b);
}
