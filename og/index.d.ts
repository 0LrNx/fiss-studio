export interface OgTheme {
  ink: string;
  pigment: string;
  lit: string;
  halo: string;
  paper: string;
}

export interface OgFont {
  name: "Display" | "Mono" | (string & {});
  data: ArrayBuffer | Buffer;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
  style?: "normal" | "italic";
}

export interface OgOptions {
  /** `*word*` is set in the halo colour. */
  title: string;
  kicker?: string;
  /** An SVG string, drawn above the text. */
  mascot?: string;
  theme?: Partial<OgTheme>;
  fonts?: OgFont[];
  /** "jpeg" (default) needs `sharp`. */
  format?: "png" | "jpeg";
  width?: number;
  height?: number;
}

export const defaultTheme: OgTheme;
export function renderOg(options: OgOptions): Promise<Buffer>;
