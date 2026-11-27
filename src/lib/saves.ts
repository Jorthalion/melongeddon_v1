/**
 * Save versioning. Every save lives in localStorage under its own key; one more key,
 * `melongeddon-save-version`, says which layout they are in. `migrateSaves()` runs once at
 * startup, before the game reads anything:
 *
 * - no saves at all: a fresh install, stamped with the current version;
 * - an older version (or saves with no version, from v0.5.0 and earlier, which count as 0):
 *   each migration runs in order, then the current version is stamped;
 * - a version this build can't read (garbage, or a migration fails): the progress saves are
 *   cleared and the game starts clean; preferences such as sound and speed are kept;
 * - a newer version (an older copy of the game opened after a newer one): left untouched.
 *
 * To change a save layout: bump SAVE_VERSION and add MIGRATIONS[old] that rewrites the keys.
 */

export const SAVE_VERSION = 2;
export const SAVE_VERSION_KEY = "melongeddon-save-version";

/** Progress: cleared on a reset. JSON ones are checked on every start. */
export const PROGRESS_KEYS = [
  "melongeddon-meta",
  "melongeddon-bookmark",
  "melongeddon-keepers",
  "melongeddon-setup",
  "melongeddon-best-wave",
  "melongeddon-endless-best",
  "melongeddon-guide",
  // A night in play, phones only (see saveRun in engine.ts). Cleared with the rest on a reset.
  "melongeddon-run",
] as const;
const JSON_KEYS = ["melongeddon-meta", "melongeddon-keepers", "melongeddon-setup"];

/** Preferences: never cleared. */
export const PREF_KEYS = [
  "melongeddon-speed",
  "melongeddon-reduced",
  "melongeddon-wavebar",
  "melongeddon-ui-size",
  "melongeddon-dev",
  "melongeddon:muted",
  "melongeddon:music",
  "melongeddon:tutorial",
  "melongeddon:chute-tip",
] as const;

/** The guided first night is finished (or skipped). */
export const GUIDE_KEY = "melongeddon-guide";

/** The bit of Storage this needs, so tests can pass a plain object. */
export interface SaveStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** MIGRATIONS[n] turns version-n saves into version n+1. */
const MIGRATIONS: Record<number, (store: SaveStore) => void> = {
  // v0 → v1: same layouts. Players who already have progress skip the new guided first night.
  0(store) {
    const played = ["melongeddon-meta", "melongeddon-keepers", "melongeddon-setup", "melongeddon-best-wave"].some(
      (k) => store.getItem(k) != null,
    );
    if (played && store.getItem(GUIDE_KEY) == null) store.setItem(GUIDE_KEY, "done");
  },
  // v1 → v2: the knight no longer comes to the door. Drop the saved answer.
  1(store) {
    store.removeItem("melongeddon-door");
    const raw = store.getItem("melongeddon-setup");
    if (raw == null) return;
    try {
      const setup = JSON.parse(raw);
      if (setup && typeof setup === "object" && "door" in setup) {
        delete setup.door;
        store.setItem("melongeddon-setup", JSON.stringify(setup));
      }
    } catch {
      /* a broken setup is dropped by the JSON check */
    }
  },
};

export type MigrateResult = "fresh" | "current" | "migrated" | "reset" | "newer";

function clearProgress(store: SaveStore) {
  for (const k of PROGRESS_KEYS) store.removeItem(k);
}

export function migrateSaves(store: SaveStore | null = defaultStore()): MigrateResult {
  if (!store) return "current";
  try {
    const raw = store.getItem(SAVE_VERSION_KEY);
    const any = PROGRESS_KEYS.some((k) => store.getItem(k) != null);
    let result: MigrateResult;
    if (raw == null && !any) {
      result = "fresh";
    } else {
      const from = raw == null ? 0 : Number(raw);
      if (!Number.isInteger(from) || from < 0) {
        clearProgress(store);
        result = "reset";
      } else if (from > SAVE_VERSION) {
        return "newer";
      } else if (from === SAVE_VERSION) {
        result = "current";
      } else {
        try {
          for (let v = from; v < SAVE_VERSION; v++) {
            const step = MIGRATIONS[v];
            if (!step) throw new Error(`no migration from save version ${v}`);
            step(store);
          }
          result = "migrated";
        } catch {
          clearProgress(store);
          result = "reset";
        }
      }
    }
    // A save that isn't valid JSON can't be read anyway: drop it so its loader starts clean.
    for (const k of JSON_KEYS) {
      const v = store.getItem(k);
      if (v == null) continue;
      try {
        JSON.parse(v);
      } catch {
        store.removeItem(k);
      }
    }
    store.setItem(SAVE_VERSION_KEY, String(SAVE_VERSION));
    return result;
  } catch {
    // Storage blocked (some embeds): nothing to migrate, nothing will be saved.
    return "current";
  }
}

function defaultStore(): SaveStore | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}
