import { test } from "node:test";
import assert from "node:assert/strict";
import { createWorld, stepWorld, type UpgradeId } from "../src/game/engine.ts";

type Api = ReturnType<typeof createWorld>;

/** Clear waves until the board is waiting on `wave` (1-based), popping every fruit as it spawns. */
function playTo(api: Api, wave: number) {
  for (let guard = 0; guard < 40 && !(api.world.hud.phase === "prep" && api.world.hud.wave === wave); guard++) {
    const h = api.world.hud;
    if (h.phase === "upgrade") api.pickUpgrade(h.offer[0].id as UpgradeId);
    else if (h.phase === "memory") api.ackMemory();
    else if (h.phase === "alliance") api.chooseAlliance("reject");
    else if (h.phase === "prep" || h.phase === "consequence" || h.phase === "betrayal") {
      api.startWave();
      for (let i = 0; i < 60 * 120 && api.world.hud.phase === "combat"; i++) {
        for (const e of api.world.enemies) e.hp = 0;
        stepWorld(api.world, 1 / 60);
      }
    } else break;
  }
  assert.equal(api.world.hud.wave, wave, `reached wave ${wave}`);
}

test("Midnight never flags the chute", () => {
  const api = createWorld(() => {});
  api.continueRun();
  api.beginNight();
  assert.equal(api.world.hud.chuteWave, false);
  playTo(api, 6);
  assert.equal(api.world.hud.chuteWave, false);
});

test("the Overflow flags the chute before wave 6, not wave 1, and a reset clears it", () => {
  const api = createWorld(() => {}, { setup: { night: "overflow", hero: "vael", door: "reject" } });
  api.continueRun();
  assert.equal(api.world.hud.night, "overflow");
  assert.equal(api.world.hud.chuteWave, false, "wave 1 comes in the front door");
  api.beginNight();
  playTo(api, 5);
  assert.equal(api.world.hud.chuteWave, false, "wave 5 has no chute fruit");
  playTo(api, 6);
  assert.equal(api.world.hud.chuteWave, true, "wave 6, 'The chute'");
  api.reset();
  assert.equal(api.world.hud.chuteWave, false);
});
