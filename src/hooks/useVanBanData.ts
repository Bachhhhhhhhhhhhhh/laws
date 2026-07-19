import { useCallback, useEffect, useMemo, useState } from "react";
import type { Filters, SortDir, SortKey, VanBan } from "../types";
import { parseExcelFile } from "../lib/excel";
import { normalizeVanBan, parseDate } from "../lib/parse";
import {
  aggregateByBoPhan,
  aggregateByPic,
  computeStats,
  fieldFillRates,
  reconcileAll,
} from "../lib/reconcile";
import { clearStored, loadStored, saveStored } from "../lib/storage";

const emptyFilters: Filters = {
  q: "",
  pic: "",
  thang: "",
  tuan: "",
  ky: "",
  anhHuong: "",
  trangThai: "",
  boPhan: "",
  loaiVanBan: "",
  deadlineBucket: "",
  chiQuaHan: false,
  chiDuThao: false,
  chiCoFileSoSanh: false,
  chiThieuTruong: false,
};

function splitHaystack(s: string): string[] {
  return s
    .replace(/;/g, ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export function useVanBanData() {
  const [list, setList] = useState<VanBan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("Đang tải…");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [sortKey, setSortKey] = useState<SortKey>("thoi_han_phan_hoi");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [baseline, setBaseline] = useState<VanBan[] | null>(null);
  const [baselineLabel, setBaselineLabel] = useState("");

  const applyList = useCallback((rows: VanBan[], label: string, persist = true) => {
    setList(rows);
    setSourceLabel(label);
    if (persist) saveStored(rows, label);
  }, []);

  const loadDefault = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stored = loadStored();
      if (stored?.list.length) {
        applyList(stored.list, `${stored.sourceLabel} (đã lưu cục bộ)`, false);
        setLoading(false);
        return;
      }
      const res = await fetch("/data/van-ban.json");
      if (!res.ok) throw new Error(`Không tải được dữ liệu mẫu (${res.status})`);
      const raw = (await res.json()) as Partial<VanBan>[];
      applyList(raw.map(normalizeVanBan), "van-ban.json (export từ Excel)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
      setList([]);
      setSourceLabel("Chưa có dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [applyList]);

  useEffect(() => {
    void loadDefault();
  }, [loadDefault]);

  const importFile = useCallback(
    async (file: File) => {
      setLoading(true);
      setError(null);
      try {
        const rows = await parseExcelFile(file);
        if (rows.length === 0) {
          throw new Error("Không đọc được dòng dữ liệu nào từ file Excel.");
        }
        applyList(rows, file.name);
        setFilters(emptyFilters);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Lỗi đọc Excel");
      } finally {
        setLoading(false);
      }
    },
    [applyList],
  );

  const importBaseline = useCallback(async (file: File) => {
    setError(null);
    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) throw new Error("File baseline trống.");
      setBaseline(rows);
      setBaselineLabel(file.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi đọc baseline");
    }
  }, []);

  const resetToSample = useCallback(async () => {
    clearStored();
    setBaseline(null);
    setBaselineLabel("");
    setFilters(emptyFilters);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/data/van-ban.json");
      if (!res.ok) throw new Error(`Không tải được dữ liệu mẫu (${res.status})`);
      const raw = (await res.json()) as Partial<VanBan>[];
      applyList(raw.map(normalizeVanBan), "van-ban.json (export từ Excel)");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [applyList]);

  const allResults = useMemo(() => reconcileAll(list), [list]);

  const filterOptions = useMemo(() => {
    const pics = new Set<string>();
    const thangs = new Set<string>();
    const tuans = new Set<string>();
    const kys = new Set<string>();
    const depts = new Set<string>();
    for (const r of allResults) {
      if (r.vanBan.pic) pics.add(r.vanBan.pic);
      if (r.vanBan.thang) thangs.add(r.vanBan.thang);
      if (r.vanBan.tuan) tuans.add(r.vanBan.tuan);
      if (r.vanBan.ky) kys.add(r.vanBan.ky);
      for (const d of r.canPhanHoi) depts.add(d);
      for (const d of r.daPhanHoi) depts.add(d);
      for (const d of r.chiaSe) depts.add(d);
    }
    return {
      pics: [...pics].sort((a, b) => a.localeCompare(b, "vi")),
      thangs: [...thangs].sort((a, b) => Number(a) - Number(b)),
      tuans: [...tuans].sort((a, b) => a.localeCompare(b, "vi")),
      kys: [...kys].sort((a, b) => a.localeCompare(b, "vi")),
      depts: [...depts].sort((a, b) => a.localeCompare(b, "vi")),
    };
  }, [allResults]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    let rows = allResults.filter((r) => {
      const vb = r.vanBan;
      if (filters.pic && vb.pic !== filters.pic) return false;
      if (filters.thang && vb.thang !== filters.thang) return false;
      if (filters.tuan && vb.tuan !== filters.tuan) return false;
      if (filters.ky && vb.ky !== filters.ky) return false;
      if (filters.anhHuong && vb.danh_gia_anh_huong !== filters.anhHuong) return false;
      if (filters.trangThai && r.trangThai !== filters.trangThai) return false;
      if (filters.loaiVanBan && r.loaiVanBan !== filters.loaiVanBan) return false;
      if (filters.deadlineBucket && r.deadlineBucket !== filters.deadlineBucket) return false;
      if (filters.chiQuaHan && !r.quaHan) return false;
      if (filters.chiDuThao && !r.isDuThao) return false;
      if (filters.chiCoFileSoSanh && !r.daCoFileSoSanh) return false;
      if (filters.chiThieuTruong && r.missingFields.length === 0) return false;
      if (filters.boPhan) {
        const key = filters.boPhan.toUpperCase();
        const hit =
          r.canPhanHoi.some((d) => d.toUpperCase() === key) ||
          r.daPhanHoi.some((d) => d.toUpperCase() === key) ||
          r.chiaSe.some((d) => d.toUpperCase() === key) ||
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
          vb.ten_cong_van,
          vb.ky,
          vb.tuan,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const dir = sortDir === "asc" ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      const va = a.vanBan;
      const vb = b.vanBan;
      let cmp = 0;
      switch (sortKey) {
        case "id":
          cmp = va.id.localeCompare(vb.id, "vi", { numeric: true });
          break;
        case "ten_van_ban":
          cmp = va.ten_van_ban.localeCompare(vb.ten_van_ban, "vi");
          break;
        case "pic":
          cmp = va.pic.localeCompare(vb.pic, "vi");
          break;
        case "thang":
          cmp = Number(va.thang || 0) - Number(vb.thang || 0);
          break;
        case "tuan":
          cmp = va.tuan.localeCompare(vb.tuan, "vi");
          break;
        case "ngay_chia_se": {
          const da = parseDate(va.ngay_chia_se)?.getTime() ?? 0;
          const db = parseDate(vb.ngay_chia_se)?.getTime() ?? 0;
          cmp = da - db;
          break;
        }
        case "thoi_han_phan_hoi": {
          const da = a.ngayDeadline?.getTime() ?? Number.POSITIVE_INFINITY;
          const db = b.ngayDeadline?.getTime() ?? Number.POSITIVE_INFINITY;
          cmp = da - db;
          break;
        }
        case "trangThai":
          cmp = a.trangThai.localeCompare(b.trangThai);
          break;
        case "completeness":
          cmp = a.completeness - b.completeness;
          break;
        case "danh_gia_anh_huong":
          cmp = va.danh_gia_anh_huong.localeCompare(vb.danh_gia_anh_huong, "vi");
          break;
        default:
          cmp = 0;
      }
      return cmp * dir;
    });

    return rows;
  }, [allResults, filters, sortKey, sortDir]);

  const stats = useMemo(() => computeStats(filtered), [filtered]);
  const boPhanAgg = useMemo(() => aggregateByBoPhan(filtered), [filtered]);
  const picAgg = useMemo(() => aggregateByPic(filtered), [filtered]);
  const fillRates = useMemo(() => fieldFillRates(list), [list]);

  const toggleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir("asc");
      return key;
    });
  }, []);

  return {
    list,
    loading,
    error,
    sourceLabel,
    filters,
    setFilters,
    resetFilters: () => setFilters(emptyFilters),
    filterOptions,
    allResults,
    filtered,
    stats,
    boPhanAgg,
    picAgg,
    fillRates,
    sortKey,
    sortDir,
    toggleSort,
    importFile,
    importBaseline,
    baseline,
    baselineLabel,
    clearBaseline: () => {
      setBaseline(null);
      setBaselineLabel("");
    },
    reload: resetToSample,
  };
}
