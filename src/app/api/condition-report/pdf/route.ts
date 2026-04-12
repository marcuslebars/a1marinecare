import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import type { ConditionReport } from "@/app/api/condition-report/route";

const C = {
  black: "#000000",
  darkGray: "#1A1A1A",
  cardGray: "#2B2B2B",
  cyan: "#00CED1",
  cyanLight: "#E0FFFE",
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

export async function POST(request: Request) {
  try {
    const params: ConditionReportPDFParams = await request.json();
    const { report, image } = params;

    return new Promise<Response>((resolve, reject) => {
      const doc = new PDFDocument({ size: "letter", margin: 0 });
      const chunks: Uint8Array[] = [];

      doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
      doc.on("end", () => {
        const buffer = Buffer.concat(chunks);
        resolve(
          new Response(buffer, {
            status: 200,
            headers: {
              "Content-Type": "application/pdf",
              "Content-Disposition": `attachment; filename="A1-Boat-Condition-Report-${Date.now()}.pdf"`,
              "Content-Length": buffer.length.toString(),
            },
          })
        );
      });
      doc.on("error", reject);

      const W = 612;
      const MX = 48;
      const CW = W - MX * 2;
      let y = 0;

      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const headerH = 100;
      doc.rect(0, 0, W, headerH).fill(C.headerBg);

      doc
        .fillColor(C.cyan)
        .font("Helvetica-Bold")
        .fontSize(24)
        .text("A1 MARINE CARE", MX, 28);
      doc
        .fillColor(C.white)
        .font("Helvetica")
        .fontSize(9)
        .text("Premium Boat Detailing & Protection", MX, 68);
      doc
        .fillColor(C.textMuted)
        .fontSize(8)
        .text(
          "(705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca",
          MX,
          82
        );

      doc
        .fillColor(C.cyan)
        .font("Helvetica-Bold")
        .fontSize(12)
        .text("CONDITION REPORT", 0, 30, { align: "right", width: W - MX });
      doc
        .fillColor(C.white)
        .font("Helvetica")
        .fontSize(8)
        .text(dateStr, 0, 48, { align: "right", width: W - MX });
      doc
        .fillColor(C.textMuted)
        .fontSize(8)
        .text("AI-Powered Analysis", 0, 60, {
          align: "right",
          width: W - MX,
        });

      y = headerH + 24;

      if (image) {
        try {
          const imgData = image.includes(",") ? image.split(",")[1] : image;
          const imgBuffer = Buffer.from(imgData, "base64");
          const imgH = 120;
          doc.rect(MX, y, CW, imgH).fill(C.cardGray);
          doc.image(imgBuffer, MX, y, {
            fit: [CW, imgH],
            align: "center",
            valign: "center",
          });
          y += imgH + 20;
        } catch {
          y += 20;
        }
      }

      doc
        .fillColor(C.text)
        .font("Helvetica-Bold")
        .fontSize(11)
        .text("Summary", MX, y);
      y += 16;

      doc
        .fillColor(C.textLight)
        .font("Helvetica")
        .fontSize(9.5)
        .text(report.summary || "No summary available.", MX, y, {
          width: CW,
        });
      y += 30;

      const assessmentTitleH = 24;
      doc
        .roundedRect(MX, y, CW, assessmentTitleH, 3)
        .fill(C.headerBg);
      doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8);
      doc.text("CONDITION ASSESSMENT", MX + 14, y + 8);
      y += assessmentTitleH;

      const assessments = [
        { label: "Oxidation Level", value: report.oxidationLevel },
        { label: "Gloss Level", value: report.glossLevel },
        { label: "Cleanliness", value: report.cleanlinessLevel },
      ];

      const colW = (CW - 24) / 3;
      for (let i = 0; i < assessments.length; i++) {
        const a = assessments[i];
        const ax = MX + i * (colW + 8);
        const boxH = 52;

        doc
          .roundedRect(ax, y, colW, boxH, 4)
          .lineWidth(0.5)
          .strokeColor(C.border)
          .stroke();

        doc
          .fillColor(C.textMuted)
          .font("Helvetica")
          .fontSize(7)
          .text(a.label.toUpperCase(), ax + 12, y + 10);

        const valColor = LEVEL_COLORS[a.value] || C.textLight;
        doc
          .fillColor(valColor)
          .font("Helvetica-Bold")
          .fontSize(16)
          .text(a.value.toUpperCase(), ax + 12, y + 24);
        y += boxH + 12;
      }

      y += 8;

      if (report.likelyIssues && report.likelyIssues.length > 0) {
        const issuesTitleH = 24;
        doc
          .roundedRect(MX, y, CW, issuesTitleH, 3)
          .fill(C.headerBg);
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8);
        doc.text("LIKELY ISSUES DETECTED", MX + 14, y + 8);
        y += issuesTitleH;

        const issueBoxH = 14 + report.likelyIssues.length * 20;
        doc.roundedRect(MX, y, CW, issueBoxH, 4).fill("#FFF8F8");
        doc.rect(MX, y, 3, issueBoxH).fill(C.red);

        for (let i = 0; i < report.likelyIssues.length; i++) {
          doc
            .fillColor(C.red)
            .fontSize(7)
            .text("\u2022", MX + 12, y + 12 + i * 20, {
              lineBreak: false,
            });
          doc
            .fillColor(C.textLight)
            .font("Helvetica")
            .fontSize(9)
            .text(
              report.likelyIssues[i] || "",
              MX + 24,
              y + 10 + i * 20,
              { width: CW - 36 }
            );
        }
        y += issueBoxH + 16;
      }

      if (report.recommendedServices && report.recommendedServices.length > 0) {
        if (y > 580) {
          doc.addPage({ size: "letter", margin: 0 });
          y = 40;
        }

        const recTitleH = 24;
        doc
          .roundedRect(MX, y, CW, recTitleH, 3)
          .fill(C.headerBg);
        doc.fillColor(C.white).font("Helvetica-Bold").fontSize(8);
        doc.text("RECOMMENDED SERVICES", MX + 14, y + 8);
        y += recTitleH;

        const recBoxH = 14 + report.recommendedServices.length * 20;
        doc.roundedRect(MX, y, CW, recBoxH, 4).fill("#F0FFFE");
        doc.rect(MX, y, 3, recBoxH).fill(C.cyan);

        for (let i = 0; i < report.recommendedServices.length; i++) {
          const svcName =
            SERVICE_NAMES[report.recommendedServices[i]] ||
            report.recommendedServices[i];
          doc
            .fillColor(C.cyan)
            .fontSize(7)
            .text("\u2022", MX + 12, y + 12 + i * 20, {
              lineBreak: false,
            });
          doc
            .fillColor(C.text)
            .font("Helvetica-Bold")
            .fontSize(9)
            .text(svcName, MX + 24, y + 10 + i * 20, {
              width: CW - 36,
            });
        }
        y += recBoxH + 16;
      }

      if (report.confidenceNote) {
        if (y > 620) {
          doc.addPage({ size: "letter", margin: 0 });
          y = 40;
        }
        const noteBoxH = 50;
        doc.roundedRect(MX, y, CW, noteBoxH, 4).fill(C.tableBg);
        doc
          .fillColor(C.textMuted)
          .font("Helvetica")
          .fontSize(8)
          .text("Assessment Note", MX + 14, y + 10);
        doc
          .fillColor(C.textLight)
          .font("Helvetica")
          .fontSize(9)
          .text(report.confidenceNote, MX + 14, y + 26, {
            width: CW - 28,
          });
        y += noteBoxH + 16;
      }

      if (y > 580) {
        doc.addPage({ size: "letter", margin: 0 });
        y = 40;
      }

      doc.roundedRect(MX, y, CW, 64, 4).fill("#F0FFFE");
      doc.rect(MX, y, 3, 64).fill(C.cyan);
      doc
        .fillColor(C.text)
        .font("Helvetica-Bold")
        .fontSize(9)
        .text("Next Steps", MX + 16, y + 10);
      doc
        .fillColor(C.textLight)
        .font("Helvetica")
        .fontSize(8.5)
        .text(
          "Get a quote, book your service, or contact us to discuss the recommended treatments for your vessel.",
          MX + 16,
          y + 26,
          { width: CW - 32 }
        );

      const ctaY = y + 42;
      doc
        .fillColor(C.cyan)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text("Get a Quote: a1marinecare.ca/quote", MX + 16, ctaY);
      doc
        .fillColor(C.cyan)
        .font("Helvetica-Bold")
        .fontSize(8.5)
        .text("Book a Service: a1marinecare.ca/booking", MX + 16, ctaY + 14);
      y += 80;

      const disclaimerY = y;
      const disclaimerH = 36;
      if (disclaimerY + disclaimerH > 750) {
        doc.addPage({ size: "letter", margin: 0 });
      }

      doc
        .fillColor(C.textMuted)
        .font("Helvetica")
        .fontSize(7)
        .text(
          "AI-generated report for visualization and guidance only. Final recommendations depend on boat condition and in-person assessment. Results may vary based on image quality, lighting, and visible surfaces. Contact A1 Marine Care for a definitive evaluation.",
          MX,
          disclaimerY + 10,
          { width: CW, align: "center" }
        );

      const footerH = 36;
      const footerY = 792 - footerH;
      doc.rect(0, footerY, W, footerH).fill(C.headerBg);

      doc
        .fillColor(C.textMuted)
        .font("Helvetica")
        .fontSize(7)
        .text(
          "A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca",
          0,
          footerY + 10,
          { align: "center", width: W }
        );
      doc
        .fillColor("#555555")
        .fontSize(6.5)
        .text(
          "Serving Georgian Bay, Lake Simcoe, and Muskoka  —  Trusted by boat owners across Ontario's premier boating regions.",
          0,
          footerY + 22,
          { align: "center", width: W }
        );

      doc.end();
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
