import * as L from "../layout.mjs";

const DEG = Math.PI / 180;

// Steam-turbine train on its table-top pedestal, with the surface condenser underneath.
export function steamTurbine(C) {
  const { k, G, A, P, V, KS, at, S, Ln, Dots, put, turned, band, slabAt, cylAt, spin, windowOn, faceWindowX, faceWindowY, padOn, record, nameFor, ballAt } = C;
  const Y = L.ST_Y;
  const Z = L.ST_Z;
  const st = L.ST;
  const frameAt = (x) => G.frameOf([x, Y, Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const SEE = [-70 * DEG, 140 * DEG];
  const DECK = L.DECK_Z;

  // ---- pedestal: a deck on columns, open under the turbine so the condenser shows -------------------
  const X0 = st.hp[0] - 12;
  const X1 = st.gen[1] + 22;
  const DY = 40;
  const neckX = [L.CONDENSER.x + 8, L.CONDENSER.x + L.CONDENSER.w - 8];
  const deckPieces = [[X0, neckX[0]], [neckX[1], X1]];
  for (const [a, b] of deckPieces) {
    slabAt("steam", { x: a, y: Y - DY, w: b - a, d: DY * 2, r: 3 }, DECK - 8, 8, { tone: "lo" }, {
      name: "steam.deck",
      bevel: 1,
      extra: Ln(k.planOutline(k.insetPlan({ x: a, y: Y - DY, w: b - a, d: DY * 2, r: 3 }, 3), DECK, P, 3), { tone: "faint" }),
    });
  }
  for (const [a, b] of [[neckX[0], neckX[1]]]) {
    for (const yy of [Y - DY, Y + DY - 8]) slabAt("steam", { x: a, y: yy, w: b - a, d: 8, r: 1 }, DECK - 8, 8, { tone: "lo" }, { name: "steam.deck-beam", bevel: 0.6, steps: 2 });
  }
  const colXs = [X0 + 8, L.CONDENSER.x - 8, L.CONDENSER.x + L.CONDENSER.w + 8, X1 - 16];
  for (const x of colXs) for (const yy of [Y - DY + 2, Y + DY - 10]) slabAt("steam", { x: x - 4, y: yy, w: 8, d: 8, r: 1 }, 0, DECK - 8, { tone: "mid" }, { name: "steam.column", bevel: 0.5, steps: 2 });

  // ---- high-pressure / intermediate casing ------------------------------------------------------------------
  const [h0, h1] = st.hp;
  const FH = frameAt(h0);
  const hp = [[0, 0], [0, 17], [2, 21], [9, 22], [h1 - h0 - 9, 22], [h1 - h0 - 2, 21], [h1 - h0, 17], [h1 - h0, 0]];
  turned("steam", FH, hp, {}, { name: "steam.hp", tone: "mid", inner: [9, h1 - h0 - 9].map((s) => G.arcOf(FH, s, 22, P)).join("") });
  slabAt("steam", { x: h0 + 8, y: Y - 12, w: 30, d: 24, r: 3 }, Z + 22, 14, { tone: "hi" }, { name: "steam.chest", bevel: 0.7, extra: Ln(k.planOutline(k.insetPlan({ x: h0 + 8, y: Y - 12, w: 30, d: 24, r: 3 }, 2.5), Z + 36, P, 3), { tone: "faint" }) });
  for (const x of [h0 + 12, h0 + 34]) cylAt("steam", x, Y, 3.4, Z + 36, 10, { tone: "mid" }, { name: "steam.valve", bevel: 0.4, steps: 16 });

  // ---- low-pressure casing: a rounded box with a window onto the double-flow rotor ---------------------------------------
  const [l0, l1] = st.lp;
  const LPP = { x: l0 + 4, y: Y - 34, w: l1 - l0 - 8, d: 68, r: 10 };
  const FL = frameAt(0);
  const LPZ0 = DECK;
  const rotorL = S(G.solidOf([[l0 - 2, 14], [l1 + 2, 14]], FL, P), { tone: "hi" });
  const blades = [];
  for (let i = 0; i < 6; i++) {
    for (const side of [-1, 1]) {
      const x = (l0 + l1) / 2 + side * (8 + i * 9.5);
      blades.push(spin({ kind: "spokes", F: FL, s: x, r0: 14, r1: 18 + i * 3.2, count: 22, from: SEE[0], to: SEE[1] }));
    }
  }
  const lpWindow = faceWindowY({ y: LPP.y + LPP.d, x0: l0 + 14, x1: l1 - 14, z0: LPZ0 + 12, z1: Z + 24, round: 3, name: "lp", content: rotorL + blades.join("") });
  slabAt("steam", LPP, LPZ0, 72, { tone: "mid" }, {
    name: "steam.lp",
    bevel: 1,
    steps: 6,
    extra: lpWindow + [0.18, 0.82].map((t) => Ln(k.sideSeam(LPP, LPZ0 + 72 * t, P, 6), { tone: "faint" })).join(""),
  });
  // exhaust neck down to the condenser
  slabAt("steam", { x: neckX[0] + 4, y: Y - 30, w: neckX[1] - neckX[0] - 8, d: 60, r: 3 }, L.CONDENSER.z1, LPZ0 - L.CONDENSER.z1, { tone: "mid" }, { name: "steam.neck", bevel: 0.6, steps: 3 });
  // crossover from the high-pressure casing to the middle of the low-pressure casing
  const cx = (l0 + l1) / 2;
  void cx;

  // ---- generator -----------------------------------------------------------------------------------------
  const [g0, g1] = st.gen;
  const GF = { x: g0 + 10, y: Y - 30, w: g1 - g0 - 20, d: 60, r: 11 };
  slabAt("steamgen", GF, Z - 30, 60, { tone: "mid" }, { name: "steamgen.frame", bevel: 1, steps: 6, extra: [0.25, 0.55, 0.85].map((t) => Ln(k.sideSeam(GF, Z - 30 + 60 * t, P, 6), { tone: "faint" })).join("") });
  const GC = { x: g0 + 20, y: Y - 22, w: g1 - g0 - 40, d: 44, r: 3 };
  slabAt("steamgen", GC, Z + 30, 16, { tone: "hi" }, { name: "steamgen.cooler", bevel: 0.8, extra: Ln(k.planOutline(k.insetPlan(GC, 3), Z + 46, P, 3), { tone: "faint" }) });
  for (const [x, flip] of [[g0, 1], [g1, -1]]) {
    const F = frameAt(x);
    const prof = flip > 0 ? [[0, 0], [0, 22], [2, 25], [10, 25], [10, 0]] : [[-10, 0], [-10, 25], [-2, 25], [0, 22], [0, 0]];
    turned("steamgen", F, prof, {}, { name: `steamgen.shield${flip}`, tone: "mid", inner: G.arcOf(F, flip > 0 ? 5 : -5, 25, P) });
  }
  const EXF = frameAt(g1);
  turned("steamgen", EXF, [[0, 0], [0, 15], [18, 15], [18, 0]], {}, { name: "steamgen.exciter", tone: "mid", inner: [4, 9, 14].map((s) => G.arcOf(EXF, s, 15, P)).join("") });

  // ---- shafts between the casings -----------------------------------------------------------------------------
  turned("steam", frameAt(h1), [[0, 0], [0, 9], [l0 - h1 + 4, 9], [l0 - h1 + 4, 0]], { tone: "hi" }, { name: "steam.shaft1", bias: -0.5 });
  turned("steam", frameAt(l1 - 4), [[0, 0], [0, 9], [g0 - l1 + 8, 9], [g0 - l1 + 8, 0]], { tone: "hi" }, { name: "steam.shaft2", bias: -0.5 });
  void G; void band; void padOn; void record; void V; void KS; void ballAt; void windowOn; void Dots;

  // ---- surface condenser under the low-pressure casing ------------------------------------------------------------------
  const c = L.CONDENSER;
  const CS = { x: c.x, y: c.y, w: c.w, d: c.d, r: 3 };
  const bundle = [];
  for (let row = 0; row < 7; row++) bundle.push(k.segment([c.x + c.w, c.y + 8, c.z0 + 10 + row * 5.2], [c.x + c.w, c.y + c.d - 8, c.z0 + 10 + row * 5.2], P));
  const tubesWin = faceWindowX({ x: c.x + c.w, y0: c.y + 8, y1: c.y + c.d - 8, z0: c.z0 + 6, z1: c.z1 - 6, round: 2, content: Ln(bundle.join(""), { tone: "lo" }), name: "cond" });
  slabAt("condenser", CS, c.z0, c.z1 - c.z0, { tone: "mid" }, { name: "condenser.shell", bevel: 0.8, steps: 4, extra: tubesWin });
  // base pad, water boxes with their nozzle faces, and the ports the pipes land on
  slabAt("condenser", { x: c.x - 6, y: c.y - 6, w: c.w + 12, d: c.d + 12, r: 2 }, 0, c.z0, { tone: "lo" }, { name: "condenser.pad", bevel: 0.6, steps: 3 });
  const wbF = { x: c.x + 3, y: c.y + c.d, w: c.w - 6, d: 14, r: 7 };
  const wbB = { x: c.x + 3, y: c.y - 14, w: c.w - 6, d: 14, r: 7 };
  const wbExtra = (plan, face) => Ln(k.sideSeam(plan, c.z0 + 8, P, 4), { tone: "faint" }) + Ln(k.sideSeam(plan, c.z1 - 8, P, 4), { tone: "faint" }) + (face ? Dots([...Array(5)].flatMap((_, i) => [at([plan.x + 12 + (i * (plan.w - 24)) / 4, plan.y + plan.d, c.z0 + 4]), at([plan.x + 12 + (i * (plan.w - 24)) / 4, plan.y + plan.d, c.z1 - 4])]), { size: 0.45 }) : "");
  slabAt("condenser", wbF, c.z0 + 2, c.z1 - c.z0 - 4, { tone: "hi" }, { name: "condenser.waterbox", bevel: 0.8, steps: 6, extra: wbExtra(wbF, true) });
  slabAt("condenser", wbB, c.z0 + 2, c.z1 - c.z0 - 4, { tone: "hi" }, { name: "condenser.waterbox", bevel: 0.8, steps: 6, extra: wbExtra(wbB, false) });
  const faceY = wbF.y + wbF.d;
  C.condenser = { hotwellOut: [c.x + c.w, c.y + c.d / 2, 10.4], inlet: [c.x + 20, faceY, c.z0 + 14], outlet: [c.x + c.w - 20, faceY, c.z1 - 14] };
}
