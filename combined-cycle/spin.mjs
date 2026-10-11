// Pure path builders for parts that turn. The build draws them at phase 0; the page rebuilds them every frame.
export function spinPath(G, P, spec, phase) {
  const F = spec.F;
  if (spec.kind === "spokes") return G.spokesOf(F, spec.s, spec.r0, spec.r1, spec.count, P, { phase, from: spec.from ?? 0, to: spec.to ?? Math.PI * 2, sweep: spec.sweep ?? 0 });
  if (spec.kind === "ribs") return G.ribsOf(F, spec.s0, spec.s1, spec.r, spec.count, P, { phase, least: spec.least ?? 0.12 });
  if (spec.kind === "dots") return G.dotsOf(F, spec.s, spec.r, spec.count, P, { phase, slope: spec.slope ?? 0, least: spec.least ?? 0.08, all: Boolean(spec.all) }).map(([x, y]) => `M${x.toFixed(1)} ${y.toFixed(1)}h0`).join("");
  return "";
}
