"use client";

import { useActionState } from "react";
import { deleteWeeklyRequest } from "@/app/actions/admin";

/**
 * Çizelgede, yönetici için bir satırın o haftaki mesai kaydını (WeeklyRequest)
 * silen küçük buton. Silme her zaman tarayıcı onayı (confirm) ister.
 */
export default function DeleteRequestButton({
  id,
  employeeName,
}: {
  id: string;
  employeeName: string;
}) {
  const [state, formAction, pending] = useActionState(deleteWeeklyRequest, null);

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `${employeeName} için bu haftaki mesai kaydını silmek istediğinize emin misiniz?`
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        title="Bu haftaki kaydı sil"
        className="rounded-md border border-rose-200 px-1.5 py-0.5 text-[10px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
      >
        {pending ? "..." : "Sil"}
      </button>
      {state?.error && <p className="mt-1 text-[10px] text-rose-600">{state.error}</p>}
    </form>
  );
}
