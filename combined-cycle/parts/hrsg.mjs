import * as L from "../layout.mjs";
import { prismAlong } from "../poly.mjs";

const DEG = Math.PI / 180;

// Heat-recovery steam generator: an open-fronted duct with five tube banks, drums on the roof and a stack.
export function hrsg(C) {
  const { k, G, A, P, V, KS, at, S, Ln, Dots, put, slabAt, cylAt, polyAt, turned, padOn, record, nameFor, ballAt } = C;
  const H = L.HRSG;
  const X0 = H.x0;
  const X1 = H.x1;
  const Y0 = H.y0;
  const Y1 = H.y1;
  const ROOF = 170;
  const wrap = (svg) => `<g class="cc-inside">${svg}</g>`;
  const inside = { layer: "back" };
  const sub = (tone, o = {}) => ({ style: { tone }, ...o });
  void sub; void wrap;

  // ---- foundation and the dark inside of the duct (back layer: always behind the gas) -------------
  const Z0 = 6.5; // top of the duct floor
  const FOUND = { x: X0 - 8, y: Y0 - 8, w: X1 - X0 + 16, d: Y1 - Y0 + 10, r: 3 };
  slabAt("hrsg", FOUND, 0, 5, { tone: "lo" }, { name: "hrsg.foundation", bevel: 1, layer: "back", extra: Dots(k.corners(FOUND, 5).map(([x, y]) => at([x, y, 5])), { size: 0.5 }) });
  const wall = (plan, z0, h, name, extra = "") => {
    const id = nameFor(name);
    put("hrsg", [plan.x + plan.w / 2, plan.y + plan.d / 2, z0 + h / 2], wrap(S(k.slabOf(plan, z0, h, P, 2, 0), { tone: "mid" }) + extra), { name: id, shapes: [record(A.box([plan.x, plan.y, z0], [plan.x + plan.w, plan.y + plan.d, z0 + h], { name: id }))], ...inside });
  };
  wall({ x: X0, y: Y0, w: X1 - X0, d: Y1 - Y0 - 5, r: 0 }, 5, Z0 - 5, "hrsg.floor");
  const inner = Y0 + 3;
  wall({ x: X0 + 3, y: Y0, w: X1 - X0 - 8, d: 3, r: 0 }, Z0, ROOF - Z0, "hrsg.back-wall",
    Ln([...Array(9)].map((_, i) => k.segment([X0 + 3, inner, Z0 + (i + 1) * 16.2], [X1 - 5, inner, Z0 + (i + 1) * 16.2], P)).join(""), { tone: "faint" }) +
      Ln([...Array(6)].map((_, i) => k.segment([X0 + 3 + (i + 1) * 36, inner, Z0], [X0 + 3 + (i + 1) * 36, inner, ROOF], P)).join(""), { tone: "faint" }));
  // the inlet wall carries the round opening the gas turbine's exhaust enters through
  const IF = G.frameOf([X0 + 3, L.GT_Y, L.GT_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  wall({ x: X0, y: Y0, w: 3, d: Y1 - Y0 - 5, r: 0 }, Z0, ROOF - Z0, "hrsg.inlet-wall",
    `<path class="cc-cavity" d="${G.circleOf(IF, 0, 50, P, 56)}"/>` + Ln(G.circleOf(IF, 0, 53, P, 56), { tone: "lo" }) + Dots(G.dotsOf(IF, 0, 57, 24, P, { all: true }), { size: 0.45 }));

  // ---- front frame: columns between beams, so nothing overlaps ----------------------------------------------
  const cols = [X0 + 3, 190, 232, 274, 316, 358];
  const edges = [...cols, X1 - 5];
  const zBeam = [86, 128];
  const fy = Y1 - 5;
  for (const x of cols) {
    const bounds = [Z0, ...zBeam.flatMap((z) => [z - 2, z + 2]), ROOF - 6];
    for (let i = 0; i < bounds.length; i += 2) {
      const z0 = bounds[i];
      const z1 = bounds[i + 1];
      if (z1 <= z0) continue;
      slabAt("hrsg", { x, y: fy, w: 5, d: 5, r: 0.6 }, z0, z1 - z0, { tone: "mid" }, { name: "hrsg.column", bevel: 0.4, steps: 2, extra: Ln(k.rise([x + 2.5, fy + 5], z0, z1, P), { tone: "faint", free: true }) });
    }
  }
  for (let i = 0; i < cols.length; i++) {
    const x0 = cols[i] + 5;
    const x1 = edges[i + 1];
    for (const z of [...zBeam, ROOF - 6]) {
      const h = z === ROOF - 6 ? 6 : 4;
      slabAt("hrsg", { x: x0, y: fy, w: x1 - x0, d: 5, r: 0.5 }, z === ROOF - 6 ? ROOF - 6 : z - 2, h, { tone: "mid" }, { name: "hrsg.beam", bevel: 0.3, steps: 2 });
    }
  }

  // ---- roof, end wall --------------------------------------------------------------------------------------
  slabAt("hrsg", { x: X1 - 5, y: Y0, w: 5, d: Y1 - Y0, r: 0 }, Z0, ROOF - Z0, { tone: "mid" }, { name: "hrsg.end-wall", bevel: 0.4, steps: 2 });
  const ROOFP = { x: X0 - 2, y: Y0 - 2, w: X1 - X0 + 4, d: Y1 - Y0 + 4, r: 2 };
  slabAt("hrsg", ROOFP, ROOF, 6, { tone: "mid" }, {
    name: "hrsg.roof",
    bevel: 1,
    extra:
      Ln([...Array(5)].map((_, i) => k.lineOnTop([X0 + (i + 1) * 42, ROOFP.y], [X0 + (i + 1) * 42, ROOFP.y + ROOFP.d], ROOF + 6, P)).join(""), { tone: "faint" }) +
      Dots(k.corners(ROOFP, 4).map(([x, y]) => at([x, y, ROOF + 6])), { size: 0.5 }),
  });

  // ---- tube banks: tubes between two tube sheets, standing on two skid beams --------------------------------------
  L.BANKS.forEach((bank, bankIndex) => {
    const w = bank.x1 - bank.x0;
    const bottom = { x: bank.x0, y: -150, w, d: 108, r: 1 };
    for (const dx of [3, w - 7]) slabAt("hrsg", { x: bank.x0 + dx, y: -150, w: 4, d: 108, r: 0.6 }, Z0, 14.4 - Z0, { tone: "mid" }, { name: `hrsg.${bank.id}.beam`, bevel: 0.2, steps: 2, bank: bankIndex });
    slabAt("hrsg", bottom, 14.4, 1.6, { tone: "lo" }, { name: `hrsg.${bank.id}.floor`, bevel: 0.2, steps: 2, bank: bankIndex });
    const tubes = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 11; col++) tubes.push([bank.x0 + 6 + row * 11, -143 + col * 9.4 + (row % 2) * 4.2]);
    for (const [cx, cy] of tubes) cylAt("hrsg", cx, cy, 1.5, 16, 140, { tone: "mid", crease: "none" }, { name: `hrsg.${bank.id}.tube`, steps: 8, bank: bankIndex });
    slabAt("hrsg", { x: bank.x0, y: -150, w, d: 108, r: 1 }, 156, 1.6, { tone: "lo" }, { name: `hrsg.${bank.id}.top`, bevel: 0.2, steps: 2, bank: bankIndex });
  });

  // ---- drums on the roof: axes along x, at the front half of the roof ------------------------------------------
  const DRUM_Y = -80;
  const drums = [
    { id: "hp", name: "HP drum", x0: 190, x1: 264, r: 11.5, nozzles: [194, 224, 252] },
    { id: "lp", name: "LP drum", x0: 276, x1: 336, r: 8.5, nozzles: [282, 304, 330] },
  ];
  C.drums = {};
  for (const drum of drums) {
    const len = drum.x1 - drum.x0;
    const r = drum.r;
    const zc = ROOF + 6 + 5 + r; // saddle block 5 high on the roof, drum tangent to it
    const F = G.frameOf([drum.x0, DRUM_Y, zc], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const head = 8;
    const radius = (x) => {
      const d = Math.min(x, len - x);
      return d >= head ? r : r * (0.5 + 0.5 * Math.sin(((Math.PI / 2) * d) / head));
    };
    const slope = (x) => {
      const d = Math.min(x, len - x);
      if (d >= head) return 0;
      const sign = x < len / 2 ? 1 : -1;
      return sign * r * 0.5 * ((Math.PI / 2) / head) * Math.cos(((Math.PI / 2) * d) / head);
    };
    const samples = [...Array(9)].map((_, i) => (i / 8) * head);
    const profile = [[0, 0], [0, radius(0)], ...samples.slice(1).map((x) => [x, radius(x), 1]), ...samples.slice(0, -1).reverse().map((x) => [len - x, radius(len - x), 1]), [len, radius(len)], [len, 0]];
    const shape = turned("drum", F, profile, {}, {
      name: `drum.${drum.id}`,
      tone: "hi",
      slope,
      radius,
      inner: [16, 34, 52, len - 16, len - 34, len - 52].filter((x) => x < len - 8 && x > 8).map((x) => G.arcOf(F, x, r, P)).join(""),
      extra: Dots(G.dotsOf(F, len, r * 0.33, 8, P, { all: true }), { size: 0.4 }) + Ln(G.circleOf(F, len, r * 0.22, P, 18), { tone: "faint" }),
    });
    C.drums[drum.id] = { F, r, zc, shape, x0: drum.x0, x1: drum.x1, nozzles: drum.nozzles, topZ: zc + r };
    // saddles
    for (const x of [drum.x0 + 14, drum.x1 - 14]) slabAt("drum", { x: x - 6, y: DRUM_Y - r * 0.8, w: 12, d: r * 1.6, r: 1 }, ROOF + 6, 5, { tone: "mid" }, { name: "drum.saddle", bevel: 0.4, steps: 2, extra: Dots([at([x - 3, DRUM_Y - r * 0.8 + 2, ROOF + 11]), at([x + 3, DRUM_Y + r * 0.8 - 2, ROOF + 11])], { size: 0.4 }) });
    // nozzles on top, each on a seated pad, with a flange on top
    for (const x of drum.nozzles) {
      const base = [x, DRUM_Y, zc + r];
      const top = padOn("drum", shape, base, [0, 0, 1], { 194: 4.2, 282: 4.8 }[x] ?? 3.6, 4.2, { name: "drum.nozzle-pad" });
      C.drums[drum.id][`n${x}`] = top;
    }
  }

  // ---- roof sleeves: where the tube-bank headers leave the boiler ------------------------------------------------
  C.sleeves = {};
  const sleeve = (id, x, y = -42, r = 4.2) => {
    cylAt("hrsg", x, y, r, ROOF + 6, 4, { tone: "mid" }, { name: `hrsg.sleeve-${id}`, bevel: 0.4, steps: 18, extra: Dots(G.dotsOf(G.frameOf([x, y, ROOF + 10], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, r * 0.74, 6, P, { all: true }), { size: 0.4 }) });
    C.sleeves[id] = [x, y, ROOF + 10];
  };
  [["sh-in", 174], ["sh-out", 188, 5.6], ["ev-hp", 224], ["ec-hp", 252], ["ev-lp", 304], ["pre-out", 330]].forEach(([id, x, r]) => sleeve(id, x, -42, r));
  void sleeve;

  // ---- stack: tapering shell on a base plate, banded, with two sampling platforms and a caged ladder ------------------
  const SX = L.STACK.x;
  const SY = L.STACK.y;
  const SZ0 = ROOF + 6;
  const BASE = { x: SX - 26, y: SY - 26, w: 52, d: 52, r: 3 };
  slabAt("hrsg", BASE, SZ0, 4, { tone: "mid" }, { name: "stack.base", bevel: 0.8, steps: 3, extra: Dots(k.corners(BASE, 4).map(([x, y]) => at([x, y, SZ0 + 4])), { size: 0.5 }) });
  const stackH = L.STACK.z1 - SZ0 - 4;
  const rs = (s) => 19 - 4 * (s / stackH);
  const segs = [0, 26, 52, 78, 104, 122, 138, 150, stackH];
  const sz = (s) => SZ0 + 4 + s;
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i];
    const b = segs[i + 1];
    const banded = i >= 5 && i % 2 === 0;
    turned("stack", G.frameOf([SX, SY, sz(a)], [0, 0, 1], [1, 0, 0], [0, 1, 0]), [[0, 0], [0, rs(a)], [b - a, rs(b)], [b - a, 0]], {}, { name: `stack.shell${i}`, tone: banded ? "lo" : "mid", steps: 40 });
  }
  for (const s of [78, 138]) {
    const rin = rs(s);
    const rout = rin + 6;
    const mid = 100 * DEG;
    const span = 45 * DEG;
    const arc = (r, from, to, n = 16) => [...Array(n + 1)].map((_, i) => [SX + Math.cos(from + ((to - from) * i) / n) * r, SY + Math.sin(from + ((to - from) * i) / n) * r]);
    const ring = [...arc(rout, mid - span, mid + span), ...arc(rin, mid + span, mid - span)];
    const id = nameFor("stack.platform");
    put("hrsg", [SX + Math.cos(mid) * (rin + 3), SY + Math.sin(mid) * (rin + 3), sz(s) + 1], S(k.extrude(ring, sz(s), 2, P, { convex: false }), { tone: "mid" }) + Dots(arc(rout - 1.5, mid - span + 0.15, mid + span - 0.15, 9).map(([x, y]) => at([x, y, sz(s) + 2])), { size: 0.4 }), { name: id, shapes: [record(A.extruded(ring, sz(s), 2, { name: id }))], bias: 0.1 });
    C.railing("hrsg", arc(rout - 0.8, mid - span + 0.1, mid + span - 0.1, 10), sz(s) + 2, { spacing: 9, name: "stack.rail", h: 8 });
  }
  // ladder: two rails stood off the shell on brackets, rungs between them
  const lad = 34 * DEG;
  const R0 = 27;
  const railAt = (sign) => {
    const a = lad + sign * (2.7 / R0);
    return [SX + Math.cos(a) * R0, SY + Math.sin(a) * R0, a];
  };
  const ladZ0 = sz(10);
  const ladZ1 = sz(stackH - 14);
  for (const sign of [-1, 1]) {
    const [rx, ry, a] = railAt(sign);
    cylAt("hrsg", rx, ry, 0.6, ladZ0, ladZ1 - ladZ0, { tone: "mid", crease: "none" }, { name: "stack.rail-v", steps: 8 });
    for (const s of [14, 54, 94, 130, stackH - 18]) {
      const surf = rs(s);
      const BF = G.frameAlong([SX + Math.cos(a) * surf, SY + Math.sin(a) * surf, sz(s)], [Math.cos(a), Math.sin(a), 0]);
      const len = R0 - 0.6 - surf;
      const id = nameFor("stack.bracket");
      put("hrsg", [SX + Math.cos(a) * (surf + len / 2), SY + Math.sin(a) * (surf + len / 2), sz(s)], S(G.disc(0, len, 0.8, BF, P), { tone: "mid" }), { name: id, shapes: [record(A.disc(BF, 0, len, 0.8, { name: id }))], bias: 0.2 });
    }
  }
  const [ax, ay] = railAt(-1);
  const [bx, by] = railAt(1);
  const rungN = Math.floor((ladZ1 - ladZ0) / 4.4);
  const rungId = nameFor("hrsg.rungs");
  put("hrsg", [SX + R0, SY, sz(stackH / 2)], Ln([...Array(rungN)].map((_, i) => k.segment([ax, ay, ladZ0 + 2 + i * 4.4], [bx, by, ladZ0 + 2 + i * 4.4], P)).join(""), { tone: "lo" }), { name: rungId, bias: 0.3, shapes: [record(A.orientedBox([(ax + bx) / 2, (ay + by) / 2, (ladZ0 + ladZ1) / 2], [[-Math.sin(lad), Math.cos(lad), 0], [Math.cos(lad), Math.sin(lad), 0], [0, 0, 1]], [2.7, 0.3, (ladZ1 - ladZ0) / 2 - 1], { name: rungId }))] });

  // ---- front platforms with handrails, and a stair at the inlet end --------------------------------------------------------------
  for (const z of [62, 122]) {
    const plan = { x: X0 + 2, y: Y1, w: X1 - X0 - 4, d: 14, r: 1 };
    slabAt("hrsg", plan, z, 2, { tone: "mid" }, {
      name: "hrsg.platform",
      bevel: 0.3,
      steps: 2,
      extra: Ln([...Array(61)].map((_, i) => k.segment([plan.x + 2 + i * 4, plan.y, z + 2], [plan.x + 2 + i * 4, plan.y + plan.d, z + 2], P)).join(""), { tone: "faint" }),
    });
    C.railing("hrsg", [[plan.x + 1, plan.y + plan.d - 1], [plan.x + plan.w - 1, plan.y + plan.d - 1]], z + 2, { spacing: 21, name: "hrsg.rail" });
  }
  // stair: a solid stringer on either side and a tread every 4.6 units, climbing toward the inlet end
  const stairX1 = X0 + 2;
  const run = 76;
  const rise = 64;
  const treads = 14;
  for (const y of [Y1 + 2.5, Y1 + 11.4]) {
    polyAt("hrsg", prismAlong("y", [[0, stairX1 - run], [0, stairX1], [rise, stairX1]], y, y + 1.6), { tone: "mid" }, { name: "hrsg.stringer", ref: [stairX1 - run / 3, y, rise / 3] });
  }
  for (let i = 0; i < treads; i++) {
    const t = (i + 1) / treads;
    const xr = stairX1 - run * (1 - t);
    slabAt("hrsg", { x: xr - run / treads, y: Y1 + 4.1, w: run / treads, d: 7.3, r: 0.3 }, rise * t - 1.4, 1.4, { tone: "lo" }, { name: "hrsg.tread", bevel: 0.1, steps: 2 });
  }

  // ---- stack: sampling platforms and a caged ladder ------------------------------------------------------------------------------------
  void 0;
  void turned; void padOn; void polyAt; void cylAt; void ballAt; void V; void KS;
}
