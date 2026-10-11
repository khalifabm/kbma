import * as L from "../layout.mjs";

const DEG = Math.PI / 180;

// The rest of the site: transformers and the pylon, the control room, the fuel-gas skid and the pump skid.
export function site(C) {
  const { k, G, A, P, V, KS, at, S, Ln, Dots, put, slabAt, cylAt, turned, spin, faceWindowX, faceWindowY, polyAt, record, nameFor, ballAt, padOn } = C;

  // ---- transformers: tank, conservator, bushings and a radiator bank on the +x side --------------------------
  function transformer(plan, id, side = "x", tank = 30) {
    const topZ = 3 + tank;
    const base = { x: plan.x - 2, y: plan.y - 2, w: plan.w + 4, d: plan.d + 4, r: 2 };
    slabAt("elec", base, 0, 3, { tone: "lo" }, { name: `${id}.base`, bevel: 0.6, steps: 3, extra: Dots(k.corners(base, 3).map(([x, y]) => at([x, y, 3])), { size: 0.45 }) });
    const seams = [topZ * 0.35, topZ * 0.65].map((z) => Ln(k.sideSeam(plan, z, P, 3), { tone: "faint" })).join("");
    const ribs = [...Array(4)].map((_, i) => k.segment([plan.x + plan.w, plan.y + ((i + 1) * plan.d) / 5, 3], [plan.x + plan.w, plan.y + ((i + 1) * plan.d) / 5, topZ], P)).join("");
    slabAt("elec", plan, 3, tank, { tone: "mid" }, { name: `${id}.tank`, bevel: 0.8, steps: 3, extra: seams + Ln(ribs, { tone: "faint" }) });
    const lid = k.insetPlan(plan, 2.5);
    slabAt("elec", lid, topZ, 3, { tone: "mid" }, { name: `${id}.lid`, bevel: 0.5, steps: 3, extra: Dots([...Array(5)].map((_, i) => at([lid.x + 4 + (i * (lid.w - 8)) / 4, lid.y + lid.d - 2.5, topZ + 3])), { size: 0.4 }) });
    const lidTop = topZ + 3;
    // conservator on two saddles
    const cy0 = plan.y + 7;
    const cLen = plan.d - 14;
    const cz = lidTop + 4 + 5;
    const CF = G.frameOf([plan.x + plan.w * 0.3, cy0, cz], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    turned("elec", CF, [[0, 0], [0, 3.5], [1.2, 4.7, 1], [3, 5, 1], [cLen - 3, 5, 1], [cLen - 1.2, 4.7, 1], [cLen, 3.5], [cLen, 0]], {}, { name: `${id}.conservator`, tone: "mid", smooth: false, inner: [cLen * 0.3, cLen * 0.7].map((s) => G.arcOf(CF, s, 5, P)).join("") });
    for (const t of [0.15, 0.85]) slabAt("elec", { x: plan.x + plan.w * 0.3 - 3, y: cy0 + cLen * t - 2, w: 6, d: 4, r: 0.6 }, lidTop, 4, { tone: "mid" }, { name: `${id}.saddle`, bevel: 0.3, steps: 2 });
    // three bushings
    for (let i = 0; i < 3; i++) {
      const bx = plan.x + plan.w * 0.65;
      const by = plan.y + plan.d * (0.22 + i * 0.28);
      const BF = G.frameOf([bx, by, lidTop], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
      const profile = [[0, 0], [0, 3.2], [2.5, 3.2], [2.5, 1.9]];
      for (let j = 0; j < 7; j++) profile.push([4.2 + j * 3.1, 1.9], [4.2 + j * 3.1, 3.4], [5.1 + j * 3.1, 3.4], [5.1 + j * 3.1, 1.9]);
      profile.push([27, 1.9], [27, 1.3], [29.5, 1.3], [29.5, 0]);
      turned("elec", BF, profile, {}, { name: `${id}.bushing`, tone: "mid", steps: 14, bias: 0.2 });
      C.bushings = C.bushings ?? {};
      (C.bushings[id] = C.bushings[id] ?? []).push([bx, by, lidTop + 29.5]);
    }
    // radiator bank on the side the viewer sees
    const rl = (side === "x" ? plan.d : plan.w) - 12;
    const n = Math.max(2, Math.round(rl / 3.2));
    for (let i = 0; i < 5; i++) {
      const o = (side === "x" ? plan.x + plan.w : plan.y + plan.d) + 4 + i * 4.4;
      const fins = [...Array(n - 1)].map((_, j) => {
        const t = 6 + ((j + 1) * rl) / n;
        return side === "x" ? k.segment([o + 2.2, plan.y + t, 7], [o + 2.2, plan.y + t, 7 + tank - 6], P) : k.segment([plan.x + t, o + 2.2, 7], [plan.x + t, o + 2.2, 7 + tank - 6], P);
      }).join("");
      const rp = side === "x" ? { x: o, y: plan.y + 6, w: 2.2, d: rl, r: 0.4 } : { x: plan.x + 6, y: o, w: rl, d: 2.2, r: 0.4 };
      slabAt("elec", rp, 7, tank - 6, { tone: "mid" }, { name: `${id}.radiator`, bevel: 0.2, steps: 2, extra: Ln(fins, { tone: "faint" }) });
    }
    // headers joining the radiators to the tank, top and bottom
    const span = 5 * 4.4 - 2.2 + 4;
    for (const z of [4, 7 + tank - 6]) {
      const hp = side === "x" ? { x: plan.x + plan.w, y: plan.y + 6, w: span, d: rl, r: 0.4 } : { x: plan.x + 6, y: plan.y + plan.d, w: rl, d: span, r: 0.4 };
      slabAt("elec", hp, z, 3, { tone: "lo" }, { name: `${id}.header`, bevel: 0.2, steps: 2 });
    }
  }
  transformer(L.XFMR_GT, "elec.gt", "y", 40);
  // isolated-phase bus duct from the generator frame to the transformer tank
  const GFX = L.GT.gen[0] + 12;
  const BUS = { x: L.XFMR_GT.x + L.XFMR_GT.w, y: -72, w: GFX - (L.XFMR_GT.x + L.XFMR_GT.w), d: 10, r: 2 };
  slabAt("elec", BUS, 33, 10, { tone: "mid" }, { name: "elec.busduct", bevel: 0.5, steps: 3, extra: Ln([0.25, 0.5, 0.75].map((t) => k.segment([BUS.x + BUS.w * t, BUS.y + BUS.d, 33], [BUS.x + BUS.w * t, BUS.y + BUS.d, 43], P)).join(""), { tone: "faint" }) });
  transformer(L.XFMR_ST, "elec.st");

  // ---- lattice pylon behind the gas-turbine transformer, with the wires that reach it ---------------------------
  const PY = { x: -412, y: -186, base: 15, top: 2.5, h: 176 };
  const half = (z) => PY.base + ((PY.top - PY.base) * z) / PY.h;
  const corner = (z, sx, sy) => [PY.x + sx * half(z), PY.y + sy * half(z), z];
  const lattice = [];
  const faint = [];
  const panels = 14;
  for (let i = 0; i < panels; i++) {
    const z0 = (i * PY.h) / panels;
    const z1 = ((i + 1) * PY.h) / panels;
    const pairs = [[[1, 1], [1, -1]], [[1, -1], [-1, -1]], [[-1, -1], [-1, 1]], [[-1, 1], [1, 1]]];
    pairs.forEach(([a, b], f) => {
      const near = f === 0 || f === 3; // faces toward +x and +y
      const target = near ? lattice : faint;
      target.push(k.segment(corner(z1, ...a), corner(z1, ...b), P));
      target.push(k.segment(corner(z0, ...a), corner(z1, ...b), P));
      target.push(k.segment(corner(z0, ...b), corner(z1, ...a), P));
    });
  }
  const legs = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sy]) => k.segment(corner(0, sx, sy), corner(PY.h, sx, sy), P)).join("");
  const feet = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sy]) => at(corner(0, sx, sy)));
  put("elec", [PY.x, PY.y, PY.h / 2], Ln(faint.join(""), { tone: "faint" }) + Ln(lattice.join(""), { tone: "lo" }) + Ln(legs, { tone: "mid" }) + Dots(feet, { size: 0.8, tone: "mid" }), { name: nameFor("elec.pylon"), shapes: [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([sx, sy]) => record(A.tube([corner(2.5, sx, sy), corner(PY.h, sx, sy)], 0.9, { name: "elec.pylon", owner: "elec.pylon" }))) });
  slabAt("elec", { x: PY.x - 20, y: PY.y - 20, w: 40, d: 40, r: 2 }, 0, 2.5, { tone: "lo" }, { name: "elec.pylon-foot", bevel: 0.5, steps: 2, bias: -1, extra: Dots(k.corners({ x: PY.x - 20, y: PY.y - 20, w: 40, d: 40 }, 4).map(([x, y]) => at([x, y, 2.5])), { size: 0.5 }) });
  // cross-arms with an insulator string hanging from each tip; the wires from the bushings end on these
  const arms = [150, 126, 102];
  const wireEnds = [];
  arms.forEach((z, i) => {
    const reach = 26 - i * 2;
    const root = corner(z, 1, 0);
    const tip = [PY.x + half(z) + reach, PY.y, z];
    const armSvg = Ln(k.segment(root, tip, P) + k.segment([root[0], root[1], root[2] - 5], tip, P), { tone: "mid" });
    const strung = [...Array(6)].map((_, j) => at([tip[0], tip[1], z - 1.5 - j * 2.2]));
    const clamp = [tip[0], tip[1], z - 15];
    put("elec", tip, armSvg + Dots(strung, { size: 0.9, tone: "mid" }) + Ln(k.segment(tip, [tip[0], tip[1], z - 13.5], P), { tone: "lo" }) + Dots([at(clamp)], { size: 0.7, tone: "hi" }), { name: nameFor("elec.arm"), bias: 0.2, shapes: [record(A.box([root[0], root[1] - 0.6, z - 15], [tip[0] + 0.6, tip[1] + 0.6, z + 0.6], { name: "elec.arm", owner: "elec.pylon" }))] });
    wireEnds.push(clamp);
  });
  // wires, sagging a little, from each bushing top to an insulator clamp
  const sag = (a, b, drop) => Array.from({ length: 17 }, (_, i) => {
    const t = i / 16;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t - drop * 4 * t * (1 - t)];
  });
  const tops = C.bushings["elec.gt"].sort((a, b) => b[1] - a[1]);
  tops.forEach((top, i) => {
    const wire3 = sag([top[0], top[1], top[2]], wireEnds[i], 9);
    const pts = wire3.map((p) => at(p));
    const wid = nameFor("elec.wire");
    put("elec", [(top[0] + wireEnds[i][0]) / 2, (top[1] + wireEnds[i][1]) / 2, (top[2] + wireEnds[i][2]) / 2], Ln(k.pathOf(pts), { tone: "mid" }) + Dots([at(top)], { size: 0.8, tone: "hi" }), { name: wid, bias: 0.5, shapes: [record(A.tube(wire3, 0.25, { name: wid, limp: true }))] });
  });

  // ---- control room: a low building with windows, a roof overhang, roof plant and a dish ----------------------------
  const CR = L.CONTROL;
  const crPlan = { x: CR.x, y: CR.y, w: CR.w, d: CR.d, r: 3 };
  slabAt("site", { ...crPlan, x: CR.x - 4, y: CR.y - 4, w: CR.w + 8, d: CR.d + 8 }, 0, 2, { tone: "lo" }, { name: "site.plinth", bevel: 0.5, steps: 3 });
  const front = CR.y + CR.d;
  const right = CR.x + CR.w;
  const windowsY = [];
  for (let i = 0; i < 4; i++) {
    const x0 = CR.x + 8 + i * 22;
    windowsY.push(faceWindowY({ y: front, x0, x1: x0 + 15, z0: 15, z1: 29, round: 1.5, name: "ctl", content: Ln([1, 2, 3].map((j) => k.segment([x0, front, 15 + j * 3.5], [x0 + 15, front, 15 + j * 3.5], P)).join(""), { tone: "lo" }) }));
  }
  const windowsX = [];
  for (let i = 0; i < 3; i++) {
    const y0 = CR.y + 10 + i * 22;
    windowsX.push(faceWindowX({ x: right, y0, y1: y0 + 14, z0: 15, z1: 29, round: 1.5, name: "ctlx", content: Ln([1, 2, 3].map((j) => k.segment([right, y0, 15 + j * 3.5], [right, y0 + 14, 15 + j * 3.5], P)).join(""), { tone: "lo" }) }));
  }
  const door = faceWindowY({ y: front, x0: CR.x + CR.w - 22, x1: CR.x + CR.w - 10, z0: 2, z1: 20, round: 1, name: "door", rim: true });
  slabAt("site", crPlan, 2, 34, { tone: "mid" }, {
    name: "site.control",
    bevel: 0.8,
    steps: 3,
    extra: windowsY.join("") + windowsX.join("") + door + Ln(k.sideSeam(crPlan, 32, P, 3), { tone: "faint" }),
  });
  const roofPlan = { x: CR.x - 3, y: CR.y - 3, w: CR.w + 6, d: CR.d + 6, r: 3 };
  slabAt("site", roofPlan, 36, 3, { tone: "mid" }, { name: "site.control-roof", bevel: 0.6, steps: 3, extra: Ln(k.planOutline(k.insetPlan(roofPlan, 3), 39, P, 3), { tone: "faint" }) });
  // roof plant: two chiller boxes with fans, and a dish on a mast
  [0, 1].forEach((i) => {
    const bx = CR.x + 14 + i * 40;
    const bp = { x: bx, y: CR.y + 14, w: 28, d: 22, r: 1.5 };
    slabAt("site", bp, 39, 9, { tone: "mid" }, { name: "site.chiller", bevel: 0.5, steps: 2, extra: Ln([...Array(5)].map((_, j) => k.planOutline({ x: bp.x + 3, y: bp.y + 3 + j * 3.6, w: bp.w - 6, d: 1, r: 0.5 }, 48, P, 3)).join(""), { tone: "lo" }) });
  });
  const mast = G.frameOf([CR.x + CR.w - 16, CR.y + CR.d - 14, 39], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
  turned("site", mast, [[0, 0], [0, 1.2], [20, 1.2], [20, 0]], {}, { name: "site.mast", tone: "mid", steps: 10, owner: "site.antenna" });
  const DF = G.frameOf([CR.x + CR.w - 16, CR.y + CR.d - 14, 58], [0.45, 0.85, 0.45], [1, 0, -1], [0, 1, 0]);
  turned("site", G.frameAlong([CR.x + CR.w - 16, CR.y + CR.d - 14, 59], G.unit3([0.5, 0.82, 0.45])), [[0, 0], [0, 1.4], [3, 6.2, 1], [4, 7.8, 1], [4.8, 8, 0], [4.8, 0]], {}, { name: "site.dish", tone: "hi", smooth: false, owner: "site.antenna" });
  void DF;

  // ---- fuel-gas skid in the corridor, with a pipe to the combustor ring ------------------------------------------------
  const FUELP = { x: -222, y: 6, w: 64, d: 36, r: 2 };
  slabAt("fuel", FUELP, 0, 3, { tone: "lo" }, { name: "fuel.base", bevel: 0.8, steps: 3, extra: Ln(k.planOutline(k.insetPlan(FUELP, 3), 3, P, 3), { tone: "faint" }) + Dots(k.corners(FUELP, 4).map(([x, y]) => at([x, y, 3])), { size: 0.5 }) });
  C.fuelSkid = { x: FUELP.x, y: FUELP.y, w: FUELP.w, d: FUELP.d };
  // two vertical vessels (scrubber and filter), a regulator box and a manifold
  [[FUELP.x + 14, FUELP.y + 12], [FUELP.x + 32, FUELP.y + 12]].forEach(([x, y], i) => {
    const F = G.frameOf([x, y, 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    turned("fuel", F, [[0, 0], [0, 5.5], [1.5, 7, 1], [4, 7.5, 1], [26, 7.5, 1], [28, 7, 1], [30, 5.5], [30, 0]], {}, { name: "fuel.vessel", tone: "mid", smooth: false, inner: [8, 18].map((s) => G.arcOf(F, s, 7.5, P)).join(""), extra: Dots(G.dotsOf(F, 30, 3.6, 6, P, { all: true }), { size: 0.4 }) });
    slabAt("fuel", { x: x - 7, y: y + 11, w: 14, d: 5, r: 0.8 }, 3, 3, { tone: "mid" }, { name: "fuel.foot", bevel: 0.2, steps: 2 });
    void i;
  });
  slabAt("fuel", { x: FUELP.x + 44, y: FUELP.y + 8, w: 16, d: 20, r: 1.5 }, 3, 14, { tone: "hi" }, { name: "fuel.regulator", bevel: 0.5, steps: 2, extra: Ln(k.planOutline(k.insetPlan({ x: FUELP.x + 44, y: FUELP.y + 8, w: 16, d: 20, r: 1.5 }, 2), 17, P, 2), { tone: "faint" }) + Dots([at([FUELP.x + 47, FUELP.y + 11, 17]), at([FUELP.x + 57, FUELP.y + 25, 17])], { size: 0.4 }) });

  // ---- pump skid in the corridor: one condensate pump and one feed pump, casings toward the condenser side ----------------------
  const PS = { x: 112, y: 44, w: 90, d: 52, r: 2 };
  slabAt("pumps", PS, 0, 3, { tone: "lo" }, { name: "pumps.base", bevel: 0.8, steps: 3, extra: Ln(k.planOutline(k.insetPlan(PS, 3), 3, P, 3), { tone: "faint" }) + Dots(k.corners(PS, 4).map(([x, y]) => at([x, y, 3])), { size: 0.5 }) });
  C.pumps = [];
  [{ x: PS.x + 22, feed: false }, { x: PS.x + 66, feed: true }].forEach(({ x: px, feed }) => {
    const zc = L.PUMP_ZC[feed ? 1 : 0];
    const rm = feed ? 8.2 : 7.2;
    const len0 = feed ? 23 : 20;
    const MF = G.frameOf([px, PS.y + 5, zc], [0, 1, 0], [1, 0, 0], [0, 0, 1]);
    turned("pumps", MF, [[0, 0], [0, rm - 1.2], [1.5, rm - 0.2, 1], [3, rm, 1], [len0 - 3, rm, 1], [len0 - 1.5, rm - 0.2, 1], [len0, rm - 1.2], [len0, 0]], {}, { name: "pumps.motor", tone: "mid", smooth: false, extra: C.Faded(G.ribsOf(MF, 3, len0 - 3, rm, 14, P, { fade: [0.1, 0.55], seams: true }), { tone: "lo" }) });
    turned("pumps", MF, [[len0, 0], [len0, 3], [len0 + 7, 3], [len0 + 7, 0]], {}, { name: "pumps.coupling", tone: "lo", steps: 14, bias: 0.1 });
    const cs = len0 + 7;
    const rc = feed ? 9.6 : 9;
    const casingShape = turned("pumps", MF, [[cs, 0], [cs, rc - 2.4], [cs + 2, rc - 0.4, 1], [cs + 6, rc, 1], [cs + 12, rc - 0.4, 1], [cs + 14, rc - 2.4], [cs + 14, 0]], {}, { name: "pumps.casing", tone: "hi", smooth: false, inner: G.arcOf(MF, cs + 7, rc, P) });
    const outlet = C.padOn("pumps", casingShape, [px, PS.y + 5 + cs + 7, zc + rc], [0, 0, 1], 4.2, 3, { name: "pumps.nozzle-pad" });
    slabAt("pumps", { x: px - 6, y: PS.y + 5, w: 12, d: 5, r: 0.8 }, 3, zc - rm - 3, { tone: "mid" }, { name: "pumps.leg", bevel: 0.2, steps: 2 });
    slabAt("pumps", { x: px - 6, y: PS.y + 5 + cs, w: 12, d: 5, r: 0.8 }, 3, zc - rc - 3, { tone: "mid" }, { name: "pumps.leg", bevel: 0.2, steps: 2 });
    C.pumps.push({ x: px, zc, feed, suction: [px, PS.y + 5 + cs + 14, zc], suctionR: rc - 2.4, discharge: outlet });
  });
  void faceWindowX; void faceWindowY; void polyAt; void spin; void record; void nameFor; void ballAt; void V; void KS; void put; void S;
}
