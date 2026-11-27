import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { BOARDS } from "../src/game/engine.ts";

// The top bar during a night has to fit every screen: the speed, pause, menu and sound buttons were pushed
// off the right edge between 640 and 820 px (44 px buttons plus the title), and on phones by a keeper's
// readout (Power, Hoard, Sisu). Measured in a browser for Mynxi, the Legal Elf, Quackarot, Sir Michael,
// Asser and Samodovol at 320–1280 px (nothing past either edge). These checks keep what makes it fit.
const src = (f: string) => readFileSync(new URL(`../src/components/${f}`, import.meta.url), "utf8");
const header = () => {
  const s = src("GameHUD.tsx");
  return s.slice(s.indexOf("export function GameHeader("), s.indexOf("/** Bottom bar while building or fighting"));
};

test("top bar buttons stay small until there's room for the big ones", () => {
  const h = header();
  assert.ok(!/sm:size-11|sm:h-11/.test(h), "a header button grows at sm (640 px) again");
  assert.match(h, /md:size-11/);
  assert.match(src("GameHUD.tsx"), /h-7 min-\[400px\]:h-8 (?:touch:h-10 touch:max-\[359px\]:h-9 )?md:h-11[^"`]*rounded-lg border px-2/, "the Objection button keeps the header's sizes");
});

test("during a night the game title only shows on wide screens", () => {
  const h = header();
  assert.match(h, /inRun \? "hidden lg:block"/);
  assert.match(h, /inRun \? "max-lg:hidden"/);
});

test("keeper readouts wrap under the stacks instead of pushing the buttons off", () => {
  const h = header();
  assert.match(h, /flex flex-wrap items-center gap-x-1\.5/);
  assert.match(h, /flex shrink-0 items-center gap-1(?: max-\[399px\]:gap-0\.5)?(?: touch:gap-2 touch:max-\[359px\]:gap-1\.5)?">\s*\{showPlace/, "the button group must not shrink");
});

test("the build tabs scroll on their own on the narrowest phones, never the page", () => {
  // Touch screens also fade the row's right edge, so a tab past it shows the row scrolls.
  assert.match(src("GameHUD.tsx"), /"min-w-0 overflow-x-auto(?: touch:pr-6 touch:\[mask-image:[^"]*)?"\}`\} role="tablist"/);
});

test("night and room aren't repeated when the room has the night's name", () => {
  // The Overflow is both a night and a room: the pause menu and Continue used to say it twice.
  assert.equal(BOARDS.overflow.name, "The Overflow");
  const ui = src("ui.tsx");
  assert.match(ui, /export function nightAndRoom/);
  assert.match(ui, /room === night \? night/);
  assert.match(src("PauseMenu.tsx"), /\{nightAndRoom\(hud\)\} · \{wave\}/);
  assert.ok(!/NIGHT_LABEL\[hud\.night\]\} · \{BOARDS/.test(src("PauseMenu.tsx")));
});

test("the checkout card's slide-in never makes the page scroll sideways", () => {
  // It starts off the right edge (the bottom edge on phones); without clipping, the page scrolled
  // sideways by up to 342 px for the first ~150 ms on desktop.
  assert.match(src("CheckoutCard.tsx"), /className="absolute inset-0 z-30 flex items-end overflow-hidden/);
});

test("during a wave the wave count stays on one line on a phone", () => {
  // At 390 px it broke into "Wave" over "1/21" beside the Back room button.
  assert.match(src("GameHUD.tsx"), /shrink-0 font-display text-lg leading-none font-semibold whitespace-nowrap">\s*\{hud\.waveCount \? `Wave/);
});

test("Sir Michael's armour cards fit a phone", () => {
  // At 320–390 px "Dragonscale Mail" spilled out of its card (and the page scrolled sideways at 320).
  const a = src("ArmourIntro.tsx");
  assert.match(a, /group relative flex min-w-0 items-center gap-3 [^"]*max-sm:flex-col/);
  assert.match(a, /<span className="min-w-0 \[overflow-wrap:anywhere\]">/);
});
