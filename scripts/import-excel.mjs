/**
 * Re-export Excel → public/data/van-ban.json
 * Usage: node scripts/import-excel.mjs "path/to/file.xlsx"
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const input =
  process.argv[2] ||
  path.join(
    process.env.USERPROFILE || process.env.HOME || "",
    "Downloads",
    "Bang quan ly van ban_16072026 (1).xlsx",
  );

if (!fs.existsSync(input)) {
  console.error("File not found:", input);
  process.exit(1);
}

const COL_MAP = {
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

function cellToString(v) {
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

const buffer = fs.readFileSync(input);
const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
const sheetName =
  wb.SheetNames.find((n) => /quan\s*ly\s*van\s*ban/i.test(n)) ?? wb.SheetNames[0];
const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
  header: 1,
  defval: null,
  raw: true,
});

const records = [];
for (let i = 4; i < rows.length; i++) {
  const row = rows[i];
  if (!row) continue;
  const rec = {};
  for (const [idx, field] of Object.entries(COL_MAP)) {
    rec[field] = cellToString(row[Number(idx)]);
  }
  if (!rec.id && !rec.ten_van_ban) continue;
  records.push(rec);
}

const outDir = path.join(root, "public", "data");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "van-ban.json");
fs.writeFileSync(outFile, JSON.stringify(records, null, 2), "utf8");
console.log(`Wrote ${records.length} records → ${outFile}`);
