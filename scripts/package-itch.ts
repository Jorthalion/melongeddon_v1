/**
 * Zips dist/ into release/melongeddon-web.zip for an itch.io HTML upload
 * (index.html at the zip root). Run after `npm run build`, or use `npm run package`.
 * No dependencies: writes a standard deflate zip with node:zlib.
 */
import { crc32, deflateRawSync } from "node:zlib";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const DIST = "dist";
const OUT_DIR = "release";
const OUT = join(OUT_DIR, "melongeddon-web.zip");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

let files: string[];
try {
  files = walk(DIST).sort();
} catch {
  console.error("No dist/ folder. Run `npm run build` first.");
  process.exit(1);
}
if (!files.some((f) => relative(DIST, f) === "index.html")) {
  console.error("dist/index.html is missing. Run `npm run build` first.");
  process.exit(1);
}

const locals: Buffer[] = [];
const centrals: Buffer[] = [];
let offset = 0;
// DOS timestamp for 2026-01-01 00:00, so zips are byte-identical between builds.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

for (const file of files) {
  const name = Buffer.from(relative(DIST, file).split("\\").join("/"), "utf8");
  const raw = readFileSync(file);
  const packed = deflateRawSync(raw, { level: 9 });
  const useDeflate = packed.length < raw.length;
  const body = useDeflate ? packed : raw;
  const crc = crc32(raw);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // UTF-8 names
  local.writeUInt16LE(useDeflate ? 8 : 0, 8);
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(body.length, 18);
  local.writeUInt32LE(raw.length, 22);
  local.writeUInt16LE(name.length, 26);
  local.writeUInt16LE(0, 28);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6);
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(useDeflate ? 8 : 0, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(body.length, 20);
  central.writeUInt32LE(raw.length, 24);
  central.writeUInt16LE(name.length, 28);
  central.writeUInt32LE(offset, 42);

  locals.push(local, name, body);
  centrals.push(central, name);
  offset += local.length + name.length + body.length;
}

const centralSize = centrals.reduce((n, b) => n + b.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

mkdirSync(OUT_DIR, { recursive: true });
const zip = Buffer.concat([...locals, ...centrals, end]);
writeFileSync(OUT, zip);
console.log(`Wrote ${OUT} (${files.length} files, ${(zip.length / 1024 / 1024).toFixed(2)} MB)`);
