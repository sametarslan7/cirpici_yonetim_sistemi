"use client";

import { useActionState, useState } from "react";
import { submitAntrenorWeeklyRequest } from "@/app/actions/requests";

type DayInfo = { index: number; label: string; dateLabel: string };

export default function AntrenorRequestForm({
  weekStartISO,
  weekDates,
  initialWorkingSaturday,
  initialOffDayIndex,
  initialExtraDays,
  saturdayLockedByOther,
  locked,
}: {
  weekStartISO: string;
  weekDates: DayInfo[];
  initialWorkingSaturday: boolean;
  initialOffDayIndex: number | null;
  initialExtraDays: boolean[];
  saturdayLockedByOther: string | null;
  locked: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitAntrenorWeeklyRequest, null);
  const [workingSaturday, setWorkingSaturday] = useState(initialWorkingSaturday);
  const [offDayIndex, setOffDayIndex] = useState(initialOffDayIndex ?? 0);
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
            {weekDates.map((day) => {
              const isOffDay = workingSaturday && day.index === offDayIndex;
              return (
                <tr key={day.index} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-800">{day.label}</div>
                    <div className="text-xs text-slate-400">{day.dateLabel}</div>
                  </td>
                  <td className="px-4 py-3">
                    {isOffDay ? (
                      <span className="text-xs text-slate-400">İzin günü</span>
                    ) : (
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
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="workingSaturday"
            checked={workingSaturday}
            disabled={locked || (!!saturdayLockedByOther && !workingSaturday)}
            onChange={(e) => setWorkingSaturday(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-800">
              Bu hafta Cumartesi (08:00-17:00) çalışacağım
            </span>
            {saturdayLockedByOther && !workingSaturday ? (
              <p className="mt-1 text-xs text-rose-600">
                Bu hafta Cumartesi vardiyası {saturdayLockedByOther} tarafından seçildi.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Cumartesi çalışırsanız, karşılığında bu hafta içinden bir gün izin
                kullanırsınız. Eren ile birlikte Cumartesi çalışan toplam antrenör
                sayısı 2 olacak şekilde, sizin gibi esnek antrenörlerden bir haftada
                en fazla 1 kişi katılabilir.
              </p>
            )}
          </span>
        </label>

        {workingSaturday && (
          <div className="mt-3 border-t border-slate-100 pt-3">
            <label className="block text-xs font-medium text-slate-600">
              Karşılığında hangi gün izin kullanmak istiyorsunuz?
            </label>
            <select
              name="offDayIndex"
              value={offDayIndex}
              disabled={locked}
              onChange={(e) => setOffDayIndex(Number(e.target.value))}
              className="mt-1.5 rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:border-teal-500 focus:outline-none"
            >
              {weekDates.map((day) => (
                <option key={day.index} value={day.index}>
                  {day.label}
                </option>
              ))}
            </select>
          </div>
        )}
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
