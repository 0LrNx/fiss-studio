#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { renderContent, renderThumb } from "./render.js";
import { pick } from "./pick.js";
import { setup } from "./setup.js";

const usage = `fiss-thumbs: YouTube-style thumbnails, 1280×720

  fiss-thumbs render --content <dir> --out <dir> [--avatar <file.json>] [--only <post-id>]
      every post under <dir>/<shelf>/ with a \`thumb:\` front-matter block
  fiss-thumbs render --spec <file.json> --out <file.jpg> [--avatar <file.json>]
      one thumbnail from a spec file
  fiss-thumbs pick <danbooru-tag>
      numbered sheet of illustrations, to choose \`characterPick\`
  fiss-thumbs setup
      install rembg once, for \`character: danbooru:<tag>\`
`;

const [command, ...rest] = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith("--")) flags[rest[i].slice(2)] = rest[++i];
  else positional.push(rest[i]);
}
const avatar = flags.avatar && JSON.parse(fs.readFileSync(flags.avatar, "utf8"));

try {
  if (command === "render" && flags.content && flags.out) {
    const n = await renderContent({ content: flags.content, out: flags.out, avatar, only: flags.only });
    if (!n) console.log(`no post with a \`thumb:\` block under ${flags.content}`);
  } else if (command === "render" && flags.spec && flags.out) {
    const spec = JSON.parse(fs.readFileSync(flags.spec, "utf8"));
    await renderThumb(spec, { out: flags.out, avatar, base: path.dirname(flags.spec) });
    console.log(`wrote ${flags.out}`);
  } else if (command === "pick" && positional[0]) {
    console.log(`wrote ${await pick(positional[0])}`);
  } else if (command === "setup") {
    setup();
  } else {
    console.log(usage);
    process.exitCode = command && command !== "help" ? 1 : 0;
  }
} catch (error) {
  console.error(`fiss-thumbs: ${error.message}`);
  process.exitCode = 1;
}
