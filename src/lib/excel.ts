import * as XLSX from "xlsx";
import type { VanBan } from "../types";
import { normalizeVanBan } from "./parse";

/**
 * Mapping cột Excel (header row 3 + subheader row 4) → field.
 * Sheet "Bang quan ly van ban" từ file quản lý văn bản pháp luật.
 */
const COL_MAP: Record<number, keyof VanBan> = {
  0: "id",
  1: "ky",
  2: "thang",
  3: "tuan",
  4: "pic",
  5: "ten_van_ban",
  6: "tom_tat",
  7: "bo_phan_chia_se",
  8: "ngay_chia_se",
  9: "thoi_han_gop_y",
  10: "ngay_hieu_luc",
  11: "ngay_ban_hanh",
  12: "ngay_hl_du_kien",
  13: "ngay_bh_du_kien",
  14: "thoi_han_phan_hoi",
  15: "bo_phan_can_phan_hoi",
  16: "ngay_gui_file_so_sanh",
  17: "bo_phan_phan_hoi",
  18: "danh_gia_anh_huong",
  19: "ngay_gui_cong_van",
  20: "ten_cong_van",
  21: "ghi_chu",
};

function cellToString(v: unknown): string {
  if (v == null || v === "") return "";
  if (v instanceof Date) {
    const dd = String(v.getDate()).padStart(2, "0");
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${v.getFullYear()}`;
  }
  if (typeof v === "number" && v > 20000 && v < 60000) {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + v * 86400000);
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}/${d.getUTCFullYear()}`;
  }
  return String(v).trim();
}

export function parseWorkbook(buffer: ArrayBuffer): VanBan[] {
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName =
    wb.SheetNames.find((n) => /quan\s*ly\s*van\s*ban/i.test(n)) ?? wb.SheetNames[0];
  if (!sheetName) return [];

  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(ws, {
    header: 1,
    defval: null,
    raw: true,
  });

  const records: VanBan[] = [];
  // Row 0: title, 1: blank, 2: headers, 3: sub-headers → data from index 4
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !Array.isArray(row)) continue;

    const partial: Partial<VanBan> = {};
    for (const [idx, field] of Object.entries(COL_MAP)) {
      partial[field] = cellToString(row[Number(idx)]);
    }

    if (!partial.id && !partial.ten_van_ban) continue;
    records.push(normalizeVanBan(partial));
  }

  return records;
}

export async function parseExcelFile(file: File): Promise<VanBan[]> {
  const buffer = await file.arrayBuffer();
  return parseWorkbook(buffer);
}

/** Xuất CSV đối chiếu */
export function exportDoiChieuCsv(
  rows: {
    id: string;
    ten: string;
    pic: string;
    trangThai: string;
    thieu: string;
    thua: string;
    deadline: string;
    quaHan: string;
  }[],
): string {
  const header = [
    "ID",
    "Tên văn bản",
    "PIC",
    "Trạng thái đối chiếu",
    "BP thiếu",
    "BP thừa",
    "Hạn phản hồi",
    "Quá hạn",
  ];
  const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [r.id, r.ten, r.pic, r.trangThai, r.thieu, r.thua, r.deadline, r.quaHan]
        .map(escape)
        .join(","),
    ),
  ];
  return "\uFEFF" + lines.join("\n");
}

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
