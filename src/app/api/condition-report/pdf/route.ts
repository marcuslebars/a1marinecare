import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

console.log("[PDF ROUTE] CLEAN PDF-LIB ROUTE ACTIVE");

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

    page.drawRectangle({ x: 0, y: 692, width: 612, height: 100, color: rgb(0.067, 0.067, 0.067) });
    page.drawText("A1 MARINE CARE", { x: 48, y: 744, size: 24, font: fontBold, color: rgb(0, 0.807, 0.82) });
    page.drawText("Condition Report", { x: 48, y: 712, size: 14, font: font, color: rgb(1, 1, 1) });
    page.drawText(report.summary || "No summary available.", { x: 48, y: 652, size: 12, font: font, color: rgb(0.2, 0.2, 0.2), maxWidth: 516 });

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