import type { Inspection } from "./types";

/** Generates a professional PDF inspection report with a QR code. */
export async function generateReport(insp: Inspection) {
  const { jsPDF } = await import("jspdf");
  const QRCode = (await import("qrcode")).default;

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const M = 40;
  let y = 0;

  const navy: [number, number, number] = [17, 39, 74];
  const gray: [number, number, number] = [90, 100, 115];

  // Header
  doc.setFillColor(...navy);
  doc.rect(0, 0, W, 78, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold").setFontSize(15);
  doc.text("SIH Prototype – Legal Metrology Inspection Report", M, 34);
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text("Smart Legal Metrology Inspector · AI-assisted packaged commodity compliance", M, 52);
  doc.text("Prototype output – not an official government certificate", M, 66);
  y = 100;

  const qrData = await QRCode.toDataURL(`SLMI-INSPECTION:${insp.id}`, { margin: 1, width: 200 });
  doc.addImage(qrData, "PNG", W - M - 78, 92, 78, 78);

  doc.setTextColor(0, 0, 0);
  const kv = (k: string, v: string) => {
    doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...gray);
    doc.text(k, M, y);
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(20, 20, 20);
    doc.text(doc.splitTextToSize(v || "—", W - 2 * M - 110), M + 130, y);
    y += 20;
  };

  kv("Inspection ID", insp.id);
  kv("Date & Time", new Date(insp.createdAt).toLocaleString());
  kv("Product Name", insp.productName);
  kv("Source", insp.source);
  kv("OCR Confidence", `${insp.ocrConfidence}%`);
  kv(
    "Category",
    `${insp.category ?? "UNKNOWN"} (${Math.round(insp.categoryConfidence ?? 0)}% confidence)${
      insp.categoryVerificationRequired ? " — inspector verification required" : ""
    }`,
  );
  kv("Prototype Score", `${insp.score.total}/100 (${insp.status})`);

  y += 6;
  if (insp.imageDataUrl) {
    try {
      doc.addImage(insp.imageDataUrl, "JPEG", M, y, 150, 110);
    } catch {
      /* ignore unsupported image */
    }
  }

  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(...navy);
  doc.text("Score breakdown", M + 170, y + 12);
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(40, 40, 40);
  doc.text(
    [
      `Mandatory declarations: ${insp.score.declarations}/60`,
      `Correct formatting: ${insp.score.formatting}/20`,
      `Readability & detection: ${insp.score.readability}/10`,
      `Other checks: ${insp.score.other}/10`,
    ],
    M + 170,
    y + 30,
  );
  y += 130;

  const section = (title: string) => {
    if (y > 720) {
      doc.addPage();
      y = 60;
    }
    doc.setFillColor(240, 243, 248);
    doc.rect(M, y - 12, W - 2 * M, 20, "F");
    doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...navy);
    doc.text(title, M + 8, y + 2);
    y += 26;
    doc.setTextColor(30, 30, 30);
  };

  section("Extracted Details");
  doc.setFontSize(9);
  for (const f of insp.fields) {
    if (y > 780) {
      doc.addPage();
      y = 60;
    }
    doc.setFont("helvetica", "bold").text(`${f.label}:`, M, y);
    doc.setFont("helvetica", "normal").text(
      doc.splitTextToSize(`${f.value ?? "Not detected"}  (${f.present ? "Present" : "Missing"}, ${f.confidence}% confidence)`, W - 2 * M - 170),
      M + 170,
      y,
    );
    y += 14;
  }

  y += 10;
  const passed = insp.checks.filter((c) => c.status === "pass");
  const warned = insp.checks.filter((c) => c.status === "warn");
  const failed = insp.checks.filter((c) => c.status === "fail");

  section(`Passed Checks (${passed.length})`);
  doc.setFontSize(9).setFont("helvetica", "normal");
  for (const c of passed) {
    if (y > 780) {
      doc.addPage();
      y = 60;
    }
    doc.text(doc.splitTextToSize(`${c.rule_id} — ${c.requirement}`, W - 2 * M), M, y);
    y += 13;
  }

  const detailBlock = (title: string, items: typeof failed) => {
    y += 10;
    section(title);
    doc.setFontSize(9);
    for (const c of items) {
      if (y > 700) {
        doc.addPage();
        y = 60;
      }
      doc.setFont("helvetica", "bold").text(`${c.rule_id} · ${c.severity} · ${c.field}`, M, y);
      y += 13;
      doc.setFont("helvetica", "normal");
      for (const line of [
        `Requirement: ${c.requirement}`,
        `Why flagged: ${c.why}`,
        `Detected evidence: ${c.evidence}`,
        `Suggested action: ${c.action}`,
        `Source: ${c.source ?? "Legal Metrology (Packaged Commodities) Rules, 2011"}`,
        `Inspector verification: ${c.verificationRequired ? "Required" : "Not required"}`,
      ]) {
        const wrapped = doc.splitTextToSize(line, W - 2 * M - 10);
        doc.text(wrapped, M + 10, y);
        y += 12 * wrapped.length;
      }
      y += 6;
    }
    if (!items.length) {
      doc.setFont("helvetica", "normal").text("None", M, y);
      y += 13;
    }
  };

  detailBlock(`Warnings (${warned.length})`, warned);
  detailBlock(`Violations (${failed.length})`, failed);

  const verify = insp.checks.filter((c) => c.verificationRequired);
  y += 10;
  section(`Inspector Verification Required (${verify.length})`);
  doc.setFontSize(9).setFont("helvetica", "normal");
  for (const c of verify) {
    if (y > 780) {
      doc.addPage();
      y = 60;
    }
    doc.text(doc.splitTextToSize(`${c.rule_id} — ${c.requirement}`, W - 2 * M), M, y);
    y += 13;
  }
  if (!verify.length) {
    doc.text("None", M, y);
    y += 13;
  }

  y += 10;
  section("Inspector Notes");
  doc.setFont("helvetica", "normal").setFontSize(9);
  doc.text(doc.splitTextToSize(insp.notes || "—", W - 2 * M), M, y);
  y += 40;

  if (y > 700) {
    doc.addPage();
    y = 60;
  }
  doc.setFontSize(8).setTextColor(...gray);
  doc.text(
    doc.splitTextToSize(
      "Disclaimer: This report is produced by an AI-assisted prototype built for Smart India Hackathon 2026 (PS 26034). Rules are configurable prototype requirements derived from the problem statement and must be verified against the latest applicable official notification. Final legal determination rests with an authorised Legal Metrology inspector.",
      W - 2 * M,
    ),
    M,
    y,
  );

  doc.save(`${insp.id}-legal-metrology-report.pdf`);
}
