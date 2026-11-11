import { expect, test } from "bun:test";
import fs from "node:fs";
import { findThumbs, renderContent, renderThumb } from "../thumbs/render.js";

const out = new URL("./out/", import.meta.url).pathname;
const content = new URL("./fixtures/content/", import.meta.url).pathname;
const character = new URL("./fixtures/character.png", import.meta.url).pathname;
const isJpeg = (file) => {
  const b = fs.readFileSync(file);
  return b[0] === 0xff && b[1] === 0xd8;
};

test("reads thumb blocks from front matter, with a default kicker", () => {
  const [post] = findThumbs(content);
  expect(post.shelf).toBe("lab");
  expect(post.id).toBe("hello");
  expect(post.spec.kicker).toBe("Lab · Sep 2026");
  expect(post.spec.style).toBe("calm");
});

test("renders a loud thumbnail from a spec", async () => {
  const file = `${out}loud.jpg`;
  await renderThumb({ style: "loud", hook: "NO BS", punch: "TEST", character }, { out: file });
  expect(isJpeg(file)).toBe(true);
}, 30_000);

test("renders a paper thumbnail, with and without a character", async () => {
  const spec = { style: "paper", hook: "I never think of", punch: "Future", kicker: "Lab · Sep 2026" };
  await renderThumb({ ...spec, character }, { out: `${out}paper.jpg` });
  await renderThumb({ ...spec, character, side: "right" }, { out: `${out}paper-right.jpg` });
  await renderThumb(spec, { out: `${out}paper-solo.jpg` });
  for (const f of ["paper", "paper-right", "paper-solo"]) expect(isJpeg(`${out}${f}.jpg`)).toBe(true);
}, 60_000);

test("renders every post with a thumb block", async () => {
  const n = await renderContent({ content, out: `${out}content`, log: () => {} });
  expect(n).toBe(1);
  expect(isJpeg(`${out}content/lab/hello.jpg`)).toBe(true);
}, 30_000);
