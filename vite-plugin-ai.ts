import type { Plugin } from "vite";

/**
 * Dev-only proxy: POST /api/ai-compliance → xAI Responses API.
 * Key: process.env.XAI_API_KEY (không lộ ra client).
 */
export function aiCompliancePlugin(): Plugin {
  return {
    name: "ai-compliance-proxy",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.split("?")[0] !== "/api/ai-compliance" || req.method !== "POST") {
          next();
          return;
        }

        const key = process.env.XAI_API_KEY;
        if (!key) {
          res.statusCode = 501;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "XAI_API_KEY missing" }));
          return;
        }

        try {
          const chunks: Buffer[] = [];
          for await (const c of req) chunks.push(c as Buffer);
          const body = JSON.parse(Buffer.concat(chunks).toString("utf8")) as {
            fileName: string;
            score: number;
            grade: string;
            summary: string;
            domains: string[];
            refs: string[];
            topMatches: unknown[];
            gaps: unknown[];
            excerpt: string;
          };

          const prompt = `Bạn là chuyên gia tuân thủ pháp lý doanh nghiệp (Việt Nam).
Nhiệm vụ: đọc tóm tắt kết quả đối chiếu hồ sơ nội bộ với CSDL văn bản pháp luật, rồi:
1) Đánh giá nhanh mức độ rủi ro vi phạm / thiếu sót (3-5 câu).
2) Liệt kê checklist việc cần làm (bullet, ưu tiên).
3) Chỉ ra tối đa 5 điểm thiếu sót quan trọng nhất (cụ thể, actionable).
4) Không bịa số hiệu VB không có trong dữ liệu.

File: ${body.fileName}
Điểm rule-based: ${body.score}/100 (hạng ${body.grade})
Tóm tắt máy: ${body.summary}
Chủ đề: ${(body.domains || []).join(", ")}
Refs phát hiện: ${(body.refs || []).join("; ")}
Top match JSON: ${JSON.stringify(body.topMatches).slice(0, 5000)}
Gaps JSON: ${JSON.stringify(body.gaps).slice(0, 4000)}

Trích đoạn hồ sơ:
"""
${(body.excerpt || "").slice(0, 5500)}
"""

Trả lời bằng tiếng Việt, rõ ràng, chuyên nghiệp.`;

          const aiRes = await fetch("https://api.x.ai/v1/responses", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "grok-4.5",
              input: prompt,
            }),
          });

          if (!aiRes.ok) {
            const errText = await aiRes.text();
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: errText.slice(0, 500) }));
            return;
          }

          const data = (await aiRes.json()) as {
            output_text?: string;
            output?: { content?: { type: string; text?: string }[] }[];
          };
          let text = data.output_text || "";
          if (!text && Array.isArray(data.output)) {
            text = data.output
              .flatMap((o) => o.content || [])
              .filter((c) => c.type === "output_text" || c.text)
              .map((c) => c.text || "")
              .join("\n");
          }

          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ text: text || JSON.stringify(data).slice(0, 2000) }));
        } catch (e) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ error: e instanceof Error ? e.message : "AI proxy error" }),
          );
        }
      });
    },
  };
}
