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
  const FOUND = { x: X0 - 8, y: Y0 - 8, w: X1 - X0 + 16, d: Y1 - Y0 + 24, r: 3 };
  slabAt("hrsg", FOUND, 0, 5, { tone: "lo" }, { name: "hrsg.foundation", bevel: 1, layer: "back", extra: Dots(k.corners(FOUND, 5).map(([x, y]) => at([x, y, 5])), { size: 0.5 }) });
  const wall = (plan, z0, h, name, extra = "") => {
    const id = nameFor(name);
    put("hrsg", [plan.x + plan.w / 2, plan.y + plan.d / 2, z0 + h / 2], wrap(S(k.slabOf(plan, z0, h, P, 2, 0), { tone: "mid" }) + extra), { name: id, shapes: [record(A.box([plan.x, plan.y, z0], [plan.x + plan.w, plan.y + plan.d, z0 + h], { name: id }))], ...inside });
  };
  wall({ x: X0, y: Y0, w: X1 - X0, d: Y1 - Y0, r: 0 }, 5, 1.5, "hrsg.floor");
  const inner = Y0 + 3;
  wall({ x: X0, y: Y0, w: X1 - X0, d: 3, r: 0 }, 5, ROOF - 5, "hrsg.back-wall",
    Ln([...Array(9)].map((_, i) => k.segment([X0, inner, 5 + (i + 1) * 16.5], [X1, inner, 5 + (i + 1) * 16.5], P)).join(""), { tone: "faint" }) +
      Ln([...Array(6)].map((_, i) => k.segment([X0 + (i + 1) * 37, inner, 5], [X0 + (i + 1) * 37, inner, ROOF], P)).join(""), { tone: "faint" }));
  wall({ x: X0, y: Y0, w: 3, d: Y1 - Y0, r: 0 }, 5, ROOF - 5, "hrsg.inlet-wall");

  // ---- front frame: columns between beams, so nothing overlaps ----------------------------------------------
  const cols = [X0, 190, 232, 274, 316, 358, X1 - 5];
  const zBeam = [86, 128];
  const fy = Y1 - 5;
  for (const x of cols) {
    const bounds = [5, ...zBeam.flatMap((z) => [z - 2, z + 2]), ROOF - 6];
    for (let i = 0; i < bounds.length; i += 2) {
      const z0 = bounds[i];
      const z1 = bounds[i + 1];
      if (z1 <= z0) continue;
      slabAt("hrsg", { x, y: fy, w: 5, d: 5, r: 0.6 }, z0, z1 - z0, { tone: "mid" }, { name: "hrsg.column", bevel: 0.4, steps: 2, extra: Ln(k.rise([x + 2.5, fy + 5], z0, z1, P), { tone: "faint", free: true }) });
    }
  }
  for (let i = 0; i < cols.length - 1; i++) {
    for (const z of [...zBeam, ROOF - 6]) {
      const h = z === ROOF - 6 ? 6 : 4;
      slabAt("hrsg", { x: cols[i] + 5, y: fy, w: cols[i + 1] - cols[i] - 5, d: 5, r: 0.5 }, z === ROOF - 6 ? ROOF - 6 : z - 2, h, { tone: "mid" }, { name: "hrsg.beam", bevel: 0.3, steps: 2 });
    }
  }

  // ---- roof, end wall --------------------------------------------------------------------------------------
  slabAt("hrsg", { x: X1 - 5, y: Y0, w: 5, d: Y1 - Y0, r: 0 }, 5, ROOF - 5 - 6, { tone: "mid" }, { name: "hrsg.end-wall", bevel: 0.4, steps: 2 });
  const ROOFP = { x: X0 - 2, y: Y0 - 2, w: X1 - X0 + 4, d: Y1 - Y0 + 4, r: 2 };
  slabAt("hrsg", ROOFP, ROOF, 6, { tone: "mid" }, {
    name: "hrsg.roof",
    bevel: 1,
    extra:
      Ln([...Array(5)].map((_, i) => k.lineOnTop([X0 + (i + 1) * 42, Y0], [X0 + (i + 1) * 42, Y1], ROOF + 6, P)).join(""), { tone: "faint" }) +
      Dots(k.corners(ROOFP, 4).map(([x, y]) => at([x, y, ROOF + 6])), { size: 0.5 }),
  });

  // ---- tube banks -------------------------------------------------------------------------------------------
  L.BANKS.forEach((bank, bankIndex) => {
    const w = bank.x1 - bank.x0;
    const bottom = { x: bank.x0, y: -150, w, d: 108, r: 1 };
    slabAt("hrsg", bottom, 12, 1.6, { tone: "lo" }, { name: `hrsg.${bank.id}.floor`, bevel: 0.2, steps: 2, bank: bankIndex });
    const tubes = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 11; col++) tubes.push([bank.x0 + 6 + row * 11, -143 + col * 9.4 + (row % 2) * 4.2]);
    for (const [cx, cy] of tubes) cylAt("hrsg", cx, cy, 1.5, 13.6, 142.4, { tone: "mid", crease: "none" }, { name: `hrsg.${bank.id}.tube`, steps: 8, bank: bankIndex });
    slabAt("hrsg", { x: bank.x0, y: -150, w, d: 108, r: 1 }, 156, 1.6, { tone: "lo" }, { name: `hrsg.${bank.id}.top`, bevel: 0.2, steps: 2, bank: bankIndex });
  });

  // ---- drums on the roof: axes along x, at the front half of the roof ------------------------------------------
  const DRUM_Y = -80;
  const drums = [
    { id: "hp", name: "HP drum", x0: 190, x1: 264, r: 11.5, nozzles: [198, 222, 256] },
    { id: "lp", name: "LP drum", x0: 276, x1: 336, r: 8.5, nozzles: [284, 300, 330] },
  ];
  C.drums = {};
  for (const drum of drums) {
    const len = drum.x1 - drum.x0;
    const r = drum.r;
    const zc = ROOF + 6 + 5 + r; // saddle block 5 high on the roof, drum tangent to it
    const F = G.frameOf([drum.x0, DRUM_Y, zc], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
    const profile = [[0, 0], [0, r * 0.5], [1, r * 0.78, 1], [3, r * 0.93, 1], [5.5, r * 0.985, 1], [8, r, 1], [len - 8, r, 1], [len - 5.5, r * 0.985, 1], [len - 3, r * 0.93, 1], [len - 1, r * 0.78, 1], [len, r * 0.5], [len, 0]];
    const shape = turned("drum", F, profile, {}, {
      name: `drum.${drum.id}`,
      tone: "hi",
      smooth: true,
      inner: [16, 34, 52, len - 16, len - 34, len - 52].filter((x) => x < len - 8 && x > 8).map((x) => G.arcOf(F, x, r, P)).join(""),
      extra: Dots(G.dotsOf(F, len, r * 0.33, 8, P, { all: true }), { size: 0.4 }) + Ln(G.circleOf(F, len, r * 0.22, P, 18), { tone: "faint" }),
    });
    C.drums[drum.id] = { F, r, zc, shape, x0: drum.x0, x1: drum.x1, nozzles: drum.nozzles, topZ: zc + r };
    // saddles
    for (const x of [drum.x0 + 14, drum.x1 - 14]) slabAt("drum", { x: x - 6, y: DRUM_Y - r * 0.8, w: 12, d: r * 1.6, r: 1 }, ROOF + 6, 5, { tone: "mid" }, { name: "drum.saddle", bevel: 0.4, steps: 2, extra: Dots([at([x - 3, DRUM_Y - r * 0.8 + 2, ROOF + 11]), at([x + 3, DRUM_Y + r * 0.8 - 2, ROOF + 11])], { size: 0.4 }) });
    // nozzles on top, each on a seated pad, with a flange on top
    for (const x of drum.nozzles) {
      const base = [x, DRUM_Y, zc + r];
      const top = padOn("drum", shape, base, [0, 0, 1], { 198: 4.2, 284: 4.8 }[x] ?? 3.6, 4.2, { name: "drum.nozzle-pad" });
      C.drums[drum.id][`n${x}`] = top;
    }
  }

  // ---- roof sleeves: where the tube-bank headers leave the boiler ------------------------------------------------
  C.sleeves = {};
  const sleeve = (id, x, y = -42, r = 4.2) => {
    cylAt("hrsg", x, y, r, ROOF + 6, 4, { tone: "mid" }, { name: `hrsg.sleeve-${id}`, bevel: 0.4, steps: 18, extra: Dots(G.dotsOf(G.frameOf([x, y, ROOF + 10], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, r * 0.74, 6, P, { all: true }), { size: 0.4 }) });
    C.sleeves[id] = [x, y, ROOF + 10];
  };
  [["sh-in", 178], ["sh-out", 188, 5.6], ["ev-hp", 222], ["ec-hp", 256], ["ev-lp", 300], ["pre-out", 330]].forEach(([id, x, r]) => sleeve(id, x, -42, r));
  void sleeve;

  // ---- stack: tapering shell on a base plate, banded and railed ---------------------------------------------------
  const SX = L.STACK.x;
  const SY = L.STACK.y;
  const SZ0 = ROOF + 6;
  const BASE = { x: SX - 26, y: SY - 26, w: 52, d: 52, r: 3 };
  slabAt("hrsg", BASE, SZ0, 4, { tone: "mid" }, { name: "stack.base", bevel: 0.8, steps: 3, extra: Dots(k.corners(BASE, 4).map(([x, y]) => at([x, y, SZ0 + 4])), { size: 0.5 }) });
  const SF = G.frameOf([SX, SY, SZ0 + 4], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  const stackH = L.STACK.z1 - SZ0 - 4;
  const rs = (s) => 19 - 4 * (s / stackH);
  const segs = [0, 36, 72, 100, 128, 156, 184, 212, 240, 268, stackH];
  const sprofile = [];
  for (let i = 0; i < segs.length - 1; i++) {
    const a = segs[i];
    const b = segs[i + 1];
    turned("stack", G.frameOf([SX, SY, SZ0 + 4 + a], [0, 0, 1], [1, 0, 0], [0, 1, 0]), [[0, 0], [0, rs(a)], [b - a, rs(b)], [b - a, 0]], { tone: i >= 7 && i % 2 === 1 ? "lo" : "mid" }, { name: `stack.shell${i}`, tone: i >= 7 && i % 2 === 1 ? "lo" : "mid", steps: 40 });
    sprofile.push([a, rs(a)]);
  }
  void SF; void sprofile;

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
  for (const y of [Y1 + 1, Y1 + 11]) {
    polyAt("hrsg", prismAlong("y", [[0, stairX1 - run], [0, stairX1], [rise, stairX1]], y, y + 1.6), { tone: "mid" }, { name: "hrsg.stringer", ref: [stairX1 - run / 3, y, rise / 3] });
  }
  for (let i = 0; i < treads; i++) {
    const t = (i + 1) / treads;
    const xr = stairX1 - run * (1 - t);
    slabAt("hrsg", { x: xr - run / treads, y: Y1 + 2.6, w: run / treads, d: 8.4, r: 0.3 }, rise * t - 1.4, 1.4, { tone: "lo" }, { name: "hrsg.tread", bevel: 0.1, steps: 2 });
  }

  // ---- stack: sampling platforms and a caged ladder ------------------------------------------------------------------------------------
  void 0;
  void turned; void padOn; void polyAt; void cylAt; void ballAt; void V; void KS;
}
