import { useCallback, useEffect, useMemo, useState } from "react";
import type { DoiChieuKetQua, Filters, VanBan } from "../types";
import { parseExcelFile } from "../lib/excel";
import { normalizeVanBan } from "../lib/parse";
import {
  aggregateByBoPhan,
  computeStats,
  reconcileAll,
} from "../lib/reconcile";

const emptyFilters: Filters = {
  q: "",
  pic: "",
  thang: "",
  tuan: "",
  anhHuong: "",
  trangThai: "",
  boPhan: "",
  chiQuaHan: false,
};

export function useVanBanData() {
  const [list, setList] = useState<VanBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Đang tải…");
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/data/van-ban.json");
      if (!res.ok) throw new Error(`Không tải được dữ liệu mẫu (${res.status})`);
      const raw = (await res.json()) as Partial<VanBan>[];
      setList(raw.map(normalizeVanBan));
      setSourceLabel("van-ban.json (export từ Excel)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setList([]);
      setSourceLabel("Chưa có dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDefault();
  }, [loadDefault]);

  const importFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await parseExcelFile(file);
      if (rows.length === 0) {
        throw new Error("Không đọc được dòng dữ liệu nào từ file Excel.");
      }
      setList(rows);
      setSourceLabel(file.name);
      setFilters(emptyFilters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi đọc Excel");
    } finally {
      setLoading(false);
    }
  }, []);

  const allResults = useMemo(() => reconcileAll(list), [list]);

  const filterOptions = useMemo(() => {
    const pics = new Set<string>();
    const thangs = new Set<string>();
    const tuans = new Set<string>();
    const depts = new Set<string>();
    for (const r of allResults) {
      if (r.vanBan.pic) pics.add(r.vanBan.pic);
      if (r.vanBan.thang) thangs.add(r.vanBan.thang);
      if (r.vanBan.tuan) tuans.add(r.vanBan.tuan);
      for (const d of r.canPhanHoi) depts.add(d);
      for (const d of r.daPhanHoi) depts.add(d);
      for (const d of r.vanBan.bo_phan_chia_se.split(/[,;]/)) {
        const t = d.trim();
        if (t) depts.add(t);
      }
    }
    return {
      pics: [...pics].sort((a, b) => a.localeCompare(b, "vi")),
      thangs: [...thangs].sort((a, b) => Number(a) - Number(b)),
      tuans: [...tuans].sort((a, b) => a.localeCompare(b, "vi")),
      depts: [...depts].sort((a, b) => a.localeCompare(b, "vi")),
    };
  }, [allResults]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return allResults.filter((r) => {
      const vb = r.vanBan;
      if (filters.pic && vb.pic !== filters.pic) return false;
      if (filters.thang && vb.thang !== filters.thang) return false;
      if (filters.tuan && vb.tuan !== filters.tuan) return false;
      if (filters.anhHuong && vb.danh_gia_anh_huong !== filters.anhHuong) return false;
      if (filters.trangThai && r.trangThai !== filters.trangThai) return false;
      if (filters.chiQuaHan && !r.quaHan) return false;
      if (filters.boPhan) {
        const key = filters.boPhan.toUpperCase();
        const hit =
          r.canPhanHoi.some((d) => d.toUpperCase() === key) ||
          r.daPhanHoi.some((d) => d.toUpperCase() === key) ||
          splitHaystack(vb.bo_phan_chia_se).some((d) => d.toUpperCase() === key);
        if (!hit) return false;
      }
      if (q) {
        const hay = [
          vb.id,
          vb.ten_van_ban,
          vb.tom_tat,
          vb.pic,
          vb.bo_phan_chia_se,
          vb.bo_phan_can_phan_hoi,
          vb.bo_phan_phan_hoi,
          vb.ghi_chu,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allResults, filters]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const boPhanAgg = useMemo(() => aggregateByBoPhan(filtered), [filtered]);

  return {
    list,
    loading,
    error,
    sourceLabel,
    filters,
    setFilters,
    filterOptions,
    allResults,
    filtered,
    stats,
    boPhanAgg,
    importFile,
    reload: loadDefault,
  };
}

function splitHaystack(s: string): string[] {
  return s
    .replace(/;/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export type VanBanDataApi = ReturnType<typeof useVanBanData> & {
  filtered: DoiChieuKetQua[];
};
