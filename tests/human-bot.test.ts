import { test } from "node:test";
import assert from "node:assert/strict";
import { BOX_SEERS, CELL, PASSIVE, type HeroId, type MapId, type NightId } from "../src/game/engine.ts";
import { simulateRun, type RunConfig } from "../scripts/sim-core.ts";
import { isShooter } from "../scripts/sim-human.ts";

const human = (hero: HeroId, night: NightId, map: MapId, extra: Partial<RunConfig> = {}): RunConfig => ({
  hero,
  difficulty: "normal",
  strategy: "human",
  night,
  map,
  seed: 1,
  ...extra,
});

test("the human bot finishes a night, the same way every time, and says why it built", () => {
  const cfg = human("mynxi", "midnight", "stacks");
  const r = simulateRun(cfg);
  assert.ok(r.won || r.reachedWave >= 1);
  assert.deepEqual(r, simulateRun(cfg));
  assert.ok(r.tactics, "human runs carry their reasons");
  const built = Object.values(r.builtBy).reduce((a, b) => a + (b ?? 0), 0);
  const reasons = Object.entries(r.tactics!).filter(([k]) => k !== "back room").reduce((a, [, n]) => a + n, 0);
  assert.equal(reasons, built, "every tower built has a reason");
});

test("the human bot has a Peeler up before shelled fruit walk in, and lamps beside cannons", () => {
  let shellWaves = 0;
  let lampsChecked = 0;
  simulateRun(
    human("scholar", "midnight", "stacks", {
      onPrep: (world, api) => {
        const next = api.comingUp();
        const armoured = next.groups.filter((g) => g.guard !== "none").reduce((a, g) => a + g.count, 0);
        const all = next.groups.reduce((a, g) => a + g.count, 0);
        if (all && armoured / all >= 0.25 && world.towers.filter((t) => isShooter(t.kind)).length >= 3) {
          shellWaves++;
          assert.ok(world.towers.some((t) => t.kind === "peeler"), `wave ${next.index + 1}: shells coming and no Peeler`);
        }
        for (const lamp of world.towers.filter((t) => t.kind === "lantern")) {
          const reach = api.previewStats("lantern").range;
          const lit = world.towers.filter((t) => t !== lamp && !PASSIVE.includes(t.kind) && Math.hypot(t.x - lamp.x, t.y - lamp.y) <= reach).length;
          assert.ok(lit >= 2, `a lamp at ${lamp.c},${lamp.r} lights only ${lit} towers`);
          lampsChecked++;
        }
      },
    }),
  );
  assert.ok(shellWaves > 0, "the Stacks has shelled waves");
  assert.ok(lampsChecked > 0, "it built at least one lamp");
});

test("on the Siege the human bot can aim at Box Cats before they come, and covers paratrooper landings", () => {
  let boxWaves = 0;
  let uncovered = 0;
  let dropWaves = 0;
  simulateRun(
    human("mynxi", "siege", "courtyard", {
      onPrep: (world, api) => {
        const next = api.comingUp();
        if (next.groups.some((g) => g.siege === "boxed")) {
          boxWaves++;
          assert.ok(world.towers.some((t) => BOX_SEERS.includes(t.kind)), `wave ${next.index + 1}: Box Cats and nothing that can aim at them`);
        }
        for (const d of next.drops) {
          dropWaves++;
          if (!api.dropCovered(d)) uncovered++;
        }
      },
    }),
  );
  assert.ok(boxWaves > 0 && dropWaves > 0, "the Siege has Box Cats and paratroopers");
  assert.ok(uncovered <= 1, `${uncovered} paratrooper landings were left uncovered`);
});

test("the human bot uses the keepers' own towers", () => {
  // Vael: a Flask, and no Fire cannon on the wet carpet.
  let fireWithFlask = false;
  const vael = simulateRun(
    human("vael", "midnight", "annex", {
      onPrep: (world) => {
        if (world.towers.some((t) => t.kind === "flask") && world.towers.some((t) => t.kind === "fire")) fireWithFlask = true;
      },
    }),
  );
  assert.ok((vael.builtBy.flask ?? 0) >= 1, "Vael builds her Flask");
  assert.ok(!fireWithFlask, "no Fire cannon beside a Flask");
  // Mynxi: the Desk early, beside the carpet near the door.
  let deskFromDoor = null as number | null;
  simulateRun(
    human("mynxi", "midnight", "stacks", {
      onPrep: (world) => {
        const desk = world.towers.find((t) => t.kind === "desk");
        const door = world.points[world.points.length - 1];
        if (desk && deskFromDoor == null) deskFromDoor = Math.hypot(desk.x - door.x, desk.y - door.y) / CELL;
      },
    }),
  );
  assert.ok(deskFromDoor != null, "Mynxi builds her Reserve Desk");
  assert.ok(deskFromDoor! <= 4, `the Desk is near the door (${deskFromDoor!.toFixed(1)} tiles away)`);
  // The Legal Elf builds the Stomp and the Honey; Sir Michael the Roost and the Gate.
  const elf = simulateRun(human("elf", "midnight", "stacks"));
  assert.ok((elf.builtBy.stomp ?? 0) >= 1 && (elf.builtBy.honey ?? 0) >= 1, "the Elf builds the Stomp and the Honey");
  const michael = simulateRun(human("michael", "midnight", "stacks", { armour: "azure" }));
  assert.ok((michael.builtBy.bombard ?? 0) >= 1 && (michael.builtBy.gourdgate ?? 0) >= 1, "Sir Michael builds the Roost and the Gate");
});
