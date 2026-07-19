import type { DoiChieuKetQua, VanBan } from "../types";
import { reconcileOne } from "./reconcile";

export type RiskLevel = "cao" | "trung_binh" | "thap" | "thong_tin";

export interface MatchedVanBan {
  vanBan: VanBan;
  reconcile: DoiChieuKetQua;
  /** 0–100 độ liên quan với hồ sơ upload */
  relevance: number;
  /** 0–100 mức rủi ro tuân thủ nếu bỏ qua VB này */
  riskScore: number;
  matchReasons: string[];
  citedInUpload: boolean;
  tokensHit: string[];
}

export interface GapItem {
  id: string;
  level: RiskLevel;
  title: string;
  detail: string;
  relatedId?: string;
  relatedName?: string;
  scoreImpact: number;
}

export interface ComplianceReport {
  fileName: string;
  analyzedAt: string;
  /** 0–100: cao = an toàn hơn */
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  summary: string;
  stats: {
    relatedCount: number;
    highImpactRelated: number;
    citedCount: number;
    uncitedHighImpact: number;
    overdueRelated: number;
    draftRelated: number;
    missingFeedbackRelated: number;
  };
  ranking: MatchedVanBan[];
  gaps: GapItem[];
  detectedRefs: string[];
  keywords: string[];
  domains: string[];
}

const STOP = new Set(
  [
    "của", "và", "các", "cho", "với", "trong", "được", "các", "một", "này", "khi",
    "có", "không", "về", "theo", "tại", "đến", "từ", "hay", "hoặc", "như", "đã",
    "sẽ", "bị", "là", "vào", "trên", "dưới", "sau", "trước", "cũng", "những",
    "the", "and", "for", "with", "from", "that", "this", "are", "was",
    "hướng", "dẫn", "quy", "định", "điều", "khoản", "chương", "mục", "năm",
    "ngày", "tháng", "thông", "nghị", "quyết", "văn", "bản", "pháp", "luật",
  ].map((s) => s.toLowerCase()),
);

/** Nhận diện số hiệu / tên loại VB trong text upload */
export function extractLegalRefs(text: string): string[] {
  const refs = new Set<string>();
  const patterns = [
    /\d{1,4}\/\d{4}\/NĐ-CP/gi,
    /\d{1,4}\/\d{4}\/TT-[A-ZĐ]{2,10}/gi,
    /\d{1,4}\/\d{4}\/QĐ-[A-ZĐ0-9-]{2,20}/gi,
    /\d{1,5}\/QĐ-[A-ZĐ0-9-]{2,20}/gi,
    /Luật\s+[^\n,;.]{5,80}/gi,
    /Nghị\s*định\s+(?:số\s+)?[\d/A-ZĐ-]{3,40}/gi,
    /Thông\s*tư\s+(?:số\s+)?[\d/A-ZĐ-]{3,40}/gi,
    /Quyết\s*định\s+(?:số\s+)?[\d/A-ZĐ-]{3,40}/gi,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) {
      const t = m[0].replace(/\s+/g, " ").trim();
      if (t.length >= 5) refs.add(t);
    }
  }
  return [...refs].slice(0, 40);
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s./-]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !STOP.has(t) && !/^\d+$/.test(t));
}

function uniqueTokens(text: string, limit = 80): string[] {
  const freq = new Map<string, number>();
  for (const t of tokenize(text)) freq.set(t, (freq.get(t) ?? 0) + 1);
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([t]) => t);
}

/** Domain / chủ đề gợi ý từ từ khóa */
const DOMAIN_RULES: { domain: string; keys: string[] }[] = [
  { domain: "Thuế / hóa đơn", keys: ["thuế", "hóa", "đơn", "gtgt", "tncn", "khai"] },
  { domain: "Hải quan / XNK", keys: ["hải", "quan", "xuất", "nhập", "khẩu", "hàng"] },
  { domain: "Lao động / BHXH", keys: ["lao", "động", "bhxh", "lương", "hưu", "hợp"] },
  { domain: "Hóa chất / an toàn", keys: ["hóa", "chất", "an", "toàn", "cháy", "nổ"] },
  { domain: "Môi trường", keys: ["môi", "trường", "nước", "thải", "khí"] },
  { domain: "CNTT / chuyển đổi số", keys: ["số", "dữ", "liệu", "công", "nghệ", "mạng"] },
  { domain: "Thương mại / khuyến mại", keys: ["thương", "mại", "khuyến", "mại", "quảng"] },
  { domain: "Xây dựng / PCCC", keys: ["xây", "dựng", "pccc", "công", "trình"] },
  { domain: "Đầu tư / báo cáo", keys: ["đầu", "tư", "báo", "cáo", "giám", "sát"] },
  { domain: "Sở hữu trí tuệ", keys: ["sở", "hữu", "nhãn", "hiệu", "bằng"] },
];

