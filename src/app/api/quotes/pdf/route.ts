import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextResponse } from "next/server";

interface QuotePDFParams {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  boatLength: number;
  boatType: string;
  serviceLocation: string;
  services: Record<string, unknown>;
  estimatedTotal: number;
  breakdown: string[];
}

const BOAT_TYPE_NAMES: Record<string, string> = {
  bowrider: "Bowrider",
  cuddy: "Cuddy Cabin",
  cruiser: "Cruiser",
  express: "Express Cruiser",
  yacht: "Yacht / Multi-Cabin",
  sailboat: "Sailboat",
  pontoon: "Pontoon",
  other: "Other",
};

const SERVICE_NAMES: Record<string, string> = {
  gelcoat: "Gelcoat Restoration",
  exterior: "Exterior Detailing",
  interior: "Interior Detailing",
  ceramic: "Ceramic Coating",
  graphene: "Graphene Nano Coating",
  wetSanding: "Wet Sanding & Correction",
  bottomPainting: "Bottom Painting",
  vinyl: "Vinyl Removal & Installation",
};

const C = {
  cyan: rgb(0, 0.808, 0.82),
  white: rgb(1, 1, 1),
  text: rgb(0.2, 0.2, 0.2),
  textLight: rgb(0.4, 0.4, 0.4),
  textMuted: rgb(0.6, 0.6, 0.6),
  border: rgb(0.878, 0.878, 0.878),
  tableBg: rgb(0.973, 0.973, 0.973),
  headerBg: rgb(0.067, 0.067, 0.067),
  cardGray: rgb(0.169, 0.169, 0.169),
  tealLight: rgb(0.941, 1, 0.996),
};

const W = 612;
const MX = 48;
const CW = W - MX * 2;

function addHeader(page: ReturnType<PDFDocument["addPage"]>, fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, dateStr: string, quoteId: string) {
  page.drawRectangle({ x: 0, y: 792 - 100, width: W, height: 100, color: C.headerBg });
  page.drawText("A1 MARINE CARE", { x: MX, y: 792 - 28, size: 24, font: fontBold, color: C.cyan });
  page.drawText("Premium Boat Detailing & Protection", { x: MX, y: 792 - 52, size: 9, font, color: C.white });
  page.drawText("(705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", { x: MX, y: 792 - 68, size: 8, font, color: C.textMuted });
  page.drawText("ESTIMATE", { x: W - MX - fontBold.widthOfTextAtSize("ESTIMATE", 12), y: 792 - 30, size: 12, font: fontBold, color: C.cyan });
  page.drawText(dateStr, { x: W - MX - font.widthOfTextAtSize(dateStr, 8), y: 792 - 46, size: 8, font, color: C.white });
  page.drawText(`Quote #${quoteId}`, { x: W - MX - font.widthOfTextAtSize(`Quote #${quoteId}`, 8), y: 792 - 58, size: 8, font, color: C.textMuted });
}

function addFooter(page: ReturnType<PDFDocument["addPage"]>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>) {
  const fy = 36;
  page.drawRectangle({ x: 0, y: fy, width: W, height: 36, color: C.headerBg });
  page.drawText("A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", {
    x: W / 2 - font.widthOfTextAtSize("A1 Marine Care  |  (705) 996-1010  |  contact@a1marinecare.ca  |  a1marinecare.ca", 7) / 2,
    y: fy + 10, size: 7, font, color: C.textMuted,
  });
  page.drawText("Serving Georgian Bay, Lake Simcoe, and Muskoka.", {
    x: W / 2 - font.widthOfTextAtSize("Serving Georgian Bay, Lake Simcoe, and Muskoka.", 6.5) / 2,
    y: fy + 22, size: 6.5, font, color: rgb(0.333, 0.333, 0.333),
  });
}

function checkPage(cursor: number, minY: number, doc: PDFDocument, fontBold: Awaited<ReturnType<PDFDocument["embedFont"]>>, font: Awaited<ReturnType<PDFDocument["embedFont"]>>, dateStr: string, quoteId: string) {
  if (cursor < minY) {
    const newPage = doc.addPage([W, 792]);
    addHeader(newPage, fontBold, font, dateStr, quoteId);
    return { page: newPage, cursor: 792 - 120 };
  }
  return null;
}

