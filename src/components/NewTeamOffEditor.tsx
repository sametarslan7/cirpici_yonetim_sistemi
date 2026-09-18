"use client";

import { useActionState, useState } from "react";
import { setNewTeamDayOff } from "@/app/actions/admin";
import { WEEKDAY_NAMES_TR } from "@/lib/week";

export default function NewTeamOffEditor({
  weekStartISO,
  employees,
  saturdayOptInActive,
}: {
  weekStartISO: string;
  employees: { id: string; name: string; dayOffIndex: number; workingSaturday: boolean }[];
  saturdayOptInActive: boolean;
}) {
  return (
    <div className="space-y-2">
      {employees.map((emp) => (
        <Row
          key={emp.id}
          weekStartISO={weekStartISO}
          employee={emp}
          saturdayOptInActive={saturdayOptInActive}
        />
      ))}
    </div>
  );
}

function Row({
  weekStartISO,
  employee,
  saturdayOptInActive,
}: {
  weekStartISO: string;
  employee: { id: string; name: string; dayOffIndex: number; workingSaturday: boolean };
  saturdayOptInActive: boolean;
}) {
  const [state, action, pending] = useActionState(setNewTeamDayOff, null);
  const [workingSaturday, setWorkingSaturday] = useState(employee.workingSaturday);
  const [dayOffIndex, setDayOffIndex] = useState(employee.dayOffIndex);

  return (
    <form
      action={action}
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2"
    >
      <input type="hidden" name="employeeId" value={employee.id} />
      <input type="hidden" name="weekStart" value={weekStartISO} />
      <input type="hidden" name="dayOffIndex" value={dayOffIndex} />
      <span className="text-sm font-medium text-slate-800">{employee.name}</span>
      <div className="flex flex-wrap items-center gap-2">
        {saturdayOptInActive && (
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              name="workingSaturday"
              checked={workingSaturday}
              onChange={(e) => setWorkingSaturday(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            Cumartesi çalışıyor
          </label>
        )}
        <div className="flex flex-wrap gap-1">
          {WEEKDAY_NAMES_TR.slice(0, 5).map((name, i) => {
            const selected = i === dayOffIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setDayOffIndex(i)}
                aria-pressed={selected}
                className={
                  "rounded-md border px-2 py-1 text-xs transition " +
                  (selected
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-slate-300 bg-white text-slate-600 hover:border-teal-400")
                }
              >
                {name}
              </button>
            );
          })}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {pending ? "..." : "Kaydet"}
        </button>
      </div>
      {state?.error && <p className="w-full text-xs text-rose-600">{state.error}</p>}
      {state?.success && !pending && (
        <p className="w-full text-xs font-medium text-emerald-600">✓ Kaydedildi</p>
      )}
    </form>
  );
}
