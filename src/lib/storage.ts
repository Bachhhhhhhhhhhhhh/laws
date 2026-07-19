import type { VanBan } from "../types";
import { normalizeVanBan } from "./parse";

const KEY = "van-ban-doi-chieu:v1";

interface Stored {
  list: VanBan[];
  sourceLabel: string;
  savedAt: string;
}

export function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.list)) return null;
    return {
      list: parsed.list.map(normalizeVanBan),
      sourceLabel: parsed.sourceLabel || "localStorage",
      savedAt: parsed.savedAt || "",
    };
  } catch {
    return null;
  }
}

export function saveStored(list: VanBan[], sourceLabel: string) {
  try {
    const payload: Stored = {
      list,
      sourceLabel,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // quota / private mode — ignore
  }
}

export function clearStored() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
