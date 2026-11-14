import { test } from "node:test";
import assert from "node:assert/strict";
import { BALANCE, EMPTY_META, createWorld, stepWorld } from "../src/game/engine.ts";

function start() {
  const api = createWorld(() => {}, { meta: EMPTY_META });
  api.openSetup();
  api.chooseHero("mynxi");
  api.beginNight();
  api.world.hud.lives = 999;
  return api;
}
type Api = ReturnType<typeof start>;
type Fruit = Api["world"]["enemies"][number];

/** Clear waves (emptying the carpet, taking the first card on every shelf) until prep on the wave called `name`. */
function reach(api: Api, name: string) {
  const w = api.world;
  for (let n = 0; n < 40; n++) {
    if ((w.hud.phase === "prep" || w.hud.phase === "consequence") && w.hud.waveName === name) return;
    if (w.hud.phase === "upgrade") {
      api.pickUpgrade(w.hud.offer[0].id);
      continue;
    }
    api.startWave();
    for (let i = 0; i < 60 * 240 && w.hud.phase === "combat"; i++) {
      w.enemies.length = 0;
      stepWorld(w, 1 / 60);
    }
  }
  throw new Error(`never reached ${name}`);
}

/** Start the wave and step until `find` returns something (no towers stand, so nothing is hurt). */
function waitFor<T>(api: Api, find: () => T | undefined): T {
  api.startWave();
  for (let i = 0; i < 60 * 30; i++) {
    const got = find();
    if (got) return got;
    stepWorld(api.world, 1 / 60);
  }
  throw new Error("it never came");
}

const seconds = (api: Api, s: number) => {
  for (let i = 0; i < Math.round(s * 60); i++) stepWorld(api.world, 1 / 60);
};

test("Stone fruit: a pit takes only pitResist of a hot pool's burn; a plain melon takes it all", () => {
  const api = start();
  reach(api, "Stone fruit");
  const w = api.world;
  const pair = waitFor(api, () => {
    const pit = w.enemies.find((e) => e.pit && e.hp > 0);
    const melon = w.enemies.find((e) => e.kind === "melon" && !e.pit && e.hp > 0);
    return pit && melon ? { pit, melon } : undefined;
  });
  // Both stand still in the same pool for one second.
  const hold = (e: Fruit) => {
    e.freeze = 99;
    e.x = 200;
    e.y = 200;
  };
  hold(pair.pit);
  hold(pair.melon);
  w.pools.push({ x: 200, y: 200, r: 60, life: 1, max: 1, hot: true, burn: 30 });
  const before = { pit: pair.pit.hp, melon: pair.melon.hp };
  seconds(api, 1);
  const lost = { pit: before.pit - pair.pit.hp, melon: before.melon - pair.melon.hp };
  assert.ok(lost.melon > 10, `melon lost ${lost.melon}`);
  assert.ok(Math.abs(lost.pit / lost.melon - BALANCE.pitResist) < 0.04, `pit/melon ${lost.pit / lost.melon}`);
});

test("The gall: the rider heals its host, and with the rider gone the host is only a pumpkin", () => {
  const api = start();
  reach(api, "The gall");
  const w = api.world;
  const rider = waitFor(api, () => w.enemies.find((e) => e.gall && e.hp > 0 && w.enemies.some((o) => o.id === e.mends && o.hp > 0)));
  const host = w.enemies.find((o) => o.id === rider.mends)!;
  assert.equal(host.kind, "pumpkin");
  host.hp = host.maxHp / 2;
  const half = host.hp;
  seconds(api, 1);
  assert.ok(host.hp - half > host.maxHp * 0.04, `healed ${host.hp - half} of ${host.maxHp}`);
  rider.hp = 0;
  stepWorld(w, 1 / 60);
  const after = host.hp;
  seconds(api, 1);
  assert.equal(host.hp, after, "no rider, no healing");
});

test("Borrowers: one at the door takes 12 seeds and no stack", () => {
  const api = start();
  reach(api, "Borrowers");
  const w = api.world;
  const thief = waitFor(api, () => w.enemies.find((e) => e.borrower && e.hp > 0));
  w.hud.seeds = 40;
  w.hud.lives = 9;
  const last = w.points[w.points.length - 1];
  thief.x = last.x;
  thief.y = last.y;
  thief.wp = w.points.length - 1;
  stepWorld(w, 1 / 60);
  assert.equal(w.hud.lives, 9, "no stack");
  assert.equal(w.hud.seeds, 28);
  assert.match(w.hud.log, /borrower/);
});
