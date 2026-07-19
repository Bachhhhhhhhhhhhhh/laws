import { useMemo, useRef } from "react";
import type { SnapshotDiff, VanBan } from "../types";
import { VAN_BAN_FIELD_LABELS } from "../types";
import { compareSnapshots, SNAPSHOT_LABEL } from "../lib/snapshot";

interface Props {
  current: VanBan[];
  baseline: VanBan[] | null;
  baselineLabel: string;
  onImportBaseline: (file: File) => void;
  onClearBaseline: () => void;
}

export function SnapshotPanel({
  current,
  baseline,
  baselineLabel,
  onImportBaseline,
  onClearBaseline,
}: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const diffs = useMemo(
    () => (baseline ? compareSnapshots(baseline, current) : []),
    [baseline, current],
  );

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of diffs) m.set(d.changeType, (m.get(d.changeType) ?? 0) + 1);
    return m;
  }, [diffs]);

  const changed = diffs.filter((d) => d.changeType !== "khong_doi");

  return (
    <div className="view">
      <div className="panel">
        <h3>Đối chiếu 2 snapshot Excel</h3>
        <p className="muted">
          File hiện tại: <strong>{current.length}</strong> VB · Baseline:{" "}
          <strong>{baseline ? `${baselineLabel} (${baseline.length} VB)` : "chưa chọn"}</strong>
        </p>
        <div className="top-actions" style={{ marginTop: 10 }}>
          <input
            ref={ref}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImportBaseline(f);
              e.target.value = "";
            }}
          />
          <button type="button" className="btn primary" onClick={() => ref.current?.click()}>
            Chọn file baseline (cũ)
          </button>
          {baseline ? (
            <button type="button" className="btn ghost" onClick={onClearBaseline}>
              Xóa baseline
            </button>
          ) : null}
        </div>
        <p className="muted small" style={{ marginTop: 10 }}>
          So khớp theo <code>ID</code> (fallback tên VB). Hiển thị VB thêm mới, bị xóa, đổi phản hồi,
          đổi ảnh hưởng, đổi hạn…
        </p>
      </div>

      {!baseline ? (
        <div className="empty">Import file Excel kỳ trước để đối chiếu với dữ liệu đang mở.</div>
      ) : (
        <>
          <div className="stat-grid">
            {[...counts.entries()].map(([k, v]) => (
              <div key={k} className="stat-card tone-info">
                <div className="stat-value">{v}</div>
                <div className="stat-label">{SNAPSHOT_LABEL[k as SnapshotDiff["changeType"]]}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <h3>Thay đổi ({changed.length})</h3>
            {changed.length === 0 ? (
              <div className="empty">Hai snapshot trùng khớp hoàn toàn.</div>
            ) : (
              <div className="snapshot-list">
                {changed.map((d) => (
                  <article key={`${d.changeType}-${d.id}-${d.ten.slice(0, 20)}`} className="snapshot-item">
                    <header>
                      <span className={`badge badge-${badgeTone(d.changeType)}`}>
                        {SNAPSHOT_LABEL[d.changeType]}
                      </span>
                      <span className="mono">{d.id || "—"}</span>
                      <strong>{d.ten}</strong>
                    </header>
                    {d.fieldChanges.length > 0 && (
                      <table className="diff-table">
                        <thead>
                          <tr>
                            <th>Trường</th>
                            <th>Baseline</th>
                            <th>Hiện tại</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.fieldChanges.map((c) => (
                            <tr key={c.field}>
                              <td>{VAN_BAN_FIELD_LABELS[c.field]}</td>
                              <td className="prewrap muted">{c.from || "∅"}</td>
                              <td className="prewrap">{c.to || "∅"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function badgeTone(t: SnapshotDiff["changeType"]): string {
  switch (t) {
    case "them_moi":
      return "ok";
    case "xoa":
      return "danger";
    case "doi_ph":
      return "warn";
    case "doi_anh_huong":
      return "danger";
    case "doi_han":
      return "info";
    default:
      return "muted";
  }
}