function detectDomains(tokens: Set<string>): string[] {
  const hit: { domain: string; n: number }[] = [];
  for (const rule of DOMAIN_RULES) {
    const n = rule.keys.filter((k) => tokens.has(k) || [...tokens].some((t) => t.includes(k))).length;
    if (n >= 2) hit.push({ domain: rule.domain, n });
  }
  return hit.sort((a, b) => b.n - a.n).map((h) => h.domain).slice(0, 6);
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFC")
    .replace(/\s+/g, " ")
    .trim();
}

function compactRef(s: string): string {
  return norm(s).replace(/\s+/g, "").replace(/[.,;:()]/g, "");
}

function isCited(uploadNorm: string, uploadCompact: string, vb: VanBan, refs: string[]): boolean {
  const ten = norm(vb.ten_van_ban);
  if (ten.length >= 12 && uploadNorm.includes(ten.slice(0, Math.min(40, ten.length)))) return true;

  // số hiệu kiểu 125/2026/TT-BCA
  const soHieu = vb.ten_van_ban.match(/\d{1,4}\/\d{4}\/[A-ZĐ0-9-]+/i);
  if (soHieu && uploadCompact.includes(compactRef(soHieu[0]))) return true;

  for (const r of refs) {
    const rc = compactRef(r);
    if (rc.length >= 8 && (compactRef(vb.ten_van_ban).includes(rc) || rc.includes(compactRef(vb.id)))) {
      return true;
    }
    // overlap số/năm
    const num = r.match(/\d{1,4}\/\d{4}/);
    if (num && vb.ten_van_ban.includes(num[0])) return true;
  }
  return false;
}

function scoreMatch(
  uploadTokens: Set<string>,
  uploadNorm: string,
  uploadCompact: string,
  vb: VanBan,
  refs: string[],
): { relevance: number; reasons: string[]; tokensHit: string[]; cited: boolean } {
  const titleTokens = uniqueTokens(vb.ten_van_ban, 30);
  const summaryTokens = uniqueTokens(vb.tom_tat, 50);
  const allVb = new Set([...titleTokens, ...summaryTokens]);

  const tokensHit = [...allVb].filter((t) => uploadTokens.has(t) || uploadNorm.includes(t));
  const titleHits = titleTokens.filter((t) => uploadTokens.has(t) || uploadNorm.includes(t));

  let relevance = 0;
  const reasons: string[] = [];

  const cited = isCited(uploadNorm, uploadCompact, vb, refs);
  if (cited) {
    relevance += 45;
    reasons.push("Hồ sơ có trích dẫn/đề cập văn bản này");
  }

  const titleOverlap =
    titleTokens.length === 0 ? 0 : titleHits.length / Math.min(titleTokens.length, 12);
  relevance += Math.round(titleOverlap * 30);
  if (titleHits.length >= 2) reasons.push(`Trùng từ khóa tên VB (${titleHits.slice(0, 5).join(", ")})`);

  const bodyOverlap =
    allVb.size === 0 ? 0 : tokensHit.length / Math.min(allVb.size, 40);
  relevance += Math.round(bodyOverlap * 25);
  if (tokensHit.length >= 4 && titleHits.length < 2) {
    reasons.push(`Trùng nội dung tóm tắt (${tokensHit.length} token)`);
  }

  // ID xuất hiện
  if (vb.id && uploadNorm.includes(vb.id)) {
    relevance += 15;
    reasons.push(`Có ID ${vb.id}`);
  }

  relevance = Math.max(0, Math.min(100, relevance));
  return { relevance, reasons, tokensHit: tokensHit.slice(0, 12), cited };
}

function riskFor(vb: VanBan, rec: DoiChieuKetQua, relevance: number, cited: boolean): number {
  let risk = relevance * 0.35;
  const ah = vb.danh_gia_anh_huong.trim().toLowerCase();
  if (ah === "có" || ah === "co") risk += 28;
  if (rec.isDuThao) risk += 10;
  if (rec.quaHan) risk += 18;
  if (["thieu", "chua_phan_hoi", "lech"].includes(rec.trangThai)) risk += 12;
  if (!cited && relevance >= 35) risk += 15;
  if (cited) risk -= 10;
  return Math.max(0, Math.min(100, Math.round(risk)));
}

