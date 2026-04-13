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

      const fontDir = path.resolve(process.cwd(), "node_modules/pdfkit/js/data");
      const FONT_HELVETICA = path.join(fontDir, "Helvetica.afm");
      const FONT_HELVETICA_BOLD = path.join(fontDir, "Helvetica-Bold.afm");

      console.log("[PDF] process.cwd():", process.cwd());
      console.log("[PDF] Font dir:", fontDir);
      console.log("[PDF] Font path exists:", require("fs").existsSync(FONT_HELVETICA));

      doc.registerFont("Helvetica", FONT_HELVETICA);
      doc.registerFont("Helvetica-Bold", FONT_HELVETICA_BOLD);

      const W = 612;
      const MX = 48;
      const CW = W - MX * 2;
      let y = 0;

      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Helper to avoid pdfkit's internal font key resolution
      const font = (name: "Helvetica" | "Helvetica-Bold") => doc.font(name);

      // Header
      doc.rect(0, 0, W, 100).fill(C.headerBg);
      font("Helvetica-Bold").fontSize(24).fillColor(C.cyan).text("A1 MARINE CARE", MX, 28);
      font("Helvetica").fontSize(9).fillColor(C.white).text("Premium Boat Detailing & Protection", MX, 68);
      font("Helvetica").fontSize(8).fillColor(C.textMuted).text("(705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", MX, 82);
      font("Helvetica-Bold").fontSize(12).fillColor(C.cyan).text("CONDITION REPORT", 0, 30, { align: "right", width: W - MX });
      font("Helvetica").fontSize(8).fillColor(C.white).text(dateStr, 0, 48, { align: "right", width: W - MX });
      font("Helvetica").fontSize(8).fillColor(C.textMuted).text("AI-Powered Analysis", 0, 60, { align: "right", width: W - MX });

      y = 128;

      // Image
      if (image) {
        try {
          const imgData = image.includes(",") ? image.split(",")[1] : image;
          const imgBuffer = Buffer.from(imgData, "base64");
          doc.rect(MX, y, CW, 120).fill(C.cardGray);
          doc.image(imgBuffer, MX, y, { fit: [CW, 120], align: "center", valign: "center" });
          console.log("[PDF] Image embedded");
          y += 140;
        } catch (err) {
          console.error("[PDF] Image embedding FAILED:", err);
          y += 20;
        }
      }

      // Summary
      font("Helvetica-Bold").fontSize(11).fillColor(C.text).text("Summary", MX, y);
      y += 16;
      font("Helvetica").fontSize(9.5).fillColor(C.textLight).text(report.summary || "No summary available.", MX, y, { width: CW });
      y += 30;

      // Assessment header
      doc.roundedRect(MX, y, CW, 24, 3).fill(C.headerBg);
      font("Helvetica-Bold").fontSize(8).fillColor(C.white).text("CONDITION ASSESSMENT", MX + 14, y + 8);
      y += 24;

      // Three assessment boxes
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
        font("Helvetica").fontSize(7).fillColor(C.textMuted).text(a.label.toUpperCase(), ax + 12, y + 10);
        const valColor = LEVEL_COLORS[a.value] || C.textLight;
        font("Helvetica-Bold").fontSize(16).fillColor(valColor).text(a.value.toUpperCase(), ax + 12, y + 24);
      }
      y += 64;

      // Likely issues
      if (report.likelyIssues && report.likelyIssues.length > 0) {
        doc.roundedRect(MX, y, CW, 24, 3).fill(C.headerBg);
        font("Helvetica-Bold").fontSize(8).fillColor(C.white).text("LIKELY ISSUES DETECTED", MX + 14, y + 8);
        y += 24;
        const issueBoxH = 14 + report.likelyIssues.length * 20;
        doc.roundedRect(MX, y, CW, issueBoxH, 4).fill("#FFF8F8");
        doc.rect(MX, y, 3, issueBoxH).fill(C.red);
        for (let i = 0; i < report.likelyIssues.length; i++) {
          font("Helvetica").fontSize(7).fillColor(C.red).text("\u2022", MX + 12, y + 12 + i * 20, { lineBreak: false });
          font("Helvetica").fontSize(9).fillColor(C.textLight).text(
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
        font("Helvetica-Bold").fontSize(8).fillColor(C.white).text("RECOMMENDED SERVICES", MX + 14, y + 8);
        y += 24;
        const recBoxH = 14 + report.recommendedServices.length * 20;
        doc.roundedRect(MX, y, CW, recBoxH, 4).fill("#F0FFFE");
        doc.rect(MX, y, 3, recBoxH).fill(C.cyan);
        for (let i = 0; i < report.recommendedServices.length; i++) {
          const svcName = SERVICE_NAMES[report.recommendedServices[i]] || report.recommendedServices[i];
          font("Helvetica").fontSize(7).fillColor(C.cyan).text("\u2022", MX + 12, y + 12 + i * 20, { lineBreak: false });
          font("Helvetica-Bold").fontSize(9).fillColor(C.text).text(svcName, MX + 24, y + 10 + i * 20, { width: CW - 36 });
        }
        y += recBoxH + 16;
      }

      // Confidence note
      if (report.confidenceNote) {
        if (y > 620) { doc.addPage(); y = 40; }
        doc.roundedRect(MX, y, CW, 50, 4).fill(C.tableBg);
        font("Helvetica").fontSize(8).fillColor(C.textMuted).text("Assessment Note", MX + 14, y + 10);
        font("Helvetica").fontSize(9).fillColor(C.textLight).text(report.confidenceNote, MX + 14, y + 26, { width: CW - 28 });
        y += 66;
      }

      // Next steps
      if (y > 580) { doc.addPage(); y = 40; }
      doc.roundedRect(MX, y, CW, 64, 4).fill("#F0FFFE");
      doc.rect(MX, y, 3, 64).fill(C.cyan);
      font("Helvetica-Bold").fontSize(9).fillColor(C.text).text("Next Steps", MX + 16, y + 10);
      font("Helvetica").fontSize(8.5).fillColor(C.textLight).text(
        "Get a quote, book your service, or contact us to discuss the recommended treatments for your vessel.",
        MX + 16, y + 26, { width: CW - 32 }
      );
      font("Helvetica-Bold").fontSize(8.5).fillColor(C.cyan).text("Get a Quote: a1marinecare.ca/quote", MX + 16, y + 42);
      font("Helvetica-Bold").fontSize(8.5).fillColor(C.cyan).text("Book a Service: a1marinecare.ca/booking", MX + 16, y + 56);
      y += 80;

      // Disclaimer
      font("Helvetica").fontSize(7).fillColor(C.textMuted).text(
        "AI-generated report for visualization and guidance only. Final recommendations depend on boat condition and in-person assessment.",
        MX, y + 10, { width: CW, align: "center" }
      );

      // Footer
      const footerY = 792 - 36;
      doc.rect(0, footerY, W, 36).fill(C.headerBg);
      font("Helvetica").fontSize(7).fillColor(C.textMuted).text(
        "A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca",
        0, footerY + 10, { align: "center", width: W }
      );
      font("Helvetica").fontSize(6.5).fillColor("#555555").text(
        "Serving Georgian Bay, Lake Simcoe, and Muskoka  —  Trusted by boat owners across Ontario's premier boating regions.",
        0, footerY + 22, { align: "center", width: W }
      );

      console.log("[PDF] Calling doc.end()...");
      doc.end();
      console.log("[PDF] doc.end() called, waiting for buffer...");
    } catch (err) {
      reject(err);
    }
  });
}

export async function POST(request: Request) {
  try {
    const params: ConditionReportPDFParams = await request.json();
    const { report, image } = params;

    console.log("[PDF Route] POST /api/condition-report/pdf");
    console.log("[PDF Route] report:", !!report, "| image:", !!image);

    if (!report) {
      return NextResponse.json({ error: "report is required" }, { status: 400 });
    }

    console.log("[PDF Route] Generating PDF...");
    const pdfBuffer = await buildPDF(report, image);
    console.log("[PDF Route] PDF generated, size:", pdfBuffer.length);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="A1-Boat-Condition-Report-${Date.now()}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("[PDF Route] FATAL:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
