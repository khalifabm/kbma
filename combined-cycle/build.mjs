import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as K from "./ctx.mjs";
import { makeContext, k, G, A } from "./ctx.mjs";
import { kitScript, glScript } from "./scripts/inline-kit.mjs";
import { glCamera } from "./kit/gl.mjs";
import { STAGES } from "./model.mjs";
import * as L from "./layout.mjs";
import { gasTurbine } from "./parts/gt.mjs";
import { hrsg } from "./parts/hrsg.mjs";
import { steamTurbine } from "./parts/st.mjs";
import { coolingTower } from "./parts/tower.mjs";
import { site } from "./parts/site.mjs";
import { piping } from "./parts/piping.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const THEME = process.argv.includes("--light") ? "light" : "dark";
const { W, H } = L;

const P = k.fitProjection(
  [
    ...k.boxCorners(L.PLINTH, -L.PLINTH_H - L.FOOT_H, 0),
    [L.STACK.x, L.STACK.y, L.STACK.z1 + 40],
    [L.TOWER.x + L.TOWER.w, L.TOWER.y + L.TOWER.d, L.TOWER.h + 90],
  ],
  W,
  H,
  { pad: 30, azimuth: L.AZIMUTH, elevation: L.ELEVATION },
);
const C = makeContext(P);
const { R, at, S, Ln, Dots } = C;

// ground: plinth on feet, always behind everything else
const back = [];
back.push(`<path class="iso-halo" d="${k.haloOf(L.PLINTH, -L.PLINTH_H - L.FOOT_H, L.PLINTH_H, P)}"/>`);
back.push(S(k.slabOf(L.PLINTH, -L.PLINTH_H, L.PLINTH_H, P, 10, 1.8), { tone: "mid" }));
C.record(A.slab(L.PLINTH, -L.PLINTH_H, L.PLINTH_H, { name: "stand.plinth" }, 10));
back.push(Ln(k.planOutline(k.insetPlan(L.PLINTH, 8), 0, P), { tone: "lo" }));

gasTurbine(C);
hrsg(C);
steamTurbine(C);
coolingTower(C);
site(C);
piping(C);

const { items } = R;
A.settle(R, P);
items.sort((a, b) => a.key - b.key);
const gOf = (item, index) => `<g class="it" data-piece="${item.piece}"${item.bank !== undefined ? ` data-bank="${item.bank}"` : ""}>${item.svg}</g>`;
const backItems = items.map((item, index) => (item.layer === "back" ? gOf(item, index) : "")).join("");
const frontItems = items.map((item, index) => (item.layer === "back" ? "" : gOf(item, index))).join("");

const LABEL =
  "A combined cycle power plant seen from above and in front. At the back a gas turbine train: air filter house and inlet plenum, a compressor and a combustor ringed with can covers, a turbine, and a generator. Its exhaust runs through the boiler, an open-fronted duct of tube banks with two steam drums on its roof and a tall stack. In front, a steam turbine with its generator stands on a table-top pedestal over the condenser; a cooling tower, a control room and transformers complete the site.";
const backSvg = k.figureSvg({ width: W, height: H, label: LABEL, body: [...back, `<g class="plant-back">${backItems}</g>`], className: "cc-back" });
// the plumes drawn as a few soft puffs, for browsers without WebGL; hidden once the shaders run
const puffs = (base, n, dx, dy, r0, grow, cls) => [...Array(n)].map((_, i) => { const p = at([base[0] + dx * i * 5, base[1] + dy * i * 5, base[2] + i * 24]); return `<circle class="cc-puff ${cls}" cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${((r0 + grow * i) * C.KS).toFixed(1)}" style="--i:${i}"/>`; }).join("");
const puffSvg = `<g class="cc-puffs">${puffs([L.STACK.x, L.STACK.y, L.STACK.z1], 5, 0.55, -0.35, 12, 4, "cc-puff-stack")}${(C.cells ?? []).map((c) => puffs([c.cx, c.cy, c.z], 5, 0.55, -0.35, 14, 5, "cc-puff-vapor")).join("")}</g>`;
const frontSvg = `<svg xmlns="http://www.w3.org/2000/svg" class="iso-svg cc-front" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="plant">${frontItems}</g>${puffSvg}</svg>`;

const DATA = {
  W,
  H,
  P,
  spins: C.spins,
  stages: STAGES.map(({ id, name, pieces }) => ({ id, name, pieces })),
  ports: C.ports ?? [],
  camera: glCamera(P),
  stackTop: [L.STACK.x, L.STACK.y, L.STACK.z1],
  stackR: 15,
  fans: (C.cells ?? []).map((cell) => [cell.cx, cell.cy, cell.z, cell.r]),
  hrsg: { x0: L.HRSG.x0 + 3.5, x1: L.HRSG.x1 - 4, y0: L.HRSG.y0 + 3.5, y1: L.HRSG.y1 - 1, z0: 7, z1: 169 },
  axis: [L.GT_Y, L.GT_Z],
  banks: L.BANKS.map((b) => (b.x0 + b.x1) / 2),
};

