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
 * Talepler Pazar günü, bir sonraki haftayı hedefleyerek girilir.
 * Bu yüzden "şu an geçerli olan talep haftası" her zaman
 * içinde bulunduğumuz haftanın bir sonrakidir.
 */
export function getUpcomingWeekStart(now: Date = new Date()): Date {
  return addDays(getMonday(now), 7);
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
