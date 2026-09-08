"use client";

import { useActionState } from "react";
import { deleteWeekSchedule } from "@/app/actions/admin";

/**
 * Çizelgede görüntülenen haftanın TÜM mesai kayıtlarını (girilmiş her
 * WeeklyRequest) tek seferde silen buton — sadece yönetici görür. Silme
 * her zaman tarayıcı onayı (confirm) ister.
 */
export default function DeleteWeekButton({ weekStartISO }: { weekStartISO: string }) {
  const [state, formAction, pending] = useActionState(deleteWeekSchedule, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Bu haftaya ait TÜM girilmiş mesai kayıtlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz."
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="weekStart" value={weekStartISO} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
      >
        {pending ? "Siliniyor..." : "Bu Haftayı Tümüyle Sil"}
      </button>
      {state?.error && <p className="mt-1 text-xs text-rose-600">{state.error}</p>}
    </form>
  );
}
