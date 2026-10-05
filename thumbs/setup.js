import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { cacheDir } from "./env.js";
import { rembg } from "./sources/danbooru.js";

// rembg (and its isnet-anime model, fetched on first use) lives in the cache,
// in its own venv: nothing is installed system-wide.
export function setup({ log = console.log } = {}) {
  if (fs.existsSync(rembg)) return log(`rembg already installed in ${path.dirname(rembg)}`);
  const venv = path.join(cacheDir, "venv");
  log(`creating ${venv}`);
  execFileSync("python3", ["-m", "venv", venv], { stdio: "inherit" });
  execFileSync(path.join(venv, "bin", "pip"), ["install", "-q", "rembg[cpu,cli]"], { stdio: "inherit" });
  log("rembg ready; the cut-out model (~170 MB) downloads on first use");
}
