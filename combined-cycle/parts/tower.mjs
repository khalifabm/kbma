import * as L from "../layout.mjs";

const DEG = Math.PI / 180;

// Mechanical-draft cooling tower: a basin, two louvered cells with fans on their decks, and the pumps that return the cold water.
export function coolingTower(C) {
  const { k, G, A, P, V, KS, at, S, Ln, Dots, put, slabAt, cylAt, spin, record, nameFor, turned } = C;
  const T = L.TOWER;
  const BASE_H = 6;
  const CELL_H = 50;
  const DECK_Z = BASE_H + CELL_H;
  const BASIN = { x: T.x, y: T.y, w: T.w, d: T.d, r: 3 };
  slabAt("tower", BASIN, 0, BASE_H, { tone: "lo" }, {
    name: "tower.basin",
    bevel: 1,
    extra: Ln(k.planOutline(k.insetPlan(BASIN, 3), BASE_H, P, 3), { tone: "faint" }) + Dots(k.corners(BASIN, 6).map(([x, y]) => at([x, y, BASE_H])), { size: 0.5 }),
  });
  C.cells = [];
  const cellW = (T.w - 12) / 2;
  for (let c = 0; c < 2; c++) {
    const plan = { x: T.x + 4 + c * (cellW + 4), y: T.y + 4, w: cellW, d: T.d - 8, r: 2 };
    // louvered casing: horizontal slats on the two faces the viewer sees
    const louvres = [];
    for (let i = 0; i < 13; i++) {
      const z = BASE_H + 5 + i * 3.4;
      louvres.push(k.segment([plan.x, plan.y + plan.d, z], [plan.x + plan.w, plan.y + plan.d, z], P));
      if (c === 1) louvres.push(k.segment([plan.x + plan.w, plan.y, z], [plan.x + plan.w, plan.y + plan.d, z], P));
    }
    const posts = [];
    for (let i = 1; i < 4; i++) {
      const x = plan.x + (plan.w * i) / 4;
      posts.push(k.segment([x, plan.y + plan.d, BASE_H], [x, plan.y + plan.d, BASE_H + CELL_H], P));
    }
    if (c === 1) for (let i = 1; i < 4; i++) {
      const y = plan.y + (plan.d * i) / 4;
      posts.push(k.segment([plan.x + plan.w, y, BASE_H], [plan.x + plan.w, y, BASE_H + CELL_H], P));
    }
    slabAt("tower", plan, BASE_H, CELL_H, { tone: "mid" }, { name: "tower.cell", bevel: 0.8, steps: 3, extra: Ln(louvres.join(""), { tone: "lo" }) + Ln(posts.join(""), { tone: "faint" }) });
    // deck
    const deck = { ...plan, x: plan.x - 1, y: plan.y - 1, w: plan.w + 2, d: plan.d + 2 };
    slabAt("tower", deck, DECK_Z, 3, { tone: "mid" }, {
      name: "tower.deck",
      bevel: 0.6,
      steps: 3,
      extra: Ln(k.planOutline(k.insetPlan(deck, 4), DECK_Z + 3, P, 3), { tone: "faint" }),
    });
    // fan stack: an open ring with a dark throat and a spinning fan inside
    const cx = plan.x + plan.w / 2;
    const cy = plan.y + plan.d / 2;
    const SF = G.frameOf([cx, cy, DECK_Z + 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    const stackH = 13;
    const rr = 19;
    const fan = [
      spin({ kind: "spokes", F: G.frameOf([cx, cy, DECK_Z + 3 + stackH - 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]), s: 0, r0: 3.4, r1: rr - 1.2, count: 8, group: "fan", sweep: 0.5, rate: 1 }),
    ].join("");
    const throat = `<path class="cc-cavity" d="${G.circleOf(SF, stackH, rr - 0.8, P, 40)}"/>`;
    const hub = Ln(G.circleOf(G.frameOf([cx, cy, DECK_Z + 3 + stackH - 3], [0, 0, 1], [1, 0, 0], [0, 1, 0]), 0, 3.4, P, 14), { tone: "mid" });
    const ring = G.ringBand(0, stackH, rr - 0.8, rr + 1.4, SF, P, {});
    const id = nameFor("tower.fan");
    put("tower", [cx, cy, DECK_Z + 3 + stackH / 2], S(ring, { tone: "mid" }) + throat + fan + hub, { name: id, shapes: [record(A.disc(SF, 0, stackH, rr + 1.4, { name: id }))], bias: 0.2 });
    // handrail round the deck, on posts
    const rail = k.insetPlan(deck, 1.6);
    const railPts = [];
    for (let i = 0; i < 4; i++) railPts.push(i);
    const posts2 = k.corners(deck, 1.6);
    for (const [x, y] of posts2) cylAt("tower", x, y, 0.55, DECK_Z + 3, 8, { tone: "mid", crease: "none" }, { name: "tower.post", steps: 8 });
    const railId = nameFor("tower.rail");
    const railRing = k.ringOf(rail, 3).map(([x, y]) => [x, y, DECK_Z + 11]);
    put("tower", [deck.x + deck.w / 2, deck.y + deck.d / 2, DECK_Z + 11], Ln(k.planOutline(rail, DECK_Z + 11, P, 3), { tone: "mid" }), { name: railId, bias: 0.3, shapes: [record(A.tube([...railRing, railRing[0]], 0.3, { name: railId, limp: true }))] });
    C.cells.push({ cx, cy, z: DECK_Z + 3 + stackH, r: rr });
  }

  // hot-water distribution box on the first deck, and the circulating-water pump house in front of the basin
  const c0 = C.cells[0];
  const dist = { x: T.x + 5, y: c0.cy - 6, w: 12, d: 12, r: 1.5 };
  slabAt("tower", dist, DECK_Z + 3, 26, { tone: "hi" }, { name: "tower.distribution", bevel: 0.5, steps: 2, extra: Dots(k.corners(dist, 2).map(([x, y]) => at([x, y, DECK_Z + 29])), { size: 0.4 }) + Ln(k.sideSeam(dist, DECK_Z + 16, P, 2), { tone: "faint" }) });
  const HOUSE = { x: T.x - 36, y: T.y + T.d - 44, w: 30, d: 26, r: 2 };
  slabAt("tower", HOUSE, 0, 16, { tone: "mid" }, { name: "tower.pumphouse", bevel: 0.7, steps: 3, extra: Ln(k.planOutline(k.insetPlan(HOUSE, 2.5), 16, P, 3), { tone: "faint" }) });
  [[HOUSE.x + 8, HOUSE.y + 8], [HOUSE.x + 21, HOUSE.y + 8], [HOUSE.x + 8, HOUSE.y + 19], [HOUSE.x + 21, HOUSE.y + 19]].slice(0, 2).forEach(([x, y]) => {
    const F = G.frameOf([x, y + 3, 16], [0, 0, 1], [1, 0, 0], [0, 1, 0]);
    turned("tower", F, [[0, 0], [0, 5.4], [1, 6, 1], [3, 6.2, 1], [14, 6.2, 1], [15, 6, 1], [17, 5.4], [17, 0]], {}, { name: "tower.motor", tone: "mid", smooth: false, extra: C.Faded(G.ribsOf(F, 3, 14, 6.2, 12, P, { fade: [0.1, 0.55] }), { tone: "lo" }) });
  });
  C.tower = { hotEnd: [dist.x + dist.w / 2, dist.y + dist.d / 2, 80], coldStart: [HOUSE.x + HOUSE.w / 2, HOUSE.y + HOUSE.d, 8], house: HOUSE };
}
