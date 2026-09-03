"use client";

import { useActionState, useState } from "react";
import { submitWeeklyRequest } from "@/app/actions/requests";
import { SHIFT_META } from "@/lib/constants";
import type { ShiftType } from "@prisma/client";

type DayInfo = { index: number; label: string; dateLabel: string };

const SELECTABLE_SHIFTS: ShiftType[] = ["NORMAL", "LATE", "EXTRA"];

export default function RequestForm({
  weekStartISO,
  weekDates,
  initialShifts,
  initialWorkingSaturday,
  saturdayLockedByOther,
  lateConflicts,
  locked,
  mondayCompOffLocked,
}: {
  weekStartISO: string;
  weekDates: DayInfo[];
  initialShifts: ShiftType[];
  initialWorkingSaturday: boolean;
  saturdayLockedByOther: string | null;
  lateConflicts: (string | null)[];
  locked: boolean;
  /** Geçen hafta Cumartesi çalıştığı için bu haftanın Pazartesi günü
   * otomatik ve zorunlu izinli olan kişi mi? (kendisi değiştiremez) */
  mondayCompOffLocked: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitWeeklyRequest, null);
  const [shifts, setShifts] = useState<ShiftType[]>(
    mondayCompOffLocked ? initialShifts.map((s, i) => (i === 0 ? "OFF" : s)) : initialShifts
  );
  const [workingSaturday, setWorkingSaturday] = useState(
    mondayCompOffLocked ? false : initialWorkingSaturday
  );

  function setShift(dayIndex: number, shift: ShiftType) {
    setShifts((prev) => {
      const next = [...prev];
      next[dayIndex] = shift;
      return next;
    });
  }

  function toggleSaturday(checked: boolean) {
    setWorkingSaturday(checked);
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="weekStart" value={weekStartISO} />

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3 font-medium">Gün</th>
              <th className="px-4 py-3 font-medium">Vardiya Seçimi</th>
            </tr>
          </thead>
          <tbody>
            {weekDates.map((day) => {
              const isLockedMonday = day.index === 0 && mondayCompOffLocked;
              const conflictName = lateConflicts[day.index];
              return (
                <tr key={day.index} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium text-slate-800">{day.label}</div>
                    <div className="text-xs text-slate-400">{day.dateLabel}</div>
                  </td>
                  <td className="px-4 py-3">
                    {isLockedMonday ? (
                      <>
                        <input type="hidden" name={`day_${day.index}`} value="OFF" />
                        <span
                          className={`inline-flex rounded-lg border px-3 py-2 text-xs font-medium ${SHIFT_META.OFF.badge}`}
                        >
                          İzinli
                        </span>
                        <p className="mt-1 text-[11px] text-slate-400">
                          Geçen hafta Cumartesi çalıştığınız için otomatik izinli.
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-wrap gap-2">
                          {SELECTABLE_SHIFTS.map((opt) => {
                            const isLate = opt === "LATE";
                            const disabled =
                              locked || (isLate && !!conflictName && shifts[day.index] !== "LATE");
                            const selected = shifts[day.index] === opt;
                            return (
                              <label
                                key={opt}
                                title={disabled && isLate ? `${conflictName} tarafından seçildi` : undefined}
                                className={`cursor-pointer rounded-lg border px-3 py-2 text-xs font-medium transition ${
                                  selected
                                    ? SHIFT_META[opt].badge + " border-current"
                                    : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                              >
                                <input
                                  type="radio"
                                  name={`day_${day.index}`}
                                  value={opt}
                                  checked={selected}
                                  disabled={disabled}
                                  onChange={() => setShift(day.index, opt)}
                                  className="sr-only"
                                />
                                {SHIFT_META[opt].time}
                              </label>
                            );
                          })}
                        </div>
                        {conflictName && shifts[day.index] !== "LATE" && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            11:00-20:00: {conflictName} tarafından seçildi
                          </p>
                        )}
                      </>
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
            disabled={locked || !!saturdayLockedByOther || mondayCompOffLocked}
            onChange={(e) => toggleSaturday(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-800">
              Bu hafta Cumartesi (08:00-17:00) çalışacağım
            </span>
            {mondayCompOffLocked ? (
              <p className="mt-1 text-xs text-rose-600">
                Geçen hafta Cumartesi çalıştığınız için bu hafta Cumartesi
                çalışamazsınız; sıranın diğer arkadaşlarınıza geçmesi gerekiyor.
              </p>
            ) : (
              <>
                {saturdayLockedByOther && (
                  <p className="mt-1 text-xs text-rose-600">
                    Bu hafta Cumartesi vardiyası {saturdayLockedByOther} tarafından seçildi.
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">
                  Bu hafta izin hakkınız yoktur; karşılığında bir sonraki haftanın
                  Pazartesi günü otomatik izinli olursunuz.
                </p>
              </>
            )}
          </span>
        </label>
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
