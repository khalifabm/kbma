// Shared drawing helpers for the combined-cycle plant. Every helper puts its drawn items into one
// recorder (kit/audit.mjs) together with their true shapes, so the audit can prove the geometry.
import * as k from "./kit/iso-kit.mjs";
import * as G from "./kit/lathe.mjs";
import { tubePieces, tubeSvg, crossingsOf } from "./kit/tube.mjs";
import * as A from "./kit/audit.mjs";
import { spinPath } from "./spin.mjs";
import { polyhedron, frustum, prismFaces, prismAlong } from "./poly.mjs";
export { polyhedron, frustum, prismFaces, prismAlong };

export { k, G, A, tubePieces, tubeSvg, crossingsOf };

export function makeContext(P) {
  const R = A.recorder(P, { order: [], spring: {} });
  const { nameFor } = R;
  const V = G.viewOf(P);
  const KS = G.scaleOf(P);
  const at = (point) => k.iso(point, P);
  const S = (paths, style) => k.solidSvg(paths, style);
  const Ln = (d, style) => k.lineSvg(d, style);
  const Dots = (points, style) => k.dotsSvg(points, style);
  const Faded = (list, style) => k.fadedSvg(list, style);
  const record = R.solid;
  const NONE = [0, 0, 0];

  // One drawn item. `layer` is "back" for things that always lie behind the shader layer.
  function put(piece, ref, svg, { bias = 0, shapes = [], name, route, chunk, layer = "front", live, bank } = {}) {
    R.put({ piece, ride: piece, at: ref, bias, svg, move: NONE, shapes, name: name ?? nameFor(`${piece}.item`), route, chunk, layer, live, bank });
  }

  function tubeItems(piece, route, r, { name, tone = "hi", bias = 0, maxLength, spacing, closed = false, owner, touch, bundle, limp = false, breaks = [], gaps = [], caps = true, ends = [true, true], rims, free = [false, false], flow, layer, rings } = {}) {
    const id = nameFor(name ?? `${piece}.tube`);
    R.route(id, route, r, { owner: owner ?? id, touch, bundle, limp, gaps, closed, ends, rims, free, piece, move: NONE, ride: piece });
    const radius = typeof r === "function" ? r : r;
    // 2D arc length along the drawn route, so a dash train that is measured in drawing units stays continuous across chunk joints
    const proj = route.map((p) => at(p));
    const cum3 = [0];
    const cum2 = [0];
    for (let i = 1; i < route.length; i++) {
      cum3.push(cum3[i - 1] + G.len3(G.sub3(route[i], route[i - 1])));
      cum2.push(cum2[i - 1] + Math.hypot(proj[i][0] - proj[i - 1][0], proj[i][1] - proj[i - 1][1]));
    }
    const s2Of = (s3) => {
      let lo = 0;
      let hi = cum3.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (cum3[mid] <= s3) lo = mid;
        else hi = mid;
      }
      const span = cum3[hi] - cum3[lo] || 1;
      return cum2[lo] + ((Math.max(0, Math.min(cum3[hi], s3)) - cum3[lo]) / span) * (cum2[hi] - cum2[lo]);
    };
    tubePieces(route, radius, P, { maxLength, spacing, closed, breaks, gaps, caps, ...(rings ? { rings } : {}) }).forEach((part, index) => {
      let svg = tubeSvg(part, { tone });
      if (flow) {
        // an animated dash train along the chunk's own centreline; every chunk carries its start arc length so the train runs on through joints
        const kind = typeof flow === "string" ? flow : flow.kind;
        const rev = typeof flow === "object" && flow.rev;
        const pts = part.points.map((p) => at(p));
        const start = s2Of(Math.max(0, part.ends && part.ends[0] ? part.from : part.from - 0.5));
        svg += `<path class="fl" data-flow="${kind}"${rev ? " data-rev" : ""} style="--s:${start.toFixed(1)}px" d="${k.pathOf(pts)}"/>`;
      }
      put(piece, part.mid, svg, { bias, name: `${id}:${index}`, route: id, chunk: index, shapes: [A.tube(part.points, part.radii)], layer });
    });
    return id;
  }

  // a turned body, recorded as the same profile it is drawn from
  function turned(piece, F, profile, style = {}, { extra = "", inner = "", bias = 0, rims, bevel = 0, steps, name, owner, smooth = profile.some((point) => point[2]), layer, fill, slope, radius, live, tone } = {}) {
    const smoothOpt = smooth === true ? { rows: Math.max(...profile.map(([, r]) => r)) < 20 ? 3 : 5 } : smooth;
    const paths = G.solidOf(profile, F, P, { bevel, smooth: slope ? { slope, ...(radius ? { radius } : {}) } : smoothOpt, ...(rims ? { rims } : {}), ...(steps ? { steps } : {}), ...(fill ? { fill } : {}) });
    const mid = (profile[0][0] + profile[profile.length - 1][0]) / 2;
    const id = nameFor(name ?? `${piece}.turned${Math.round(profile[0][0])}`);
    const shape = record(A.solid(F, profile, { name: id, owner, curve: smooth && !slope && !smooth.slope ? profile : undefined, ...(radius ? { radius } : {}) }));
    put(piece, G.add3(F.o, G.mul3(F.a, mid)), S(paths, { tone: tone ?? "hi", ...style, inner: inner ? Ln(inner, { tone: "faint" }) : "" }) + extra, { bias, name: id, shapes: [shape], layer, live });
    return shape;
  }

  const band = (piece, F, s0, s1, r, style = {}, options = {}) => turned(piece, F, [[s0, r], [s1, r]], style, options);

  // flange: its back face sits on the route end
  function flangeAt(piece, centre, axis, r, thick, { bolts = 8, tone = "hi", bias = 0, boltR, name, owner, layer } = {}) {
    const F = G.frameAlong(centre, axis);
    const id = nameFor(name ?? `${piece}.flange`);
    const paths = G.disc(-thick / 2, thick / 2, r, F, P);
    const faces = [];
    const towards = G.dot3(F.a, V) > 0 ? thick / 2 : -thick / 2;
    if (Math.abs(G.dot3(F.a, V)) > 0.12 && bolts) faces.push(Dots(G.dotsOf(F, towards, boltR ?? r * 0.74, bolts, P, { all: true }), { size: 0.42, tone: "mid" }));
    put(piece, centre, S(paths, { tone }) + faces.join(""), { bias, name: id, shapes: [record(A.disc(F, -thick / 2, thick / 2, r, { name: id, owner }))], layer });
  }

  function pipe(piece, control, r, { bend = 2.6, tone = "hi", flanges = [true, true], flangeR = 1.55, coupling = false, bands = [], bellows = null, valve = null, valves = [], bias = 0, maxLength = 26, spacing, name, touch, breaks = [], gaps: extra = [], free, flow, layer, limp = false } = {}) {
    const flangeRs = [flangeR].flat().length > 1 ? [flangeR].flat() : [flangeR, flangeR].flat();
    if (coupling) flanges = [flanges[0], false];
    const line = G.fillet(control, Math.max(r * bend, 3), r > 3 ? 24 : 12, { P, tube: r });
    const total = G.pathLength(line);
    const collars = [];
    [[0, -1], [total, 1]].forEach(([along, sign], index) => {
      if (!flanges[index]) return;
      const thick = Math.max(0.9, r * 0.55);
      const tangent = G.tangentAlong(line, along);
      collars.push({ kind: "flange", centre: G.add3(G.pointAlong(line, along), G.mul3(tangent, (-sign * thick) / 2)), tangent, radius: r * flangeRs[index], thick, gap: sign < 0 ? [0, thick] : [total - thick, total] });
    });
    if (coupling) {
      const thick = Math.max(1.6, r * 1.4);
      collars.push({ kind: "coupling", centre: G.pointAlong(line, total - thick / 2), tangent: G.tangentAlong(line, total), radius: r * 1.5, thick, gap: [total - thick, total] });
    }
    const ring = (along, radius, thick, kind) => collars.push({ kind, centre: G.pointAlong(line, along), tangent: G.tangentAlong(line, along), radius, thick, gap: [along - thick / 2, along + thick / 2] });
    for (const share of bands) ring(share > 1 ? share : total * share, r * 1.18, Math.max(0.8, r * 0.7), "band");
    if (bellows) {
      const [from, to, count] = bellows;
      for (let index = 0; index < count; index++) ring(total * (from + ((to - from) * index) / (count - 1)), r * 1.26, Math.max(0.6, r * 0.3), "bellows");
    }
    const gaps = [...collars.map(({ gap }) => gap), ...extra];
    if (valve) {
      const along = valve[0] > 1 ? valve[0] : total * valve[0];
      gaps.push([along - valve[1] * 2.4, along + valve[1] * 2.4]);
    }
    const valveAlongs = valves.map((spec) => alongNear(line, spec.near));
    valveAlongs.forEach((along) => gaps.push([along - r * 2.4, along + r * 2.4]));
    const owner = tubeItems(piece, line, r, { name: name ?? `${piece}.pipe`, tone, bias, maxLength, spacing: spacing ?? Math.max(0.8, Math.min(2.4, r * 0.18)), touch, gaps, breaks, free, flow, layer, limp, rims: flanges.map((flanged, index) => (flanged ? r * flangeRs[index] : index && coupling ? r * 1.5 : r)) });
    for (const { kind, centre, tangent, radius, thick } of collars)
      flangeAt(piece, centre, tangent, radius, thick, { bolts: kind === "flange" && r > 3 ? 8 : 0, tone: kind === "flange" || kind === "coupling" ? tone : "mid", bias, name: `${owner}.${kind}`, owner, layer });
    line.owner = owner;
    valves.forEach((spec, i) => valveAt(piece, line, valveAlongs[i], r, spec));
    return line;
  }

  // a rounded box standing on z, recorded as the same rounded slab
  function slabAt(piece, plan, z, h, style = {}, { extra = "", bias = 0, bevel = 0.5, steps = 3, name, owner, layer, live, ref, bank } = {}) {
    const centre = ref ?? [plan.x + plan.w / 2, plan.y + plan.d / 2, z + h / 2];
    const id = nameFor(name ?? `${piece}.box`);
    put(piece, centre, S(k.slabOf(plan, z, h, P, steps, bevel), { tone: "hi", ...style }) + extra, { bias, name: id, shapes: [record(A.slab(plan, z, h, { name: id, owner }, steps))], layer, live, bank });
    return id;
  }

  function cylAt(piece, cx, cy, r, z, h, style = {}, { extra = "", bias = 0, bevel = 0, steps, name, owner, layer, bank } = {}) {
    const id = nameFor(name ?? `${piece}.cyl`);
    put(piece, [cx, cy, z + h / 2], S(k.cylinder(cx, cy, r, z, h, P, steps ?? G.stepsFor(r, 20, 72, KS), bevel), { tone: "hi", ...style }) + extra, { bias, name: id, shapes: [record(A.cylinder(cx, cy, r, z, h, { name: id, owner }))], layer, bank });
    return id;
  }

  function ballAt(piece, centre, r, { tone = "mid", bias = 0, name, owner, layer } = {}) {
    const id = nameFor(name ?? `${piece}.ball`);
    put(piece, centre, S(G.sphereOf(centre, r, P, { steps: G.stepsFor(r, 32) }), { tone }), { bias, name: id, shapes: [record(A.ball(centre, r, { name: id, owner }))], layer });
  }


  // ---- parts that turn: registered so the page can rebuild them each frame --------------------
  const spins = [];
  function spin(spec) {
    const id = spins.length;
    spins.push(spec);
    const d = spinPath(G, P, spec, spec.phase0 ?? 0);
    if (spec.kind === "dots") return `<path class="cc-dot" data-spin="${id}" d="${d}"/>`;
    return `<path class="${spec.kind === "spokes" ? "cc-blade" : "iso-line"}"${spec.kind === "ribs" ? ' data-tone="lo"' : ""} data-spin="${id}" d="${d}"/>`;
  }

  // ---- an opening cut into a casing, showing a dark cavity with content seen through it ----------
  // r is the wall radius as a function of s; angles run from the frame's u axis toward v.
  function windowOn({ F, s0, s1, r, aMid, aHalf, content = "", name, steps = 10, rim = true }) {
    const rr = typeof r === "function" ? r : () => r;
    const ring = [];
    for (let i = 0; i <= steps; i++) ring.push([s0, aMid - aHalf + (2 * aHalf * i) / steps]);
    for (let i = 1; i <= steps; i++) ring.push([s0 + ((s1 - s0) * i) / steps, aMid + aHalf]);
    for (let i = 1; i <= steps; i++) ring.push([s1, aMid + aHalf - (2 * aHalf * i) / steps]);
    for (let i = 1; i < steps; i++) ring.push([s1 - ((s1 - s0) * i) / steps, aMid - aHalf]);
    const d = k.pathOf(ring.map(([s, a]) => at(G.pointOf(F, s, rr(s), a))), true);
    const id = `win-${nameFor(name ?? "window")}`;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><path class="cc-cavity" d="${d}"/><g clip-path="url(#${id})">${content}</g>${rim ? `<path class="iso-line" data-tone="lo" d="${d}"/>` : ""}`;
  }

  // a flat saddle pad seated on a curved host (copied from the Raptor example)
  function padOn(piece, host, point, outward, a, h, { name, tone = "mid", bias = 0.1, owner, ring = false, layer } = {}) {
    const hosts = [host].flat();
    const inside = (p) => hosts.some((shape) => A.sdf(shape, p) < 0);
    const axis = G.unit3(outward);
    const F = G.frameAlong(point, axis);
    const start = (angle) => {
      let lo = -2.5 * a;
      let hi = h;
      if (!inside(G.pointOf(F, lo, a, angle))) return 0;
      for (let step = 0; step < 40; step++) {
        const mid = (lo + hi) / 2;
        if (inside(G.pointOf(F, mid, a, angle))) lo = mid;
        else hi = mid;
      }
      return hi;
    };
    const low = Math.min(...Array.from({ length: 48 }, (_, index) => start((index / 48) * Math.PI * 2)));
    const id = nameFor(name ?? `${piece}.pad`);
    const face = ring && G.dot3(axis, V) > 0.15 ? Ln(G.circleOf(F, h, a * 0.55, P, 16), { tone: "faint" }) : "";
    put(piece, G.add3(point, G.mul3(axis, h / 2)), S(G.saddleOf(F, a, start, h, P), { tone }) + face, { bias, name: id, shapes: [record(A.disc(F, low - 0.05, h, a, { name: id, owner, seated: true, cut: hosts }))], layer });
    return G.add3(point, G.mul3(axis, h));
  }

  // a convex polyhedron; its recorded shape is its bounding box (conservative)
  function polyAt(piece, faces, style = {}, { extra = "", bias = 0, name, owner, layer, ref, shapes } = {}) {
    const pts = faces.flat();
    const min = [0, 1, 2].map((i) => Math.min(...pts.map((p) => p[i])));
    const max = [0, 1, 2].map((i) => Math.max(...pts.map((p) => p[i])));
    const id = nameFor(name ?? `${piece}.poly`);
    put(piece, ref ?? [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2], S(polyhedron(faces, P), { tone: "mid", ...style }) + extra, { bias, name: id, shapes: shapes ? shapes.map((b) => record(A.box(b[0], b[1], { name: id, owner }))) : [record(A.box(min, max, { name: id, owner }))], layer });
    return id;
  }

  // an opening in a flat face at y = value (the face that looks toward +y), content drawn clipped to it
  function faceWindowY({ y, x0, x1, z0, z1, round = 2, content = "", name, rim = true }) {
    const pts = [];
    const corner = (cx, cz, a0) => {
      for (let i = 0; i <= 4; i++) {
        const a = a0 + (i / 4) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * round, cz + Math.sin(a) * round]);
      }
    };
    corner(x1 - round, z1 - round, 0);
    corner(x0 + round, z1 - round, Math.PI / 2);
    corner(x0 + round, z0 + round, Math.PI);
    corner(x1 - round, z0 + round, Math.PI * 1.5);
    const d = k.pathOf(pts.map(([x, z]) => at([x, y, z])), true);
    const id = `win-${nameFor(name ?? "face")}`;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><path class="cc-cavity" d="${d}"/><g clip-path="url(#${id})">${content}</g>${rim ? `<path class="iso-line" data-tone="lo" d="${d}"/>` : ""}`;
  }

  // an opening in a flat face at x = value (the face that looks toward +x)
  function faceWindowX({ x, y0, y1, z0, z1, round = 2, content = "", name, rim = true }) {
    const pts = [];
    const corner = (cy, cz, a0) => {
      for (let i = 0; i <= 4; i++) {
        const a = a0 + (i / 4) * (Math.PI / 2);
        pts.push([cy + Math.cos(a) * round, cz + Math.sin(a) * round]);
      }
    };
    corner(y1 - round, z1 - round, 0);
    corner(y0 + round, z1 - round, Math.PI / 2);
    corner(y0 + round, z0 + round, Math.PI);
    corner(y1 - round, z0 + round, Math.PI * 1.5);
    const d = k.pathOf(pts.map(([y, z]) => at([x, y, z])), true);
    const id = `win-${nameFor(name ?? "facex")}`;
    return `<clipPath id="${id}"><path d="${d}"/></clipPath><path class="cc-cavity" d="${d}"/><g clip-path="url(#${id})">${content}</g>${rim ? `<path class="iso-line" data-tone="lo" d="${d}"/>` : ""}`;
  }

  // a handrail on posts along a path of floor points: posts, a top rail and a mid rail through the post tops
  function railing(piece, path, z, { h = 9, spacing = 20, closed = false, tone = "mid", name = "rail" } = {}) {
    const pts = [];
    const segs = closed ? path.length : path.length - 1;
    for (let i = 0; i < segs; i++) {
      const a = path[i];
      const b = path[(i + 1) % path.length];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / spacing));
      for (let j = 0; j < n; j++) pts.push([a[0] + ((b[0] - a[0]) * j) / n, a[1] + ((b[1] - a[1]) * j) / n]);
    }
    if (!closed) pts.push(path[path.length - 1]);
    for (const [x, y] of pts) cylAt(piece, x, y, 0.5, z, h, { tone, crease: "none" }, { name: `${name}.post`, steps: 8 });
    const loop = (zz) => pts.map(([x, y]) => [x, y, zz]);
    for (const zz of [z + h, z + h / 2]) {
      const line = loop(zz);
      const d = k.pathOf(line.map((p) => at(p)), closed);
      const id = nameFor(`${piece}.${name}`);
      put(piece, line[Math.floor(line.length / 2)], Ln(d, { tone }), { name: id, bias: 0.3, shapes: [record(A.tube(closed ? [...line, line[0]] : line, 0.3, { name: id, limp: true }))] });
    }
  }

  // arc length on a route nearest to a world point
  function alongNear(line, target) {
    const dense = G.resample(line, 0.5);
    let best = 0;
    let bestD = Infinity;
    let acc = 0;
    dense.forEach((p, i) => {
      if (i) acc += G.len3(G.sub3(p, dense[i - 1]));
      const d = G.len3(G.sub3(p, target));
      if (d < bestD) { bestD = d; best = acc; }
    });
    return best;
  }

  // a valve on a straight horizontal run: bulged body, a neck going up, and a hand wheel or an actuator box on top
  function valveAt(piece, line, along, r, { kind = "wheel", tone = "hi", name } = {}) {
    const centre = G.pointAlong(line, along);
    const tangent = G.tangentAlong(line, along);
    const F = G.frameAlong(centre, tangent);
    const owner = line.owner;
    const id = nameFor(name ?? `${owner}.valve`);
    const half = r * 2.4;
    const crown = r * 1.9;
    const bulge = (x) => r * 1.4 + (crown - r * 1.4) * Math.sqrt(Math.max(0, 1 - (x / (r * 1.5)) ** 2));
    const bulgeSlope = (x) => {
      if (Math.abs(x) >= r * 1.5 - 1e-9) return 0;
      const t = Math.max(-0.995, Math.min(0.995, x / (r * 1.5)));
      return (-(crown - r * 1.4) * t) / (r * 1.5 * Math.sqrt(1 - t * t));
    };
    const meridian = [[-half, 0], [-half, r * 1.4], ...Array.from({ length: 13 }, (_, i) => {
      const x = r * 1.5 * Math.sin(((i - 6) / 6) * (Math.PI / 2));
      return [x, bulge(x), i && i < 12 ? 1 : 0];
    }), [half, r * 1.4], [half, 0]];
    put(piece, centre, S(G.lathe(meridian, F, P, { steps: 24, smooth: { slope: bulgeSlope, rows: 3 } }), { tone }) + Dots([...G.dotsOf(F, -half, r * 1.15, 6, P, { all: true }), ...G.dotsOf(F, half, r * 1.15, 6, P, { all: true })].filter((_, i) => i % 2 === 0), { size: 0.4, tone: "mid" }), { name: id, shapes: [record(A.body(F, meridian, { name: id, owner }))], bias: 0 });
    // neck and top
    const up = [0, 0, 1];
    const NF = G.frameAlong(centre, up);
    const s0 = crown - 0.2;
    const s1 = crown + r * 1.5;
    put(piece, G.add3(centre, [0, 0, (s0 + s1) / 2]), S(G.disc(s0, s1, r * 0.5, NF, P), { tone }), { name: `${id}.neck`, shapes: [record(A.disc(NF, s0, s1, r * 0.5, { name: `${id}.neck`, owner }))], bias: 0.2 });
    const topZ = centre[2] + s1;
    if (kind === "box") {
      const plan = { x: centre[0] - r * 1.6, y: centre[1] - r * 1.6, w: r * 3.2, d: r * 3.2, r: 0.8 };
      slabAt(piece, plan, topZ, r * 2.4, { tone }, { name: `${id}.actuator`, owner, bias: 0.3, bevel: 0.4, steps: 2, extra: Ln(k.planOutline(k.insetPlan(plan, 0.9), topZ + r * 2.4, P, 2), { tone: "faint" }) });
    } else {
      const wr = r * 1.7;
      const stemId = `${id}.stem`;
      const WF = G.frameOf([centre[0], centre[1], topZ], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
      put(piece, [centre[0], centre[1], topZ + r * 0.8], S(G.disc(0, r * 1.6, 0.45, WF, P), { tone: "mid" }), { name: stemId, shapes: [record(A.disc(WF, 0, r * 1.6, 0.45, { name: stemId, owner }))], bias: 0.3 });
      const wz = topZ + r * 1.6;
      const spokes = [0, 1, 2, 3].map((i) => k.lineOnTop([centre[0] + Math.cos((i * Math.PI) / 2 + 0.4) * 0.45, centre[1] + Math.sin((i * Math.PI) / 2 + 0.4) * 0.45], [centre[0] + Math.cos((i * Math.PI) / 2 + 0.4) * wr, centre[1] + Math.sin((i * Math.PI) / 2 + 0.4) * wr], wz, P)).join("");
      const wid = `${id}.wheel`;
      put(piece, [centre[0], centre[1], wz], Ln(k.ring(centre[0], centre[1], wr, wz, P, 24), { tone }) + Ln(spokes, { tone: "mid" }), { name: wid, shapes: [record(A.disc(WF, r * 1.5, r * 1.7, wr, { name: wid, owner }))], bias: 0.4 });
    }
  }

  // a pipe support: a post to the floor and a saddle cap the pipe rests on (for a horizontal run at height z along `axis`)
  function supportAt(piece, [x, y, z], r, { axis = "x", name = "support", wide = 9 } = {}) {
    const bottom = z - r;
    const cap = axis === "x" ? { x: x - 2.4, y: y - wide / 2, w: 4.8, d: wide, r: 0.5 } : { x: x - wide / 2, y: y - 2.4, w: wide, d: 4.8, r: 0.5 };
    slabAt(piece, cap, bottom - 2.2, 2.2, { tone: "mid" }, { name: `${name}.cap`, bevel: 0.3, steps: 2 });
    slabAt(piece, { x: x - 2, y: y - 2, w: 4, d: 4, r: 0.5 }, 0, bottom - 2.2, { tone: "mid" }, { name: `${name}.post`, bevel: 0.3, steps: 2 });
  }

  return { alongNear, valveAt, supportAt, railing, faceWindowX, faceWindowY, polyAt, spins, spin, windowOn, padOn, k, G, A, P, R, V, KS, at, S, Ln, Dots, Faded, record, put, tubeItems, turned, band, flangeAt, pipe, slabAt, cylAt, ballAt, nameFor, NONE };
}
