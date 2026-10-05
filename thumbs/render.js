import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { parse as parseYaml } from "yaml";
import { avatarMarkup } from "../og/avatar.js";
import sharp from "sharp";
import { screenshot } from "./env.js";
import { background } from "./sources/openverse.js";
import { character as danbooru } from "./sources/danbooru.js";
import { cover } from "./sources/mangadex.js";
import { icon } from "./sources/icons.js";

const template = fs.readFileSync(new URL("./template.html", import.meta.url), "utf8");
const url = (file) => file && pathToFileURL(file).href;

/**
 * Renders one 1280×720 thumbnail to `out` (JPEG). Relative paths in `spec`
 * resolve against `base`. Returns the credits of anything fetched.
 */
export async function renderThumb(spec, { out, avatar, base = process.cwd() }) {
  const credits = {};
  const local = (p) => path.resolve(base, p);

  let bg;
  if (spec.bg?.startsWith("search:")) {
    const found = await background(spec.bg.slice(7).trim(), spec.bgPick);
    bg = found.file;
    credits.bg = found.credit;
  } else if (spec.bg) bg = local(spec.bg);

  let character;
  if (spec.character?.startsWith("danbooru:")) {
    const found = await danbooru(spec.character.slice(9).trim(), spec.characterPick, spec.characterPost);
    character = found.file;
    credits.character = found.credit;
  } else if (spec.character) character = local(spec.character);

  const coverFile = spec.manga ? await cover(spec.manga) : undefined;
  const drawAvatar = !character && !coverFile;
  if (drawAvatar && !avatar) throw new Error("nothing to show: pass --avatar, or set `character` or `manga`");

  const data = {
    style: spec.style ?? "loud",
    hook: spec.hook,
    kicker: spec.kicker,
    punch: spec.punch,
    ombre: drawAvatar ? await avatarMarkup(avatar, spec.ombre ?? "neutral") : "",
    logos: await Promise.all((spec.logos ?? []).map(icon)),
    bg: url(bg),
    character: url(character),
    cover: url(coverFile),
    tint: spec.manga?.tint ?? true,
  };
  // `<` escaped so the SVG markup can never close the script early.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  const html = template.replace("<body>", `<body><script>window.SPEC = ${json};</script>`);

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fiss-thumb-"));
  try {
    const page = path.join(tmp, "thumb.html");
    const png = path.join(tmp, "thumb.png");
    fs.writeFileSync(page, html);
    screenshot(page, png, 1280, 720);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(png).jpeg({ quality: 80, chromaSubsampling: "4:2:0" }).toFile(out);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return credits;
}

const frontMatter = (text) => {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? parseYaml(m[1]) ?? {} : {};
};

const kickerFor = (shelf, date) => {
  const name = shelf[0].toUpperCase() + shelf.slice(1);
  // YAML 1.2 keeps `2026-09-18` a string; older parsers give a Date.
  const d = date instanceof Date ? date : new Date(date);
  if (!date || Number.isNaN(d.valueOf())) return name;
  const when = d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
  return `${name} · ${when}`;
};

/** Every post under `content/<shelf>/` with a `thumb:` block, as `{ shelf, id, file, spec }`. */
export function findThumbs(content) {
  const found = [];
  for (const shelf of fs.readdirSync(content, { withFileTypes: true })) {
    if (!shelf.isDirectory()) continue;
    for (const name of fs.readdirSync(path.join(content, shelf.name))) {
      if (!/\.mdx?$/.test(name)) continue;
      const file = path.join(content, shelf.name, name);
      const data = frontMatter(fs.readFileSync(file, "utf8"));
      if (!data.thumb) continue;
      const spec = { kicker: kickerFor(shelf.name, data.date), ...data.thumb };
      found.push({ shelf: shelf.name, id: name.replace(/\.mdx?$/, ""), file, spec });
    }
  }
  return found;
}

/** Renders every post's thumbnail to `out/<shelf>/<id>.jpg`, plus `out/credits.json`. */
export async function renderContent({ content, out, avatar, only, log = console.log }) {
  const credits = {};
  const posts = findThumbs(content).filter((p) => !only || p.id === only);
  for (const post of posts) {
    const target = path.join(out, post.shelf, `${post.id}.jpg`);
    const got = await renderThumb(post.spec, { out: target, avatar, base: path.dirname(post.file) });
    if (Object.keys(got).length) credits[`${post.shelf}/${post.id}`] = got;
    log(`wrote ${path.relative(process.cwd(), target)}`);
  }
  if (Object.keys(credits).length) {
    const file = path.join(out, "credits.json");
    const previous = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
    fs.writeFileSync(file, `${JSON.stringify({ ...previous, ...credits }, null, 2)}\n`);
  }
  return posts.length;
}
