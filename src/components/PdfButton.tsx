import { formatISODate } from "@/lib/week";

export default function PdfButton({ weekStart }: { weekStart: Date }) {
  return (
    <a
      href={`/api/pdf?week=${formatISODate(weekStart)}`}
      className="rounded-md bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700"
    >
      PDF İndir
    </a>
  );
}
