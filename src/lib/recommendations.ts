import type { GapItem, MatchedVanBan, RiskLevel } from "./compliance";
import { TRANG_THAI_LABEL } from "./reconcile";

/** Mức ưu tiên hành động */
export type ActionPriority = "P1_khan" | "P2_tuan" | "P3_thang" | "P4_cai_tien";

export type ActionCategory =
  | "bo_sung_ho_so"
  | "phap_che"
  | "dieu_phoi_bp"
  | "theo_doi_du_thao"
  | "cap_nhat_csdl"
  | "chat_luong_file"
  | "quy_trinh";

export interface ActionStep {
  order: number;
  action: string;
  doneWhen: string;
}

export interface ActionRecommendation {
  id: string;
  priority: ActionPriority;
  category: ActionCategory;
  /** Tiêu đề ngắn */
  title: string;
  /** Vì sao phải làm (gắn hạn chế file/gap) */
  why: string;
  /** Ai nên chủ trì */
  owner: string;
  /** Ai phối hợp */
  collaborators: string[];
  /** Thời hạn gợi ý */
  timeline: string;
  /** Kết quả/deliverable mong đợi */
  deliverable: string;
  /** Các bước chi tiết */
  steps: ActionStep[];
  /** Rủi ro nếu không làm */
  ifIgnored: string;
  /** Gap / VB liên quan */
  gapIds: string[];
  relatedVbIds: string[];
  relatedVbNames: string[];
}

export interface ActionPlan {
  generatedAt: string;
  headline: string;
  /** Tóm tắt roadmap 3 tầng */
  roadmap: { window: string; focus: string; count: number }[];
  items: ActionRecommendation[];
  /** Checklist tổng hợp để copy */
  checklist: string[];
}

export const PRIORITY_LABEL: Record<ActionPriority, string> = {
  P1_khan: "P1 · Làm ngay (0–3 ngày)",
  P2_tuan: "P2 · Trong tuần (3–7 ngày)",
  P3_thang: "P3 · Trong tháng",
  P4_cai_tien: "P4 · Cải tiến / dài hạn",
};

export const CATEGORY_LABEL: Record<ActionCategory, string> = {
  bo_sung_ho_so: "Bổ sung / sửa hồ sơ upload",
  phap_che: "Pháp chế · căn cứ pháp lý",
  dieu_phoi_bp: "Điều phối bộ phận phản hồi",
  theo_doi_du_thao: "Theo dõi dự thảo VB",
  cap_nhat_csdl: "Cập nhật CSDL quản lý VB",
  chat_luong_file: "Chất lượng file nguồn",
  quy_trinh: "Quy trình & kiểm soát",
};

interface BuildCtx {
  fileName: string;
  grade: string;
  score: number;
  domains: string[];
  gaps: GapItem[];
  ranking: MatchedVanBan[];
  stats: {
    relatedCount: number;
    highImpactRelated: number;
    citedCount: number;
    uncitedHighImpact: number;
    overdueRelated: number;
    draftRelated: number;
    missingFeedbackRelated: number;
  };
  detectedRefs: string[];
  fileWarnings?: string[];
}

function findMatch(ranking: MatchedVanBan[], id?: string): MatchedVanBan | undefined {
  if (!id) return undefined;
  return ranking.find((r) => r.vanBan.id === id);
}

function uniqueDepts(matches: MatchedVanBan[]): string[] {
  const s = new Set<string>();
  for (const m of matches) {
    for (const d of m.reconcile.thieu) s.add(d);
    for (const d of m.reconcile.canPhanHoi) s.add(d);
    if (m.vanBan.pic) s.add(`PIC: ${m.vanBan.pic}`);
  }
  return [...s].slice(0, 12);
}

/**
 * Sinh đề xuất hành động cụ thể từ gap + ranking + hạn chế file.
 */
