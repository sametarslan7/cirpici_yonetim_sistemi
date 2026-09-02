import type { ShiftType } from "@prisma/client";

export const MANAGER_NAME = "Mahsum Akikol";

export const SHIFT_META: Record<
  ShiftType,
  { time: string; label: string; badge: string; dot: string }
> = {
  NORMAL: {
    time: "08:00 - 17:00",
    label: "Normal Mesai",
    badge: "bg-emerald-50 text-emerald-800 border-emerald-300",
    dot: "bg-emerald-500",
  },
  LATE: {
    time: "11:00 - 20:00",
    label: "Geç Mesai",
    badge: "bg-sky-50 text-sky-800 border-sky-300",
    dot: "bg-sky-500",
  },
  EXTRA: {
    time: "08:00 - 20:00",
    label: "Ekstra Mesai (+3 sa.)",
    badge: "bg-amber-50 text-amber-800 border-amber-300",
    dot: "bg-amber-500",
  },
  OFF: {
    time: "—",
    label: "İzinli",
    badge: "bg-rose-50 text-rose-800 border-rose-300",
    dot: "bg-rose-500",
  },
};

export const NEW_TEAM_SHIFT = { time: "11:00 - 20:00", label: "Sabit Mesai" };
export const NEW_TEAM_SATURDAY_SHIFT = { time: "08:00 - 17:00", label: "Cumartesi (Sabit)" };
export const VETERAN_SATURDAY_TIME = "08:00 - 17:00";
