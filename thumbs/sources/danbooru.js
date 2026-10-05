import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { cacheDir, download, getJson, magick, slug } from "../env.js";

export const rembg = path.join(cacheDir, "venv", "bin", "rembg");

// Solo, general-rated illustrations on a plain background: the ones a cut-out
// handles cleanly. Anonymous searches take two tags at most; the rest is
// filtered here.
export async function candidates(tag) {
  const url = new URL("https://danbooru.donmai.us/posts.json");
  url.search = new URLSearchParams({ tags: `${tag} simple_background`, limit: "100" });
  return (await getJson(url)).filter(
    (p) =>
      p.rating === "g" &&
      p.file_url &&
      ` ${p.tag_string} `.includes(" solo ") &&
      p.image_height >= 900,
  );
}

export async function character(tag, pick = 0) {
  const file = path.join(cacheDir, "characters", `${slug(tag, pick)}.png`);
  const meta = `${file}.json`;
  if (!fs.existsSync(file)) {
    if (!fs.existsSync(rembg)) throw new Error("cut-outs need rembg: run `fiss-thumbs setup` once");
    const found = await candidates(tag);
    const post = found[pick];
    if (!post) throw new Error(`no usable illustration for "${tag}" (pick ${pick} of ${found.length})`);
    const raw = `${file}.src`;
    const cut = `${file}.cut.png`;
    await download(post.file_url, raw);
    execFileSync(rembg, ["i", "-m", "isnet-anime", raw, cut], {
      env: { ...process.env, U2NET_HOME: path.join(cacheDir, "models") },
      stdio: "ignore",
    });
    magick([cut, "-trim", "+repage", "-resize", "x1000>", file]);
    fs.rmSync(raw);
    fs.rmSync(cut);
    const credit = { tag, post: `https://danbooru.donmai.us/posts/${post.id}`, artist: post.tag_string_artist };
    fs.writeFileSync(meta, JSON.stringify(credit, null, 2));
  }
  return { file, credit: JSON.parse(fs.readFileSync(meta, "utf8")) };
}
