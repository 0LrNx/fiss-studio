import fs from "node:fs";
import path from "node:path";
import { cacheDir, download, getJson, magick, slug } from "../env.js";

// CC0 and public-domain photos only, so nothing needs crediting on the image.
export async function background(query, pick = 0) {
  const file = path.join(cacheDir, "backgrounds", `${slug(query, pick)}.jpg`);
  const meta = `${file}.json`;
  if (!fs.existsSync(file)) {
    const url = new URL("https://api.openverse.org/v1/images/");
    url.search = new URLSearchParams({
      q: query,
      license: "cc0,pdm",
      aspect_ratio: "wide",
      size: "large",
      mature: "false",
      page_size: "20",
    });
    const hit = (await getJson(url)).results[pick];
    if (!hit) throw new Error(`no CC0 photo for "${query}" (pick ${pick})`);
    const raw = `${file}.src`;
    await download(hit.url, raw);
    magick([raw, "-resize", "1600x>", "-quality", "85", file]);
    fs.rmSync(raw);
    const { title, creator, license, foreign_landing_url: source } = hit;
    fs.writeFileSync(meta, JSON.stringify({ query, title, creator, license, source }, null, 2));
  }
  return { file, credit: JSON.parse(fs.readFileSync(meta, "utf8")) };
}
