import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

/**
 * After a build: write precache.json (every file, for the offline cache) into the output folder and stamp its
 * sw.js with a build id. The folder is the one Vite built into (dist, or whatever --outDir says), so a build
 * elsewhere never leaves an unstamped sw.js behind or rewrites dist's list.
 */
function offlineCache(): Plugin {
  let dist = fileURLToPath(new URL("./dist", import.meta.url));
  return {
    name: "melongeddon-offline-cache",
    apply: "build",
    configResolved(config) {
      dist = resolve(config.root, config.build.outDir);
    },
    closeBundle() {
      const walk = (dir: string): string[] =>
        readdirSync(dir).flatMap((name) => {
          const full = join(dir, name);
          return statSync(full).isDirectory() ? walk(full) : [full];
        });
      const skip = new Set(["sw.js", "precache.json", "og.jpg"]);
      const files = walk(dist)
        .map((f) => relative(dist, f).split("\\").join("/"))
        .filter((f) => !skip.has(f))
        .sort();
      const id = Date.now().toString(36);
      writeFileSync(join(dist, "precache.json"), JSON.stringify({ id, files }));
      const sw = join(dist, "sw.js");
      writeFileSync(sw, readFileSync(sw, "utf8").replace("__BUILD_ID__", id));
    },
  };
}
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative asset URLs, so the same build runs at a domain root, under /melongeddon/ on GitHub Pages,
  // or inside itch.io's CDN folder.
  base: "./",
  plugins: [react(), tailwindcss(), offlineCache()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
});
