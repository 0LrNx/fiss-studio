import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { download, magick, slug } from "./env.js";
import { candidates } from "./sources/danbooru.js";

// A numbered contact sheet of a tag's usable illustrations, to choose
// `characterPick` at a glance.
export async function pick(tag, { max = 16 } = {}) {
  const found = (await candidates(tag)).slice(0, max);
  if (!found.length) throw new Error(`no usable illustration for "${tag}"`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fiss-pick-"));
  try {
    const args = ["montage"];
    for (const [i, post] of found.entries()) {
      const file = path.join(tmp, `${i}.jpg`);
      await download(post.large_file_url ?? post.file_url, file);
      args.push("-label", `characterPick: ${i}`, file);
    }
    const out = path.resolve(`pick-${slug(tag)}.jpg`);
    magick([...args, "-tile", "4x", "-geometry", "260x340>+10+10", "-pointsize", "18", "-background", "#f3f2ec", out]);
    return out;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
