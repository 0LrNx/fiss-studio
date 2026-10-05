import { expect, test } from "bun:test";
import fs from "node:fs";
import { renderOg } from "../og/index.js";

const mascot = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="#f3f2ec"/></svg>`;
fs.mkdirSync(new URL("./out/", import.meta.url), { recursive: true });

test("site card renders a PNG", async () => {
  const png = await renderOg({ title: "Break it in the *lab*. Sleep *well* in prod.", mascot, format: "png" });
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  fs.writeFileSync(new URL("./out/site.png", import.meta.url), png);
});

test("post card renders a JPEG", async () => {
  const jpg = await renderOg({
    title: "Vaultwarden installation guide, from setup to backups and a custom domain",
    kicker: "Lab · Sep 18, 2026",
    mascot,
  });
  expect(jpg[0]).toBe(0xff);
  expect(jpg[1]).toBe(0xd8);
  fs.writeFileSync(new URL("./out/post.jpg", import.meta.url), jpg);
});
