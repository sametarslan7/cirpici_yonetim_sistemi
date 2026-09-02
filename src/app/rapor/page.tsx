import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getMonthlyExtraShiftReport } from "@/lib/report";

const MONTH_NAMES_TR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export default async function RaporPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  await requireSession();
  const params = await searchParams;

  const now = new Date();
  const year = params.y ? Number(params.y) : now.getFullYear();
  const month = params.m ? Number(params.m) : now.getMonth() + 1;

  const rows = await getMonthlyExtraShiftReport(year, month);

  const prev = month === 1 ? { y: year - 1, m: 12 } : { y: year, m: month - 1 };
  const next = month === 12 ? { y: year + 1, m: 1 } : { y: year, m: month + 1 };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Aylık Ekstra Mesai Raporu</h1>
          <p className="mt-1 text-sm text-slate-500">
            {MONTH_NAMES_TR[month - 1]} {year} — sadece onaylanmış kayıtlar sayılır
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/rapor?y=${prev.y}&m=${prev.m}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            ← Önceki Ay
          </Link>
          <Link
            href={`/rapor?y=${next.y}&m=${next.m}`}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Sonraki Ay →
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Personel</th>
              <th className="px-4 py-3 font-medium">Ekstra Mesai (08-20) Gün Sayısı</th>
              <th className="px-4 py-3 font-medium">Cumartesi Gün Sayısı</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.employeeId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{row.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                    {row.extraShiftCount} gün (+{row.extraShiftCount * 3} saat)
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{row.saturdayCount} gün</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