const BUTTONS = STAGES.map((stage, index) => `<button type="button" class="cc-part" data-stage="${stage.id}"><span class="cc-num">${String(index + 1).padStart(2, "0")}</span>${stage.name}</button>`).join("");
const corners = `<div class="iso-plate-corners" aria-hidden="true"><span class="iso-plate-corner" data-corner="fig">Fig 1</span><span class="iso-plate-corner" data-corner="title">Combined cycle plant</span><span class="iso-plate-corner" data-corner="readout" data-readout>cold</span></div>`;
const controls = `<div class="cc-controls"><button type="button" class="cc-run" data-run><span class="cc-lamp" aria-hidden="true"></span><span data-run-label>Start</span></button><label class="cc-load"><span>Load</span><input type="range" min="40" max="100" value="100" step="1" data-load aria-label="Gas turbine load, percent of base load"><output data-load-out>100 %</output></label><span class="cc-hint">Hover a machine, or follow the numbered stages below</span><span class="cc-live" aria-live="polite" data-live></span></div>`;
const stage = `<div class="cc-stage" tabindex="0" role="group" aria-label="Combined cycle power plant. Arrow keys step through the stages the working fluid passes; Space starts or stops the plant; Up and Down change the load; Escape clears the selection.">${backSvg}<canvas class="cc-gl cc-gas" aria-hidden="true"></canvas>${frontSvg}<canvas class="cc-gl cc-veil" aria-hidden="true"></canvas></div>`;
const caption =
  "A combined cycle plant burns gas once and uses the heat twice. The gas turbine converts about 39 % of the fuel into power; its 600 °C exhaust, which a simple-cycle plant would vent, boils water in the boiler, and that steam drives a second turbine. Together they turn nearly 58 % of the fuel's energy into electricity. The numbers on the card come from one small model of a 280 MW gas turbine and a 135 MW steam turbine; change the load and every flow, temperature and output follows.";
const body = `<figure class="iso-figure cc"><div class="iso-plate">${corners}${stage}${controls}</div><figcaption class="iso-legend"><span class="cc-parts">${BUTTONS}</span><span class="iso-caption">${caption}</span></figcaption></figure>`;

const strip = (file) => readFileSync(join(HERE, file), "utf8").replace(/^import .*$/gm, "");
const exportsOf = (source) => [...source.matchAll(/^export (?:const|function) ([A-Za-z0-9_]+)/gm)].map((m) => m[1]);
const wrapModule = (name, file) => {
  const source = strip(file);
  return `const ${name} = (() => {${source.replace(/^export /gm, "")}\nreturn { ${exportsOf(source).join(", ")} };})();\n`;
};
const kitDir = (file) => readFileSync(join(HERE, "kit", file), "utf8").replace(/^import .*$/gm, "");
const latheScript = (() => {
  const source = kitDir("lathe.mjs");
  return `const G = (() => {${source.replace(/^export /gm, "")}\nreturn { ${exportsOf(source).join(", ")} };})();\n`;
})();
const spinScript = strip("spin.mjs").replace(/^export /gm, "");
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const bankCss = `.it[data-bank] .iso-fill{fill:color-mix(in srgb,var(--cc-hot) calc(var(--bk,0) * 42%),var(--anatomy-paper))}.it[data-bank] .iso-top{fill:color-mix(in srgb,var(--cc-hot) calc(var(--bk,0) * 46%),var(--anatomy-top))}` + [0, 1, 2, 3].map((n) => `.it[data-bank] .iso-shade[data-shade="${n}"]{fill:color-mix(in srgb,var(--cc-hot) calc(var(--bk,0) * 50%),var(--anatomy-shade-${n}))}`).join("");
const flowCss = ["steam", "water", "fuel", "cool", "air"].map((m) => [1, 2, 3, 4, 5].map((l) => `.cc-stage[data-fl-${m}="${l}"] .fl[data-flow="${m}"]{opacity:${(l / 5).toFixed(2)}}`).join("")).join("");
const CSS = readFileSync(join(HERE, "plant.css"), "utf8") + bankCss + flowCss;
const page = k.pageHtml({ title: "Combined cycle plant", theme: THEME, body: `<style>${CSS}</style>${body}`, script: kitScript() + glScript() + latheScript + spinScript + wrapModule("MODEL", "model.mjs") + LIVE, width: 1280 });
const name = THEME === "light" ? "combined-cycle-light.html" : "combined-cycle.html";
writeFileSync(join(HERE, name), page);
console.log("wrote", name, `${(page.length / 1024).toFixed(0)} KB`, `${items.length} items`);
// every pair below was looked at at 8x: a line passes well in front of or behind the other (40+ units apart in depth) and reads as a crossing
const CROWD_OK = [["drum.lp-riser", "drum.lp-feed"], ["tower.cold", "steam.column*"], ["drum.hp-riser", "drum.hp-feed"], ["drum.hp-feed", "steam.low"], ["pumps.feed", "hrsg.column*"], ["drum.hp-steam", "steam.main"], ["pumps.feed", "hrsg.hpev.beam*"], ["steam.low", "drum.lp-riser"], ["steam.low", "skid.base"]];
A.auditOrExit(R, P, { crowd: CROWD_OK });
