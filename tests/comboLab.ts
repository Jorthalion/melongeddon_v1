// Shared set-up for the status-combo tests (not a test file itself).
import { ALL_UNLOCKED, createWorld, emptyProgress, stepWorld } from "../src/game/engine.ts";

export type Api = ReturnType<typeof createWorld>;
export type Fruit = Api["world"]["enemies"][number];
export type Shot = Api["world"]["shots"][number];

/** A wave held open with `n` sturdy plain melons standing still in a row on the Stacks, `gap` px apart. */
export function lab(n = 2, gap = 30) {
  const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), allTricks: true, setup: { night: "midnight", map: "stacks", hero: "mynxi" } });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 999;
  api.world.hud.seeds = 9999;
  api.startWave();
  const w = api.world;
  for (let i = 0; i < 60 * 30 && w.enemies.length < 1; i++) stepWorld(w, 1 / 60);
  const proto = w.enemies[0];
  const fruit: Fruit[] = [];
  for (let k = 0; k < n; k++) {
    const e = k === 0 ? proto : ({ ...proto, id: 900000 + k } as Fruit);
    Object.assign(e, { kind: "melon", hp: 1000, maxHp: 1000, speed: 0, x: 200 + k * gap, y: 200, wp: 1, guard: "none", shell: 0, boss: false, freeze: 0, chill: 0, frost: 0, iced: 0 });
    fruit.push(e);
  }
  w.enemies = [...fruit];
  // A parked fruit far away keeps the wave open.
  w.enemies.push({ ...proto, id: 999999, hp: 1e9, maxHp: 1e9, speed: 0, x: -500, y: -500 } as Fruit);
  return { api, w, fruit };
}

export const step = (api: Api, s = 1 / 60) => {
  for (let i = 0; i < Math.round(s * 60); i++) stepWorld(api.world, 1 / 60);
};

/** A shot landing on `e` next frame. */
export function shoot(api: Api, e: Fruit, opts: Partial<Shot> = {}) {
  api.world.shots.push({
    id: Math.random() * 1e9,
    x: e.x,
    y: e.y,
    tx: e.x,
    ty: e.y,
    target: e.id,
    dmg: 20,
    life: 1,
    bounces: 0,
    orange: false,
    splash: 0,
    element: "shot",
    procs: false,
    splashRatio: 0,
    chill: 0,
    freezeExtra: 0,
    fireLife: 0,
    fireBurn: 0,
    pulp: false,
    ...opts,
  } as Shot);
  stepWorld(api.world, 1 / 60);
}

export const lost = (e: Fruit) => e.maxHp - e.hp;
export const ICE: Partial<Shot> = { element: "ice", dmg: 1 };
export const MORTAR: Partial<Shot> = { element: "mortar", dmg: 20, splash: 36, splashRatio: 0.5 };
