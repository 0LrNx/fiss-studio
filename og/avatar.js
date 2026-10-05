// One settled frame of a @bible-strong avatar. The React component only applies
// an expression once mounted, so this goes through avatar-core directly.
export async function avatarGeometry(definition, expression = "neutral") {
  const { createAvatarPlaybackState, renderAvatarFrame } = await import("@bible-strong/avatar-core");
  const state = { ...createAvatarPlaybackState(), activeExpression: expression };
  return renderAvatarFrame(definition, state, 60_000, { random: () => 0.5, reduceMotion: true });
}

const paths = (list) => list.filter(Boolean).map((d) => `<path d="${d}"/>`).join("");
const eye = (d, visible) => (visible ? `<path d="${d}"/>` : "");

export async function avatarSvg(definition, expression = "neutral", colors = {}) {
  const { geometry: g, colors: own } = await avatarGeometry(definition, expression);
  const body = colors.body ?? own.body;
  const eyes = colors.eyes ?? own.eyes;
  return (
    // The spikes reach past the definition's own -150…150 box; renderers that
    // clip to the viewBox (resvg) would cut them off.
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-195 -195 390 390">` +
    `<defs><clipPath id="head"><path d="${g.headPath}"/></clipPath></defs>` +
    `<g fill="${body}">${paths(g.backPaths)}<path d="${g.headPath}"/></g>` +
    `<g fill="${eyes}" clip-path="url(#head)">${eye(g.leftPath, g.leftVisible)}${eye(g.rightPath, g.rightVisible)}</g>` +
    `<g fill="${body}">${paths(g.frontPaths)}</g>` +
    `</svg>`
  );
}

// Unfilled, with class hooks, for templates that colour and outline it in CSS.
export async function avatarMarkup(definition, expression = "neutral") {
  const { geometry: g } = await avatarGeometry(definition, expression);
  const body = `${paths(g.backPaths)}<path d="${g.headPath}"/>${paths(g.frontPaths)}`;
  return (
    `<svg viewBox="-150 -150 300 300"><defs><clipPath id="head"><path d="${g.headPath}"/></clipPath></defs>` +
    `<g class="outline">${body}</g>` +
    `<g class="shape">${paths(g.backPaths)}<path d="${g.headPath}"/>` +
    `<g class="eyes" clip-path="url(#head)">${eye(g.leftPath, g.leftVisible)}${eye(g.rightPath, g.rightVisible)}</g>` +
    `${paths(g.frontPaths)}</g></svg>`
  );
}