async function buildPDF(params: QuotePDFParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  let page = doc.addPage([W, 792]);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const quoteId = `A1-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const boatTypeName = BOAT_TYPE_NAMES[params.boatType] || params.boatType;
  const totalDollars = params.estimatedTotal / 100;

  addHeader(page, fontBold, font, dateStr, quoteId);
  let y = 792 - 120;

  const infoBoxH = 80;
  const halfW = CW / 2 - 6;

  page.drawRectangle({ x: MX, y: y - infoBoxH, width: halfW, height: infoBoxH, borderColor: C.border, borderWidth: 0.5 });
  page.drawText("CLIENT", { x: MX + 14, y: y - infoBoxH + 12, size: 7, font: fontBold, color: C.cyan });
  page.drawText(params.customerName, { x: MX + 14, y: y - infoBoxH + 26, size: 11, font: fontBold, color: C.text });
  page.drawText(params.customerEmail, { x: MX + 14, y: y - infoBoxH + 42, size: 8.5, font, color: C.textLight });
  page.drawText(params.customerPhone, { x: MX + 14, y: y - infoBoxH + 55, size: 8.5, font, color: C.textLight });

  const rx = MX + halfW + 12;
  page.drawRectangle({ x: rx, y: y - infoBoxH, width: halfW, height: infoBoxH, borderColor: C.border, borderWidth: 0.5 });
  page.drawText("VESSEL", { x: rx + 14, y: y - infoBoxH + 12, size: 7, font: fontBold, color: C.cyan });
  page.drawText(`${params.boatLength}' ${boatTypeName}`, { x: rx + 14, y: y - infoBoxH + 26, size: 11, font: fontBold, color: C.text });
  page.drawText(`Location: ${params.serviceLocation || "TBD"}`, { x: rx + 14, y: y - infoBoxH + 42, size: 8.5, font, color: C.textLight });

  const activeServices = Object.keys(params.services).map((k) => SERVICE_NAMES[k] || k);
  if (activeServices.length > 0) {
    page.drawText(`${activeServices.length} service${activeServices.length > 1 ? "s" : ""} selected`, { x: rx + 14, y: y - infoBoxH + 55, size: 8.5, font, color: C.textLight });
  }

  y -= infoBoxH + 20;

  page.drawRectangle({ x: MX, y: y - 24, width: CW, height: 24, color: C.headerBg });
  page.drawText("SERVICE DESCRIPTION", { x: MX + 14, y: y - 24 + 8, size: 8, font: fontBold, color: C.white });
  page.drawText("AMOUNT", { x: W - MX - 14 - fontBold.widthOfTextAtSize("AMOUNT", 8), y: y - 24 + 8, size: 8, font: fontBold, color: C.white });
  y -= 24;

  let rowIndex = 0;
  let currentSection = "";

  for (const line of params.breakdown) {
    if (y < 112) {
      const result = checkPage(y, 112, doc, fontBold, font, dateStr, quoteId);
      if (result) { page = result.page; y = result.cursor; }
    }

    if (line.startsWith("---")) {
      currentSection = line.replace(/^-+s*/, "").replace(/s*-+$/, "").trim();
      const sectionH = 28;
      page.drawRectangle({ x: MX, y: y - sectionH, width: 3, height: sectionH, color: C.cyan });
      page.drawRectangle({ x: MX + 3, y: y - sectionH, width: CW - 3, height: sectionH, color: C.tealLight });
      page.drawText(currentSection, { x: MX + 16, y: y - sectionH + 9, size: 9.5, font: fontBold, color: C.text });
      y -= sectionH;
      rowIndex = 0;
    } else if (line.includes("$")) {
      const rowH = 22;
      if (rowIndex % 2 === 1) {
        page.drawRectangle({ x: MX, y: y - rowH, width: CW, height: rowH, color: C.tableBg });
      }

      let description = line;
      let price = "";
      const dollarParts = line.split(/\$(?=[0-9])/);
      if (dollarParts.length >= 2) {
        const lastAmount = dollarParts[dollarParts.length - 1].trim();
        price = `$${lastAmount}`;
        const eqIdx = line.lastIndexOf("= $");
        const colonIdx = line.lastIndexOf(": $");
        if (eqIdx > -1 && eqIdx > colonIdx) {
          description = line.substring(0, eqIdx).trim();
        } else if (colonIdx > -1) {
          description = line.substring(0, colonIdx).trim();
        } else {
          description = dollarParts.slice(0, -1).join("$").trim();
        }
      }

      const rangeMatch = line.match(/\$([0-9,]+)\s*[–-]\s*\$([0-9,]+)/);
      if (rangeMatch) {
        price = `$${rangeMatch[1]} – $${rangeMatch[2]}`;
        const rangeIdx = line.indexOf("$");
        description = line.substring(0, rangeIdx).replace(/:\s*$/, "").trim();
      }

      page.drawText(description, { x: MX + 16, y: y - rowH + 6, size: 8.5, font, color: C.textLight, maxWidth: 340 });
      page.drawText(price, { x: W - MX - 14 - fontBold.widthOfTextAtSize(price, 9), y: y - rowH + 6, size: 9, font: fontBold, color: C.text });
      y -= rowH;
      rowIndex++;
    } else if (line.trim()) {
      const rowH = 18;
      page.drawText(line.trim(), { x: MX + 24, y: y - rowH + 5, size: 7.5, font, color: C.textMuted, maxWidth: 380 });
      y -= rowH;
    }
  }

  y -= 12;
  page.drawRectangle({ x: MX, y, width: CW, height: 1, color: C.border });
  y -= 16;

  const totalsX = MX + CW - 240;
  page.drawText("Estimated Total", { x: totalsX, y, size: 9, font, color: C.textLight });
  page.drawText(`$${totalDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, { x: W - MX - fontBold.widthOfTextAtSize(`$${totalDollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18), y: y - 2, size: 18, font: fontBold, color: C.text });
  y -= 28;

  page.drawRectangle({ x: totalsX, y, width: CW - (totalsX - MX), height: 0.5, color: C.border });
  y -= 10;

  page.drawText("Booking Request", { x: totalsX, y, size: 8.5, font, color: C.textLight });
  page.drawText("Due upon receipt", { x: W - MX - fontBold.widthOfTextAtSize("Due upon receipt", 12), y: y, size: 12, font: fontBold, color: C.text });
  y -= 30;

  if (y < 100) {
    page = doc.addPage([W, 792]);
    addHeader(page, fontBold, font, dateStr, quoteId);
    y = 792 - 120;
  }

  page.drawRectangle({ x: MX, y: y - 48, width: CW, height: 48, color: C.tealLight });
  page.drawRectangle({ x: MX, y: y - 48, width: 3, height: 48, color: C.cyan });
  page.drawText("Next Steps", { x: MX + 16, y: y - 48 + 10, size: 8.5, font: fontBold, color: C.text });
  page.drawText("Reserve your preferred service date online. After booking, our team will follow up to confirm scheduling, scope, access requirements, and any final service details.", {
    x: MX + 16, y: y - 48 + 24, size: 8, font, color: C.textLight, maxWidth: CW - 32,
  });
  y -= 48 + 14;

  const services = params.services as Record<string, { heavyOxidation?: boolean; blisterRepair?: boolean }>;
  const notes: string[] = [];
  if (services.interior) {
    notes.push("Interior: After booking, we may send you an email requesting 3-10 interior photos so our team can confirm the scope and prepare for your service.");
  }
  if (services.gelcoat?.heavyOxidation) {
    notes.push("Gelcoat: A 20% heavy oxidation surcharge has been applied to the base gelcoat service price.");
  }
  if (services.bottomPainting?.blisterRepair) {
    notes.push("Bottom Painting: Blister repair requires on-site inspection. Final pricing will be confirmed upon arrival.");
  }
  if (services.wetSanding) {
    notes.push("Wet Sanding: Final results depend on the depth and severity of surface imperfections.");
  }
  notes.push("This estimate is valid for 30 days from the date above. Final price may vary based on actual vessel condition upon inspection.");

  for (const note of notes) {
    if (y < 80) {
      const result = checkPage(y, 80, doc, fontBold, font, dateStr, quoteId);
      if (result) { page = result.page; y = result.cursor; }
    }
    page.drawText("\u2022", { x: MX + 4, y, size: 7, font, color: C.cyan });
    page.drawText(note, { x: MX + 16, y, size: 7.5, font, color: C.textMuted, maxWidth: CW - 16 });
    y -= 22;
  }

  addFooter(page, font);

  return doc.save();
}

export async function POST(request: Request) {
  try {
    const params: QuotePDFParams = await request.json();

    console.log("[Quote PDF] Building PDF for:", params.customerName);

    const pdfBytes = await buildPDF(params);

    console.log("[Quote PDF] Generated:", pdfBytes.length, "bytes");

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="A1-Quote-${params.customerName.replace(/\s+/g, "-")}-${Date.now()}.pdf"`,
        "Content-Length": String(pdfBytes.length),
      },
    });
  } catch (err) {
    console.error("[Quote PDF] FATAL:", err);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
