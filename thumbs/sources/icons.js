import fs from "node:fs";
import path from "node:path";
import { cacheDir, download } from "../env.js";

// Simple Icons (CC0), by slug: https://simpleicons.org
export async function icon(name) {
  const file = path.join(cacheDir, "icons", `${name}.svg`);
  if (!fs.existsSync(file)) {
    await download(`https://cdn.jsdelivr.net/npm/simple-icons@13/icons/${name}.svg`, file).catch(() => {
      throw new Error(`unknown icon "${name}" (see https://simpleicons.org)`);
    });
  }
  return fs.readFileSync(file, "utf8");
}
