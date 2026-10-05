# fiss-studio

Social cards and thumbnails, built for [fiss.dev](https://fiss.dev) and usable anywhere.

- **`fiss-studio/og`**: renders an Open Graph card (1200×630) from a title, a kicker and a mascot. [Satori](https://github.com/vercel/satori) + [resvg](https://github.com/yisibl/resvg-js), so it runs at build time with no browser.
- **`fiss-studio/avatar`**: draws a [`@bible-strong`](https://www.npmjs.com/package/@bible-strong/avatar-core) avatar in a given expression as a plain SVG.
- **Thumbnails** (YouTube-style, offline CLI): coming in `v0.2.0`.

## Install

```bash
bun add github:0LrNx/fiss-studio#v0.1.0
```

`sharp` is needed for JPEG output, and `@bible-strong/avatar-core` for `avatarSvg`. Both are optional peer dependencies.

## Open Graph cards

```js
import { renderOg } from "fiss-studio/og";

const jpeg = await renderOg({
  title: "Break it in the *lab*. Sleep *well* in prod.", // *word* uses the halo colour
  kicker: "Lab · Sep 18, 2026",
  mascot: svgString,                                      // optional
  theme: { ink: "#101219", pigment: "#002fa7", halo: "#b4bce4", paper: "#f3f2ec" },
  format: "jpeg",                                         // or "png"
});
```

In Astro, return it from a static endpoint so every card is built with the site:

```ts
// src/pages/og/[...slug].jpg.ts
export const GET = async ({ props }) =>
  new Response(await renderOg(props), { headers: { "Content-Type": "image/jpeg" } });
```

Fonts default to Fraunces and IBM Plex Mono (bundled, SIL OFL). Pass `fonts` with Satori font objects named `Display` and `Mono` to use others.

## Avatar

```js
import { avatarSvg } from "fiss-studio/avatar";

const svg = await avatarSvg(definition, "suspicious-right", { body: "#f3f2ec", eyes: "#002fa7" });
```

## Development

```bash
bun install
bun test      # writes sample cards to test/out/
```

## License

MIT. The bundled fonts keep their own licences (SIL Open Font License), in `fonts/`.
