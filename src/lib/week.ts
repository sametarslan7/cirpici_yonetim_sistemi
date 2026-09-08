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
 * bkz. [[getCurrentWeekStart]]/[[getRequestableWeekStarts]].)
 */
export function getUpcomingWeekStart(now: Date = new Date()): Date {
  return addDays(getMonday(now), 7);
}

/** İçinde bulunduğumuz haftanın Pazartesi'si. */
export function getCurrentWeekStart(now: Date = new Date()): Date {
  return getMonday(now);
}

/**
 * Kullanıcıların talep/mesai saati girebileceği haftalar: içinde
 * bulunulan hafta (unutulan ya da sonradan eklenmesi gereken girişler
 * için) ve bir sonraki hafta (asıl/olağan akış). Sıra önemli — ilk eleman
 * varsayılan olarak seçili olmayan, ikinci eleman ("gelecek hafta")
 * sayfaların varsayılan/öntanımlı sekmesidir.
 */
export function getRequestableWeekStarts(now: Date = new Date()): [Date, Date] {
  return [getCurrentWeekStart(now), getUpcomingWeekStart(now)];
}

/** Verilen ISO tarihin (o anki `now`'a göre) girilebilir iki haftadan
 * biri olup olmadığını kontrol eder — form submit'lerinde sunucu taraflı
 * doğrulama için kullanılır. */
export function isRequestableWeekStart(iso: string, now: Date = new Date()): boolean {
  return getRequestableWeekStarts(now).some((d) => formatISODate(d) === iso);
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