export function buildActionPlan(ctx: BuildCtx): ActionPlan {
  const items: ActionRecommendation[] = [];
  let n = 0;
  const nid = () => `act-${++n}`;

  const uncitedHigh = ctx.ranking.filter(
    (r) =>
      !r.citedInUpload &&
      /^có$/i.test(r.vanBan.danh_gia_anh_huong) &&
      r.relevance >= 35,
  );
  const overdue = ctx.ranking.filter((r) => r.reconcile.quaHan);
  const missingFb = ctx.ranking.filter((r) =>
    ["thieu", "chua_phan_hoi", "lech"].includes(r.reconcile.trangThai),
  );
  const drafts = ctx.ranking.filter((r) => r.reconcile.isDuThao && r.relevance >= 40);
  const noLegalRefGap = ctx.gaps.some((g) => g.title.includes("không có số hiệu"));
  const noMatchGap = ctx.gaps.some((g) => g.title.includes("Không khớp VB"));
  const outsideRefs = ctx.gaps.filter((g) => g.title.includes("ngoài CSDL"));

  // —— P1: Quá hạn PH ——
  if (overdue.length > 0) {
    const top = overdue.slice(0, 5);
    const depts = uniqueDepts(top);
    const names = top.map((m) => `«${m.vanBan.ten_van_ban}» (ID ${m.vanBan.id}, hạn ${m.vanBan.thoi_han_phan_hoi || "N/A"})`);
    items.push({
      id: nid(),
      priority: "P1_khan",
      category: "dieu_phoi_bp",
      title: `Đóng ${overdue.length} VB liên quan đang quá hạn phản hồi nội bộ`,
      why: `Hồ sơ «${ctx.fileName}» đang chạm các VB đã quá hạn PH trong bảng quản lý. Nếu triển khai theo hồ sơ khi BP chưa chốt ý kiến, rủi ro áp dụng sai / bỏ sót nghĩa vụ pháp lý cao.`,
      owner: top[0]?.vanBan.pic ? `PIC ${top[0].vanBan.pic} (hoặc Legal lead)` : "Legal / Compliance lead",
      collaborators: depts.length ? depts : ["Các BP trong cột «Cần phản hồi»"],
      timeline: "Trong 1–3 ngày làm việc (ưu tiên VB quá hạn lâu nhất trước)",
      deliverable:
        "Bảng trạng thái PH cập nhật (BP nào đã gửi / còn thiếu) + email/công văn nhắc + quyết định: cho phép dùng hồ sơ hay tạm dừng điều khoản liên quan",
      steps: [
        {
          order: 1,
          action: `Lọc danh sách quá hạn liên quan hồ sơ:\n${names.map((x, i) => `   ${i + 1}) ${x}`).join("\n")}`,
          doneWhen: "Có list ID + hạn + BP thiếu, đã gửi cho stakeholder",
        },
        {
          order: 2,
          action: `Gửi reminder có deadline cụ thể (ví dụ EOD+1) tới BP thiếu: ${top.flatMap((m) => m.reconcile.thieu).slice(0, 8).join(", ") || "xem cột BP thiếu trên từng VB"}. Đính kèm tóm tắt VB và câu hỏi: «Ảnh hưởng gì tới quy trình/hồ sơ ${ctx.fileName}?»`,
          doneWhen: "Có confirm đã nhận từ từng BP hoặc escalation manager",
        },
        {
          order: 3,
          action:
            "Thu phản hồi → cập nhật cột «Bộ phận phản hồi» trên Excel quản lý VB; đánh dấu VB nào chặn việc ban hành/áp dụng hồ sơ upload.",
          doneWhen: "Excel/CSDL phản ánh đúng BP đã PH; gap quá hạn giảm",
        },
        {
          order: 4,
          action:
            "Nếu BP không phản hồi: họp nhanh 15–30 phút (Legal + BP + owner hồ sơ) để chốt giả định tạm thời và rủi ro chấp nhận được (risk acceptance) có chữ ký.",
          doneWhen: "Biên bản risk acceptance hoặc đủ PH",
        },
      ],
      ifIgnored:
        "Hồ sơ có thể đi vào vận hành khi nghĩa vụ pháp lý chưa được BP chuyên môn rà — dễ vi phạm ngầm / audit fail.",
      gapIds: ctx.gaps.filter((g) => g.title.includes("quá hạn")).map((g) => g.id),
      relatedVbIds: top.map((m) => m.vanBan.id),
      relatedVbNames: top.map((m) => m.vanBan.ten_van_ban),
    });
  }

  // —— P1/P2: VB AH Có chưa trích dẫn ——
  if (uncitedHigh.length > 0) {
    const top = uncitedHigh.slice(0, 8);
    const prio: ActionPriority = uncitedHigh.length >= 3 || ctx.score < 55 ? "P1_khan" : "P2_tuan";
    items.push({
      id: nid(),
      priority: prio,
      category: "bo_sung_ho_so",
      title: `Bổ sung căn cứ & nội dung cho ${uncitedHigh.length} VB có ảnh hưởng chưa được hồ sơ đề cập`,
      why: `Hệ thống thấy nội dung «${ctx.fileName}» liên quan các VB đánh giá ảnh hưởng = Có, nhưng file upload không trích dẫn/ghi nhận. Đây là khoảng trống tuân thủ trực tiếp trên tài liệu.`,
      owner: "Owner soạn thảo hồ sơ (kèm Legal review)",
      collaborators: [
        ...new Set(top.map((m) => m.vanBan.pic).filter(Boolean).map((p) => `PIC VB: ${p}`)),
        "Pháp chế",
      ].slice(0, 8),
      timeline: prio === "P1_khan" ? "0–3 ngày: draft chỉnh sửa; 5 ngày: Legal sign-off" : "Trong 5–7 ngày",
      deliverable:
        "Bản hồ sơ revision: mục «Căn cứ pháp lý» + bảng mapping Điều/khoản VB → điều khoản/hạng mục trong hồ sơ + track-change",
      steps: [
        {
          order: 1,
          action:
            "Mở mục «Căn cứ pháp lý» / «Tài liệu liên quan» (nếu chưa có thì tạo section mới ngay sau phần phạm vi áp dụng).",
          doneWhen: "Section tồn tại trong DOCX/PDF nguồn",
        },
        {
          order: 2,
          action:
            "Với từng VB dưới đây, ghi: số hiệu đầy đủ · ngày ban hành/hiệu lực · 1–3 điểm ảnh hưởng tới hồ sơ · điều khoản hồ sơ cần sửa:\n" +
            top
              .map((m, i) => {
                const hl = m.vanBan.ngay_hieu_luc || m.vanBan.ngay_hl_du_kien || "chưa rõ HL";
                const bh = m.vanBan.ngay_ban_hanh || "chưa rõ BH";
                const tom = (m.vanBan.tom_tat || "").replace(/\s+/g, " ").slice(0, 180);
                return `   ${i + 1}) ID ${m.vanBan.id} — ${m.vanBan.ten_van_ban}\n      BH: ${bh} | HL: ${hl} | Liên quan máy: ${m.relevance}%\n      Gợi ý từ tóm tắt CSDL: ${tom || "—"}…`;
              })
              .join("\n"),
          doneWhen: "Mỗi VB có ít nhất 1 dòng mapping trong hồ sơ hoặc phụ lục",
        },
        {
          order: 3,
          action:
            "Rà soát điều khoản xung đột: nếu hồ sơ quy định khác VB (mức phạt, thời hạn, trách nhiệm BP, quy trình…), sửa điều khoản hoặc thêm ngoại lệ có kiểm soát.",
          doneWhen: "Không còn mâu thuẫn «đã biết» giữa hồ sơ và VB AH=Có",
        },
        {
          order: 4,
          action:
            "Legal review checklist: (a) đủ số hiệu (b) đúng hiệu lực (c) phạm vi HVN/BP (d) đã cập nhật phụ lục biểu mẫu nếu VB đổi mẫu.",
          doneWhen: "Email/phiếu approve từ Pháp chế",
        },
        {
          order: 5,
          action: `Xuất lại file PDF/DOCX (text layer, không scan) và chạy lại tab Rà soát — mục tiêu: giảm «AH Có chưa nêu» về 0, điểm ≥ ${Math.min(100, ctx.score + 15)}.`,
          doneWhen: "Báo cáo rà soát mới đạt chỉ tiêu",
        },
      ],
      ifIgnored:
        "Audit/internal control có thể kết luận hồ sơ thiếu căn cứ; khi VB bị thanh tra, không chứng minh được đã nội bộ hóa nghĩa vụ.",
      gapIds: ctx.gaps.filter((g) => g.title.includes("Chưa đề cập")).map((g) => g.id),
      relatedVbIds: top.map((m) => m.vanBan.id),
      relatedVbNames: top.map((m) => m.vanBan.ten_van_ban),
    });
  }

  // —— P2: Thiếu PH (chưa quá hạn) ——
  const missingNotOverdue = missingFb.filter((m) => !m.reconcile.quaHan);
  if (missingNotOverdue.length > 0) {
    const top = missingNotOverdue.slice(0, 6);
    items.push({
      id: nid(),
      priority: "P2_tuan",
      category: "dieu_phoi_bp",
      title: `Thu đủ phản hồi bộ phận cho ${missingNotOverdue.length} VB liên quan (chưa/thiếu PH)`,
      why: "Hồ sơ dựa trên VB mà nội bộ chưa chốt đủ ý kiến BP — dễ bỏ sót yêu cầu vận hành (HQ, thuế, HR, QC…).",
      owner: "Điều phối Legal desk / thư ký VB",
      collaborators: uniqueDepts(top),
      timeline: "Trước hạn PH trên từng VB; nếu không có hạn → chốt trong 7 ngày",
      deliverable: "Cột «Bộ phận phản hồi» đủ khớp «Cần phản hồi»; file so sánh (nếu có) đã gửi",
      steps: [
        {
          order: 1,
          action:
            "Tạo matrix BP × VB (Excel): hàng = BP, cột = ID VB, ô = Chưa / Đã / N/A.\n" +
            top
              .map((m) => {
                const st = TRANG_THAI_LABEL[m.reconcile.trangThai];
                return `   • ${m.vanBan.id}: cần [${m.reconcile.canPhanHoi.join(", ") || "—"}] | đã [${m.reconcile.daPhanHoi.join(", ") || "—"}] | thiếu [${m.reconcile.thieu.join(", ") || "—"}] | TT: ${st}`;
              })
              .join("\n"),
          doneWhen: "Matrix chia sẻ Teams/SharePoint",
        },
        {
          order: 2,
          action:
            "Gửi request PH theo template: tóm tắt 5 dòng + 3 câu hỏi bắt buộc (ảnh hưởng quy trình? cần sửa SOP/hợp đồng? chi phí/thời gian?).",
          doneWhen: "100% BP thiếu đã nhận request",
        },
        {
          order: 3,
          action:
            "Với BP «thừa / ngoài list»: xác minh có cần bổ sung vào «Cần PH» chính thức không — tránh PH ngoài luồng không được ghi nhận.",
          doneWhen: "Quyết định keep/remove từng BP thừa",
        },
        {
          order: 4,
          action: "Sau khi đủ PH: cập nhật hồ sơ upload nếu BP yêu cầu chỉnh điều khoản; version mới + changelog.",
          doneWhen: "Version hồ sơ + changelog có ngày",
        },
      ],
      ifIgnored: "BP vận hành có thể không sẵn sàng thực thi → hồ sơ «có trên giấy» nhưng fail khi áp dụng.",
      gapIds: ctx.gaps.filter((g) => g.title.includes("phản hồi bộ phận")).map((g) => g.id),
      relatedVbIds: top.map((m) => m.vanBan.id),
      relatedVbNames: top.map((m) => m.vanBan.ten_van_ban),
    });
  }

  // —— P2: Không có số hiệu trong hồ sơ ——
  if (noLegalRefGap || (ctx.detectedRefs.length === 0 && ctx.stats.relatedCount > 0)) {
    items.push({
      id: nid(),
      priority: "P2_tuan",
      category: "phap_che",
      title: "Thêm mục Căn cứ pháp lý với số hiệu đầy đủ vào hồ sơ",
      why: `File «${ctx.fileName}» không (hoặc gần như không) chứa hiện mẫu số hiệu NĐ-CP / TT / QĐ / Luật. Máy khó chứng minh hồ sơ bám VB; auditor cũng khó tra cứu.`,
      owner: "Owner hồ sơ + Legal",
      collaborators: ["Pháp chế"],
      timeline: "3–5 ngày làm việc",
      deliverable: "Section «Căn cứ pháp lý» ≥ 3 số hiệu liên quan (ưu tiên VB AH=Có trong ranking) + ngày hiệu lực",
      steps: [
        {
          order: 1,
          action:
            "Chọn tối thiểu các VB ranking cao (AH=Có hoặc relevance ≥ 40%) để đưa vào căn cứ — lấy đúng số hiệu như trên CSDL, không viết tắt mơ hồ.",
          doneWhen: "Danh sách ≥ 3 VB được Legal xác nhận",
        },
        {
          order: 2,
          action:
            "Format gợi ý mỗi dòng:\n   - [Loại] số …/…/… ngày … của …; có hiệu lực từ …; liên quan điều … của hồ sơ này.",
          doneWhen: "Section hoàn chỉnh trong bản draft",
        },
        {
          order: 3,
          action:
            "Thêm phụ lục «Bảng đối chiếu VB – điều khoản hồ sơ» (2 cột) để rà soát định kỳ khi VB sửa đổi.",
          doneWhen: "Phụ lục đính kèm bản phát hành",
        },
      ],
      ifIgnored: "Hồ sơ trông «nội bộ thuần» — khó bảo vệ khi có tranh chấp hoặc thanh tra.",
      gapIds: ctx.gaps.filter((g) => g.title.includes("số hiệu")).map((g) => g.id),
      relatedVbIds: ctx.ranking.slice(0, 5).map((r) => r.vanBan.id),
      relatedVbNames: ctx.ranking.slice(0, 5).map((r) => r.vanBan.ten_van_ban),
    });
  }

  // —— P2/P3: Dự thảo ——
  if (drafts.length > 0) {
    const top = drafts.slice(0, 5);
    items.push({
      id: nid(),
      priority: "P2_tuan",
      category: "theo_doi_du_thao",
      title: `Theo dõi ${drafts.length} dự thảo VB liên quan — chưa chốt nghĩa vụ vĩnh viễn`,
      why: "Hồ sơ đang «dính» dự thảo: nội dung có thể đổi trước khi ban hành. Nếu copy cứng vào SOP/hợp đồng sẽ phải sửa lại hàng loạt.",
      owner: top[0]?.vanBan.pic ? `PIC ${top[0].vanBan.pic}` : "Legal monitoring",
      collaborators: ["Owner hồ sơ", "BP bị ảnh hưởng"],
      timeline: "Đăng ký theo dõi ngay; review lại khi VB ban hành hoặc sau 30 ngày",
      deliverable: "Watchlist dự thảo + điều khoản hồ sơ đánh dấu «phụ thuộc dự thảo» + trigger cập nhật",
      steps: [
        {
          order: 1,
          action:
            "Lập watchlist:\n" +
            top
              .map(
                (m) =>
                  `   • ${m.vanBan.id} — ${m.vanBan.ten_van_ban} (PIC ${m.vanBan.pic || "—"}; hạn góp ý CQNN: ${m.vanBan.thoi_han_gop_y || "—"})`,
              )
              .join("\n"),
          doneWhen: "Watchlist trên tracker chung",
        },
        {
          order: 2,
          action:
            "Trong hồ sơ: đánh dấu vàng mọi điều khoản dựa trên dự thảo (footnote: «Áp dụng dự kiến — chờ VB chính thức»).",
          doneWhen: "Mọi phụ thuộc dự thảo đều có footnote",
        },
        {
          order: 3,
          action:
            "Nếu đang trong thời hạn góp ý CQNN: tổng hợp comment nội bộ (BP liên quan) và gửi qua đúng kênh trước deadline.",
          doneWhen: "Comment đã submit hoặc ghi nhận «không góp ý»",
        },
        {
          order: 4,
          action: "Khi dự thảo thành VB chính thức: diff điều khoản → patch hồ sơ trong 10 ngày làm việc.",
          doneWhen: "Issue/ticket patch có owner + due date",
        },
      ],
      ifIgnored: "Hồ sơ có thể trái VB chính thức ngay sau khi ban hành mà không ai cập nhật.",
      gapIds: ctx.gaps.filter((g) => g.title.includes("dự thảo")).map((g) => g.id),
      relatedVbIds: top.map((m) => m.vanBan.id),
      relatedVbNames: top.map((m) => m.vanBan.ten_van_ban),
    });
  }

  // —— P3: Ref ngoài CSDL ——
  if (outsideRefs.length > 0) {
    const refs = outsideRefs.map((g) => g.detail.match(/«([^»]+)»/)?.[1] || g.detail).slice(0, 8);
    items.push({
      id: nid(),
      priority: "P3_thang",
      category: "cap_nhat_csdl",
      title: `Bổ sung ${outsideRefs.length} tham chiếu pháp lý đang nằm ngoài bảng quản lý VB`,
      why: "Hồ sơ đã trích VB/số hiệu mà CSDL nội bộ chưa có → mù điểm theo dõi PH, AH, hạn nội bộ.",
      owner: "Thư ký / admin bảng quản lý VB",
      collaborators: ["PIC chuyên môn theo domain", "Legal"],
      timeline: "Trong chu kỳ cập nhật tuần/tháng gần nhất",
      deliverable: "Dòng mới trên Excel quản lý VB (đủ PIC, tóm tắt, AH, BP chia sẻ) + re-import vào tool",
      steps: [
        {
          order: 1,
          action: "Danh sách cần tra cứu & thêm:\n" + refs.map((r, i) => `   ${i + 1}) ${r}`).join("\n"),
          doneWhen: "Mỗi ref có link VB gốc hoặc file PDF lưu trữ",
        },
        {
          order: 2,
          action:
            "Điền đủ: Tên VB, tóm tắt ảnh hưởng HVN, BP chia sẻ, BP cần PH, đánh giá AH Có/Không, hạn PH nội bộ.",
          doneWhen: "Dòng Excel không thiếu field core",
        },
        {
          order: 3,
          action: "Import Excel mới vào tool (nút Import) và chạy lại Rà soát hồ sơ để ranking chính xác hơn.",
          doneWhen: "Ref chuyển từ «ngoài CSDL» sang có ID nội bộ",
        },
      ],
      ifIgnored: "Theo dõi tuân thủ bị thủ công, dễ sót khi VB ngoài list đổi.",
      gapIds: outsideRefs.map((g) => g.id),
      relatedVbIds: [],
      relatedVbNames: refs,
    });
  }

  // —— P2: Không khớp CSDL ——
  if (noMatchGap || ctx.stats.relatedCount === 0) {
    items.push({
      id: nid(),
      priority: "P2_tuan",
      category: "chat_luong_file",
      title: "Xử lý file nguồn để máy đọc được & khớp CSDL VB",
      why: `Không (hoặc gần như không) khớp VB nào với «${ctx.fileName}». Có thể do PDF scan, file quá generic, hoặc CSDL chưa cover domain.`,
      owner: "Owner hồ sơ",
      collaborators: ["Legal desk", "Admin CSDL VB"],
      timeline: "1–3 ngày",
      deliverable: "File text-based mới + (nếu cần) bổ sung VB domain vào Excel + báo cáo rà soát có ≥ 3 VB related",
      steps: [
        {
          order: 1,
          action:
            "Kiểm tra loại file: nếu PDF scan/ảnh → OCR (Adobe/ABBYY) hoặc xuất lại từ Word; tránh upload ảnh chụp.",
          doneWhen: "Copy-paste được đoạn text từ file ra Notepad",
        },
        {
          order: 2,
          action:
            "Thêm vào hồ sơ các từ khóa domain & số hiệu VB thật (thuế, HQ, LĐ…). Domain gợi ý hiện tại: " +
            (ctx.domains.join(", ") || "chưa nhận diện — cần mô tả rõ lĩnh vực trong phần đầu hồ sơ"),
          doneWhen: "Có section lĩnh vực + ≥ 1 số hiệu",
        },
        {
          order: 3,
          action:
            "Nếu hồ sơ thuộc lĩnh vực chưa có trong 341 VB: nhờ Legal bổ sung pack VB chuyên đề vào Excel trước khi rà lại.",
          doneWhen: "CSDL có ≥ 5 VB cùng domain",
        },
        {
          order: 4,
          action: "Chạy lại Rà soát; nếu vẫn 0 match → gửi Legal review thủ công (không rely tool).",
          doneWhen: "Có relatedCount > 0 hoặc biên bản review tay",
        },
      ],
      ifIgnored: "Tool cho điểm thấp / F; không có early-warning — rủi ro ẩn không được đo.",
      gapIds: ctx.gaps.filter((g) => g.title.includes("Không khớp")).map((g) => g.id),
      relatedVbIds: [],
      relatedVbNames: [],
    });
  }

  // —— File warnings (extract) ——
  const warns = ctx.fileWarnings ?? [];
  if (warns.some((w) => /trang|ký tự|cắt|scan/i.test(w))) {
    items.push({
      id: nid(),
      priority: "P3_thang",
      category: "chat_luong_file",
      title: "Chuẩn hóa chất lượng file để rà soát đầy đủ (không cắt trang / không mất text)",
      why: "Hệ thống đã cảnh báo khi trích xuất: " + warns.join(" | "),
      owner: "Owner hồ sơ / Document control",
      collaborators: [],
      timeline: "Trước lần ban hành chính thức tiếp theo",
      deliverable: "File master DOCX + PDF text layer đủ trang, đặt tên version",
      steps: [
        {
          order: 1,
          action: "Gộp đủ phụ lục vào một file hoặc upload từng phụ lục và rà soát lần lượt.",
          doneWhen: "Không còn phụ lục quan trọng ngoài phạm vi đọc",
        },
        {
          order: 2,
          action: "Đặt naming: `LOAI_TenHoSo_vX.Y_yyyy-mm-dd.pdf` và lưu trên thư mục chuẩn.",
          doneWhen: "File nằm đúng repo tài liệu",
        },
        {
          order: 3,
          action: "Re-run rà soát trên bản full; lưu báo cáo TXT kèm version hồ sơ.",
          doneWhen: "Báo cáo gắn với đúng version",
        },
      ],
      ifIgnored: "Phân tích chỉ trên phần đầu file → false sense of security.",
      gapIds: [],
      relatedVbIds: [],
      relatedVbNames: [],
    });
  }

  // —— P3: Domain-specific process ——
  if (ctx.domains.length > 0 && (uncitedHigh.length > 0 || ctx.score < 75)) {
    items.push({
      id: nid(),
      priority: "P3_thang",
      category: "quy_trinh",
      title: `Thiết lập checklist tuân thủ theo domain: ${ctx.domains.slice(0, 3).join(" · ")}`,
      why: "Hồ sơ thuộc domain đã nhận diện — nên có checklist tái sử dụng cho lần soạn thảo sau, không rà ad-hoc.",
      owner: "Process owner domain + Legal",
      collaborators: ctx.domains.slice(0, 3),
      timeline: "Trong 30 ngày",
      deliverable: "Checklist 1 trang (PDF) + gắn vào quy trình ban hành tài liệu",
      steps: [
        {
          order: 1,
          action: `Liệt kê 8–15 câu hỏi bắt buộc trước khi approve hồ sơ thuộc [${ctx.domains.join(", ")}] (căn cứ VB, BP review, hiệu lực, biểu mẫu, đào tạo…).`,
          doneWhen: "Draft checklist review được",
        },
        {
          order: 2,
          action: "Map mỗi câu hỏi → VB ID trong CSDL (hoặc «N/A»).",
          doneWhen: "Có cột VB tham chiếu",
        },
        {
          order: 3,
          action: "Thêm gate: bắt buộc chạy tab Rà soát hồ sơ và đính kèm báo cáo (điểm + gaps) vào phiếu ban hành.",
          doneWhen: "Quy trình ban hành có gate này",
        },
      ],
      ifIgnored: "Lặp lại cùng lỗi thiếu sót ở hồ sơ sau.",
      gapIds: [],
      relatedVbIds: uncitedHigh.slice(0, 3).map((m) => m.vanBan.id),
      relatedVbNames: uncitedHigh.slice(0, 3).map((m) => m.vanBan.ten_van_ban),
    });
  }

  // —— P4: Điểm tốt nhưng duy trì ——
  if (items.length === 0 || ctx.score >= 85) {
    items.push({
      id: nid(),
      priority: "P4_cai_tien",
      category: "quy_trinh",
      title: "Duy trì rà soát định kỳ khi VB/CSDL đổi",
      why:
        ctx.score >= 85
          ? `Hồ sơ đang hạng ${ctx.grade} (${ctx.score}/100) — cần cơ chế giữ mức này khi VB mới vào CSDL.`
          : "Sau khi xử lý các mục P1–P3, cần vòng kiểm soát để không tụt hạng.",
      owner: "Document control / Legal desk",
      collaborators: ["Owner hồ sơ"],
      timeline: "Mỗi quý hoặc khi có VB AH=Có mới cùng domain",
      deliverable: "Lịch re-scan + owner + lưu archive báo cáo",
      steps: [
        {
          order: 1,
          action: "Subscribe cập nhật Excel quản lý VB (tuần/tháng).",
          doneWhen: "Có nguồn Excel chuẩn",
        },
        {
          order: 2,
          action: `Re-import + re-run rà soát «${ctx.fileName}» khi có ≥ 1 VB AH=Có mới liên quan domain.`,
          doneWhen: "Báo cáo mới lưu archive",
        },
        {
          order: 3,
          action: "Nếu điểm giảm > 10 hoặc xuất hiện gap P1: mở change request sửa hồ sơ.",
          doneWhen: "CR có số ticket",
        },
      ],
      ifIgnored: "Hồ sơ «đúng tại thời điểm T» nhưng lệch dần theo thời gian.",
      gapIds: [],
      relatedVbIds: [],
      relatedVbNames: [],
    });
  }

  // Enrich gap-linked micro actions for gaps not yet covered heavily
  for (const g of ctx.gaps.slice(0, 15)) {
    const already = items.some((it) => it.gapIds.includes(g.id));
    if (already) continue;
    const m = findMatch(ctx.ranking, g.relatedId);
    const prio = levelToPriority(g.level);
    items.push({
      id: nid(),
      priority: prio,
      category: categoryFromGap(g),
      title: `Xử lý: ${g.title}${g.relatedId ? ` (VB ${g.relatedId})` : ""}`,
      why: g.detail,
      owner: m?.vanBan.pic ? `PIC ${m.vanBan.pic}` : "Legal / owner hồ sơ",
      collaborators: m ? uniqueDepts([m]).slice(0, 5) : [],
      timeline: timelineFromPriority(prio),
      deliverable: deliverableFromGap(g, m),
      steps: stepsFromGap(g, m, ctx.fileName),
      ifIgnored: `Giữ nguyên gap «${g.title}» — tiếp tục trừ điểm tuân thủ (impact ${g.scoreImpact}).`,
      gapIds: [g.id],
      relatedVbIds: g.relatedId ? [g.relatedId] : [],
      relatedVbNames: g.relatedName ? [g.relatedName] : [],
    });
  }

  // Sort by priority
  const order: ActionPriority[] = ["P1_khan", "P2_tuan", "P3_thang", "P4_cai_tien"];
  items.sort((a, b) => order.indexOf(a.priority) - order.indexOf(b.priority));

  // Dedupe similar titles (keep first)
  const seen = new Set<string>();
  const deduped: ActionRecommendation[] = [];
  for (const it of items) {
    const key = it.title.slice(0, 60);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(it);
  }

  const finalItems = deduped.slice(0, 18);

  const roadmap = (["P1_khan", "P2_tuan", "P3_thang", "P4_cai_tien"] as ActionPriority[]).map((p) => ({
    window: PRIORITY_LABEL[p],
    focus: focusFor(p, finalItems),
    count: finalItems.filter((i) => i.priority === p).length,
  }));

  const checklist: string[] = [];
  let c = 0;
  for (const it of finalItems) {
    checklist.push(`[ ] ${++c}. [${it.priority.replace("_", " ")}] ${it.title} — Owner: ${it.owner} — ${it.timeline}`);
    for (const st of it.steps) {
      checklist.push(`      [ ] B${st.order}. ${st.action.split("\n")[0]}`);
    }
  }

  const p1 = finalItems.filter((i) => i.priority === "P1_khan").length;
  const headline =
    p1 > 0
      ? `Có ${p1} việc khẩn (P1) từ hạn chế của «${ctx.fileName}» — ưu tiên đóng quá hạn PH và bổ sung VB AH=Có trước khi ban hành hồ sơ.`
      : `Không có P1 khẩn; tập trung ${finalItems.filter((i) => i.priority === "P2_tuan").length} việc trong tuần để nâng hạng (hiện ${ctx.grade} · ${ctx.score}/100).`;

  return {
    generatedAt: new Date().toISOString(),
    headline,
    roadmap,
    items: finalItems,
    checklist,
  };
}