function gradeOf(score: number): ComplianceReport["grade"] {
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

/**
 * Đối chiếu nội dung hồ sơ upload với CSDL văn bản pháp luật → ranking + gap + điểm.
 */
export function analyzeCompliance(
  uploadText: string,
  catalog: VanBan[],
  fileName: string,
): ComplianceReport {
  const refs = extractLegalRefs(uploadText);
  const keywords = uniqueTokens(uploadText, 40);
  const uploadTokens = new Set(keywords);
  // thêm token thưa hơn để match
  for (const t of uniqueTokens(uploadText, 120)) uploadTokens.add(t);

  const uploadNorm = norm(uploadText);
  const uploadCompact = compactRef(uploadText);
  const domains = detectDomains(uploadTokens);

  const ranking: MatchedVanBan[] = [];

  for (const vb of catalog) {
    const { relevance, reasons, tokensHit, cited } = scoreMatch(
      uploadTokens,
      uploadNorm,
      uploadCompact,
      vb,
      refs,
    );
    if (relevance < 18 && !cited) continue;

    const reconcile = reconcileOne(vb);
    const riskScore = riskFor(vb, reconcile, relevance, cited);
    ranking.push({
      vanBan: vb,
      reconcile,
      relevance,
      riskScore,
      matchReasons: reasons.length ? reasons : ["Liên quan yếu theo từ khóa"],
      citedInUpload: cited,
      tokensHit,
    });
  }

  ranking.sort((a, b) => b.riskScore - a.riskScore || b.relevance - a.relevance);
  const top = ranking.slice(0, 40);
  const related = top.filter((r) => r.relevance >= 28 || r.citedInUpload);

  const highImpact = related.filter((r) => /^có$/i.test(r.vanBan.danh_gia_anh_huong));
  const uncitedHigh = highImpact.filter((r) => !r.citedInUpload && r.relevance >= 35);
  const overdueRelated = related.filter((r) => r.reconcile.quaHan);
  const draftRelated = related.filter((r) => r.reconcile.isDuThao);
  const missingFb = related.filter((r) =>
    ["thieu", "chua_phan_hoi", "lech"].includes(r.reconcile.trangThai),
  );
  const citedCount = related.filter((r) => r.citedInUpload).length;

  const gaps: GapItem[] = [];
  let gapN = 0;
  const gid = () => `g${++gapN}`;

  for (const m of uncitedHigh.slice(0, 12)) {
    gaps.push({
      id: gid(),
      level: m.riskScore >= 70 ? "cao" : "trung_binh",
      title: "Chưa đề cập VB có ảnh hưởng",
      detail: `Hồ sơ có nội dung liên quan nhưng chưa trích dẫn/ghi nhận: «${m.vanBan.ten_van_ban}» (AH: Có, liên quan ${m.relevance}%).`,
      relatedId: m.vanBan.id,
      relatedName: m.vanBan.ten_van_ban,
      scoreImpact: -8,
    });
  }

  for (const m of overdueRelated.slice(0, 8)) {
    gaps.push({
      id: gid(),
      level: "cao",
      title: "VB liên quan đang quá hạn phản hồi nội bộ",
      detail: `«${m.vanBan.ten_van_ban}» — hạn PH ${m.vanBan.thoi_han_phan_hoi || "N/A"}, BP thiếu: ${m.reconcile.thieu.join(", ") || "chưa PH"}.`,
      relatedId: m.vanBan.id,
      relatedName: m.vanBan.ten_van_ban,
      scoreImpact: -6,
    });
  }

  for (const m of missingFb.slice(0, 8)) {
    if (m.reconcile.quaHan) continue; // already covered
    gaps.push({
      id: gid(),
      level: "trung_binh",
      title: "Chưa đủ phản hồi bộ phận trên VB liên quan",
      detail: `«${m.vanBan.ten_van_ban}» — ${m.reconcile.trangThai}; thiếu: ${m.reconcile.thieu.join(", ") || "—"}.`,
      relatedId: m.vanBan.id,
      relatedName: m.vanBan.ten_van_ban,
      scoreImpact: -4,
    });
  }

  for (const m of draftRelated.filter((x) => x.relevance >= 40).slice(0, 6)) {
    gaps.push({
      id: gid(),
      level: "trung_binh",
      title: "Liên quan dự thảo (chưa ban hành ổn định)",
      detail: `«${m.vanBan.ten_van_ban}» là dự thảo — cần theo dõi thay đổi trước khi chốt tuân thủ.`,
      relatedId: m.vanBan.id,
      relatedName: m.vanBan.ten_van_ban,
      scoreImpact: -3,
    });
  }

  // Refs trong hồ sơ không map được CSDL
  const unmatchedRefs = refs.filter((r) => {
    const rc = compactRef(r);
    return !catalog.some((vb) => {
      const tc = compactRef(vb.ten_van_ban);
      return tc.includes(rc.slice(0, 12)) || rc.includes(compactRef(vb.ten_van_ban).slice(0, 12));
    });
  });
  for (const r of unmatchedRefs.slice(0, 8)) {
    gaps.push({
      id: gid(),
      level: "thong_tin",
      title: "Tham chiếu ngoài CSDL hiện có",
      detail: `Hồ sơ nêu «${r}» nhưng chưa có trong bảng quản lý VB đã load — cần rà tay hoặc bổ sung Excel.`,
      scoreImpact: -2,
    });
  }

  if (related.length === 0) {
    gaps.push({
      id: gid(),
      level: "trung_binh",
      title: "Không khớp VB nào trong CSDL",
      detail:
        "Nội dung upload không đủ tín hiệu trùng với 341 VB. Thử file đủ text (không scan ảnh) hoặc mở rộng bộ VB.",
      scoreImpact: -15,
    });
  }

  if (refs.length === 0 && related.length > 0) {
    gaps.push({
      id: gid(),
      level: "thap",
      title: "Hồ sơ không có số hiệu VB pháp luật rõ",
      detail:
        "Không phát hiện mẫu số hiệu (NĐ-CP, TT-…, QĐ-…). Nên bổ sung căn cứ pháp lý nếu đây là SOP/hợp đồng/chính sách.",
      scoreImpact: -5,
    });
  }

  // Điểm tổng: bắt đầu 100, trừ gap, cộng coverage
  let score = 78;
  if (related.length > 0) score += Math.min(12, citedCount * 3);
  if (highImpact.length > 0) {
    const cover = citedCount / Math.max(1, highImpact.length);
    score += Math.round(cover * 10);
  }
  for (const g of gaps) score += g.scoreImpact;
  if (uncitedHigh.length === 0 && related.length > 0) score += 5;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const grade = gradeOf(score);
  const summary = buildSummary({
    score,
    grade,
    related: related.length,
    uncitedHigh: uncitedHigh.length,
    overdue: overdueRelated.length,
    cited: citedCount,
    domains,
  });

  // sort gaps by severity
  const levelOrder: Record<RiskLevel, number> = {
    cao: 0,
    trung_binh: 1,
    thap: 2,
    thong_tin: 3,
  };
  gaps.sort((a, b) => levelOrder[a.level] - levelOrder[b.level] || a.scoreImpact - b.scoreImpact);

  return {
    fileName,
    analyzedAt: new Date().toISOString(),
    overallScore: score,
    grade,
    summary,
    stats: {
      relatedCount: related.length,
      highImpactRelated: highImpact.length,
      citedCount,
      uncitedHighImpact: uncitedHigh.length,
      overdueRelated: overdueRelated.length,
      draftRelated: draftRelated.length,
      missingFeedbackRelated: missingFb.length,
    },
    ranking: top,
    gaps,
    detectedRefs: refs,
    keywords: keywords.slice(0, 25),
    domains,
  };
}

function buildSummary(p: {
  score: number;
  grade: string;
  related: number;
  uncitedHigh: number;
  overdue: number;
  cited: number;
  domains: string[];
}): string {
  const dom = p.domains.length ? ` Chủ đề gợi ý: ${p.domains.join(", ")}.` : "";
  if (p.score >= 85) {
    return `Hồ sơ đạt mức tốt (hạng ${p.grade}). Đã liên kết ${p.related} VB, trích dẫn ${p.cited}.${dom}`;
  }
  if (p.uncitedHigh > 0 || p.overdue > 0) {
    return `Hồ sơ hạng ${p.grade} (${p.score}/100): có ${p.uncitedHigh} VB ảnh hưởng chưa đề cập và ${p.overdue} VB liên quan quá hạn PH nội bộ. Cần rà gap bên dưới.${dom}`;
  }
  return `Hồ sơ hạng ${p.grade} (${p.score}/100), khớp ${p.related} VB (trích dẫn ${p.cited}). Xem ranking & điểm thiếu sót để bổ sung.${dom}`;
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  cao: "Rủi ro cao",
  trung_binh: "Trung bình",
  thap: "Thấp",
  thong_tin: "Thông tin",
};
