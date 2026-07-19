import type { ComplianceReport } from "./compliance";

export interface AiInsight {
  enabled: boolean;
  text: string;
  error?: string;
}

/**
 * Gọi proxy dev `/api/ai-compliance` (xAI server-side qua Vite plugin).
 * Không nhúng API key vào bundle trình duyệt.
 */
export async function requestAiComplianceInsight(
  report: ComplianceReport,
  uploadExcerpt: string,
): Promise<AiInsight> {
  const top = report.ranking.slice(0, 12).map((r) => ({
    id: r.vanBan.id,
    ten: r.vanBan.ten_van_ban,
    ah: r.vanBan.danh_gia_anh_huong,
    relevance: r.relevance,
    risk: r.riskScore,
    cited: r.citedInUpload,
    thieu: r.reconcile.thieu,
  }));

  const gaps = report.gaps.slice(0, 15).map((g) => ({
    level: g.level,
    title: g.title,
    detail: g.detail,
  }));

  try {
    const res = await fetch("/api/ai-compliance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: report.fileName,
        score: report.overallScore,
        grade: report.grade,
        summary: report.summary,
        domains: report.domains,
        refs: report.detectedRefs,
        topMatches: top,
        gaps,
        excerpt: uploadExcerpt.slice(0, 6000),
      }),
    });

    if (res.status === 501) {
      return {
        enabled: false,
        text: "",
        error:
          "Chưa bật AI: đặt XAI_API_KEY trong file .env rồi chạy lại npm run dev. Phân tích rule-based vẫn dùng được.",
      };
    }
    if (!res.ok) {
      const err = await res.text();
      return { enabled: true, text: "", error: err || `AI lỗi HTTP ${res.status}` };
    }
    const data = (await res.json()) as { text?: string };
    return { enabled: true, text: data.text || "(AI không trả nội dung)" };
  } catch (e) {
    return {
      enabled: false,
      text: "",
      error: e instanceof Error ? e.message : "Không gọi được AI proxy",
    };
  }
}
