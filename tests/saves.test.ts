import { test } from "node:test";
import assert from "node:assert/strict";
import { GUIDE_KEY, SAVE_VERSION, SAVE_VERSION_KEY, migrateSaves, type SaveStore } from "../src/lib/saves.ts";

function store(init: Record<string, string> = {}): SaveStore & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
  };
}

test("a fresh install is stamped with the current version and keeps the guide", () => {
  const s = store();
  assert.equal(migrateSaves(s), "fresh");
  assert.equal(s.getItem(SAVE_VERSION_KEY), String(SAVE_VERSION));
  assert.equal(s.getItem(GUIDE_KEY), null);
});

test("unversioned saves (v0.5.0 and earlier) migrate, keep progress and skip the guide", () => {
  const meta = JSON.stringify({ wins: 3 });
  const s = store({ "melongeddon-meta": meta, "melongeddon-speed": "2" });
  assert.equal(migrateSaves(s), "migrated");
  assert.equal(s.getItem("melongeddon-meta"), meta);
  assert.equal(s.getItem("melongeddon-speed"), "2");
  assert.equal(s.getItem(GUIDE_KEY), "done");
  assert.equal(s.getItem(SAVE_VERSION_KEY), String(SAVE_VERSION));
});

test("current saves are left as they are", () => {
  const s = store({ [SAVE_VERSION_KEY]: String(SAVE_VERSION), "melongeddon-best-wave": "7" });
  assert.equal(migrateSaves(s), "current");
  assert.equal(s.getItem("melongeddon-best-wave"), "7");
  assert.equal(s.getItem(GUIDE_KEY), null);
});

test("an unreadable version resets progress but keeps preferences", () => {
  const s = store({ [SAVE_VERSION_KEY]: "banana", "melongeddon-meta": "{}", "melongeddon-keepers": "{}", "melongeddon:muted": "1" });
  assert.equal(migrateSaves(s), "reset");
  assert.equal(s.getItem("melongeddon-meta"), null);
  assert.equal(s.getItem("melongeddon-keepers"), null);
  assert.equal(s.getItem("melongeddon:muted"), "1");
  assert.equal(s.getItem(SAVE_VERSION_KEY), String(SAVE_VERSION));
});

test("saves from a newer version are not touched", () => {
  const s = store({ [SAVE_VERSION_KEY]: String(SAVE_VERSION + 1), "melongeddon-meta": "not json" });
  assert.equal(migrateSaves(s), "newer");
  assert.equal(s.getItem("melongeddon-meta"), "not json");
  assert.equal(s.getItem(SAVE_VERSION_KEY), String(SAVE_VERSION + 1));
});

test("a corrupt JSON save is dropped so its loader starts clean", () => {
  const s = store({ [SAVE_VERSION_KEY]: String(SAVE_VERSION), "melongeddon-setup": "{oops", "melongeddon-meta": "{}" });
  migrateSaves(s);
  assert.equal(s.getItem("melongeddon-setup"), null);
  assert.equal(s.getItem("melongeddon-meta"), "{}");
});

test("blocked storage does not throw", () => {
  const broken: SaveStore = {
    getItem() {
      throw new Error("blocked");
    },
    setItem() {
      throw new Error("blocked");
    },
    removeItem() {
      throw new Error("blocked");
    },
  };
  assert.equal(migrateSaves(broken), "current");
  assert.equal(migrateSaves(null), "current");
});

test("version 1 saves drop the knight's door answer and keep the rest of the setup", () => {
  const setup = { night: "overflow", hero: "vael", difficulty: "hard", door: "accept" };
  const s = store({ [SAVE_VERSION_KEY]: "1", "melongeddon-door": "accept", "melongeddon-setup": JSON.stringify(setup) });
  assert.equal(migrateSaves(s), "migrated");
  assert.equal(s.getItem("melongeddon-door"), null);
  assert.deepEqual(JSON.parse(s.getItem("melongeddon-setup") ?? "{}"), { night: "overflow", hero: "vael", difficulty: "hard" });
  assert.equal(s.getItem(SAVE_VERSION_KEY), String(SAVE_VERSION));
});
