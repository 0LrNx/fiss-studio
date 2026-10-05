# fiss-studio

Social cards and thumbnails, built for [fiss.dev](https://fiss.dev) and usable anywhere.

- **`fiss-studio/og`**: renders an Open Graph card (1200×630) from a title, a kicker and a mascot. [Satori](https://github.com/vercel/satori) + [resvg](https://github.com/yisibl/resvg-js), so it runs at build time with no browser.
- **`fiss-studio/avatar`**: draws a [`@bible-strong`](https://www.npmjs.com/package/@bible-strong/avatar-core) avatar in a given expression as a plain SVG.
- **`fiss-thumbs`**: a CLI for YouTube-style thumbnails (1280×720), from a `thumb:` block in each post's front matter. Runs offline, on your machine.

## Install

```bash
bun add github:0LrNx/fiss-studio#v0.2.0
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

## Thumbnails

Needs Chrome (or set `CHROME`), ImageMagick and, for cut-out characters, Python 3.

```bash
fiss-thumbs setup                     # once: installs rembg for character cut-outs
fiss-thumbs render --content src/content --out public/thumbs --avatar ombre.avatar.json
fiss-thumbs pick yagami_light         # numbered sheet, to choose characterPick
```

Each post opts in with a `thumb:` block. Every field but `punch` is optional:

```yaml
thumb:
  style: loud                        # loud | calm
  hook: NO BS                        # loud: the boxed line on top
  kicker: Lab · Sep 2026             # calm: the mono line; defaults to shelf · month
  punch: VAULTWARDEN                 # the big line, fitted to its box
  ombre: suspicious-right            # an avatar expression (needs --avatar)…
  character: danbooru:yagami_light   # …or a cut-out character, or a PNG path
  characterPick: 0
  manga: { title: Death Note, volume: 1 }   # …or a MangaDex cover as a card
  logos: [bitwarden, docker]         # Simple Icons slugs
  bg: "search:server rack"           # a CC0 photo from Openverse, or an image path
  bgPick: 0
```

The output is `<out>/<shelf>/<id>.jpg`, plus `<out>/credits.json` listing where every fetched image came from. Downloads, cut-outs and rembg live in `~/.cache/fiss-studio` (`FISS_STUDIO_CACHE` to move it).

Sources: [Openverse](https://openverse.org) (CC0 / public domain only), [Danbooru](https://danbooru.donmai.us) (general-rated, solo, simple background, cut out with rembg's `isnet-anime`), [MangaDex](https://mangadex.org) covers, [Simple Icons](https://simpleicons.org). Characters and covers are the rights holders' artwork: using them is your call.

## Development

```bash
bun install
bun test      # writes sample cards to test/out/
```

## License

MIT. The bundled fonts keep their own licences (SIL Open Font License), in `fonts/`.
