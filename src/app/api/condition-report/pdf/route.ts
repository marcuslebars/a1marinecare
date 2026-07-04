import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

console.log("[PDF Route] Premium pdf-lib layout active");

interface ConditionReport {
  oxidationLevel?: string;
  glossLevel?: string;
  cleanlinessLevel?: string;
  likelyIssues?: string[];
  recommendedServices?: string[];
  confidenceNote?: string;
  summary?: string;
}

interface ConditionReportPDFParams {
  report: ConditionReport;
  image?: string;
}

const C = {
  cyan: rgb(0, 0.808, 0.82),
  white: rgb(1, 1, 1),
  text: rgb(0.2, 0.2, 0.2),
  textLight: rgb(0.4, 0.4, 0.4),
  textMuted: rgb(0.6, 0.6, 0.6),
  border: rgb(0.878, 0.878, 0.878),
  tableBg: rgb(0.973, 0.973, 0.973),
  headerBg: rgb(0.067, 0.067, 0.067),
  emerald: rgb(0.063, 0.725, 0.506),
  amber: rgb(0.96, 0.62, 0.043),
  red: rgb(0.937, 0.267, 0.267),
  tealLight: rgb(0.941, 1, 0.996),
  redLight: rgb(1, 0.973, 0.973),
};

const LEVEL_COLORS: Record<string, ReturnType<typeof rgb>> = {
  low: C.red,
  moderate: C.amber,
  heavy: C.red,
  fair: C.amber,
  strong: C.emerald,
  poor: C.red,
  good: C.emerald,
};

const SERVICE_NAMES: Record<string, string> = {
  "boat-detailing": "Exterior Detailing",
  "gelcoat-restoration": "Gelcoat Restoration",
  "ceramic-coating": "Ceramic Coating",
  "graphene-coating": "Graphene Nano Coating",
  "interior-detailing": "Interior Detailing",
  "wet-sanding": "Wet Sanding & Paint Correction",
  "bottom-painting": "Bottom Painting",
  "vinyl-removal": "Vinyl Removal & Installation",
};

const W = 612;
const MX = 48;
const CW = W - MX * 2;

function drawHeader(page: ReturnType<PDFDocument["addPage"]>, fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, dateStr: string) {
  page.drawRectangle({ x: 0, y: 792 - 100, width: W, height: 100, color: C.headerBg });
  page.drawText("A1 MARINE CARE", { x: MX, y: 792 - 28, size: 22, font: fontBold, color: C.cyan });
  page.drawText("Premium Boat Detailing & Protection", { x: MX, y: 792 - 52, size: 9, font, color: C.white });
  page.drawText("(705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", { x: MX, y: 792 - 68, size: 8, font, color: C.textMuted });
  page.drawText("BOAT CONDITION REPORT", { x: W - MX - fontBold.widthOfTextAtSize("BOAT CONDITION REPORT", 12), y: 792 - 28, size: 12, font: fontBold, color: C.cyan });
  page.drawText(dateStr, { x: W - MX - font.widthOfTextAtSize(dateStr, 8), y: 792 - 46, size: 8, font, color: C.white });
  page.drawText("AI-Powered Assessment", { x: W - MX - font.widthOfTextAtSize("AI-Powered Assessment", 8), y: 792 - 58, size: 8, font, color: C.textMuted });
}

function drawFooter(page: ReturnType<PDFDocument["addPage"]>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const fy = 36;
  const centerX = W / 2 - font.widthOfTextAtSize("A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", 7) / 2;
  page.drawRectangle({ x: 0, y: fy, width: W, height: 36, color: C.headerBg });
  page.drawText("A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", {
    x: centerX, y: fy + 10, size: 7, font, color: C.textMuted,
  });
  const centerX2 = W / 2 - font.widthOfTextAtSize("Serving Georgian Bay, Lake Simcoe, and Muskoka.", 6.5) / 2;
  page.drawText("Serving Georgian Bay, Lake Simcoe, and Muskoka.", {
    x: centerX2, y: fy + 22, size: 6.5, font, color: rgb(0.5, 0.5, 0.5),
  });
}

