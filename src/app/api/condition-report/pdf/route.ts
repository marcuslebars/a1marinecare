import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import path from "path";
import type { ConditionReport } from "@/app/api/condition-report/route";

const C = {
  cyan: "#00CED1",
  white: "#FFFFFF",
  text: "#333333",
  textLight: "#666666",
  textMuted: "#999999",
  border: "#E0E0E0",
  tableBg: "#F8F8F8",
  headerBg: "#111111",
  emerald: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  cardGray: "#2B2B2B",
};

const LEVEL_COLORS: Record<string, string> = {
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

interface ConditionReportPDFParams {
  report: ConditionReport;
  image?: string;
}

function buildPDF(report: ConditionReport, image: string | undefined): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "letter", margin: 0 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const fontDir = path.resolve(process.cwd(), "node_modules/pdfkit/data");
      doc.registerFont("Helvetica", path.join(fontDir, "Helvetica.afm"));
      doc.registerFont("Helvetica-Bold", path.join(fontDir, "Helvetica-Bold.afm"));

      console.log("[PDF] Font dir:", fontDir);
      console.log("[PDF] Registered Helvetica:", path.join(fontDir, "Helvetica.afm"));

      const W = 612;
      const MX = 48;
      const CW = W - MX * 2;
      let y = 0;

      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Header
      doc.rect(0, 0, W, 100).fill(C.headerBg);
      doc.fillColor(C.cyan).font("Helvetica-Bold").fontSize(24).text("A1 MARINE CARE", MX, 28);
      doc.fillColor(C.white).font("Helvetica").fontSize(9).text("Premium Boat Detailing & Protection", MX, 68);
      doc.fillColor(C.textMuted).fontSize(8).text("(705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", MX, 82);
      doc.fillColor(C.cyan).font("Helvetica-Bold").fontSize(12).text("CONDITION REPORT", 0, 30, { align: "right", width: W - MX });
      doc.fillColor(C.white).font("Helvetica").fontSize(8).text(dateStr, 0, 48, { align: "right", width: W - MX });
      doc.fillColor(C.textMuted).fontSize(8).text("AI-Powered Analysis", 0, 60, { align: "right", width: W - MX });

      y = 128;

      // Image
      if (image) {
        try {
          const imgData = image.includes(",") ? image.split(",")[1] : image;
          const imgBuffer = Buffer.from(imgData, "base64");
          doc.rect(MX, y, CW, 120).fill(C.cardGray);
          doc.image(imgBuffer, MX, y, { fit: [CW, 120], align: "center", valign: "center" });
          console.log("[PDF] Image embedded successfully");
          y += 140;
        } catch (err) {
          console.error("[PDF] Image embedding FAILED, skipping:", err);
          y += 20;
        }
      }

      // Summary
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(11).text("Summary", MX, y);
      y += 16;
      doc.fillColor(C.textLight).font("Helvetica").fontSize(9.5).text(report.summary || "No summary available.", MX, y, { width: CW });
      y += 30;

      // Assessment header
      doc.roundedRect(MX, y, CW, 24, 3).fill(C.headerBg);
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8).text("CONDITION ASSESSMENT", MX + 14, y + 8);
      y += 24;

      // Three boxes
      const assessments = [
        { label: "Oxidation Level", value: String(report.oxidationLevel) },
        { label: "Gloss Level", value: String(report.glossLevel) },
        { label: "Cleanliness", value: String(report.cleanlinessLevel) },
      ];
      const colW = (CW - 24) / 3;
      for (let i = 0; i < assessments.length; i++) {
        const a = assessments[i];
        const ax = MX + i * (colW + 8);
        doc.roundedRect(ax, y, colW, 52, 4).lineWidth(0.5).strokeColor(C.border).stroke();
        doc.fillColor(C.textMuted).font("Helvetica").fontSize(7).text(a.label.toUpperCase(), ax + 12, y + 10);
        const valColor = LEVEL_COLORS[a.value] || C.textLight;
        doc.fillColor(valColor).font("Helvetica-Bold").fontSize(16).text(a.value.toUpperCase(), ax + 12, y + 24);
      }
      y += 64;

      // Likely issues
      if (report.likelyIssues && report.likelyIssues.length > 0) {
        doc.roundedRect(MX, y, CW, 24, 3).fill(C.headerBg);
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8).text("LIKELY ISSUES DETECTED", MX + 14, y + 8);
        y += 24;
        const issueBoxH = 14 + report.likelyIssues.length * 20;
        doc.roundedRect(MX, y, CW, issueBoxH, 4).fill("#FFF8F8");
        doc.rect(MX, y, 3, issueBoxH).fill(C.red);
        for (let i = 0; i < report.likelyIssues.length; i++) {
          doc.fillColor(C.red).fontSize(7).text("\u2022", MX + 12, y + 12 + i * 20, { lineBreak: false });
          doc.fillColor(C.textLight).font("Helvetica").fontSize(9).text(
            report.likelyIssues[i] || "",
            MX + 24, y + 10 + i * 20,
            { width: CW - 36 }
          );
        }
        y += issueBoxH + 16;
      }

      // Recommended services
      if (report.recommendedServices && report.recommendedServices.length > 0) {
        if (y > 580) { doc.addPage(); y = 40; }
        doc.roundedRect(MX, y, CW, 24, 3).fill(C.headerBg);
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8).text("RECOMMENDED SERVICES", MX + 14, y + 8);
        y += 24;
        const recBoxH = 14 + report.recommendedServices.length * 20;
        doc.roundedRect(MX, y, CW, recBoxH, 4).fill("#F0FFFE");
        doc.rect(MX, y, 3, recBoxH).fill(C.cyan);
        for (let i = 0; i < report.recommendedServices.length; i++) {
          const svcName = SERVICE_NAMES[report.recommendedServices[i]] || report.recommendedServices[i];
          doc.fillColor(C.cyan).fontSize(7).text("\u2022", MX + 12, y + 12 + i * 20, { lineBreak: false });
          doc.fillColor(C.text).font("Helvetica-Bold").fontSize(9).text(svcName, MX + 24, y + 10 + i * 20, { width: CW - 36 });
        }
        y += recBoxH + 16;
      }

      // Confidence note
      if (report.confidenceNote) {
        if (y > 620) { doc.addPage(); y = 40; }
        doc.roundedRect(MX, y, CW, 50, 4).fill(C.tableBg);
        doc.fillColor(C.textMuted).font("Helvetica").fontSize(8).text("Assessment Note", MX + 14, y + 10);
        doc.fillColor(C.textLight).font("Helvetica").fontSize(9).text(report.confidenceNote, MX + 14, y + 26, { width: CW - 28 });
        y += 66;
      }

      // Next steps
      if (y > 580) { doc.addPage(); y = 40; }
      doc.roundedRect(MX, y, CW, 64, 4).fill("#F0FFFE");
      doc.rect(MX, y, 3, 64).fill(C.cyan);
      doc.fillColor(C.text).font("Helvetica-Bold").fontSize(9).text("Next Steps", MX + 16, y + 10);
      doc.fillColor(C.textLight).font("Helvetica").fontSize(8.5).text(
        "Get a quote, book your service, or contact us to discuss the recommended treatments for your vessel.",
        MX + 16, y + 26, { width: CW - 32 }
      );
      doc.fillColor(C.cyan).font("Helvetica-Bold").fontSize(8.5).text("Get a Quote: a1marinecare.ca/quote", MX + 16, y + 42);
      doc.fillColor(C.cyan).font("Helvetica-Bold").fontSize(8.5).text("Book a Service: a1marinecare.ca/booking", MX + 16, y + 56);
      y += 80;

      // Disclaimer
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7).text(
        "AI-generated report for visualization and guidance only. Final recommendations depend on boat condition and in-person assessment. Results may vary based on image quality, lighting, and visible surfaces. Contact A1 Marine Care for a definitive evaluation.",
        MX, y + 10, { width: CW, align: "center" }
      );

      // Footer
      const footerY = 792 - 36;
      doc.rect(0, footerY, W, 36).fill(C.headerBg);
      doc.fillColor(C.textMuted).font("Helvetica").fontSize(7).text(
        "A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca",
        0, footerY + 10, { align: "center", width: W }
      );
      doc.fillColor("#555555").fontSize(6.5).text(
        "Serving Georgian Bay, Lake Simcoe, and Muskoka  —  Trusted by boat owners across Ontario's premier boating regions.",
        0, footerY + 22, { align: "center", width: W }
      );

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(request: Request) {
  try {
    const params: ConditionReportPDFParams = await request.json();
    const { report, image } = params;

    console.log("[PDF Route] POST called, report exists:", !!report, "| image exists:", !!image);

    if (!report) {
      return NextResponse.json({ error: "report is required" }, { status: 400 });
    }

    const pdfBuffer = await buildPDF(report, image);
    console.log("[PDF Route] PDF generated, size:", pdfBuffer.length, "bytes");

    if (pdfBuffer.length === 0) {
      return NextResponse.json({ error: "PDF generation produced empty buffer" }, { status: 500 });
    }

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="A1-Boat-Condition-Report-${Date.now()}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("[PDF Route] FATAL ERROR:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
