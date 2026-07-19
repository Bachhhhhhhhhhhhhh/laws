import { useState } from "react";
import type { ActionPlan, ActionPriority, ActionRecommendation } from "../lib/recommendations";
import { CATEGORY_LABEL, PRIORITY_LABEL } from "../lib/recommendations";
import { downloadText } from "../lib/excel";

interface Props {
  plan: ActionPlan;
  fileName: string;
}

export function ActionPlanPanel({ plan, fileName }: Props) {
  const [openId, setOpenId] = useState<string | null>(plan.items[0]?.id ?? null);
  const [done, setDone] = useState<Record<string, boolean>>({});

  const toggleStep = (key: string) => {
    setDone((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const exportPlan = () => {
    const lines = [
      `ĐỀ XUẤT HÀNH ĐỘNG — RÀ SOÁT HỒ SƠ`,
      `File: ${fileName}`,
      `Tạo lúc: ${plan.generatedAt}`,
      ``,
      plan.headline,
      ``,
      `=== ROADMAP ===`,
      ...plan.roadmap.map((r) => `- ${r.window} (${r.count}): ${r.focus}`),
      ``,
      `=== CHI TIẾT ===`,
      ...plan.items.flatMap((it, idx) => formatItem(idx + 1, it)),
      ``,
      `=== CHECKLIST TỔNG ===`,
      ...plan.checklist,
    ];
    downloadText(
      `de-xuat-hanh-dong-${fileName.replace(/\W+/g, "_").slice(0, 40)}.txt`,
      lines.join("\n"),
      "text/plain;charset=utf-8",
    );
  };

  const byPriority = (p: ActionPriority) => plan.items.filter((i) => i.priority === p);

  return (
    <section className="panel action-plan-panel">
      <div className="panel-head action-plan-head">
        <div>
          <h3>Đề xuất nên làm gì (chi tiết)</h3>
          <p className="muted">{plan.headline}</p>
        </div>
        <button type="button" className="btn primary" onClick={exportPlan}>
          Xuất kế hoạch TXT
        </button>
      </div>

      <div className="roadmap-row">
        {plan.roadmap.map((r) => (
          <div key={r.window} className={`roadmap-card ${r.count ? "has" : "empty-card"}`}>
            <div className="roadmap-count">{r.count}</div>
            <div className="roadmap-window">{r.window}</div>
            <div className="roadmap-focus muted small">{r.focus}</div>
          </div>
        ))}
      </div>

      {(["P1_khan", "P2_tuan", "P3_thang", "P4_cai_tien"] as ActionPriority[]).map((p) => {
        const list = byPriority(p);
        if (!list.length) return null;
        return (
          <div key={p} className="action-priority-block">
            <h4 className={`priority-title prio-${p}`}>{PRIORITY_LABEL[p]}</h4>
            <div className="action-cards">
              {list.map((it, idx) => {
                const isOpen = openId === it.id;
                return (
                  <article key={it.id} className={`action-card prio-${it.priority}`}>
                    <button
                      type="button"
                      className="action-card-toggle"
                      onClick={() => setOpenId(isOpen ? null : it.id)}
                    >
                      <span className="action-idx">
                        {idx + 1}. {CATEGORY_LABEL[it.category]}
                      </span>
                      <strong className="action-title">{it.title}</strong>
                      <span className="muted small action-meta">
                        Owner: {it.owner} · {it.timeline}
                      </span>
                      <span className="action-chevron">{isOpen ? "▾" : "▸"}</span>
                    </button>

                    {isOpen && (
                      <div className="action-body">
                        <div className="action-grid">
                          <div>
                            <div className="subh">Vì sao (từ hạn chế file)</div>
                            <p className="prewrap">{it.why}</p>
                          </div>
                          <div>
                            <div className="subh">Kết quả cần có (deliverable)</div>
                            <p className="prewrap">{it.deliverable}</p>
                          </div>
                          <div>
                            <div className="subh">Chủ trì</div>
                            <p>{it.owner}</p>
                            {it.collaborators.length > 0 && (
                              <>
                                <div className="subh">Phối hợp</div>
                                <div className="chip-row">
                                  {it.collaborators.map((c) => (
                                    <span key={c} className="chip chip-info">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                          <div>
                            <div className="subh">Thời hạn gợi ý</div>
                            <p>{it.timeline}</p>
                            <div className="subh">Nếu không làm</div>
                            <p className="text-danger small prewrap">{it.ifIgnored}</p>
                          </div>
                        </div>

                        {it.relatedVbNames.length > 0 && (
                          <div className="related-vb-box">
                            <div className="subh">VB / tham chiếu liên quan</div>
                            <ul className="related-vb-list">
                              {it.relatedVbNames.map((name, i) => (
                                <li key={name + i}>
                                  {it.relatedVbIds[i] ? (
                                    <span className="mono">{it.relatedVbIds[i]}</span>
                                  ) : null}{" "}
                                  {name}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="subh">Các bước cụ thể</div>
                        <ol className="action-steps">
                          {it.steps.map((st) => {
                            const key = `${it.id}-s${st.order}`;
                            return (
                              <li key={key} className={done[key] ? "step-done" : undefined}>
                                <label className="step-label">
                                  <input
                                    type="checkbox"
                                    checked={!!done[key]}
                                    onChange={() => toggleStep(key)}
                                  />
                                  <div>
                                    <div className="step-action prewrap">
                                      <strong>Bước {st.order}.</strong> {st.action}
                                    </div>
                                    <div className="step-done-when muted small">
                                      ✓ Xong khi: {st.doneWhen}
                                    </div>
                                  </div>
                                </label>
                              </li>
                            );
                          })}
                        </ol>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        );
      })}

      <details className="checklist-details">
        <summary>Checklist tổng hợp (copy / theo dõi)</summary>
        <pre className="checklist-pre">{plan.checklist.join("\n")}</pre>
      </details>
    </section>
  );
}

function formatItem(n: number, it: ActionRecommendation): string[] {
  return [
    ``,
    `${n}. [${PRIORITY_LABEL[it.priority]}] ${it.title}`,
    `   Nhóm: ${CATEGORY_LABEL[it.category]}`,
    `   Owner: ${it.owner}`,
    `   Phối hợp: ${it.collaborators.join(", ") || "—"}`,
    `   Timeline: ${it.timeline}`,
    `   Vì sao: ${it.why}`,
    `   Deliverable: ${it.deliverable}`,
    `   Nếu bỏ: ${it.ifIgnored}`,
    `   VB: ${it.relatedVbNames.map((name, i) => (it.relatedVbIds[i] ? `${it.relatedVbIds[i]} ` : "") + name).join(" | ") || "—"}`,
    `   Bước:`,
    ...it.steps.map(
      (s) => `      ${s.order}. ${s.action.replace(/\n/g, "\n         ")}\n         → Xong khi: ${s.doneWhen}`,
    ),
  ];
}
