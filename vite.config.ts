import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

/** After a build: write dist/precache.json (every file, for the offline cache) and stamp dist/sw.js with a build id. */
function offlineCache(): Plugin {
  return {
    name: "melongeddon-offline-cache",
    apply: "build",
    closeBundle() {
      const dist = fileURLToPath(new URL("./dist", import.meta.url));
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
