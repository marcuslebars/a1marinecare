import { PDFDocument, StandardFonts } from "pdf-lib";
import { NextResponse } from "next/server";

console.log("[PDF ROUTE] PURE PDF-LIB CONFIRMED");

interface ConditionReportPDFParams {
  report: {
    summary?: string;
    oxidationLevel?: string;
    glossLevel?: string;
    cleanlinessLevel?: string;
    likelyIssues?: string[];
    recommendedServices?: string[];
    confidenceNote?: string;
  };
  image?: string;
}

export async function POST(request: Request) {
  try {
    const params: ConditionReportPDFParams = await request.json();
    const { report } = params;

    console.log("[PDF Route] Using pdf-lib ONLY - no PDFKit present");

    if (!report) {
      return NextResponse.json({ error: "report is required" }, { status: 400 });
    }

    const doc = await PDFDocument.create();
    const page = doc.addPage([612, 792]);

    const font = await doc.embedFont(StandardFonts.Helvetica);
    const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

    page.drawRectangle({ x: 0, y: 792 - 100, width: 612, height: 100, color: { red: 0.067, green: 0.067, blue: 0.067 } });
    page.drawText("A1 MARINE CARE", { x: 48, y: 792 - 48, size: 24, font: fontBold, color: { red: 0, green: 0.807, blue: 0.82 } });
    page.drawText("Condition Report", { x: 48, y: 792 - 80, size: 14, font: font, color: { red: 1, green: 1, blue: 1 } });
    page.drawText(report.summary || "No summary available.", { x: 48, y: 792 - 140, size: 12, font: font, color: { red: 0.2, green: 0.2, blue: 0.2 }, maxWidth: 516 });

    const pdfBytes = await doc.save();
    console.log("[PDF Route] pdf-lib bytes generated:", pdfBytes.length);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="A1-Boat-Condition-Report-${Date.now()}.pdf"`,
        "Content-Length": String(pdfBytes.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[PDF Route] FATAL:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}