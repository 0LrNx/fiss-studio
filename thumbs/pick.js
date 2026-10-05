import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { download, screenshot, slug } from "./env.js";
import { candidates } from "./sources/danbooru.js";

// A contact sheet of a tag's usable illustrations, each labelled with the
// `characterPost` id that pins it.
export async function pick(tag, { max = 16 } = {}) {
  const found = (await candidates(tag)).slice(0, max);
  if (!found.length) throw new Error(`no usable illustration for "${tag}"`);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fiss-pick-"));
  try {
    const cells = [];
    for (const [i, post] of found.entries()) {
      const file = path.join(tmp, `${i}.jpg`);
      await download(post.large_file_url ?? post.file_url, file);
      cells.push(`<figure><img src="${pathToFileURL(file).href}"><figcaption>characterPost: ${post.id} <small>(pick ${i})</small></figcaption></figure>`);
    }
    const rows = Math.ceil(found.length / 4);
    const height = rows * 400 + 40;
    const page = path.join(tmp, "sheet.html");
    fs.writeFileSync(
      page,
      `<!doctype html><style>
        body { margin: 0; padding: 20px; background: #f3f2ec; font: 600 18px ui-monospace, monospace;
               display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
        figure { margin: 0; height: 380px; min-width: 0; display: flex; flex-direction: column; }
        img { flex: 1; min-height: 0; width: 100%; object-fit: contain; background: #e4e6f2; }
        figcaption { padding-top: 8px; }
      </style>${cells.join("")}`,
    );
    const out = path.resolve(`pick-${slug(tag)}.png`);
    screenshot(page, out, 1240, height);
    return out;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
