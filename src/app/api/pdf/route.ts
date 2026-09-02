import { NextRequest, NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { requireSession } from "@/lib/session";
import { getMonday, parseISODate, formatTRDate, getWeekDates, WEEKDAY_NAMES_TR } from "@/lib/week";
import { getApprovedWeekSchedule } from "@/lib/schedule";
import { FIRA_SANS_REGULAR_BASE64, FIRA_SANS_BOLD_BASE64 } from "@/lib/fonts/fira-sans-base64";

export const runtime = "nodejs";

// Vardiya tipine göre PDF tablosunda hücre rengi (arayüzdeki renk koduyla aynı mantık).
const SHIFT_FILL: Record<string, [number, number, number]> = {
  NORMAL: [209, 250, 229], // emerald-100
  LATE: [224, 242, 254], // sky-100
  EXTRA: [254, 243, 199], // amber-100
  OFF: [255, 228, 230], // rose-100
};

export async function GET(request: NextRequest) {
  await requireSession();

  const weekParam = request.nextUrl.searchParams.get("week");
  const weekStart = weekParam ? getMonday(parseISODate(weekParam)) : getMonday(new Date());
  const weekDates = getWeekDates(weekStart);
  const rows = await getApprovedWeekSchedule(weekStart);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.addFileToVFS("FiraSans-Regular.ttf", FIRA_SANS_REGULAR_BASE64);
  doc.addFont("FiraSans-Regular.ttf", "FiraSans", "normal");
  doc.addFileToVFS("FiraSans-Bold.ttf", FIRA_SANS_BOLD_BASE64);
  doc.addFont("FiraSans-Bold.ttf", "FiraSans", "bold");
  doc.setFont("FiraSans", "bold");

  doc.setFontSize(14);
  doc.text("Çırpıcı Sporcu Sağlığı ve Performans Merkezi - Haftalık Vardiye Çizelgesi", 40, 36);
  doc.setFont("FiraSans", "normal");
  doc.setFontSize(10);
  doc.text(
    `${formatTRDate(weekStart)} - ${formatTRDate(weekDates[5])}`,
    40,
    52
  );

  const head = [["Personel", ...WEEKDAY_NAMES_TR.slice(0, 6).map((d, i) => `${d}\n${formatTRDate(weekDates[i])}`)]];
  const body = rows.map((row) => [
    row.name,
    ...row.days.map((cell) => (cell ? `${cell.time}${cell.shift === "OFF" ? "\n(İzinli)" : ""}` : "—")),
  ]);

  autoTable(doc, {
    head,
    body,
    startY: 66,
    styles: { font: "FiraSans", fontStyle: "normal", fontSize: 9, cellPadding: 6, halign: "center", valign: "middle" },
    headStyles: { font: "FiraSans", fontStyle: "bold", fillColor: [13, 148, 136], textColor: [255, 255, 255] },
    columnStyles: { 0: { halign: "left", fontStyle: "bold" } },
    didParseCell: (data) => {
      if (data.section !== "body" || data.column.index === 0) return;
      const row = rows[data.row.index];
      const cell = row?.days[data.column.index - 1];
      if (cell) {
        data.cell.styles.fillColor = SHIFT_FILL[cell.shift];
      }
    },
  });

  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cizelge-${weekParam ?? "guncel"}.pdf"`,
    },
  });
}
