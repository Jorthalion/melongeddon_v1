import { test } from "node:test";
import assert from "node:assert/strict";
import { ALL_UNLOCKED, CELL, createWorld, emptyProgress, stepWorld } from "../src/game/engine.ts";

const center = (n: number) => n * CELL + CELL / 2;

/** Every fly a hive sends lands: none run out of time on the way, however far the fruit is. */
for (const map of ["stacks", "greathall"] as const) {
  test(`a corner Fly Hive's flies all reach their fruit (${map})`, () => {
    const api = createWorld(() => {}, { meta: ALL_UNLOCKED, keepers: emptyProgress(), setup: { night: "midnight", map, hero: "vael" } });
    api.openSetup();
    api.chooseMap(map);
    api.chooseHero("vael");
    api.beginNight();
    const w = api.world;
    w.hud.seeds = 9999;
    // The open floor tile farthest from the middle of the board.
    let spot: [number, number] = [0, 0];
    let far = -1;
    for (let r = 0; r < w.rows; r++)
      for (let c = 0; c < w.cols; c++) {
        if (w.pathCells.has(`${c},${r}`) || w.shelfCells.has(`${c},${r}`)) continue;
        const d = (c - w.cols / 2) ** 2 + (r - w.rows / 2) ** 2;
        if (d > far) [far, spot] = [d, [c, r]];
      }
    api.chooseBuild("hive");
    api.pointer(center(spot[0]), center(spot[1]), "down");
    assert.ok(w.towers.some((t) => t.kind === "hive"), "hive built");

    let fired = 0;
    let timedOut = 0;
    const lastLife = new Map<number, number>();
    w.hud.lives = 999;
    api.startWave();
    for (let i = 0; i < 60 * 120 && w.hud.phase === "combat"; i++) {
      stepWorld(w, 1 / 60);
      const now = new Set<number>();
      for (const s of w.shots) {
        if (s.element !== "fly") continue;
        now.add(s.id);
        if (!lastLife.has(s.id)) fired++;
        lastLife.set(s.id, s.life);
      }
      for (const [id, life] of lastLife)
        if (!now.has(id)) {
          // A hit ends a shot early; running out of time ends it on its last frame.
          if (life <= 1 / 60 + 1e-6) timedOut++;
          lastLife.delete(id);
        }
    }
    // Stingers (COMBO) kill wave 1 sooner, so fewer flies go out than before; enough to show none time out.
    assert.ok(fired > 12, `the hive fired (${fired})`);
    assert.equal(timedOut, 0, `${timedOut} of ${fired} flies ran out of time`);
  });
}