function levelToPriority(level: RiskLevel): ActionPriority {
  if (level === "cao") return "P1_khan";
  if (level === "trung_binh") return "P2_tuan";
  if (level === "thap") return "P3_thang";
  return "P4_cai_tien";
}

function categoryFromGap(g: GapItem): ActionCategory {
  if (g.title.includes("quá hạn") || g.title.includes("phản hồi")) return "dieu_phoi_bp";
  if (g.title.includes("Chưa đề cập") || g.title.includes("số hiệu")) return "bo_sung_ho_so";
  if (g.title.includes("dự thảo")) return "theo_doi_du_thao";
  if (g.title.includes("CSDL") || g.title.includes("ngoài")) return "cap_nhat_csdl";
  if (g.title.includes("Không khớp")) return "chat_luong_file";
  return "phap_che";
}

function timelineFromPriority(p: ActionPriority): string {
  switch (p) {
    case "P1_khan":
      return "0–3 ngày làm việc";
    case "P2_tuan":
      return "Trong 7 ngày";
    case "P3_thang":
      return "Trong 30 ngày";
    default:
      return "Lịch cải tiến / quý";
  }
}

function deliverableFromGap(g: GapItem, m?: MatchedVanBan): string {
  if (g.title.includes("Chưa đề cập")) {
    return `Hồ sơ có trích dẫn VB ${g.relatedId || ""} + mapping điều khoản ảnh hưởng`;
  }
  if (g.title.includes("quá hạn")) {
    return `Đủ PH từ [${m?.reconcile.thieu.join(", ") || "BP thiếu"}] hoặc risk acceptance`;
  }
  if (g.title.includes("phản hồi")) {
    return "Cập nhật cột Bộ phận phản hồi khớp danh sách cần PH";
  }
  return "Gap được đóng trên báo cáo rà soát phiên bản sau";
}

