import type { Filters } from "../types";
import { TRANG_THAI_LABEL } from "../lib/reconcile";

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  options: {
    pics: string[];
    thangs: string[];
    tuans: string[];
    depts: string[];
  };
}

export function FiltersBar({ filters, onChange, options }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="filters">
      <div className="filter-field grow">
        <label>Tìm kiếm</label>
        <input
          type="search"
          placeholder="ID, tên VB, tóm tắt, PIC, bộ phận…"
          value={filters.q}
          onChange={(e) => set("q", e.target.value)}
        />
      </div>

      <div className="filter-field">
        <label>PIC</label>
        <select value={filters.pic} onChange={(e) => set("pic", e.target.value)}>
          <option value="">Tất cả</option>
          {options.pics.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label>Tháng</label>
        <select value={filters.thang} onChange={(e) => set("thang", e.target.value)}>
          <option value="">Tất cả</option>
          {options.thangs.map((t) => (
            <option key={t} value={t}>
              Tháng {t}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label>Tuần</label>
        <select value={filters.tuan} onChange={(e) => set("tuan", e.target.value)}>
          <option value="">Tất cả</option>
          {options.tuans.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label>Ảnh hưởng</label>
        <select
          value={filters.anhHuong}
          onChange={(e) => set("anhHuong", e.target.value)}
        >
          <option value="">Tất cả</option>
          <option value="Có">Có</option>
          <option value="Không">Không</option>
        </select>
      </div>

      <div className="filter-field">
        <label>Trạng thái đối chiếu</label>
        <select
          value={filters.trangThai}
          onChange={(e) => set("trangThai", e.target.value)}
        >
          <option value="">Tất cả</option>
          {Object.entries(TRANG_THAI_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-field">
        <label>Bộ phận</label>
        <select value={filters.boPhan} onChange={(e) => set("boPhan", e.target.value)}>
          <option value="">Tất cả</option>
          {options.depts.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <label className="filter-check">
        <input
          type="checkbox"
          checked={filters.chiQuaHan}
          onChange={(e) => set("chiQuaHan", e.target.checked)}
        />
        Chỉ quá hạn
      </label>
    </div>
  );
}
