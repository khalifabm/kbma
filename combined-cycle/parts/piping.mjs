import * as L from "../layout.mjs";

const DEG = Math.PI / 180;

// All the pipework. Every route is listed in the order the fluid flows, so the dash trains run the right way.
export function piping(C) {
  const { k, G, A, P, V, at, S, Ln, Dots, put, pipe, tubeItems, slabAt, ballAt, record, nameFor } = C;
  const top = (drum, x) => C.drums[drum][`n${x}`];
  const HP = C.drums.hp;
  const LP = C.drums.lp;
  const sl = C.sleeves;

  // ---- boiler roof loops: drum feed, evaporator risers, steam to the superheater ---------------------------------------------
  const loop = (name, from, to, zHigh, y0 = -42, y1 = -80, r = 2.2, flow = "water") =>
    pipe("drum", [from, [from[0], y0, zHigh], [to[0], y1, zHigh], to], r, { name: `drum.${name}`, tone: "mid", flow, maxLength: 20, bend: 2.4 });
  loop("hp-feed", sl["ec-hp"], top("hp", 256), 222);
  loop("hp-riser", sl["ev-hp"], top("hp", 222), 216);
  pipe("drum", [top("hp", 198), [198, -80, 232], [178, -80, 232], [178, -42, 232], sl["sh-in"]], 2.6, { name: "drum.hp-steam", tone: "hi", flow: "steam", maxLength: 20, bend: 2.4 });
  loop("lp-feed", sl["pre-out"], top("lp", 330), 214);
  loop("lp-riser", sl["ev-lp"], top("lp", 300), 208);

  // ---- main steam to the steam turbine (high pressure) and low-pressure steam to its casing -----------------------------------------
  pipe("steam", [sl["sh-out"], [188, -42, 198], [188, -10, 198], [188, -10, 64], [188, 40, 64], [-17, 40, 64], [-17, 40, 170], [-17, 176, 170], [-17, 176, 136]], 3.4, { name: "steam.main", tone: "hi", flow: "steam", maxLength: 24, bend: 2.6, bands: [0.2, 0.55, 0.8] });
  pipe("steam", [top("lp", 284), [284, -80, 236], [284, -10, 236], [284, -10, 80], [284, 24, 80], [57, 24, 80], [57, 24, 160], [57, 176, 160], [57, 176, 136]], 3.0, { name: "steam.low", tone: "hi", flow: "steam", maxLength: 24, bend: 2.6, bands: [0.25, 0.6] });

  // ---- condensate and feed water: condenser to pumps, pumps to the cold ends of the boiler -------------------------------------------
  const [cp, fp] = C.pumps;
  const cd = C.condenser;
  pipe("pumps", [cd.hotwellOut, [cp.x, cd.hotwellOut[1], cd.hotwellOut[2]], [cp.x, cp.suction[1], cp.suction[2]]], 2.8, { name: "pumps.suction", tone: "mid", flow: "water", maxLength: 24 });
  pipe("pumps", [cp.discharge, [cp.x, cp.discharge[1], 34], [cp.x, -8, 34], [345, -8, 34], [345, -8, 9.4], [345, -146, 9.4]], 2.4, { name: "pumps.condensate", tone: "mid", flow: "water", maxLength: 24, flanges: [true, false] });
  pipe("pumps", [fp.discharge, [fp.x, fp.discharge[1], 44], [fp.x, 4, 44], [261, 4, 44], [261, 4, 9.4], [261, -146, 9.4]], 2.4, { name: "pumps.feed", tone: "mid", flow: "water", maxLength: 24, flanges: [true, false] });

  // ---- fuel gas to the combustor ring ---------------------------------------------------------------------------------------------------
  const FB = G.frameOf([-118, L.GT_Y, L.GT_Z], [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const RING_R = 64.5;
  const RING_S = 28;
  const ringPoints = G.arcPoints(FB, RING_S, RING_R, -35 * DEG, 155 * DEG, 40);
  const arcLen = G.pathLength(ringPoints);
  const teeAt = (RING_R * 35 * DEG);
  const TEE_R = 4.2;
  const gap = Math.sqrt(TEE_R ** 2 - 2.4 ** 2);
  tubeItems("fuel", ringPoints, 2.4, { name: "fuel.ring", tone: "mid", flow: "fuel", maxLength: 16, spacing: 1.6, gaps: [[teeAt - gap, teeAt + gap]] });
  const teeCentre = G.pointOf(FB, RING_S, RING_R, 0);
  ballAt("fuel", teeCentre, TEE_R, { tone: "hi", name: "fuel.tee" });
  void arcLen;
  const fuelRim = Math.sqrt(TEE_R ** 2 - 2.8 ** 2);
  pipe("fuel", [[-170, 24, 17], [-170, 24, L.GT_Z], [teeCentre[0], 24, L.GT_Z], [teeCentre[0], teeCentre[1] + fuelRim, L.GT_Z]], 2.8, { name: "fuel.feed", tone: "mid", flow: "fuel", maxLength: 24, bend: 2.4, flanges: [true, false] });

  // ---- cooling water between the condenser and the tower ---------------------------------------------------------------------------------------
  const tw = C.tower;
  pipe("tower", [tw.coldStart, [tw.coldStart[0], 240, tw.coldStart[2]], [cd.inlet[0], 240, tw.coldStart[2]], [cd.inlet[0], 240, cd.inlet[2]], cd.inlet], 5, { name: "tower.cold", tone: "hi", flow: "cool", maxLength: 30, bend: 2.6 });
  pipe("tower", [cd.outlet, [cd.outlet[0], 256, cd.outlet[2]], [tw.hotEnd[0], 256, cd.outlet[2]], [tw.hotEnd[0], 256, 80], [tw.hotEnd[0], tw.hotEnd[1], 80], tw.hotEnd], 5, { name: "tower.hot", tone: "hi", flow: "cool", maxLength: 30, bend: 2.6, flangeR: [1.55, 0.95] });
  void k; void A; void V; void at; void S; void Ln; void Dots; void put; void slabAt; void record; void nameFor;
}
