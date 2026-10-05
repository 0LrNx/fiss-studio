import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const cacheDir =
  process.env.FISS_STUDIO_CACHE ??
  path.join(process.env.XDG_CACHE_HOME ?? path.join(os.homedir(), ".cache"), "fiss-studio");

export const userAgent = "fiss-studio (https://github.com/0LrNx/fiss-studio)";

const chromes = [
  process.env.CHROME,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

export function screenshot(page, png, width, height) {
  const chrome = chromes.find((p) => p && fs.existsSync(p));
  if (!chrome) throw new Error("Chrome not found: set CHROME to a Chromium-based browser");
  execFileSync(
    chrome,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--allow-file-access-from-files",
      `--window-size=${width},${height}`,
      "--virtual-time-budget=5000",
      `--screenshot=${png}`,
      pathToFileURL(page).href,
    ],
    { stdio: "ignore" },
  );
}

export async function download(url, file) {
  const res = await fetch(url, { headers: { "User-Agent": userAgent } });
  if (!res.ok) throw new Error(`download ${res.status}: ${url}`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

export const getJson = async (url, headers = {}) => {
  const res = await fetch(url, { headers: { "User-Agent": userAgent, ...headers } });
  if (!res.ok) throw new Error(`${res.status} on ${url}`);
  return res.json();
};

export const slug = (...parts) => parts.join("-").replace(/\W+/g, "-").toLowerCase();
