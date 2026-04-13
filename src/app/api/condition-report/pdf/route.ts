import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";
import type { ConditionReport } from "@/app/api/condition-report/route";

interface ConditionReportPDFParams {
  report: ConditionReport;
  image?: string;
}

function buildPDF(report: ConditionReport, _image: string | undefined): Promise<Uint8Array> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log("[PDF Route] Using pdf-lib implementation");

      const doc = await PDFDocument.create();
      const page = doc.addPage([612, 792]);

      const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
      const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

      console.log("[PDF Route] pdf-lib fonts embedded");

      const C = {
        cyan: rgb(0, 0.807, 0.82),
        white: rgb(1, 1, 1),
        text: rgb(0.2, 0.2, 0.2),
        textLight: rgb(0.4, 0.4, 0.4),
        textMuted: rgb(0.6, 0.6, 0.6),
        border: rgb(0.878, 0.878, 0.878),
        headerBg: rgb(0.067, 0.067, 0.067),
        emerald: rgb(0.063, 0.725, 0.506),
        amber: rgb(0.96, 0.62, 0.043),
        red: rgb(0.937, 0.267, 0.267),
        cardGray: rgb(0.169, 0.169, 0.169),
      };

      const LEVEL_COLORS: Record<string, typeof C.textLight> = {
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
      const FONT_HELVETICA = fontRegular;
      const FONT_HELVETICA_BOLD = fontBold;

      let y = 0;

      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Header background
      page.drawRectangle({ x: 0, y: 792 - 100, width: W, height: 100, color: C.headerBg });

      // Header text
      page.drawText("A1 MARINE CARE", {
        x: MX, y: 792 - 28 - 20,
        size: 24, font: FONT_HELVETICA_BOLD, color: C.cyan,
      });

      page.drawText("Premium Boat Detailing & Protection", {
        x: MX, y: 792 - 68 - 20,
        size: 9, font: FONT_HELVETICA, color: C.white,
      });

      page.drawText("(705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", {
        x: MX, y: 792 - 82 - 20,
        size: 8, font: FONT_HELVETICA, color: C.textMuted,
      });

      page.drawText("CONDITION REPORT", {
        x: 0, y: 792 - 30 - 20,
        size: 12, font: FONT_HELVETICA_BOLD, color: C.cyan,
        align: "right", maxWidth: W - MX,
      });

      page.drawText(dateStr, {
        x: 0, y: 792 - 48 - 20,
        size: 8, font: FONT_HELVETICA, color: C.white,
        align: "right", maxWidth: W - MX,
      });

      page.drawText("AI-Powered Analysis", {
        x: 0, y: 792 - 60 - 20,
        size: 8, font: FONT_HELVETICA, color: C.textMuted,
        align: "right", maxWidth: W - MX,
      });

      y = 792 - 128 - 20;

      // Image placeholder (skipped for now - text-only first)
      // TODO: Add image embedding once text-only PDF works
      y += 20;

      // Summary heading
      page.drawText("Summary", {
        x: MX, y,
        size: 11, font: FONT_HELVETICA_BOLD, color: C.text,
      });
      y -= 16;

      page.drawText(report.summary || "No summary available.", {
        x: MX, y,
        size: 9.5, font: FONT_HELVETICA, color: C.textLight,
        maxWidth: CW,
      });
      y -= 30;

      // Assessment header bar
      page.drawRectangle({ x: MX, y, width: CW, height: 24, color: C.headerBg });
      page.drawText("CONDITION ASSESSMENT", {
        x: MX + 14, y: y + 8,
        size: 8, font: FONT_HELVETICA_BOLD, color: C.white,
      });
      y -= 24;

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
        page.drawRectangle({ x: ax, y: y - 52, width: colW, height: 52, borderColor: C.border, borderWidth: 0.5 });
        page.drawText(a.label.toUpperCase(), {
          x: ax + 12, y: y - 10,
          size: 7, font: FONT_HELVETICA, color: C.textMuted,
        });
        const valColor = LEVEL_COLORS[a.value] || C.textLight;
        page.drawText(a.value.toUpperCase(), {
          x: ax + 12, y: y - 24,
          size: 16, font: FONT_HELVETICA_BOLD, color: valColor,
        });
      }
      y -= 52 + 12;

      // Likely issues
      if (report.likelyIssues && report.likelyIssues.length > 0) {
        page.drawRectangle({ x: MX, y, width: CW, height: 24, color: C.headerBg });
        page.drawText("LIKELY ISSUES DETECTED", {
          x: MX + 14, y: y + 8,
          size: 8, font: FONT_HELVETICA_BOLD, color: C.white,
        });
        y -= 24;

        const issueBoxH = 14 + report.likelyIssues.length * 20;
        page.drawRectangle({ x: MX, y: y - issueBoxH, width: CW, height: issueBoxH, color: rgb(1, 0.973, 0.973) });
        page.drawRectangle({ x: MX, y: y - issueBoxH, width: 3, height: issueBoxH, color: C.red });

        for (let i = 0; i < report.likelyIssues.length; i++) {
          page.drawText("\u2022", {
            x: MX + 12, y: y - issueBoxH + 12 + i * 20,
            size: 7, font: FONT_HELVETICA, color: C.red,
          });
          page.drawText(report.likelyIssues[i] || "", {
            x: MX + 24, y: y - issueBoxH + 10 + i * 20,
            size: 9, font: FONT_HELVETICA, color: C.textLight,
            maxWidth: CW - 36,
          });
        }
        y -= issueBoxH + 16;
      }

      // Recommended services
      if (report.recommendedServices && report.recommendedServices.length > 0) {
        if (y < 212) {
          doc.addPage();
          y = 792 - 40;
        }
        page.drawRectangle({ x: MX, y: y - 24, width: CW, height: 24, color: C.headerBg });
        page.drawText("RECOMMENDED SERVICES", {
          x: MX + 14, y: y - 24 + 8,
          size: 8, font: FONT_HELVETICA_BOLD, color: C.white,
        });
        y -= 24;

        const recBoxH = 14 + report.recommendedServices.length * 20;
        page.drawRectangle({ x: MX, y: y - recBoxH, width: CW, height: recBoxH, color: rgb(0.941, 1, 0.996) });
        page.drawRectangle({ x: MX, y: y - recBoxH, width: 3, height: recBoxH, color: C.cyan });

        for (let i = 0; i < report.recommendedServices.length; i++) {
          const svcName = SERVICE_NAMES[report.recommendedServices[i]] || report.recommendedServices[i];
          page.drawText("\u2022", {
            x: MX + 12, y: y - recBoxH + 12 + i * 20,
            size: 7, font: FONT_HELVETICA, color: C.cyan,
          });
          page.drawText(svcName, {
            x: MX + 24, y: y - recBoxH + 10 + i * 20,
            size: 9, font: FONT_HELVETICA_BOLD, color: C.text,
            maxWidth: CW - 36,
          });
        }
        y -= recBoxH + 16;
      }

      // Confidence note
      if (report.confidenceNote) {
        if (y < 172) {
          doc.addPage();
          y = 792 - 40;
        }
        page.drawRectangle({ x: MX, y: y - 50, width: CW, height: 50, color: C.border });
        page.drawText("Assessment Note", {
          x: MX + 14, y: y - 50 + 10,
          size: 8, font: FONT_HELVETICA, color: C.textMuted,
        });
        page.drawText(report.confidenceNote, {
          x: MX + 14, y: y - 50 + 26,
          size: 9, font: FONT_HELVETICA, color: C.textLight,
          maxWidth: CW - 28,
        });
        y -= 50 + 16;
      }

      // Next steps
      if (y < 212) {
        doc.addPage();
        y = 792 - 40;
      }
      page.drawRectangle({ x: MX, y: y - 64, width: CW, height: 64, color: rgb(0.941, 1, 0.996) });
      page.drawRectangle({ x: MX, y: y - 64, width: 3, height: 64, color: C.cyan });

      page.drawText("Next Steps", {
        x: MX + 16, y: y - 64 + 10,
        size: 9, font: FONT_HELVETICA_BOLD, color: C.text,
      });
      page.drawText("Get a quote, book your service, or contact us to discuss the recommended treatments for your vessel.", {
        x: MX + 16, y: y - 64 + 26,
        size: 8.5, font: FONT_HELVETICA, color: C.textLight,
        maxWidth: CW - 32,
      });
      page.drawText("Get a Quote: a1marinecare.ca/quote", {
        x: MX + 16, y: y - 64 + 42,
        size: 8.5, font: FONT_HELVETICA_BOLD, color: C.cyan,
      });
      page.drawText("Book a Service: a1marinecare.ca/booking", {
        x: MX + 16, y: y - 64 + 56,
        size: 8.5, font: FONT_HELVETICA_BOLD, color: C.cyan,
      });
      y -= 64 + 16;

      // Disclaimer
      page.drawText("AI-generated report for visualization and guidance only.", {
        x: MX, y: y - 10,
        size: 7, font: FONT_HELVETICA, color: C.textMuted,
        align: "center", maxWidth: CW,
      });

      // Footer
      const footerY = 36;
      page.drawRectangle({ x: 0, y: footerY, width: W, height: 36, color: C.headerBg });
      page.drawText("A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", {
        x: 0, y: footerY + 10,
        size: 7, font: FONT_HELVETICA, color: C.textMuted,
        align: "center", maxWidth: W,
      });
      page.drawText("Serving Georgian Bay, Lake Simcoe, and Muskoka.", {
        x: 0, y: footerY + 22,
        size: 6.5, font: FONT_HELVETICA, color: rgb(0.333, 0.333, 0.333),
        align: "center", maxWidth: W,
      });

      const pdfBytes = await doc.save();
      console.log("[PDF Route] pdf-lib bytes generated:", pdfBytes.length);
      resolve(pdfBytes);
    } catch (err) {
      console.error("[PDF Route] pdf-lib build error:", err);
      reject(err);
    }
  });
}

export async function POST(request: Request) {
  try {
    const params: ConditionReportPDFParams = await request.json();
    const { report, image } = params;

    console.log("[PDF Route] POST /api/condition-report/pdf");
    console.log("[PDF Route] Using pdf-lib implementation");

    if (!report) {
      return NextResponse.json({ error: "report is required" }, { status: 400 });
    }

    console.log("[PDF Route] report:", !!report, "| image:", !!image);

    const pdfBytes = await buildPDF(report, image);
    console.log("[PDF Route] PDF generated, size:", pdfBytes.length);

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