import { WEEKDAY_NAMES_TR, formatTRDate } from "@/lib/week";
import { SHIFT_META } from "@/lib/constants";
import type { ScheduleRow } from "@/lib/schedule";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Onay bekliyor",
  APPROVED: "Onaylandı",
  REJECTED: "Reddedildi",
  NONE: "Talep girilmedi",
};

export default function ScheduleTable({
  rows,
  weekDates,
}: {
  rows: ScheduleRow[];
  weekDates: Date[];
}) {
  const veteranRows = rows.filter((r) => r.role === "VETERAN");
  const newTeamRows = rows.filter((r) => r.role === "NEW");
  const antrenorRows = rows.filter((r) => r.role === "ANTRENOR");
  const saglikciRows = rows.filter((r) => r.role === "SAGLIKCI");

  return (
    <div className="space-y-3">
      <Section
        title="Fizyoterapistler"
        count={veteranRows.length + newTeamRows.length}
        weekDates={weekDates}
      >
        {veteranRows.map((row) => (
          <Row key={row.employeeId} row={row} />
        ))}
        {newTeamRows.length > 0 && (
          <tr>
            <td
              colSpan={7}
              className="bg-slate-50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400"
            >
              Yeni Ekip (Sabit)
            </td>
          </tr>
        )}
        {newTeamRows.map((row) => (
          <Row key={row.employeeId} row={row} />
        ))}
      </Section>

      <Section title="Antrenör Ekibi" count={antrenorRows.length} weekDates={weekDates}>
        {antrenorRows.map((row) => (
          <Row key={row.employeeId} row={row} />
        ))}
      </Section>

      <Section title="Sağlık Ekibi" count={saglikciRows.length} weekDates={weekDates}>
        {saglikciRows.map((row) => (
          <Row key={row.employeeId} row={row} />
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  count,
  weekDates,
  children,
}: {
  title: string;
  count: number;
  weekDates: Date[];
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <details open className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 hover:bg-slate-50">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          {title}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
            {count} kişi
          </span>
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="overflow-x-auto border-t border-slate-200">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Personel</th>
              {weekDates.map((d, i) => (
                <th key={i} className="px-3 py-3 font-medium">
                  <div>{WEEKDAY_NAMES_TR[i]}</div>
                  <div className="font-normal normal-case text-slate-400">{formatTRDate(d)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </details>
  );
}

function Row({ row }: { row: ScheduleRow }) {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      <td className="px-4 py-3 align-top">
        <div className="font-medium text-slate-800">{row.name}</div>
        {row.requestStatus && row.requestStatus !== "APPROVED" && (
          <div className="text-[11px] text-slate-400">{STATUS_LABEL[row.requestStatus]}</div>
        )}
      </td>
      {row.days.map((cell, i) => (
        <Cell key={i} cell={cell} />
      ))}
    </tr>
  );
}

function Cell({ cell }: { cell: { shift: keyof typeof SHIFT_META; time: string; isSaturday: boolean } | null }) {
  if (!cell) {
    return (
      <td className="px-3 py-3 align-top">
        <span className="text-xs text-slate-300">—</span>
      </td>
    );
  }
  const meta = SHIFT_META[cell.shift];
  return (
    <td className="px-3 py-3 align-top">
      <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${meta.badge}`}>
        {cell.time}
      </span>
    </td>
  );
}
