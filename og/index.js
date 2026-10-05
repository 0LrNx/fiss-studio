import fs from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";

const asset = (file) => fs.readFileSync(new URL(file, import.meta.url));

export const defaultTheme = {
  ink: "#101219",
  pigment: "#002fa7",
  lit: "#1430d8",
  halo: "#b4bce4",
  paper: "#f3f2ec",
};

// Satori reads ttf/otf/woff, not woff2.
const defaultFonts = () => [
  { name: "Display", data: asset("../fonts/fraunces-400.woff"), weight: 400, style: "normal" },
  { name: "Display", data: asset("../fonts/fraunces-600.woff"), weight: 600, style: "normal" },
  { name: "Mono", data: asset("../fonts/ibm-plex-mono-500.woff"), weight: 500, style: "normal" },
];

const grain = `data:image/png;base64,${asset("./grain.png").toString("base64")}`;
const svgData = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

const el = (type, style, children = [], props = {}) => ({
  type,
  props: { style, children, ...props },
});

// Satori trims the spaces at the edge of every text run, so the title is laid
// out word by word with an explicit gap. "*lab*." keeps its "." on the word.
const words = (text, theme) => {
  let em = false;
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const parts = [];
      word.split("*").forEach((piece, i) => {
        if (i > 0) em = !em;
        if (piece) parts.push(el("span", em ? { color: theme.halo } : {}, piece));
      });
      return el("div", { display: "flex" }, parts);
    });
};

/**
 * @param {object} options
 * @param {string} options.title          `*word*` is set in the halo colour
 * @param {string} [options.kicker]       small mono line above the title
 * @param {string} [options.mascot]       an SVG string, drawn above the text
 * @param {Partial<typeof defaultTheme>} [options.theme]
 * @param {Array} [options.fonts]         Satori fonts named "Display" and "Mono"
 * @param {"png"|"jpeg"} [options.format] jpeg needs `sharp`
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {Promise<Buffer>}
 */
export async function renderOg({
  title,
  kicker,
  mascot,
  theme: overrides,
  fonts = defaultFonts(),
  format = "jpeg",
  width = 1200,
  height = 630,
}) {
  const theme = { ...defaultTheme, ...overrides };
  const long = title.length > 38;

  const card = el(
    "div",
    {
      width,
      height,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      backgroundColor: theme.ink,
      backgroundImage: [
        `radial-gradient(circle at 98% 6%, ${theme.halo} 0%, ${theme.lit} 22%, transparent 48%)`,
        `radial-gradient(circle at 0% 100%, ${theme.lit} 0%, ${theme.pigment} 25%, transparent 55%)`,
        `radial-gradient(circle at 45% 120%, ${theme.pigment} 0%, transparent 45%)`,
      ].join(", "),
    },
    [
      el("img", { position: "absolute", top: 0, left: 0, width, height, opacity: 0.55 }, [], {
        src: grain,
        width,
        height,
      }),
      mascot &&
        el("img", { width: long ? 150 : 190, height: long ? 150 : 190, marginBottom: 28 }, [], {
          src: svgData(mascot),
          width: 300,
          height: 300,
        }),
      kicker &&
        el(
          "div",
          {
            fontFamily: "Mono",
            fontSize: 20,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: theme.halo,
            marginBottom: 20,
          },
          kicker,
        ),
      el(
        "div",
        {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          columnGap: (long ? 50 : 62) * 0.26,
          maxWidth: 980,
          textAlign: "center",
          fontFamily: "Display",
          fontSize: long ? 50 : 62,
          lineHeight: 1.12,
          letterSpacing: -1,
          color: theme.paper,
        },
        words(title, theme),
      ),
    ].filter(Boolean),
  );

  const svg = await satori(card, { width, height, fonts });
  const png = new Resvg(svg, { fitTo: { mode: "width", value: width } }).render().asPng();
  if (format === "png") return png;

  const { default: sharp } = await import("sharp");
  return sharp(png).jpeg({ quality: 80, chromaSubsampling: "4:2:0" }).toBuffer();
}
