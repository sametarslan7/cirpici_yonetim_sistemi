"use client";

import { useActionState, useState } from "react";
import { submitSaglikciWeeklyRequest } from "@/app/actions/requests";

type DayInfo = { index: number; label: string; dateLabel: string };

export default function SaglikciExtraForm({
  weekStartISO,
  weekDates,
  initialExtraDays,
  locked,
}: {
  weekStartISO: string;
  weekDates: DayInfo[];
  initialExtraDays: boolean[];
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitSaglikciWeeklyRequest, null);
  const [extraDays, setExtraDays] = useState<boolean[]>(initialExtraDays);

  function toggleExtra(dayIndex: number, checked: boolean) {
    setExtraDays((prev) => {
      const next = [...prev];
      next[dayIndex] = checked;
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="weekStart" value={weekStartISO} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Gün</th>
              <th className="px-4 py-3 font-medium">Ek Mesai</th>
            </tr>
          </thead>
          <tbody>
            {weekDates.map((day) => (
              <tr key={day.index} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 align-top">
                  <div className="font-medium text-slate-800">{day.label}</div>
                  <div className="text-xs text-slate-400">{day.dateLabel}</div>
                </td>
                <td className="px-4 py-3">
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      name={`extra_${day.index}`}
                      checked={extraDays[day.index] ?? false}
                      disabled={locked}
                      onChange={(e) => toggleExtra(day.index, e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                    />
                    Bu gün 20:00&apos;a kadar çalışacağım (+3 saat)
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {state?.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Talebiniz gönderildi, onay bekleniyor.
        </div>
      )}

      <button
        type="submit"
        disabled={pending || locked}
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 sm:w-auto"
      >
        {locked ? "Onaylandı (Değiştirilemez)" : pending ? "Gönderiliyor..." : "Talebi Gönder"}
      </button>
    </form>
  );
}
