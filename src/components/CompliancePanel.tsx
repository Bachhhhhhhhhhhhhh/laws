import { useMemo, useRef, useState } from "react";
import type { DoiChieuKetQua, VanBan } from "../types";
import { extractTextFromFile, type ExtractedFile } from "../lib/extract";
import {
  analyzeCompliance,
  RISK_LABEL,
  type ComplianceReport,
  type RiskLevel,
} from "../lib/compliance";
import { requestAiComplianceInsight, type AiInsight } from "../lib/aiAnalyze";
import { StatusBadge } from "./StatusBadge";
import { ActionPlanPanel } from "./ActionPlanPanel";
import { downloadText } from "../lib/excel";

interface Props {
  catalog: VanBan[];
  onOpenVanBan: (row: DoiChieuKetQua) => void;
}

type Phase = "idle" | "extracting" | "scoring" | "done" | "error";

export function CompliancePanel({ catalog, onOpenVanBan }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedFile | null>(null);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [ai, setAi] = useState<AiInsight | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const gradeTone = useMemo(() => {
    if (!report) return "muted";
    if (report.grade === "A" || report.grade === "B") return "ok";
    if (report.grade === "C") return "warn";
    return "danger";
  }, [report]);

  const runFile = async (file: File) => {
    setError(null);
    setAi(null);
    setReport(null);
    setExtracted(null);
    setPhase("extracting");
    try {
      const ext = await extractTextFromFile(file);
      setExtracted(ext);
      setPhase("scoring");
      // yield UI
      await new Promise((r) => setTimeout(r, 30));
      const rep = analyzeCompliance(ext.text, catalog, ext.fileName, ext.warnings);
      setReport(rep);
      setPhase("done");
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Lỗi xử lý file");
    }
  };

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void runFile(f);
  };

  const runAi = async () => {
    if (!report || !extracted) return;
    setAiLoading(true);
    setAi(null);
    const insight = await requestAiComplianceInsight(report, extracted.text);
    setAi(insight);
    setAiLoading(false);
  };

  const exportReport = () => {
    if (!report) return;
    const lines = [
      `BÁO CÁO RÀ SOÁT HỒ SƠ × VĂN BẢN PHÁP LUẬT`,
      `File: ${report.fileName}`,
      `Thời điểm: ${report.analyzedAt}`,
      `Điểm: ${report.overallScore}/100 · Hạng: ${report.grade}`,
      `Tóm tắt: ${report.summary}`,
      ``,
      `=== STATS ===`,
      JSON.stringify(report.stats, null, 2),
      ``,
      `=== GAPS ===`,
      ...report.gaps.map(
        (g) => `[${RISK_LABEL[g.level]}] ${g.title}\n  ${g.detail}\n  VB: ${g.relatedId || "—"} ${g.relatedName || ""}`,
      ),
      ``,
      `=== ĐỀ XUẤT HÀNH ĐỘNG ===`,
      report.actionPlan.headline,
      ...report.actionPlan.roadmap.map((r) => `- ${r.window} (${r.count}): ${r.focus}`),
      ``,
      ...report.actionPlan.checklist,
      ``,
      `=== RANKING ===`,
      ...report.ranking.map(
        (r, i) =>
          `${i + 1}. [${r.relevance}% liên quan | risk ${r.riskScore}] ${r.vanBan.id} — ${r.vanBan.ten_van_ban}\n   cited=${r.citedInUpload} AH=${r.vanBan.danh_gia_anh_huong}\n   ${r.matchReasons.join("; ")}`,
      ),
      ``,
      `=== REFS ===`,
      report.detectedRefs.join("\n"),
      ``,
      ai?.text ? `=== AI ===\n${ai.text}` : "",
    ];
    downloadText(
      `bao-cao-ra-soat-${report.fileName.replace(/\W+/g, "_").slice(0, 40)}.txt`,
      lines.join("\n"),
      "text/plain;charset=utf-8",
    );
  };

  return (
    <div className="view compliance-view">
      <section className="panel">
        <h3>BMLG · Rà soát hồ sơ × Văn bản pháp luật</h3>
        <p className="muted">
          Tải lên <strong>PDF / Word (.docx) / Excel / TXT</strong> (hợp đồng, SOP, chính sách, báo
          cáo…). Hệ thống trích text, đối chiếu với <strong>{catalog.length}</strong> VB trong CSDL,
          <strong> chấm điểm – xếp hạng</strong> VB liên quan và chỉ ra <strong>điểm thiếu sót / rủi ro</strong>.
        </p>

        <div
          className={`dropzone ${dragOver ? "dragover" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            onFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.xlsx,.xls,.txt,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain"
            hidden
            onChange={(e) => onFiles(e.target.files)}
          />
          <div className="dropzone-title">Kéo thả file vào đây hoặc bấm để chọn</div>
          <div className="muted small">PDF · DOCX · XLSX · TXT — xử lý ngay trên trình duyệt</div>
        </div>

        {(phase === "extracting" || phase === "scoring") && (
          <div className="banner" style={{ marginTop: 12 }}>
            {phase === "extracting" ? "Đang trích xuất nội dung file…" : "Đang đối chiếu & chấm điểm…"}
          </div>
        )}
        {error && (
          <div className="banner error" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
        {extracted && (
          <div className="extract-meta">
            <span>
              <strong>{extracted.fileName}</strong> ({extracted.kind.toUpperCase()})
            </span>
            <span className="muted">{extracted.charCount.toLocaleString()} ký tự</span>
            {extracted.pageOrSheetHint ? (
              <span className="muted">{extracted.pageOrSheetHint}</span>
            ) : null}
            {extracted.warnings.map((w) => (
              <span key={w} className="badge badge-warn">
                {w}
              </span>
            ))}
          </div>
        )}
      </section>

      {report && (
        <>
          <section className={`score-hero tone-${gradeTone}`}>
            <div className="score-ring">
              <div className="score-num">{report.overallScore}</div>
              <div className="score-den">/100</div>
            </div>
            <div className="score-body">
              <div className="score-grade">Hạng {report.grade}</div>
              <p>{report.summary}</p>
              <div className="score-actions">
                <button type="button" className="btn" onClick={exportReport}>
                  Xuất báo cáo TXT
                </button>
                <button type="button" className="btn primary" onClick={() => void runAi()} disabled={aiLoading}>
                  {aiLoading ? "AI đang phân tích…" : "Phân tích sâu bằng AI (xAI)"}
                </button>
              </div>
            </div>
            <div className="score-stats">
              <div>
                <strong>{report.stats.relatedCount}</strong>
                <span>VB liên quan</span>
              </div>
              <div>
                <strong>{report.stats.citedCount}</strong>
                <span>Đã trích dẫn</span>
              </div>
              <div>
                <strong>{report.stats.uncitedHighImpact}</strong>
                <span>AH Có chưa nêu</span>
              </div>
              <div>
                <strong>{report.stats.overdueRelated}</strong>
                <span>Quá hạn PH</span>
              </div>
              <div>
                <strong>{report.stats.draftRelated}</strong>
                <span>Dự thảo liên quan</span>
              </div>
              <div>
                <strong>{report.gaps.length}</strong>
                <span>Điểm thiếu sót</span>
              </div>
              <div>
                <strong>{report.actionPlan.items.length}</strong>
                <span>Việc đề xuất</span>
              </div>
            </div>
          </section>

          <ActionPlanPanel plan={report.actionPlan} fileName={report.fileName} />

          {ai && (
            <section className="panel">
              <h3>Nhận định AI (Grok / xAI)</h3>
              {ai.error ? (
                <div className="banner error">{ai.error}</div>
              ) : (
                <p className="prewrap ai-text">{ai.text}</p>
              )}
            </section>
          )}

          <div className="compliance-grid">
            <section className="panel">
              <h3>Điểm thiếu sót / rủi ro ({report.gaps.length})</h3>
              {report.gaps.length === 0 ? (
                <div className="empty">Không phát hiện gap đáng kể theo rule hiện tại.</div>
              ) : (
                <ul className="gap-list">
                  {report.gaps.map((g) => (
                    <li key={g.id} className={`gap-item level-${g.level}`}>
                      <div className="gap-head">
                        <span className={`badge badge-${riskTone(g.level)}`}>{RISK_LABEL[g.level]}</span>
                        <strong>{g.title}</strong>
                        <span className="muted small">điểm {g.scoreImpact}</span>
                      </div>
                      <p className="gap-detail">{g.detail}</p>
                      {g.relatedId ? (
                        <button
                          type="button"
                          className="linkish"
                          onClick={() => {
                            const hit = report.ranking.find((r) => r.vanBan.id === g.relatedId);
                            if (hit) onOpenVanBan(hit.reconcile);
                          }}
                        >
                          Xem VB {g.relatedId} →
                        </button>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="panel">
              <h3>Tín hiệu từ hồ sơ</h3>
              <div className="detail-section" style={{ border: 0, paddingTop: 0, marginTop: 0 }}>
                <h4 className="subh">Chủ đề gợi ý</h4>
                <div className="chip-row">
                  {report.domains.length ? (
                    report.domains.map((d) => (
                      <span key={d} className="chip chip-info">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="muted">—</span>
                  )}
                </div>
                <h4 className="subh">Số hiệu / căn cứ phát hiện</h4>
                <div className="chip-row">
                  {report.detectedRefs.length ? (
                    report.detectedRefs.map((r) => (
                      <span key={r} className="chip">
                        {r}
                      </span>
                    ))
                  ) : (
                    <span className="muted">Không thấy mẫu số hiệu rõ</span>
                  )}
                </div>
                <h4 className="subh">Từ khóa nổi bật</h4>
                <div className="chip-row">
                  {report.keywords.map((k) => (
                    <span key={k} className="chip chip-muted">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          </div>

          <section className="panel">
            <h3>Ranking văn bản pháp luật liên quan</h3>
            <p className="muted small">
              Sắp theo <strong>risk score</strong> (rủi ro nếu bỏ qua) · kèm % liên quan nội dung
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Risk</th>
                    <th>Liên quan</th>
                    <th>ID</th>
                    <th>Tên văn bản</th>
                    <th>AH</th>
                    <th>Trích dẫn?</th>
                    <th>PH nội bộ</th>
                    <th>Lý do khớp</th>
                  </tr>
                </thead>
                <tbody>
                  {report.ranking.map((r, idx) => (
                    <tr key={r.vanBan.id + idx} onClick={() => onOpenVanBan(r.reconcile)}>
                      <td className="mono">{idx + 1}</td>
                      <td>
                        <span className={`risk-pill ${riskPill(r.riskScore)}`}>{r.riskScore}</span>
                      </td>
                      <td className="mono">{r.relevance}%</td>
                      <td className="mono">{r.vanBan.id}</td>
                      <td className="col-name">{r.vanBan.ten_van_ban}</td>
                      <td>{r.vanBan.danh_gia_anh_huong || "—"}</td>
                      <td>{r.citedInUpload ? "✓ Có" : "✗ Chưa"}</td>
                      <td>
                        <StatusBadge
                          status={r.reconcile.trangThai}
                          quaHan={r.reconcile.quaHan}
                        />
                      </td>
                      <td className="muted small">{r.matchReasons.join(" · ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {report.ranking.length === 0 && (
              <div className="empty">Không có VB đủ ngưỡng liên quan.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function riskTone(level: RiskLevel): string {
  if (level === "cao") return "danger";
  if (level === "trung_binh") return "warn";
  if (level === "thap") return "info";
  return "muted";
}

function riskPill(score: number): string {
  if (score >= 70) return "high";
  if (score >= 45) return "mid";
  return "low";
}
