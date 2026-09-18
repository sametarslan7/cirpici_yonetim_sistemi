"use client";

import { useActionState, useState } from "react";
import { submitNewTeamDayOff } from "@/app/actions/requests";

type DayInfo = { index: number; label: string; dateLabel: string };

export default function NewTeamDayOffForm({
  weekStartISO,
  weekDates,
  initialDayOffIndex,
  isOverridden,
  saturdayOptInActive,
  initialWorkingSaturday,
}: {
  weekStartISO: string;
  weekDates: DayInfo[];
  initialDayOffIndex: number;
  isOverridden: boolean;
  saturdayOptInActive: boolean;
  initialWorkingSaturday: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitNewTeamDayOff, null);
  const [workingSaturday, setWorkingSaturday] = useState(initialWorkingSaturday);
  const [dayOffIndex, setDayOffIndex] = useState(initialDayOffIndex);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="weekStart" value={weekStartISO} />
      <input type="hidden" name="dayOffIndex" value={dayOffIndex} />

      {saturdayOptInActive && (
        <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
          <input
            type="checkbox"
            name="workingSaturday"
            checked={workingSaturday}
            onChange={(e) => setWorkingSaturday(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-slate-700">
            Bu hafta Cumartesi çalışmak istiyorum.
            <span className="mt-0.5 block text-xs text-slate-400">
              İşaretlerseniz izin gününüz varsayılan olarak Pazartesi olur, dilerseniz aşağıdan
              başka bir güne değiştirebilirsiniz.
            </span>
          </span>
        </label>
      )}

      <div>
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
          İzinli Olmak İstediğim Gün
        </span>
        <div className="flex flex-wrap gap-2">
          {weekDates.map((day) => {
            const selected = day.index === dayOffIndex;
            return (
              <button
                key={day.index}
                type="button"
                onClick={() => setDayOffIndex(day.index)}
                aria-pressed={selected}
                className={
                  "rounded-md border px-3 py-2 text-sm transition " +
                  (selected
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-teal-400")
                }
              >
                {day.label}
                <span className="block text-xs opacity-80">{day.dateLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        {workingSaturday
          ? "Cumartesi çalışmayı seçtiğiniz için izin gününüz varsayılan olarak Pazartesi'dir, isterseniz yukarıdan değiştirebilirsiniz."
          : isOverridden
            ? "Bu hafta için daha önce bir gün seçtiniz, yukarıdan değiştirebilirsiniz."
            : "Sistemin rotasyonla önerdiği gün önceden işaretli geldi, isterseniz değiştirebilirsiniz."}{" "}
        Mahsum hoca gerekirse admin panelinden yine değiştirebilir.
      </p>

      {state?.error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      )}
      {state?.success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          İzin gününüz kaydedildi.
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Kaydediliyor..." : "Kaydet"}
      </button>
    </form>
  );
}
