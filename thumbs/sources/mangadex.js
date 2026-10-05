import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { cacheDir, download, getJson, slug } from "../env.js";

const api = async (pathname, params) => {
  const url = new URL(pathname, "https://api.mangadex.org");
  for (const [k, v] of params) url.searchParams.append(k, v);
  const json = await getJson(url);
  await new Promise((r) => setTimeout(r, 250)); // well under the ~5 req/s limit
  return json;
};

// Covers are hosted even for licensed series, whose chapters only link out.
// Hotlinking is blocked, so they are downloaded and cached.
export async function cover({ title, volume, locale = "ja" }) {
  const file = path.join(cacheDir, "manga", `${slug(title, volume ?? "first", locale)}.jpg`);
  if (fs.existsSync(file)) return file;
  const manga = (await api("/manga", [["title", title], ["limit", "1"], ["order[relevance]", "desc"]])).data[0];
  if (!manga) throw new Error(`no manga found for "${title}"`);
  const covers = (await api("/cover", [["manga[]", manga.id], ["limit", "100"], ["order[volume]", "asc"]])).data;
  const ofVolume = volume ? covers.filter((c) => c.attributes.volume === String(volume)) : covers;
  const found = ofVolume.find((c) => c.attributes.locale === locale) ?? ofVolume[0];
  if (!found) throw new Error(`no cover for "${title}" volume ${volume}`);
  const raw = `${file}.src`;
  await download(`https://uploads.mangadex.org/covers/${manga.id}/${found.attributes.fileName}`, raw);
  await sharp(raw).resize({ height: 900, withoutEnlargement: true }).jpeg({ quality: 88 }).toFile(file);
  fs.rmSync(raw);
  return file;
}
