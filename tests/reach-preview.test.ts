import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CANNON, CELL, carpetInReach, createWorld, emptyProgress, gateStrip, reachShape, stepWorld, type HeroId, type MapId } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

function night(hero: HeroId = "mynxi", map: MapId = "stacks") {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), allTricks: true, setup: { night: "midnight", map, hero } });
  api.openSetup();
  api.chooseHero(hero);
  if (hero === "michael") api.pickOath("sling");
  else api.beginNight();
  api.world.hud.seeds = 99999;
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof night>;

/** Hover tile (c, r) with `kind` picked: what the placing preview says. Then build it and return the real reach. */
function previewThenBuild(api: Api, kind: Parameters<Api["chooseBuild"]>[0], c: number, r: number) {
  api.dismissSelection();
  api.chooseBuild(kind);
  api.pointer(center(c), center(r), "move");
  const preview = api.world.hud.placeRange;
  api.pointer(center(c), center(r), "down");
  const t = api.world.towers.find((x) => x.c === c && x.r === r);
  assert.ok(t, `built a ${kind} on ${c},${r}`);
  return { t, preview, real: api.statsOf(t.id)!.range };
}

test("placing: the preview already counts the kind's back-room fittings", () => {
  const api = night();
  for (const [kind, mod] of [["melon", "reach"], ["mortar", "arc"], ["bell", "loud"]] as const) {
    api.openShop(kind);
    api.pickMod(mod);
    api.closeShop();
  }
  for (const [kind, c, r] of [["melon", 1, 3], ["mortar", 3, 3], ["bell", 12, 0]] as const) {
    const { preview, real } = previewThenBuild(api, kind, c, r);
    assert.equal(preview, real, kind);
  }
});

test("placing: the preview counts a Reading Lamp in reach, and on the Archive the lamp lifts the dark", () => {
  const stacks = night();
  previewThenBuild(stacks, "lantern", 2, 3);
  const lit = previewThenBuild(stacks, "melon", 3, 3);
  assert.equal(lit.preview, lit.real);
  assert.ok(lit.real > 176, "the lamp's boost shows");
  const far = previewThenBuild(stacks, "melon", 14, 0);
  assert.equal(far.preview, far.real, "out of the lamp's reach: no boost, no boost shown");

  const archive = night("mynxi", "archive");
  const dark = previewThenBuild(archive, "melon", 14, 9);
  assert.equal(dark.preview, dark.real, "in the dark");
  previewThenBuild(archive, "lantern", 2, 6);
  const lamp = previewThenBuild(archive, "melon", 3, 6);
  assert.equal(lamp.preview, lamp.real, "by the lamp");
  assert.ok(lamp.real > dark.real);
});

test("a selected Copycat shows its copy's reach, not nothing", () => {
  const api = night("ooze");
  previewThenBuild(api, "melon", 3, 3);
  const { t } = previewThenBuild(api, "copycat", 4, 3);
  api.dismissSelection();
  api.pointer(t.x, t.y, "down");
  assert.equal(api.world.hud.selected, t.id);
  stepWorld(api.world, 1 / 60);
  assert.ok(api.world.hud.range > 0);
  assert.equal(api.world.hud.range, api.statsOf(t.id)!.range);
});

test("Orrery: the lit band reaches past the orbit as far as a planet can touch a fruit", () => {
  const api = night();
  api.startWave();
  const w = api.world;
  for (let i = 0; i < 600 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const e = w.enemies[0];
  const { t } = previewThenBuild(api, "orrery", 3, 3);
  const range = api.statsOf(t.id)!.range;
  const shape = reachShape("orrery", range);
  assert.equal(shape.outer, range + CANNON.orreryReach);
  for (const off of [-25, 15, 25, 40]) {
    Object.assign(e, { hp: 1e6, maxHp: 1e6, speed: 0 });
    w.enemies = [e];
    for (let i = 0; i < 60 * 4; i++) {
      e.x = t.x;
      e.y = t.y + range + off;
      stepWorld(w, 1 / 60);
    }
    const lit = range + off >= shape.inner && range + off <= shape.outer;
    assert.equal(e.hp < 1e6, lit, `a melon ${range + off} px out: lit ${lit}`);
  }
});

test("Gourd Gate: the preview is the strip it holds, and it holds fruit only there", () => {
  const api = night("michael");
  const { t } = previewThenBuild(api, "gourdgate", 7, 4);
  const strip = gateStrip(api.world.points, t.x, t.y);
  assert.equal(reachShape("gourdgate", 66).mode, "gate");
  assert.ok(Math.abs(strip.length - CANNON.gateBand) < 0.5);
  assert.deepEqual(api.reachOf(t.id), { tiles: Math.round((strip.length / CELL) * 2) / 2, towers: 0 });
  // A fruit on the strip is held; one inside the old circle but past the portcullis is not.
  api.startWave();
  const w = api.world;
  for (let i = 0; i < 600 && !w.enemies.length; i++) stepWorld(w, 1 / 60);
  const e = w.enemies[0];
  w.enemies = [e];
  const s = strip.stretches[0];
  Object.assign(e, { hp: 1e6, maxHp: 1e6, x: (s.x1 + s.x2) / 2, y: (s.y1 + s.y2) / 2, wp: 2 });
  t.cd = 0;
  stepWorld(w, 1 / 60);
  assert.ok((e.stomped ?? 0) > 0, "held on the strip");
  assert.ok(carpetInReach(w.points, t.x, t.y, api.statsOf(t.id)!.range).length > strip.length, "the circle was bigger than where it works");
});

test("towers whose hits land past their circle say so", () => {
  assert.equal(reachShape("quill", 100).beyond?.radius, Math.round(100 * CANNON.quillReach));
  assert.equal(reachShape("stomp", 100).beyond?.radius, 100 + CANNON.stompRadius);
  for (const kind of ["press", "globe", "plane"] as const) assert.ok(reachShape(kind, 100).beyond?.note, kind);
  assert.equal(reachShape("melon", 100).beyond, undefined);
  assert.equal(reachShape("melon", 100).outer, 100);
});
