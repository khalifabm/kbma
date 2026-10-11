import * as L from "../layout.mjs";
import { prismFaces, frustum, prismAlong } from "../poly.mjs";

const DEG = Math.PI / 180;

// Gas-turbine train, left to right: generator, inlet plenum, compressor, combustor, turbine, exhaust diffuser,
// with the filter house behind it and the transition box that meets the boiler.
export function gasTurbine(C) {
  const { k, G, A, P, V, at, S, Ln, Dots, put, turned, slabAt, cylAt, spin, windowOn, padOn, polyAt, record, nameFor } = C;
  const Y = L.GT_Y;
  const Z = L.GT_Z;
  const g = L.GT;
  const SKID_TOP = 8;
  const frameAt = (x) => G.frameOf([x, Y, Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const SEE = [-70 * DEG, 140 * DEG]; // blade angles that can be seen from the camera

  // ---- base skid ---------------------------------------------------------------------------------------------
  const SKID = { x: g.gen[0] - 24, y: Y - 56, w: g.diffuser[1] - (g.gen[0] - 24), d: 112, r: 3 };
  slabAt("skid", SKID, 0, SKID_TOP, { tone: "lo" }, {
    name: "skid.base",
    bevel: 1.2,
    extra:
      Ln(k.planOutline(k.insetPlan(SKID, 4), SKID_TOP, P, 3), { tone: "faint" }) +
      Dots(k.corners(SKID, 7).map(([x, y]) => at([x, y, SKID_TOP])), { size: 0.5 }) +
      Dots([...Array(9)].flatMap((_, i) => [at([SKID.x + 32 + i * 52, SKID.y + 7, SKID_TOP]), at([SKID.x + 32 + i * 52, SKID.y + SKID.d - 7, SKID_TOP])]), { size: 0.45 }),
  });
  // a pedestal under a casing: narrow, with its top following the casing's lowest line so the two touch all along
  const pedestal = (name, x0, x1, rOf) => {
    const half = 9;
    const topAt = (x) => Z - rOf(x);
    const poly = [[x0, Y - half], [x1, Y - half], [x1, Y + half], [x0, Y + half]];
    const tops = [topAt(x0), topAt(x1), topAt(x1), topAt(x0)];
    const faces = prismFaces(poly, SKID_TOP, tops);
    const n = 4;
    const boxes = Array.from({ length: n }, (_, i) => {
      const a = x0 + ((x1 - x0) * i) / n;
      const b = x0 + ((x1 - x0) * (i + 1)) / n;
      return [[a, Y - half, SKID_TOP], [b, Y + half, Math.min(topAt(a), topAt(b))]];
    });
    const front = Y + half;
    polyAt("skid", faces, { tone: "mid" }, { name: `skid.${name}`, shapes: boxes, extra: Dots([at([x0 + 3, front, topAt(x0) - 2]), at([x1 - 3, front, topAt(x1) - 2])], { size: 0.4 }) });
  };
  const flatPedestal = (name, x0, x1, top, half = 18) => {
    slabAt("skid", { x: x0, y: Y - half, w: x1 - x0, d: half * 2, r: 1.5 }, SKID_TOP, top - SKID_TOP, { tone: "mid" }, { name: `skid.${name}`, bevel: 0.6, steps: 3, extra: Dots([at([x0 + 3, Y + half - 2.6, top]), at([x1 - 3, Y + half - 2.6, top])], { size: 0.45 }) });
  };

  // ---- generator: stator frame between two end shields, cooler on top -----------------------------------------------
  const [g0, g1] = g.gen;
  const FRAME = { x: g0 + 12, y: Y - 34, w: g1 - g0 - 24, d: 68, r: 13 };
  slabAt("gen", FRAME, Z - 34, 68, { tone: "mid" }, {
    name: "gen.frame",
    bevel: 1,
    steps: 6,
    extra: [0.2, 0.5, 0.8].map((t) => Ln(k.sideSeam(FRAME, Z - 34 + 68 * t, P, 6), { tone: "faint" })).join(""),
  });
  for (const [x, flip] of [[g0, 1], [g1, -1]]) {
    const F = frameAt(x);
    const prof = flip > 0 ? [[0, 0], [0, 25], [2, 28], [12, 28], [12, 0]] : [[-12, 0], [-12, 28], [-2, 28], [0, 25], [0, 0]];
    turned("gen", F, prof, {}, {
      name: `gen.shield${flip}`,
      tone: "mid",
      inner: G.arcOf(F, flip > 0 ? 6 : -6, 28, P),
      extra: flip < 0 ? Dots(G.dotsOf(F, 0, 22, 14, P, { all: true }), { size: 0.4 }) : "",
    });
  }
  const COOLER = { x: g0 + 20, y: Y - 27, w: g1 - g0 - 40, d: 54, r: 3 };
  slabAt("gen", COOLER, Z + 34, 20, { tone: "hi" }, {
    name: "gen.cooler",
    bevel: 0.8,
    extra:
      Ln(k.planOutline(k.insetPlan(COOLER, 3), Z + 54, P, 3), { tone: "faint" }) +
      Ln([...Array(7)].map((_, i) => k.lineOnTop([COOLER.x + 9 + i * 7, COOLER.y + 3], [COOLER.x + 9 + i * 7, COOLER.y + COOLER.d - 3], Z + 54, P)).join(""), { tone: "lo" }),
  });
  slabAt("skid", { x: g0 + 22, y: Y - 22, w: g1 - g0 - 44, d: 44, r: 2 }, SKID_TOP, Z - 34 - SKID_TOP, { tone: "mid" }, { name: "skid.gen", bevel: 0.6, steps: 3 });
  const front = FRAME.y + FRAME.d;
  for (const t of [0.3, 0.68]) {
    const x = FRAME.x + FRAME.w * t - 11;
    const door = { x, y: front, w: 22, d: 0.9, r: 0.3 };
    slabAt("gen", door, Z - 20, 34, { tone: "lo" }, { name: "gen.door", bevel: 0.2, steps: 2, extra: Ln(k.lineOnTop([x + 3, front + 0.9], [x + 19, front + 0.9], Z + 14, P), { tone: "faint", free: true }) });
  }
  const EXF = frameAt(g0 - 20);
  turned("gen", EXF, [[0, 0], [0, 17], [20, 17], [20, 0]], {}, { name: "gen.exciter", tone: "mid", inner: [4, 10, 16].map((s) => G.arcOf(EXF, s, 17, P)).join("") });
  flatPedestal("exciter", g0 - 17, g0 - 3, Z - 17, 10);

  // ---- shaft and coupling between the generator and the inlet plenum ------------------------------------------------
  turned("gen", frameAt(g1), [[0, 0], [0, 10], [3, 10], [3, 0]], { tone: "hi" }, { name: "gen.shaft", bias: -0.5 });
  turned("gen", frameAt(g1 + 10), [[0, 0], [0, 10], [g.plenum[0] - g1 - 10, 10], [g.plenum[0] - g1 - 10, 0]], { tone: "hi" }, { name: "gen.shaft", bias: -0.5 });
  const CF = frameAt(g1 + 3);
  turned("gen", CF, [[0, 0], [0, 14], [7, 14], [7, 0]], { tone: "mid" }, { name: "gen.coupling", extra: spin({ kind: "dots", F: CF, s: 7, r: 12, count: 10, all: false, group: "gt" }).replace("cc-dot", "cc-dot cc-dot-hi"), bias: 0.2, inner: G.arcOf(CF, 3.5, 14, P) });

  // ---- inlet plenum: a box with an air duct rising to the filter house -------------------------------------------------
  const [p0, p1] = g.plenum;
  const PLEN = { x: p0, y: Y - 38, w: p1 - p0, d: 76, r: 9 };
  slabAt("intake", PLEN, Z - 38, 76, { tone: "mid" }, {
    name: "intake.plenum",
    bevel: 1,
    steps: 5,
    extra: Ln(k.sideSeam(PLEN, Z + 20, P, 5), { tone: "faint" }) + Ln(k.sideSeam(PLEN, Z - 20, P, 5), { tone: "faint" }),
  });
  flatPedestal("plenum", p0 + 8, p1 - 8, Z - 38, 20);
  const NECK = { x: p0 + 4, y: Y - 22, w: p1 - p0 - 8, d: 44, r: 4 };
  slabAt("intake", NECK, Z + 38, 20, { tone: "mid" }, { name: "intake.neck", bevel: 0.8, extra: Ln(k.planOutline(k.insetPlan(NECK, 2.5), Z + 58, P, 3), { tone: "faint" }) });
  const FH = L.FILTER;
  const DUCT = { x: p0 + 4, y: FH.y + FH.d, w: p1 - p0 - 8, d: Y + 22 - (FH.y + FH.d), r: 4 };
  slabAt("intake", DUCT, Z + 58, 26, { tone: "mid" }, {
    name: "intake.duct",
    bevel: 0.8,
    extra:
      Ln([0.15, 0.4, 0.65, 0.88].map((t) => k.lineOnTop([DUCT.x, DUCT.y + DUCT.d * t], [DUCT.x + DUCT.w, DUCT.y + DUCT.d * t], Z + 84, P)).join(""), { tone: "faint" }) +
      Dots([0.15, 0.4, 0.65, 0.88].flatMap((t) => [at([DUCT.x + 3, DUCT.y + DUCT.d * t + 1.5, Z + 84]), at([DUCT.x + DUCT.w - 3, DUCT.y + DUCT.d * t + 1.5, Z + 84])]), { size: 0.4 }),
  });

  // ---- filter house: louvered hoods on the two faces the viewer sees, a roof and a hatch --------------------------------------
  const FBASE = { x: FH.x - 4, y: FH.y - 4, w: FH.w + 8, d: FH.d + 8, r: 2 };
  slabAt("intake", FBASE, 0, 3, { tone: "lo" }, { name: "intake.filter-base", bevel: 0.6, steps: 3, extra: Dots(k.corners(FBASE, 4).map(([x, y]) => at([x, y, 3])), { size: 0.5 }) });
  const FPLAN = { x: FH.x, y: FH.y, w: FH.w, d: FH.d, r: 2 };
  const faceY = FH.y + FH.d;
  const faceX = FH.x + FH.w;
  const rows = [10, 36, 62, 88];
  slabAt("intake", FPLAN, 3, FH.h - 3, { tone: "mid" }, { name: "intake.filter", bevel: 0.8, steps: 3, extra: Ln(k.sideSeam(FPLAN, FH.h - 8, P, 3), { tone: "faint" }) });
  const hoodX = (z0) => polyAt("intake", prismAlong("x", [[faceY, z0], [faceY + 9, z0], [faceY + 9, z0 + 3], [faceY, z0 + 9]], FH.x + 4, FH.x + FH.w - 4), { tone: "mid" }, { name: "intake.hood" });
  const hoodY = (z0) => polyAt("intake", prismAlong("y", [[z0, faceX], [z0, faceX + 9], [z0 + 3, faceX + 9], [z0 + 9, faceX]], FH.y + 4, FH.y + FH.d - 4), { tone: "mid" }, { name: "intake.hood" });
  rows.forEach((z0) => { hoodX(z0 + 14); hoodY(z0 + 14); });
  slabAt("intake", { x: FH.x + 10, y: FH.y + 10, w: 30, d: 24, r: 2 }, FH.h, 8, { tone: "mid" }, { name: "intake.roofbox", bevel: 0.6, steps: 3, extra: Ln(k.planOutline(k.insetPlan({ x: FH.x + 10, y: FH.y + 10, w: 30, d: 24, r: 2 }, 2.5), FH.h + 8, P, 3), { tone: "faint" }) });

  // ---- compressor -------------------------------------------------------------------------------------------------------
  const [c0, c1] = g.comp;
  const FC = frameAt(c0);
  const rc = (s) => 35 - 7 * (s / (c1 - c0));
  const rings = [8, 28, 46, 62, 76];
  const compProfile = [[0, 0], [0, 33.5]];
  for (let i = 0; i <= 10; i++) {
    const s = (i / 10) * (c1 - c0);
    compProfile.push([s, rc(s)]);
  }
  compProfile.push([c1 - c0, 0]);
  const cav = (s0, s1, aMid, aHalf, name, stages, drum, tip0, tip1) => {
    const stage = stages.map((s, i) => {
      const t = i / (stages.length - 1);
      return spin({ kind: "spokes", F: FC, s, r0: drum(s), r1: tip0 + (tip1 - tip0) * t, count: 24, from: SEE[0], to: SEE[1], group: "gt" });
    });
    const rotor = S(G.solidOf([[s0 - 2, drum(s0)], [s1 + 2, drum(s1)]], FC, P), { tone: "hi" });
    return windowOn({ F: FC, s0, s1, r: (s) => rc(s) - 0.4, aMid, aHalf, name, content: rotor + stage.join("") });
  };
  const compWindow = cav(18, 70, 22 * DEG, 32 * DEG, "comp", Array.from({ length: 8 }, (_, i) => 22 + i * 6.4), (s) => 19 + s * 0.02, 29, 22);
  turned("comp", FC, compProfile, {}, { name: "comp.casing", tone: "mid", extra: compWindow + rings.map((s) => Ln(G.arcOf(FC, s, rc(s), P, { slope: -7 / (c1 - c0) }), { tone: "faint" })).join("") });
  pedestal("comp", c0 + 8, c1 - 8, (x) => rc(x - c0));

  // ---- combustor: outer casing with can covers and sight ports --------------------------------------------------------------
  const [b0, b1] = g.comb;
  const FB = frameAt(b0);
  const RB = 44;
  const combProfile = [[0, 0], [0, 38], [3, 42], [8, RB], [b1 - b0 - 8, RB], [b1 - b0 - 3, 42], [b1 - b0, 38], [b1 - b0, 0]];
  const combShape = turned("comb", FB, combProfile, {}, { name: "comb.casing", tone: "mid", inner: G.arcOf(FB, 8, RB, P) + G.arcOf(FB, b1 - b0 - 8, RB, P) });
  pedestal("comb", b0 + 8, b1 - 8, () => RB);
  const canS = 28;
  const canAngles = [-30, 0, 30, 60, 90, 120, 150].map((a) => a * DEG);
  C.cans = [];
  for (const a of canAngles) {
    const radial = G.radialOf(FB, a);
    const base = G.pointOf(FB, canS, RB, a);
    const top = padOn("comb", combShape, base, radial, 10.6, 3, { name: "comb.can-pad" });
    const CF2 = G.frameAlong(top, radial);
    const id = nameFor("comb.can");
    put("comb", G.add3(top, G.mul3(radial, 5)), S(G.disc(0, 9, 8.6, CF2, P), { tone: "mid" }) + Ln([2.5, 6.5].map((t) => G.arcOf(CF2, t, 8.6, P, { least: -1 })).join(""), { tone: "faint" }), { name: id, shapes: [record(A.disc(CF2, 0, 9, 8.6, { name: id }))], bias: 0.2 });
    const idc = nameFor("comb.can-cap");
    const capFace = G.dot3(radial, V) > 0.12 ? Dots(G.dotsOf(CF2, 11, 7.6, 8, P, { all: true }), { size: 0.4, tone: "mid" }) + Ln(G.circleOf(CF2, 11, 4.2, P, 16), { tone: "faint" }) : "";
    put("comb", G.add3(top, G.mul3(radial, 10)), S(G.disc(9, 11, 9.8, CF2, P), { tone: "hi" }) + capFace, { name: idc, shapes: [record(A.disc(CF2, 9, 11, 9.8, { name: idc }))], bias: 0.3 });
    C.cans.push({ a, radial, capTop: G.add3(top, G.mul3(radial, 11)) });
  }
  const portS = b1 - b0 - 12;
  C.ports = [];
  for (const a of [10, 55, 100].map((v) => v * DEG)) {
    const radial = G.radialOf(FB, a);
    const base = G.pointOf(FB, portS, RB, a);
    const top = padOn("comb", combShape, base, radial, 6.4, 2.4, { name: "comb.port-pad" });
    const PF = G.frameAlong(top, radial);
    const id = nameFor("comb.port");
    const glass = at(G.add3(top, G.mul3(radial, 2.4)));
    const visible = G.dot3(radial, V) > 0.1;
    const rim = visible ? Ln(G.circleOf(PF, 2.4, 4.4, P, 18), { tone: "lo" }) : "";
    const glow = visible ? `<circle class="cc-port-glow" cx="${glass[0].toFixed(2)}" cy="${glass[1].toFixed(2)}" r="${(3.6 * C.KS).toFixed(2)}"/>` : "";
    put("comb", G.add3(top, G.mul3(radial, 1.5)), S(G.disc(0, 2.4, 6.4, PF, P), { tone: "hi" }) + rim + glow, { name: id, shapes: [record(A.disc(PF, 0, 2.4, 6.4, { name: id }))], bias: 0.3 });
    C.ports.push({ at: glass });
  }

  // ---- turbine ------------------------------------------------------------------------------------------------------------
  const [t0, t1] = g.turb;
  const FT = frameAt(t0);
  const rt = (s) => 40 + 11 * (s / (t1 - t0));
  const turbProfile = [[0, 0], [0, 38]];
  for (let i = 0; i <= 8; i++) {
    const s = (i / 8) * (t1 - t0);
    turbProfile.push([s, rt(s)]);
  }
  turbProfile.push([t1 - t0, 0]);
  const turbRotor = S(G.solidOf([[16, 18], [66, 20]], FT, P), { tone: "hi" });
  const turbBlades = [24, 38, 52, 64].map((s, i) => spin({ kind: "spokes", F: FT, s, r0: 18 + i * 0.5, r1: 32 + i * 2.5, count: 24, from: SEE[0], to: SEE[1], group: "gt" }));
  const turbWindow = windowOn({ F: FT, s0: 12, s1: 70, r: (s) => rt(s) - 0.4, aMid: 20 * DEG, aHalf: 30 * DEG, name: "turb", content: turbRotor + turbBlades.join("") });
  turned("turb", FT, turbProfile, {}, { name: "turb.casing", tone: "mid", extra: turbWindow, inner: [5, 77].map((s) => G.arcOf(FT, s, rt(s), P, { slope: 11 / (t1 - t0) })).join("") });
  pedestal("turb", t0 + 8, t1 - 8, (x) => rt(x - t0));

  // ---- exhaust diffuser, expansion joint, and the transition box that meets the boiler ----------------------------------------------
  const [d0, d1] = g.diffuser;
  const FD = frameAt(d0);
  const rdEnd = 52;
  const dLen = d1 - d0 - 14;
  turned("diffuser", FD, [[0, 0], [0, 51], [dLen, rdEnd], [dLen, 0]], {}, { name: "diffuser.cone", tone: "mid", inner: G.arcOf(FD, 20, 51 + (rdEnd - 51) * (20 / dLen), P, { slope: (rdEnd - 51) / dLen }) });
  pedestal("diffuser", d0 + 6, d0 + 40, (x) => 51 + ((rdEnd - 51) * (x - d0)) / dLen);
  const FJ = frameAt(d1 - 14);
  const joint = [[0, 0], [0, rdEnd]];
  for (let i = 0; i < 5; i++) joint.push([2 + i * 2.6, rdEnd], [2 + i * 2.6, 56], [3.6 + i * 2.6, 56], [3.6 + i * 2.6, rdEnd]);
  joint.push([14, rdEnd], [14, 0]);
  turned("diffuser", FJ, joint, {}, { name: "diffuser.joint", tone: "lo" });
  const H = L.HRSG;
  const tbx0 = g.transition[0];
  const tbx1 = g.transition[1];
  polyAt("diffuser", frustum(tbx0, [Y - 56, Y + 56, 6.5, Z + 56], tbx1, [H.y0, H.y1, 6.5, 170]), { tone: "mid" }, {
    name: "diffuser.transition",
    extra:
      Ln([0.33, 0.66].map((t) => {
        const x = tbx0 + (tbx1 - tbx0) * t;
        const yy = Y + 56 + (H.y1 - (Y + 56)) * t;
        const zt = Z + 56 + (170 - (Z + 56)) * t;
        const zb = 6.5;
        return k.segment([x, yy, zb], [x, yy, zt], P);
      }).join(""), { tone: "faint" }),
  });
  void cylAt;
}