function stepsFromGap(g: GapItem, m: MatchedVanBan | undefined, fileName: string): ActionStep[] {
  const vbLine = m
    ? `${m.vanBan.id} — ${m.vanBan.ten_van_ban}`
    : g.relatedName || "VB liên quan";
  return [
    {
      order: 1,
      action: `Xác nhận lại gap trên hồ sơ «${fileName}» và VB: ${vbLine}.`,
      doneWhen: "Owner xác nhận gap còn hiệu lực",
    },
    {
      order: 2,
      action: g.detail.startsWith("Hồ sơ")
        ? `Thực hiện khắc phục: ${g.detail}`
        : `Khắc phục theo mô tả: ${g.detail}`,
      doneWhen: "Có chứng cứ (file sửa / email PH / dòng Excel cập nhật)",
    },
    {
      order: 3,
      action: "Chạy lại Rà soát hồ sơ để xác nhận gap biến mất hoặc giảm mức rủi ro.",
      doneWhen: "Báo cáo mới không còn gap này (hoặc hạ level)",
    },
  ];
}

function focusFor(p: ActionPriority, items: ActionRecommendation[]): string {
  const subset = items.filter((i) => i.priority === p);
  if (!subset.length) return "Không có hạng mục";
  return subset
    .slice(0, 2)
    .map((i) => i.title)
    .join("; ");
}
