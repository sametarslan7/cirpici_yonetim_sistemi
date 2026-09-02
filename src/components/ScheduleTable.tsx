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

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table id="schedule-table" className="w-full min-w-[820px] text-sm">
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
        <tbody>
          {veteranRows.map((row) => (
            <tr key={row.employeeId} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-slate-800">{row.name}</div>
                {row.requestStatus && row.requestStatus !== "APPROVED" && (
                  <div className="text-[11px] text-slate-400">
                    {STATUS_LABEL[row.requestStatus]}
                  </div>
                )}
              </td>
              {row.days.map((cell, i) => (
                <Cell key={i} cell={cell} />
              ))}
            </tr>
          ))}

          {newTeamRows.length > 0 && (
            <tr>
              <td colSpan={7} className="bg-slate-50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Yeni Ekip (Sabit)
              </td>
            </tr>
          )}
          {newTeamRows.map((row) => (
            <tr key={row.employeeId} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3 align-top">
                <div className="font-medium text-slate-800">{row.name}</div>
              </td>
              {row.days.map((cell, i) => (
                <Cell key={i} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
