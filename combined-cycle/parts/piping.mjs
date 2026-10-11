import * as L from "../layout.mjs";

const DEG = Math.PI / 180;

// All the pipework. Every route is listed in the order the fluid flows, so the dash trains run the right way.
export function piping(C) {
  const { G, A, P, S, Ln, put, pipe, tubeItems, ballAt, record, nameFor } = C;
  const top = (drum, x) => C.drums[drum][`n${x}`];
  const sl = C.sleeves;

  // ---- boiler roof loops: drum feed, evaporator risers, steam to the superheater ---------------------------------------------
  const loop = (name, from, to, zHigh, r = 2.2, flow = "water") =>
    pipe("drum", [from, [from[0], from[1], zHigh], [to[0], to[1], zHigh], to], r, { name: `drum.${name}`, tone: "mid", flow, maxLength: 20, bend: 4.4 });
  loop("hp-feed", sl["ec-hp"], top("hp", 252), 238);
  loop("hp-riser", sl["ev-hp"], top("hp", 224), 232);
  pipe("drum", [top("hp", 194), [194, -80, 244], [174, -80, 244], [174, -42, 244], sl["sh-in"]], 2.6, { name: "drum.hp-steam", tone: "hi", flow: "steam", maxLength: 20, bend: 4.4 });
  loop("lp-feed", sl["pre-out"], top("lp", 330), 226);
  loop("lp-riser", sl["ev-lp"], top("lp", 304), 232);

  // ---- main steam to the steam turbine (high pressure) and low-pressure steam to its casing -----------------------------------------
  pipe("steam", [sl["sh-out"], [188, -42, 244], [188, 2, 244], [188, 2, 64], [188, 40, 64], [-17, 40, 64], [-17, 40, 170], [-17, 176, 170], [-17, 176, 136]], 3.4, { name: "steam.main", tone: "hi", flow: "steam", maxLength: 24, bend: 7.4, bands: [0.2, 0.8], touch: ["steam.rack*"], valves: [{ near: [100, 40, 64], kind: "box" }] });
  pipe("steam", [top("lp", 282), [282, -80, 250], [282, -10, 250], [282, -10, 80], [282, 30, 80], [57, 30, 80], [57, 30, 160], [57, 176, 160], [57, 176, 136]], 3.0, { name: "steam.low", tone: "hi", flow: "steam", maxLength: 24, bend: 4.4, bands: [0.25], touch: ["steam.rack*"], valves: [{ near: [190, 30, 80], kind: "wheel" }] });

  // ---- condensate and feed water: condenser to pumps, pumps to the cold ends of the boiler -------------------------------------------
  const [cp, fp] = C.pumps;
  const cd = C.condenser;
  const WALL = L.HRSG.y0 + 3; // the header ends on the inner face of the back wall
  pipe("pumps", [cd.hotwellOut, [cp.x, cd.hotwellOut[1], cd.hotwellOut[2]], cp.suction.slice(0, 3).map((v, i) => (i === 0 ? cp.x : v))], 2.8, { name: "pumps.suction", tone: "mid", flow: "water", maxLength: 24 });
  pipe("pumps", [cp.discharge, [cp.x, cp.discharge[1], 40], [cp.x, -12, 40], [345, -12, 40], [345, -12, 10.4], [345, WALL, 10.4]], 2.4, { name: "pumps.condensate", tone: "mid", flow: "water", maxLength: 24, bend: 3.4, flanges: [true, false], touch: ["pumps.rack*"], valves: [{ near: [cp.x, 60, 40], kind: "wheel" }] });
  pipe("pumps", [fp.discharge, [fp.x, fp.discharge[1], 50], [fp.x, 10, 50], [261, 10, 50], [261, 10, 10.4], [261, WALL, 10.4]], 2.4, { name: "pumps.feed", tone: "mid", flow: "water", maxLength: 24, bend: 3.4, flanges: [true, false], valves: [{ near: [fp.x, 66, 50], kind: "box" }] });

  // ---- fuel gas to the combustor: a manifold carried on the can covers, a ball tee over each, and a feed from the skid -----------------
  const FB = G.frameOf([L.GT.comb[0], L.GT_Y, L.GT_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const RING_R = 64.5;
  const RING_S = 28;
  const TEE_R = 4.2;
  const R_TUBE = 2.4;
  const cans = C.cans;
  const a0 = cans[0].a;
  const a1 = cans[cans.length - 1].a;
  const gap = Math.sqrt(TEE_R ** 2 - R_TUBE ** 2);
  const trim = gap / RING_R;
  const ringPoints = G.arcPoints(FB, RING_S, RING_R, a0 + trim, a1 - trim, 48);
  const total = G.pathLength(ringPoints);
  const gaps = cans.slice(1, -1).map((can) => {
    const at = RING_R * (can.a - a0 - trim);
    return [at - gap, at + gap];
  });
  tubeItems("fuel", ringPoints, R_TUBE, { name: "fuel.ring", tone: "mid", flow: "fuel", maxLength: 16, spacing: 1.6, gaps, touch: ["fuel.tee*", "fuel.stem*"] });
  void total;
  const STEM_R = 1.6;
  for (const can of cans) {
    const centre = G.pointOf(FB, RING_S, RING_R, can.a);
    ballAt("fuel", centre, TEE_R, { tone: "hi", name: "fuel.tee" });
    const rimFromCentre = Math.sqrt(TEE_R ** 2 - STEM_R ** 2);
    const capRadial = G.len3(G.sub3(can.capTop, G.pointOf(FB, RING_S, 0, 0)));
    const SF = G.frameAlong(can.capTop, can.radial);
    const length = RING_R - rimFromCentre - capRadial;
    const id = nameFor("fuel.stem");
    put("fuel", G.add3(can.capTop, G.mul3(can.radial, length / 2)), S(G.disc(0, length, STEM_R, SF, P), { tone: "mid" }), { name: id, shapes: [record(A.disc(SF, 0, length, STEM_R, { name: id }))], bias: 0.4 });
  }
  const feedTee = G.pointOf(FB, RING_S, RING_R, 0);
  const fuelRim = Math.sqrt(TEE_R ** 2 - 2.8 ** 2);
  pipe("fuel", [[-170, 24, 17], [-170, 24, L.GT_Z], [feedTee[0], 24, L.GT_Z], [feedTee[0], feedTee[1] + fuelRim, L.GT_Z]], 2.8, { name: "fuel.feed", tone: "mid", flow: "fuel", maxLength: 24, bend: 3.4, flanges: [true, false], touch: ["fuel.ring*", "fuel.tee*", "fuel.rack*"], valves: [{ near: [-140, 24, L.GT_Z], kind: "box" }] });

  // ---- cooling water between the condenser and the tower ---------------------------------------------------------------------------------------
  const tw = C.tower;
  pipe("tower", [tw.coldStart, [tw.coldStart[0], 250, tw.coldStart[2]], [cd.inlet[0] - 2, 250, tw.coldStart[2]], [cd.inlet[0] - 2, 250, cd.inlet[2]], [cd.inlet[0] - 2, cd.inlet[1], cd.inlet[2]]], 5, { name: "tower.cold", tone: "hi", flow: "cool", maxLength: 30, bend: 2.6, touch: ["tower.sleeper*"], valves: [{ near: [150, 250, tw.coldStart[2]], kind: "box" }] });
  const hot = tw.hotEnd;
  pipe("tower", [cd.outlet, [cd.outlet[0], 252, cd.outlet[2]], [cd.outlet[0] + 20, 272, cd.outlet[2]], [hot[0], 272, cd.outlet[2]], [hot[0], 272, 66], [hot[0], 258, 80], [hot[0], hot[1] + 6, 80]], 5, { name: "tower.hot", tone: "hi", flow: "cool", maxLength: 30, bend: 4.4, flangeR: [1.55, 0.95], touch: ["tower.rack*"], valves: [{ near: [200, 272, cd.outlet[2]], kind: "box" }] });

  // ---- pipe supports: rack posts under the long runs ------------------------------------------------------------------------------------------
  for (const x of [160, 40]) C.supportAt("steam", [x, 40, 64], 3.4, { axis: "x", name: "steam.rack" });
  for (const x of [250, 112]) C.supportAt("steam", [x, 30, 80], 3.0, { axis: "x", name: "steam.rack" });
  for (const x of [200, 100, 20]) C.supportAt("tower", [x, 250, tw.coldStart[2]], 5, { axis: "x", name: "tower.sleeper", wide: 14 });
  for (const x of [160, 240]) C.supportAt("tower", [x, 272, cd.outlet[2]], 5, { axis: "x", name: "tower.rack", wide: 14 });
  for (const y of [30, 8]) C.supportAt("pumps", [cp.x, y, 40], 2.4, { axis: "y", name: "pumps.rack", wide: 8 });
  for (const x of [-150, -110]) C.supportAt("fuel", [x, 24, L.GT_Z], 2.8, { axis: "x", name: "fuel.rack", wide: 8 });
}
