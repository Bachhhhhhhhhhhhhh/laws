import * as XLSX from "xlsx";
import type { DoiChieuKetQua, VanBan } from "../types";
import { VAN_BAN_FIELD_LABELS, VAN_BAN_FIELD_ORDER } from "../types";
import { normalizeVanBan } from "./parse";
import { DEADLINE_LABEL, LOAI_VB_LABEL, TRANG_THAI_LABEL } from "./reconcile";

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

export function downloadText(filename: string, content: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Xuất CSV đối chiếu (rút gọn) */
export function exportDoiChieuCsv(results: DoiChieuKetQua[]): string {
  const header = [
    "ID",
    "Tên văn bản",
    "PIC",
    "Kỳ",
    "Tháng",
    "Tuần",
    "Loại VB",
    "Trạng thái đối chiếu",
    "BP chia sẻ",
    "BP cần PH",
    "BP đã PH",
    "BP thiếu",
    "BP thừa",
    "Hạn phản hồi",
    "Quá hạn",
    "Bucket hạn",
    "Ảnh hưởng",
    "File so sánh",
    "Ngày ban hành",
    "Ngày hiệu lực",
    "Độ đầy đủ %",
    "Trường thiếu",
    "Ghi chú",
  ];
  const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [
    header.join(","),
    ...results.map((r) => {
      const vb = r.vanBan;
      return [
        vb.id,
        vb.ten_van_ban,
        vb.pic,
        vb.ky,
        vb.thang,
        vb.tuan,
        LOAI_VB_LABEL[r.loaiVanBan] ?? r.loaiVanBan,
        TRANG_THAI_LABEL[r.trangThai],
        r.chiaSe.join("; "),
        r.canPhanHoi.join("; "),
        r.daPhanHoi.join("; "),
        r.thieu.join("; "),
        r.thua.join("; "),
        vb.thoi_han_phan_hoi,
        r.quaHan ? "Có" : "Không",
        DEADLINE_LABEL[r.deadlineBucket],
        vb.danh_gia_anh_huong,
        vb.ngay_gui_file_so_sanh,
        vb.ngay_ban_hanh,
        vb.ngay_hieu_luc,
        String(r.completeness),
        r.missingFields.map((f) => VAN_BAN_FIELD_LABELS[f]).join("; "),
        vb.ghi_chu,
      ]
        .map(escape)
        .join(",");
    }),
  ];
  return "\uFEFF" + lines.join("\n");
}

/** Xuất CSV full mọi cột gốc */
export function exportFullCsv(list: VanBan[]): string {
  const header = VAN_BAN_FIELD_ORDER.map((f) => VAN_BAN_FIELD_LABELS[f]);
  const escape = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const lines = [
    header.map(escape).join(","),
    ...list.map((vb) => VAN_BAN_FIELD_ORDER.map((f) => escape(vb[f] ?? "")).join(",")),
  ];
  return "\uFEFF" + lines.join("\n");
}

/** Xuất Excel .xlsx đầy đủ + sheet đối chiếu */
export function exportWorkbook(results: DoiChieuKetQua[], filename?: string) {
  const list = results.map((r) => r.vanBan);
  const fullRows = list.map((vb) => {
    const row: Record<string, string> = {};
    for (const f of VAN_BAN_FIELD_ORDER) row[VAN_BAN_FIELD_LABELS[f]] = vb[f] ?? "";
    return row;
  });

  const dcRows = results.map((r) => ({
    ID: r.vanBan.id,
    "Tên văn bản": r.vanBan.ten_van_ban,
    PIC: r.vanBan.pic,
    "Loại VB": LOAI_VB_LABEL[r.loaiVanBan],
    "Trạng thái": TRANG_THAI_LABEL[r.trangThai],
    "BP chia sẻ": r.chiaSe.join(", "),
    "BP cần PH": r.canPhanHoi.join(", "),
    "BP đã PH": r.daPhanHoi.join(", "),
    "BP thiếu": r.thieu.join(", "),
    "BP thừa": r.thua.join(", "),
    "Hạn PH": r.vanBan.thoi_han_phan_hoi,
    "Quá hạn": r.quaHan ? "Có" : "Không",
    "Bucket hạn": DEADLINE_LABEL[r.deadlineBucket],
    "Ảnh hưởng": r.vanBan.danh_gia_anh_huong,
    "File so sánh": r.vanBan.ngay_gui_file_so_sanh,
    "Độ đầy đủ %": r.completeness,
    "Trường thiếu": r.missingFields.map((f) => VAN_BAN_FIELD_LABELS[f]).join(", "),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(fullRows), "Du lieu day du");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dcRows), "Doi chieu");
  const out = filename ?? `van-ban-doi-chieu-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, out);
}
