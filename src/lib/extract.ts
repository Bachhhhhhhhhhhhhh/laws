import * as XLSX from "xlsx";
import mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist";

// Vite: worker từ package
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

export type UploadKind = "pdf" | "docx" | "doc" | "xlsx" | "xls" | "txt" | "unknown";

export interface ExtractedFile {
  fileName: string;
  kind: UploadKind;
  text: string;
  charCount: number;
  pageOrSheetHint?: string;
  warnings: string[];
}

export function detectKind(file: File): UploadKind {
  const n = file.name.toLowerCase();
  if (n.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  if (n.endsWith(".docx") || file.type.includes("wordprocessingml")) return "docx";
  if (n.endsWith(".doc")) return "doc";
  if (n.endsWith(".xlsx") || n.endsWith(".xls") || file.type.includes("spreadsheet")) {
    return n.endsWith(".xls") && !n.endsWith(".xlsx") ? "xls" : "xlsx";
  }
  if (n.endsWith(".txt") || file.type.startsWith("text/")) return "txt";
  return "unknown";
}

export async function extractTextFromFile(file: File): Promise<ExtractedFile> {
  const kind = detectKind(file);
  const warnings: string[] = [];

  if (kind === "unknown") {
    throw new Error("Định dạng không hỗ trợ. Dùng PDF, DOCX, XLSX/XLS hoặc TXT.");
  }
  if (kind === "doc") {
    throw new Error(
      "File .doc (Word cũ) chưa hỗ trợ. Hãy Save As .docx hoặc xuất PDF rồi tải lên.",
    );
  }

  let text = "";
  let pageOrSheetHint = "";

  if (kind === "txt") {
    text = await file.text();
  } else if (kind === "docx") {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    text = result.value || "";
    if (result.messages?.length) {
      warnings.push(...result.messages.map((m) => m.message).slice(0, 5));
    }
  } else if (kind === "pdf") {
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    const parts: string[] = [];
    const maxPages = Math.min(pdf.numPages, 80);
    if (pdf.numPages > 80) {
      warnings.push(`PDF có ${pdf.numPages} trang — chỉ đọc 80 trang đầu.`);
    }
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const line = content.items
        .map((it) => ("str" in it ? String((it as { str: string }).str) : ""))
        .join(" ");
      parts.push(line);
    }
    text = parts.join("\n");
    pageOrSheetHint = `${maxPages}/${pdf.numPages} trang`;
  } else {
    // xlsx / xls
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const chunks: string[] = [];
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      chunks.push(`### Sheet: ${name}\n${csv}`);
    }
    text = chunks.join("\n\n");
    pageOrSheetHint = `${wb.SheetNames.length} sheet`;
  }

  text = text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
  if (!text) {
    throw new Error("Không trích xuất được nội dung text từ file (file scan/ảnh?).");
  }

  // Giới hạn để ranking + AI không quá nặng
  const MAX = 120_000;
  if (text.length > MAX) {
    warnings.push(`Nội dung dài ${text.length} ký tự — cắt còn ${MAX} ký tự để phân tích.`);
    text = text.slice(0, MAX);
  }

  return {
    fileName: file.name,
    kind,
    text,
    charCount: text.length,
    pageOrSheetHint,
    warnings,
  };
}