function checkPage(page: ReturnType<PDFDocument["addPage"]>, cursor: number, minY: number, doc: PDFDocument, fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, dateStr: string): { page: ReturnType<PDFDocument["addPage"]>; cursor: number } {
  if (cursor < minY) {
    const newPage = doc.addPage([W, 792]);
    drawHeader(newPage, fontBold, font, dateStr);
    return { page: newPage, cursor: 792 - 60 };
  }
  return { page, cursor };
}

async function buildPDF(report: ConditionReport, imageData: string | undefined): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([W, 792]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  let cursor = 792 - 120;

  drawHeader(page, fontBold, font, dateStr);

  // Image
  if (imageData) {
    try {
      const base64 = imageData.includes(",") ? imageData.split(",")[1] : imageData;
      const buffer = Buffer.from(base64, "base64");
      const jpgImage = await doc.embedJpg(buffer);
      const dims = jpgImage.scale(1);
      const maxW = CW;
      const maxH = 140;
      const ratio = Math.min(maxW / dims.width, maxH / dims.height);
      const iw = dims.width * ratio;
      const ih = dims.height * ratio;
      const ix = MX + (maxW - iw) / 2;

      const { page: p, cursor: c } = checkPage(page, cursor, 140, doc, fontBold, font, dateStr);
      page = p;
      cursor = c;

      page.drawImage(jpgImage, { x: ix, y: cursor - ih, width: iw, height: ih });
      cursor -= ih + 16;
    } catch (err) {
      console.error("[PDF] Image embed failed:", err);
      cursor -= 20;
    }
  }

  // Assessment section header
  page.drawRectangle({ x: MX, y: cursor - 28, width: CW, height: 28, color: C.headerBg });
  page.drawText("CONDITION ASSESSMENT", { x: MX + 14, y: cursor - 28 + 9, size: 8, font: fontBold, color: C.white });
  cursor -= 32;

  // Three condition boxes
  const assessments = [
    { label: "Oxidation Level", value: report.oxidationLevel },
    { label: "Gloss Level", value: report.glossLevel },
    { label: "Cleanliness", value: report.cleanlinessLevel },
  ];
  const colW = (CW - 24) / 3;
  for (let i = 0; i < assessments.length; i++) {
    const ax = MX + i * (colW + 8);
    const val = assessments[i].value || "—";
    const valColor = LEVEL_COLORS[val] || C.textLight;
    page.drawRectangle({ x: ax, y: cursor - 48, width: colW, height: 48, color: C.white, borderColor: C.border, borderWidth: 0.5 });
    page.drawText(assessments[i].label.toUpperCase(), { x: ax + 10, y: cursor - 14, size: 7, font, color: C.textMuted });
    page.drawText(val.toUpperCase(), { x: ax + 10, y: cursor - 30, size: 14, font: fontBold, color: valColor });
  }
  cursor -= 48 + 16;

  // Summary
  page.drawText("ASSESSMENT SUMMARY", { x: MX, y: cursor, size: 9, font: fontBold, color: C.text });
  cursor -= 14;
  page.drawText(report.summary || "No summary available.", { x: MX, y: cursor, size: 9.5, font, color: C.textLight, maxWidth: CW });
  cursor -= 28;

  // Likely issues
  if (report.likelyIssues && report.likelyIssues.length > 0) {
    const result = checkPage(page, cursor, 180, doc, fontBold, font, dateStr);
    page = result.page;
    cursor = result.cursor;

    page.drawRectangle({ x: MX, y: cursor - 28, width: CW, height: 28, color: C.headerBg });
    page.drawText("LIKELY ISSUES DETECTED", { x: MX + 14, y: cursor - 28 + 9, size: 8, font: fontBold, color: C.white });
    cursor -= 32;

    const boxH = 16 + report.likelyIssues.length * 18;
    page.drawRectangle({ x: MX, y: cursor - boxH, width: CW, height: boxH, color: C.redLight });
    page.drawRectangle({ x: MX, y: cursor - boxH, width: 3, height: boxH, color: C.red });
    for (let i = 0; i < report.likelyIssues.length; i++) {
      page.drawText("\u2022", { x: MX + 12, y: cursor - boxH + 8 + i * 18, size: 7, font, color: C.red });
      page.drawText(report.likelyIssues[i] || "", { x: MX + 24, y: cursor - boxH + 6 + i * 18, size: 9, font, color: C.textLight, maxWidth: CW - 36 });
    }
    cursor -= boxH + 16;
  }

  // Recommended services
  if (report.recommendedServices && report.recommendedServices.length > 0) {
    const result = checkPage(page, cursor, 180, doc, fontBold, font, dateStr);
    page = result.page;
    cursor = result.cursor;

    page.drawRectangle({ x: MX, y: cursor - 28, width: CW, height: 28, color: C.headerBg });
    page.drawText("RECOMMENDED SERVICES", { x: MX + 14, y: cursor - 28 + 9, size: 8, font: fontBold, color: C.white });
    cursor -= 32;

    const recH = 16 + report.recommendedServices.length * 18;
    page.drawRectangle({ x: MX, y: cursor - recH, width: CW, height: recH, color: C.tealLight });
    page.drawRectangle({ x: MX, y: cursor - recH, width: 3, height: recH, color: C.cyan });
    for (let i = 0; i < report.recommendedServices.length; i++) {
      const svcName = SERVICE_NAMES[report.recommendedServices[i]] || report.recommendedServices[i];
      page.drawText("\u2022", { x: MX + 12, y: cursor - recH + 8 + i * 18, size: 7, font, color: C.cyan });
      page.drawText(svcName, { x: MX + 24, y: cursor - recH + 6 + i * 18, size: 9, font: fontBold, color: C.text, maxWidth: CW - 36 });
    }
    cursor -= recH + 16;
  }

  // Confidence note
  if (report.confidenceNote) {
    const result = checkPage(page, cursor, 130, doc, fontBold, font, dateStr);
    page = result.page;
    cursor = result.cursor;

    page.drawRectangle({ x: MX, y: cursor - 46, width: CW, height: 46, color: C.tableBg });
    page.drawText("Assessment Note", { x: MX + 12, y: cursor - 46 + 10, size: 8, font, color: C.textMuted });
    page.drawText(report.confidenceNote, { x: MX + 12, y: cursor - 46 + 24, size: 9, font, color: C.textLight, maxWidth: CW - 24 });
    cursor -= 46 + 16;
  }

  // Next steps CTA
  const result = checkPage(page, cursor, 140, doc, fontBold, font, dateStr);
  page = result.page;
  cursor = result.cursor;

  page.drawRectangle({ x: MX, y: cursor - 70, width: CW, height: 70, color: C.tealLight });
  page.drawRectangle({ x: MX, y: cursor - 70, width: 3, height: 70, color: C.cyan });
  page.drawText("NEXT STEPS", { x: MX + 16, y: cursor - 70 + 10, size: 9, font: fontBold, color: C.text });
  page.drawText("Get a quote, book your service, or contact us to discuss the recommended treatments for your vessel.", {
    x: MX + 16, y: cursor - 70 + 26, size: 8.5, font, color: C.textLight, maxWidth: CW - 32,
  });
  page.drawText("Get a Quote: a1marinecare.ca/quote", { x: MX + 16, y: cursor - 70 + 42, size: 8.5, font: fontBold, color: C.cyan });
  page.drawText("Book a Service: a1marinecare.ca/booking", { x: MX + 16, y: cursor - 70 + 56, size: 8.5, font: fontBold, color: C.cyan });
  cursor -= 70 + 16;

  // Disclaimer
  const disclaimer = "AI-generated report for visualization and guidance only. Final recommendations depend on in-person inspection.";
  page.drawText(disclaimer, {
    x: W / 2 - font.widthOfTextAtSize(disclaimer, 7) / 2, y: cursor, size: 7, font, color: C.textMuted,
  });

  drawFooter(page, font);

  const pdfBytes = await doc.save();
  console.log("[PDF Route] Premium PDF generated:", pdfBytes.length, "bytes");
  return pdfBytes;
}

export async function POST(request: Request) {
  try {
    const params: ConditionReportPDFParams = await request.json();
    const { report, image } = params;

    console.log("[PDF Route] Using pdf-lib premium layout - no PDFKit present");

    if (!report) {
      return NextResponse.json({ error: "report is required" }, { status: 400 });
    }

    const pdfBytes = await buildPDF(report, image);

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