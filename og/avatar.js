// Draws one settled frame of a @bible-strong avatar as a standalone SVG string.
// The React component only applies an expression once mounted, so this goes
// through avatar-core directly.
export async function avatarSvg(definition, expression = "neutral", colors = {}) {
  const { createAvatarPlaybackState, renderAvatarFrame } = await import("@bible-strong/avatar-core");
  const state = { ...createAvatarPlaybackState(), activeExpression: expression };
  const { geometry: g, colors: own } = renderAvatarFrame(definition, state, 60_000, {
    random: () => 0.5,
    reduceMotion: true,
  });
  const body = colors.body ?? own.body;
  const eyes = colors.eyes ?? own.eyes;
  const paths = (list) => list.filter(Boolean).map((d) => `<path d="${d}"/>`).join("");
  const eye = (d, visible) => (visible ? `<path d="${d}"/>` : "");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-150 -150 300 300">` +
    `<defs><clipPath id="head"><path d="${g.headPath}"/></clipPath></defs>` +
    `<g fill="${body}">${paths(g.backPaths)}<path d="${g.headPath}"/></g>` +
    `<g fill="${eyes}" clip-path="url(#head)">${eye(g.leftPath, g.leftVisible)}${eye(g.rightPath, g.rightVisible)}</g>` +
    `<g fill="${body}">${paths(g.frontPaths)}</g>` +
    `</svg>`
  );
}
