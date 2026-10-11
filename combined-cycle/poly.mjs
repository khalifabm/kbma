// A convex polyhedron drawn the kit's way: paper fill, four side tones, a lighter top, creases and a silhouette.
import { iso, pathOf, cameraOf, towardViewer } from "./kit/iso-kit.mjs";
import { hullOf, sub3, cross3, dot3, unit3, viewOf } from "./kit/lathe.mjs";

const key = (p) => p.map((v) => Math.round(v * 1e4)).join(",");

// faces: arrays of 3D vertices wound counter-clockwise seen from outside
export function polyhedron(faces, P, { top = 0.55 } = {}) {
  const V = viewOf(P);
  const { sinA, cosA } = cameraOf(P);
  const info = faces.map((face) => {
    let n = [0, 0, 0];
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      n = [n[0] + (a[1] - b[1]) * (a[2] + b[2]), n[1] + (a[2] - b[2]) * (a[0] + b[0]), n[2] + (a[0] - b[0]) * (a[1] + b[1])];
    }
    n = unit3(n);
    return { face, n, visible: dot3(n, V) > 1e-6 };
  });
  const edges = new Map();
  info.forEach((f, index) => {
    f.face.forEach((a, i) => {
      const b = f.face[(i + 1) % f.face.length];
      const ka = key(a);
      const kb = key(b);
      const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      if (!edges.has(id)) edges.set(id, { a, b, faces: [] });
      edges.get(id).faces.push(index);
    });
  });
  const proj = (p) => iso(p, P);
  const shades = [[], [], [], []];
  const topPaths = [];
  const visiblePoints = [];
  for (const f of info) {
    if (!f.visible) continue;
    const pts = f.face.map(proj);
    visiblePoints.push(...pts);
    const poly = pathOf(pts, true);
    if (f.n[2] > top) topPaths.push(poly);
    else {
      const h = Math.hypot(f.n[0], f.n[1]) || 1;
      const lit = ((f.n[0] / h) * -sinA + (f.n[1] / h) * cosA + 1) / 2;
      shades[Math.min(3, Math.max(0, Math.floor(lit * 4)))].push(poly);
    }
  }
  const outline = [];
  const crease = [];
  for (const e of edges.values()) {
    const vis = e.faces.filter((i) => info[i].visible);
    if (vis.length === 1) outline.push(pathOf([proj(e.a), proj(e.b)]));
    else if (vis.length === 2 && vis.some((i) => info[i].n[2] > top) && !vis.every((i) => info[i].n[2] > top)) crease.push(pathOf([proj(e.a), proj(e.b)]));
  }
  return {
    fill: pathOf(hullOf(visiblePoints), true),
    outline: outline.join(""),
    crease: crease.join(""),
    top: topPaths.join(""),
    shades: shades.map((list) => list.join("")),
  };
}

// a box whose two end rectangles may differ: a, b are [y0, y1, z0, z1] at x = x0 and x = x1
export function frustum(x0, a, x1, b) {
  const q = (x, [y0, y1, z0, z1]) => [[x, y0, z0], [x, y1, z0], [x, y1, z1], [x, y0, z1]];
  const A = q(x0, a);
  const B = q(x1, b);
  return [
    [A[0], A[3], A[2], A[1]], // -x
    [B[0], B[1], B[2], B[3]], // +x
    [A[0], A[1], B[1], B[0]], // bottom
    [A[3], B[3], B[2], A[2]], // top
    [A[0], B[0], B[3], A[3]], // -y
    [A[1], A[2], B[2], B[1]], // +y
  ];
}

// a prism: a convex polygon (counter-clockwise from above) lifted between two heights, each vertex may carry its own top height
export function prismFaces(polygon, z0, z1) {
  const top = (p, i) => [p[0], p[1], Array.isArray(z1) ? z1[i] : z1];
  const n = polygon.length;
  const faces = [polygon.map((p, i) => top(p, i)), [...polygon].reverse().map((p) => [p[0], p[1], z0])];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([[polygon[i][0], polygon[i][1], z0], [polygon[j][0], polygon[j][1], z0], top(polygon[j], j), top(polygon[i], i)]);
  }
  return faces;
}
void sub3; void cross3; void towardViewer;

// a prism along an axis. axis "x": polygon in (y, z); axis "y": polygon in (z, x); axis "z": polygon in (x, y). Counter-clockwise or not, it is corrected.
export function prismAlong(axis, poly, a0, a1) {
  const area = poly.reduce((sum, [u, v], i) => sum + (u * poly[(i + 1) % poly.length][1] - poly[(i + 1) % poly.length][0] * v), 0);
  const Q = area < 0 ? [...poly].reverse() : poly;
  const at = (a, [u, v]) => (axis === "x" ? [a, u, v] : axis === "y" ? [v, a, u] : [u, v, a]);
  const faces = [Q.map((q) => at(a1, q)), [...Q].reverse().map((q) => at(a0, q))];
  for (let i = 0; i < Q.length; i++) {
    const j = (i + 1) % Q.length;
    faces.push([at(a0, Q[i]), at(a0, Q[j]), at(a1, Q[j]), at(a1, Q[i])]);
  }
  return faces;
}
