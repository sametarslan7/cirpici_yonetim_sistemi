"use client";

import { useActionState } from "react";
import { submitNewTeamDayOff } from "@/app/actions/requests";

type DayInfo = { index: number; label: string; dateLabel: string };

export default function NewTeamDayOffForm({
  weekStartISO,
  weekDates,
  initialDayOffIndex,
  isOverridden,
}: {
  weekStartISO: string;
  weekDates: DayInfo[];
  initialDayOffIndex: number;
  isOverridden: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitNewTeamDayOff, null);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="weekStart" value={weekStartISO} />

      <label className="block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
          İzinli Olmak İstediğim Gün
        </span>
        <select
          name="dayOffIndex"
          defaultValue={initialDayOffIndex}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none sm:w-auto"
        >
          {weekDates.map((day) => (
            <option key={day.index} value={day.index}>
              {day.label} ({day.dateLabel})
            </option>
          ))}
        </select>
      </label>

      <p className="text-xs text-slate-400">
        {isOverridden
          ? "Bu hafta için daha önce bir gün seçtiniz, aşağıdan değiştirebilirsiniz."
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
