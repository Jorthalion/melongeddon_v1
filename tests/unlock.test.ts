import { test } from "node:test";
import assert from "node:assert/strict";
import { ROOM, START_ROOMS, roomFor, unlockNote } from "../src/game/engine.ts";

test("unlockNote: the room that unlocks it, and how close you are", () => {
  const room = roomFor("keeper", "elf")!;
  assert.ok(room, "a room opens the Legal Elf");
  const short = unlockNote("keeper", "elf", START_ROOMS, 0)!;
  assert.equal(short.room.id, room.id);
  assert.equal(short.ready, room.cost <= 0);
  assert.equal(short.text, `Restore ${room.name} in the Grand Catalogue (0 of ${room.cost} fragments).`);
  const rich = unlockNote("keeper", "elf", START_ROOMS, room.cost)!;
  assert.equal(rich.ready, true);
  assert.equal(rich.text, `Restore ${room.name} in the Grand Catalogue. You have the ${room.cost} fragments it takes.`);
});

test("unlockNote: nothing once the room is restored, or for something no room locks", () => {
  const room = roomFor("map", "archive")!;
  assert.equal(unlockNote("map", "archive", [...START_ROOMS, room.id], 0), null);
  assert.equal(unlockNote("map", "stacks", START_ROOMS, 0), null, "the Stacks is open from the start");
  assert.equal(unlockNote("map", "overflow", START_ROOMS, 0), null, "no room locks the Overflow's map");
  assert.ok(ROOM[room.id]);
});

test("unlockNote covers every kind a room can lock: keeper, map, bookmark, keeper tower, cosmetic", () => {
  for (const [kind, id] of [
    ["keeper", "elf"],
    ["map", "archive"],
    ["bookmark", "seedfund"],
    ["tower", "desk"],
    ["cosmetic", "carpets"],
  ] as const) {
    const note = unlockNote(kind, id, START_ROOMS, 0);
    assert.ok(note, `${kind} ${id}`);
    assert.match(note.text, /^Restore .+ in the Grand Catalogue/);
  }
});
