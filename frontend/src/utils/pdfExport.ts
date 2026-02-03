import { jsPDF } from "jspdf";
import type { Segment } from "@/types";

interface PdfExportOptions {
  fileName: string;
  segments: Segment[];
  showAnonymized: boolean;
  metadata: {
    duration: number | null;
    speakerCount: number;
    wordCount: number;
    segmentCount: number;
    createdAt: string;
  };
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "-";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function exportToPdf(options: PdfExportOptions): void {
  const { fileName, segments, showAnonymized, metadata } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = margin;

  // Helper to add new page if needed
  const checkPageBreak = (requiredSpace: number) => {
    if (yPos + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPos = margin;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("Transkription", margin, yPos);
  yPos += 10;

  // File name
  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(fileName, margin, yPos);
  yPos += 12;

  // Metadata box
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, yPos, contentWidth, 28, 3, 3, "F");

  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  const metaCol1 = margin + 5;
  const metaCol2 = margin + contentWidth / 4;
  const metaCol3 = margin + (contentWidth / 4) * 2;
  const metaCol4 = margin + (contentWidth / 4) * 3;

  // Row 1
  yPos += 8;
  doc.text("Skapad", metaCol1, yPos);
  doc.text("Längd", metaCol2, yPos);
  doc.text("Talare", metaCol3, yPos);
  doc.text("Ord", metaCol4, yPos);

  // Row 2 (values)
  yPos += 6;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "bold");
  doc.text(formatDate(metadata.createdAt), metaCol1, yPos);
  doc.text(formatDuration(metadata.duration), metaCol2, yPos);
  doc.text(String(metadata.speakerCount || "-"), metaCol3, yPos);
  doc.text(metadata.wordCount.toLocaleString(), metaCol4, yPos);

  yPos += 22;

  // Anonymization notice
  if (showAnonymized && segments.some((s) => s.anonymized_text && s.anonymized_text !== s.text)) {
    doc.setFillColor(254, 243, 199);
    doc.roundedRect(margin, yPos, contentWidth, 10, 2, 2, "F");
    doc.setFontSize(9);
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "normal");
    doc.text("Detta dokument innehåller avidentifierad text", margin + 5, yPos + 6);
    yPos += 18;
  }

  // Transcript content
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);

  for (const segment of segments) {
    const text = showAnonymized && segment.anonymized_text
      ? segment.anonymized_text
      : segment.text;

    // Check if we need a new page before the speaker header
    checkPageBreak(25);

    // Speaker and timestamp header
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    const timeStr = `[${formatTime(segment.start_time)} - ${formatTime(segment.end_time)}]`;
    const speaker = segment.speaker || "Okänd talare";

    // Speaker name
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246); // Blue
    doc.text(speaker, margin, yPos);

    // Timestamp
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    const speakerWidth = doc.getTextWidth(speaker);
    doc.text(`  ${timeStr}`, margin + speakerWidth, yPos);

    yPos += 6;

    // Segment text
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.setFont("helvetica", "normal");

    // Split text into lines that fit the content width
    const lines = doc.splitTextToSize(text, contentWidth);

    for (const line of lines) {
      checkPageBreak(6);
      doc.text(line, margin, yPos);
      yPos += 5;
    }

    yPos += 6; // Space between segments
  }

  // Footer on last page
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    "Genererad med Intervju-Transkribering",
    margin,
    pageHeight - 10
  );
  doc.text(
    new Date().toLocaleDateString("sv-SE"),
    pageWidth - margin - 20,
    pageHeight - 10
  );

  // Download the PDF
  const pdfFileName = fileName.replace(/\.[^.]+$/, "") + ".pdf";
  doc.save(pdfFileName);
}
