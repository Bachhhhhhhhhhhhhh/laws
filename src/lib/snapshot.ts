import type { SnapshotChangeType, SnapshotDiff, VanBan } from "../types";
import { VAN_BAN_FIELD_ORDER } from "../types";

const WATCH: (keyof VanBan)[] = [
  "ten_van_ban",
  "pic",
  "tom_tat",
  "bo_phan_chia_se",
  "ngay_chia_se",
  "thoi_han_phan_hoi",
  "bo_phan_can_phan_hoi",
  "bo_phan_phan_hoi",
  "danh_gia_anh_huong",
  "ngay_gui_file_so_sanh",
  "ngay_ban_hanh",
  "ngay_hieu_luc",
  "ghi_chu",
  "thoi_han_gop_y",
  "ten_cong_van",
];

export const SNAPSHOT_LABEL: Record<SnapshotChangeType, string> = {
  them_moi: "Thêm mới",
  xoa: "Bị xóa / không còn",
  doi_ph: "Đổi phản hồi BP",
  doi_anh_huong: "Đổi đánh giá AH",
  doi_han: "Đổi hạn PH",
  doi_khac: "Đổi trường khác",
  khong_doi: "Không đổi",
};

function keyOf(vb: VanBan): string {
  return vb.id?.trim() || `name:${vb.ten_van_ban.trim().toLowerCase()}`;
}

export function compareSnapshots(before: VanBan[], after: VanBan[]): SnapshotDiff[] {
  const bMap = new Map(before.map((v) => [keyOf(v), v]));
  const aMap = new Map(after.map((v) => [keyOf(v), v]));
  const keys = new Set([...bMap.keys(), ...aMap.keys()]);
  const diffs: SnapshotDiff[] = [];

  for (const k of keys) {
    const b = bMap.get(k);
    const a = aMap.get(k);

    if (b && !a) {
      diffs.push({
        id: b.id,
        ten: b.ten_van_ban,
        changeType: "xoa",
        before: b,
        fieldChanges: [],
      });
      continue;
    }
    if (!b && a) {
      diffs.push({
        id: a.id,
        ten: a.ten_van_ban,
        changeType: "them_moi",
        after: a,
        fieldChanges: [],
      });
      continue;
    }
    if (!b || !a) continue;

    const fieldChanges: SnapshotDiff["fieldChanges"] = [];
    for (const f of VAN_BAN_FIELD_ORDER) {
      const from = (b[f] ?? "").trim();
      const to = (a[f] ?? "").trim();
      if (from !== to) fieldChanges.push({ field: f, from, to });
    }

    if (!fieldChanges.length) {
      diffs.push({
        id: a.id,
        ten: a.ten_van_ban,
        changeType: "khong_doi",
        before: b,
        after: a,
        fieldChanges: [],
      });
      continue;
    }

    const changed = new Set(fieldChanges.map((c) => c.field));
    let changeType: SnapshotChangeType = "doi_khac";
    if (changed.has("bo_phan_phan_hoi") || changed.has("bo_phan_can_phan_hoi")) {
      changeType = "doi_ph";
    } else if (changed.has("danh_gia_anh_huong")) {
      changeType = "doi_anh_huong";
    } else if (changed.has("thoi_han_phan_hoi")) {
      changeType = "doi_han";
    } else if ([...changed].some((f) => !WATCH.includes(f))) {
      changeType = "doi_khac";
    }

    diffs.push({
      id: a.id,
      ten: a.ten_van_ban,
      changeType,
      before: b,
      after: a,
      fieldChanges,
    });
  }

  const order: SnapshotChangeType[] = [
    "them_moi",
    "xoa",
    "doi_ph",
    "doi_anh_huong",
    "doi_han",
    "doi_khac",
    "khong_doi",
  ];
  return diffs.sort(
    (x, y) => order.indexOf(x.changeType) - order.indexOf(y.changeType) || x.id.localeCompare(y.id),
  );
}
