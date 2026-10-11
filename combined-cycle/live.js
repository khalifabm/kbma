const D = __DATA__;
const M = MODEL;
const root = document.querySelector(".cc");
const stage = root.querySelector(".cc-stage");
const front = stage.querySelector(".cc-front");
const readout = root.querySelector("[data-readout]");
const liveRegion = root.querySelector("[data-live]");
const runButton = root.querySelector("[data-run]");
const runLabel = root.querySelector("[data-run-label]");
const loadInput = root.querySelector("[data-load]");
const loadOut = root.querySelector("[data-load-out]");
const stageButtons = [...root.querySelectorAll(".cc-part")];
const still = matchMedia("(prefers-reduced-motion: reduce)");
const dark = root.closest("[data-theme]")?.getAttribute("data-theme") === "dark";
if (dark) root.setAttribute("data-dark", "");
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

// ---- what turns --------------------------------------------------------------------------------
const spinEls = D.spins.map((spec, index) => ({ spec, index, el: stage.querySelector(`[data-spin="${index}"]`), last: NaN }));
const items = [...front.querySelectorAll(".it")];
const byPiece = new Map();
for (const el of items) {
  const piece = el.dataset.piece;
  if (!byPiece.has(piece)) byPiece.set(piece, []);
  byPiece.get(piece).push(el);
}
const stageOf = new Map();
D.stages.forEach((s) => s.pieces.forEach((p) => stageOf.set(p, s.id)));

// ---- the plant's state: each part comes up behind the one that feeds it -----------------------------
const env = { gtSpeed: { x: 0, v: 0 }, flame: { x: 0, v: 0 }, gtLoad: { x: 0, v: 0 }, boiler: { x: 0, v: 0 }, steam: { x: 0, v: 0 }, stSpeed: { x: 0, v: 0 }, stLoad: { x: 0, v: 0 }, cool: { x: 0, v: 0 } };
const S = { run: false, load: 1, angle: 0, stAngle: 0, phase: 0 };
function step(dt, calm) {
  const on = S.run;
  let moving = false;
  const go = (name, target, seconds) => { if (settle(env[name], target, dt, seconds, calm)) moving = true; };
  go("gtSpeed", on ? 1 : 0, on ? 1.3 : 2.2);
  go("flame", on && env.gtSpeed.x > 0.3 ? 1 : 0, on ? 0.45 : 0.3);
  go("gtLoad", on && env.gtSpeed.x > 0.9 && env.flame.x > 0.9 ? 1 : 0, on ? 1.2 : 1.0);
  go("boiler", env.gtLoad.x, on ? 2.4 : 4);
  go("steam", env.boiler.x > 0.45 ? clamp((env.boiler.x - 0.45) / 0.45, 0, 1) : 0, 1.8);
  go("stSpeed", on && env.steam.x > 0.55 ? 1 : 0, on ? 1.6 : 2.6);
  go("stLoad", on && env.stSpeed.x > 0.9 ? 1 : 0, on ? 1.3 : 1.0);
  go("cool", env.stLoad.x, 1.4);
  return moving;
}
const levels = () => ({ gt: env.gtLoad.x, boiler: env.boiler.x * (env.steam.x > 0.05 ? 1 : 0.92), st: env.stLoad.x, gtSpeed: env.gtSpeed.x, stSpeed: env.stSpeed.x });
const model = () => M.plant({ load: S.load, levels: levels() });

const levels5 = {};
function setLevel(name, value) {
  const level = Math.round(clamp(value, 0, 1) * 5);
  if (levels5[name] !== level) { levels5[name] = level; stage.setAttribute(`data-fl-${name}`, String(level)); }
}
const portGlows = [...stage.querySelectorAll(".cc-port-glow")];
const puffGroup = stage.querySelector(".cc-puffs");
const bankEls = [];
for (const el of front.querySelectorAll(".it[data-bank]")) (bankEls[Number(el.dataset.bank)] ??= []).push(el);
const bankLevel = [];
function setBank(b, value) {
  const q = Math.round(clamp(value, 0, 1) * 32) / 32;
  if (bankLevel[b] === q) return;
  bankLevel[b] = q;
  for (const el of bankEls[b] ?? []) el.style.setProperty("--bk", q.toFixed(3));
}
const SPEED = 1.7; // radians per second at full speed, slowed so the blades can be followed
function spinAll() {
  for (const s of spinEls) {
    if (!s.el) continue;
    const phase = (s.spec.group === "st" ? S.stAngle : S.angle) * (s.spec.rate ?? 1);
    const rounded = Math.round(phase * 200);
    if (rounded === s.last) continue;
    s.last = rounded;
    s.el.setAttribute("d", spinPath(G, D.P, s.spec, phase));
  }
}

// ---- stage selection and the readout --------------------------------------------------------------------
let selected = null;
let touring = !still.matches;
let tourAt = 0;
let idleTimer = 0;
function select(id) {
  if (id === selected) return;
  selected = id;
  const pieces = id ? D.stages.find((s) => s.id === id).pieces : [];
  for (const [piece, els] of byPiece) els.forEach((el) => (pieces.includes(piece) ? el.setAttribute("data-on", "") : el.removeAttribute("data-on")));
  if (id) stage.setAttribute("data-focus", "");
  else stage.removeAttribute("data-focus");
  stageButtons.forEach((b) => (b.dataset.stage === id ? b.setAttribute("data-on", "") : b.removeAttribute("data-on")));
  if (id) liveRegion.textContent = M.STAGES.find((s) => s.id === id).name;
  say();
}
const phaseWord = () => {
  if (!S.run && env.gtSpeed.x < 0.01 && env.stSpeed.x < 0.01) return "cold";
  if (!S.run) return "shutting down";
  if (env.gtSpeed.x < 0.3) return "turning the compressor · cranking";
  if (env.flame.x < 0.9) return "ignition";
  if (env.gtLoad.x < 0.95) return "gas turbine loading";
  if (env.boiler.x < 0.9) return "boiler warming up";
  if (env.stSpeed.x < 0.95) return "steam rolling the turbine";
  if (env.stLoad.x < 0.95) return "steam turbine loading";
  return "";
};
let lastText = "";
let lastPhase = "cold";
function say() {
  const m = model();
  let text;
  if (selected) text = M.STAGES.find((s) => s.id === selected).say(m);
  else {
    const word = phaseWord();
    text = word ? word : `${M.fmt(m.total.mw)} MW · ${M.fmt(m.total.efficiency * 100, 1)} % · gas ${M.fmt(m.gt.mw)} + steam ${M.fmt(m.st.mw)}`;
  }
  if (text !== lastText) { readout.textContent = text; lastText = text; }
  const phase = phaseWord() || "full load";
  if (phase !== lastPhase) { lastPhase = phase; if (!selected) liveRegion.textContent = phase; }
}

// ---- the loop --------------------------------------------------------------------------------------------------
let frame = 0, last = 0, clock = 0, visible = false, slow = 0.016, count = 0;
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  clock += dt;
  const calm = still.matches;
  const moving = step(dt, calm);
  if (!calm) {
    S.angle += SPEED * env.gtSpeed.x * dt;
    S.stAngle += SPEED * env.stSpeed.x * dt;
    spinAll();
  }
  setLevel("air", env.gtSpeed.x * 0.9);
  setLevel("fuel", env.flame.x);
  setLevel("water", clamp(env.boiler.x * 1.2, 0, 1));
  setLevel("steam", env.steam.x);
  setLevel("cool", env.cool.x);
  if (env.gtSpeed.x > 0.02 !== stage.hasAttribute("data-run")) stage.toggleAttribute("data-run", env.gtSpeed.x > 0.02);
  for (const el of portGlows) el.style.setProperty("--cc-flame", env.flame.x.toFixed(3));
  if (touring && env.stLoad.x > 0.95 && !selected && !calm) { tourAt = 0; }
  if (touring) runTour(dt);
  slow = slow * 0.96 + dt * 0.04;
  count++;
  if (calm || slow < 0.026 || count % 2 === 0) drawGL(clock);
  say();
  const alive = moving || S.run || env.gtSpeed.x > 0.001 || env.stSpeed.x > 0.001;
  frame = visible && (alive || touring) && !(calm && !moving) ? requestAnimationFrame(tick) : 0;
}
const kick = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };

// ---- the idle tour: start the plant, then follow the working fluid round ---------------------------------------
let tourStage = -1, tourTimer = 0;
function runTour(dt) {
  if (!S.run && env.gtSpeed.x < 0.001 && clock > 1.4 && tourStage < 0) setRun(true);
  if (env.stLoad.x < 0.9) return;
  tourTimer += dt;
  if (tourTimer > 3.6 || tourStage < 0) {
    tourTimer = 0;
    tourStage = (tourStage + 1) % D.stages.length;
    select(D.stages[tourStage].id);
  }
}
function quietTour() {
  touring = false;
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => { if (!still.matches) { touring = true; tourTimer = 3.6; kick(); } }, 5200);
}

// ---- controls ---------------------------------------------------------------------------------------------------
function setRun(value) {
  S.run = value;
  runButton.setAttribute("data-state", value ? "on" : "off");
  runLabel.textContent = value ? "Stop" : "Start";
  if (still.matches) for (const key in env) env[key].x = value ? 1 : 0;
  liveRegion.textContent = value ? "Starting the plant" : "Shutting down";
  kick();
}
runButton.addEventListener("click", () => { quietTour(); setRun(!S.run); });
loadInput.addEventListener("input", () => { S.load = clamp(Number(loadInput.value) / 100, M.LOAD_MIN, 1); loadOut.textContent = `${Math.round(S.load * 100)} %`; quietTour(); say(); kick(); });
stageButtons.forEach((button) => {
  button.addEventListener("pointerenter", () => { quietTour(); select(button.dataset.stage); });
  button.addEventListener("focus", () => { quietTour(); select(button.dataset.stage); });
  button.addEventListener("click", () => { quietTour(); select(button.dataset.stage); });
});
root.querySelector(".cc-parts").addEventListener("pointerleave", () => { select(null); });
stage.addEventListener("pointermove", (event) => {
  const target = event.target.closest?.(".it");
  const id = target ? stageOf.get(target.dataset.piece) ?? null : null;
  if (id !== selected) { quietTour(); select(id); }
});
stage.addEventListener("pointerleave", () => select(null));
stage.addEventListener("keydown", (event) => {
  const index = D.stages.findIndex((s) => s.id === selected);
  let next = null;
  if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (index + 1) % D.stages.length;
  else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (index <= 0 ? D.stages.length : index) - 1;
  else if (event.key === "Home") next = 0;
  else if (event.key === "End") next = D.stages.length - 1;
  else if (event.key === " " || event.key === "Enter") { event.preventDefault(); quietTour(); setRun(!S.run); return; }
  else if (event.key === "Escape") { quietTour(); select(null); return; }
  else if (event.key === "+" || event.key === "-") { loadInput.value = String(clamp(Number(loadInput.value) + (event.key === "+" ? 5 : -5), 40, 100)); loadInput.dispatchEvent(new Event("input")); return; }
  if (next === null) return;
  event.preventDefault();
  quietTour();
  select(D.stages[next].id);
});

new IntersectionObserver((entries) => { visible = entries[entries.length - 1].isIntersecting; if (visible) kick(); }, { rootMargin: "120px 0px" }).observe(stage);
runButton.setAttribute("data-state", "off");
if (still.matches) { touring = false; setRun(true); spinAll(); }
say();

// ---- shaders inside the drawing: heat haze through the boiler (between the two SVGs) and the plumes (over them) ----------------
const GLS_COMMON = `
uniform float uLight;
vec3 ditherOf(vec3 c,float a){float n=(hash12(gl_FragCoord.xy+fract(uTime*.61)*91.)+hash12(gl_FragCoord.yx*1.37+fract(uTime*.37)*57.)-1.)/255.;return max(c+n*smoothstep(0.,1.5/255.,a),0.);}
bool hitBox(vec3 p0,vec3 d,vec3 lo,vec3 hi,out float ta,out float tb){
  vec3 t1=(lo-p0)/d;vec3 t2=(hi-p0)/d;vec3 mn=min(t1,t2);vec3 mx=max(t1,t2);
  ta=max(max(mn.x,mn.y),mn.z);tb=min(min(mx.x,mx.y),mx.z);return tb>ta;}
`;
const GAS_FRAGMENT = GLS_COMMON + `
uniform vec4 uTa;uniform vec3 uTb;uniform float uHeat;
const vec3 LO=vec3(${D.hrsg.x0.toFixed(1)},${D.hrsg.y0.toFixed(1)},${D.hrsg.z0.toFixed(1)});
const vec3 HI=vec3(${D.hrsg.x1.toFixed(1)},${D.hrsg.y1.toFixed(1)},${D.hrsg.z1.toFixed(1)});
const vec2 AXIS=vec2(${D.axis[0].toFixed(1)},${D.axis[1].toFixed(1)});
float tempAt(float x){
  if(x<177.)return mix(uTa.x,uTa.y,clamp((x-151.)/26.,0.,1.));
  if(x<219.)return mix(uTa.y,uTa.z,(x-177.)/42.);
  if(x<261.)return mix(uTa.z,uTa.w,(x-219.)/42.);
  if(x<303.)return mix(uTa.w,uTb.x,(x-261.)/42.);
  if(x<345.)return mix(uTb.x,uTb.y,(x-303.)/42.);
  return mix(uTb.y,uTb.z,clamp((x-345.)/50.,0.,1.));
}
vec3 heatCol(float T){
  float h=clamp((T-70.)/540.,0.,1.);
  vec3 c0=vec3(.72,.78,.92);vec3 c1=vec3(.95,.52,.22);vec3 c2=vec3(1.,.62,.14);vec3 c3=vec3(1.,.88,.52);
  return h<.3?mix(c0,c1,h/.3):h<.65?mix(c1,c2,(h-.3)/.35):mix(c2,c3,(h-.65)/.35);
}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer();vec3 p0=rayOf(vb);
  float ta,tb;
  if(uHeat<.002||!hitBox(p0,V,LO,HI,ta,tb)){gl_FragColor=vec4(0.);return;}
  const int N=26;
  float dt=(tb-ta)/float(N);
  float jit=hash12(gl_FragCoord.xy);
  vec3 acc=vec3(0.);float trans=1.;
  for(int i=0;i<N;i++){
    vec3 p=p0+(ta+(float(i)+jit)*dt)*V;
    float T=tempAt(p.x);
    float h=clamp((T-70.)/540.,0.,1.);
    float dy=p.y-AXIS.x;float dz=p.z-AXIS.y;
    float R=44.+(p.x-151.)*.55;
    float jet=exp(-(dy*dy+dz*dz)/(R*R));
    float n=noise3(vec3(p.x*.05-uTime*1.1,p.y*.06,p.z*.06));
    float dens=(.30+.70*jet)*(.55+.9*n);
    dens*=window(p.x,LO.x,HI.x,6.)*window(p.y,LO.y,HI.y,7.)*window(p.z,LO.z,HI.z,6.);
    float sigma=(.010+.040*h)*uHeat;
    float a=1.-exp(-dens*sigma*dt);
    vec3 c=heatCol(T);
    acc+=trans*a*c;
    trans*=1.-a;
  }
  float alpha=clamp(1.-trans,0.,1.)*.82;
  vec3 col=min(acc*.82,vec3(alpha));
  col=ditherOf(col,alpha);
  gl_FragColor=vec4(col,alpha);
}`;
const PLUME_FRAGMENT = GLS_COMMON + `
uniform vec2 uWind;uniform float uStack;uniform float uVapor;
uniform vec4 uFan0;uniform vec4 uFan1;uniform vec3 uTop;
vec4 plume(vec3 p0,vec3 V,vec3 base,float r0,float H,float spread,float amount,float k,float seed,float warm){
  if(amount<.002)return vec4(0.);
  float za=(base.z-p0.z)/V.z;float zb=(base.z+H-p0.z)/V.z;
  vec3 pm=p0+(za+zb)*.5*V;
  float lean=H*.5*(.42+.0016*H*.5);
  float reach=r0+spread*H*.6+length(uWind)*lean+H*.5*length(V.xy)/V.z;
  if(length(pm.xy-base.xy-uWind*lean)>reach+20.)return vec4(0.);
  const int N=22;
  float dt=(zb-za)/float(N);
  float jit=hash12(gl_FragCoord.xy+seed);
  vec3 acc=vec3(0.);float trans=1.;
  for(int i=0;i<N;i++){
    vec3 p=p0+(za+(float(i)+jit)*dt)*V;
    float h=p.z-base.z;
    vec2 c=base.xy+uWind*(h*.42+.0016*h*h);
    float rr=length(p.xy-c);
    float R=r0+spread*h;
    float core=exp(-rr*rr/(R*R)*1.7);
    float n=fbm3(vec3(p.xy*.05,h*.045-uTime*.5+seed));
    float d=core*(.25+1.05*smoothstep(.2,.8,n))*smoothstep(0.,7.,h)*(1.-smoothstep(H*.5,H,h))*amount;
    float a=1.-exp(-d*dt*k);
    float up=clamp(h/H*.7+n*.5,0.,1.);
    vec3 dark=mix(vec3(.70,.73,.79),vec3(.97,.97,.985),up);
    vec3 night=mix(vec3(.55,.62,.80),vec3(.9,.94,1.),up)*.85;
    vec3 sc=mix(night,dark,uLight);
    sc=mix(sc,vec3(1.,.82,.58),warm*(1.-smoothstep(0.,H*.3,h))*.5);
    acc+=trans*a*sc;trans*=1.-a;
  }
  return vec4(acc,1.-trans);
}
void main(){
  vec2 vb=viewOf(gl_FragCoord.xy);
  vec3 V=towardViewer();vec3 p0=rayOf(vb);
  vec4 s=plume(p0,V,uTop,13.,150.,.16,uStack,.032,3.1,1.);
  vec4 f0=plume(p0,V,uFan0.xyz,15.,170.,.22,uVapor,.062,7.7,0.);
  vec4 f1=plume(p0,V,uFan1.xyz,15.,170.,.22,uVapor,.062,11.3,0.);
  vec4 o=f1+f0*(1.-f1.a);o=o+s*(1.-o.a);
  float a=clamp(o.a,0.,.9)*(mix(.8,1.,uLight));
  vec3 col=min(o.rgb*(mix(.8,1.,uLight)),vec3(a));
  col=ditherOf(col,a);
  gl_FragColor=vec4(col,a);
}`;
const gasLayer = glLayer({ canvas: stage.querySelector(".cc-gas"), fragment: GAS_FRAGMENT, view: [D.W, D.H], camera: D.camera, uniforms: ["uTa", "uTb", "uHeat"], fixed: { uLight: dark ? 0 : 1 }, maxRatio: 1.25 });
const veilLayer = glLayer({ canvas: stage.querySelector(".cc-veil"), fragment: PLUME_FRAGMENT, view: [D.W, D.H], camera: D.camera, uniforms: ["uWind", "uStack", "uVapor", "uFan0", "uFan1", "uTop"], fixed: { uLight: dark ? 0 : 1 }, maxRatio: 1.25 });
if (gasLayer && veilLayer) stage.setAttribute("data-gl", "");
const BANK_COUNT = D.banks.length;
function drawGL(clockTime) {
  const heat = env.boiler.x;
  if (puffGroup && !stage.hasAttribute("data-gl")) {
    puffGroup.style.setProperty("--cc-stack", (env.gtLoad.x * (0.45 + 0.4 * S.load)).toFixed(3));
    puffGroup.style.setProperty("--cc-vapor", (env.cool.x * (0.5 + 0.5 * S.load)).toFixed(3));
  }
  const m = model();
  const temps = [m.gt.exhaust, ...m.boiler.gasTemps, m.boiler.stack];
  // station temperatures: inlet, then after each bank; the haze reads them at its own x
  const ta = [temps[0], temps[1], temps[2], temps[3]];
  const tb = [temps[4], temps[5], temps[6]];
  const time = still.matches ? 0.8 : clockTime;
  if (gasLayer) {
    if (heat > 0.004) gasLayer.draw({ uTa: ta, uTb: tb, uHeat: heat }, time);
    else gasLayer.clear();
  }
  if (veilLayer) {
    const stackAmount = env.gtLoad.x * (0.45 + 0.4 * S.load);
    const vapor = env.cool.x * (0.5 + 0.5 * S.load);
    if (stackAmount > 0.004 || vapor > 0.004) veilLayer.draw({ uWind: [0.55, -0.35], uStack: stackAmount, uVapor: vapor, uFan0: D.fans[0] ?? [0, 0, 0, 0], uFan1: D.fans[1] ?? [0, 0, 0, 0], uTop: D.stackTop }, time);
    else veilLayer.clear();
  }
  // the banks warm up with the gas that passes through them
  for (let b = 0; b < BANK_COUNT; b++) setBank(b, clamp((m.boiler.gasTemps[b] - 70) / 520, 0, 1) * heat);
}

// ---- test hook: ?pose=full starts the plant at full load with the tour off, so stills show the steady state ----------------------------------
if (new URLSearchParams(location.search).get("pose") === "full") {
  touring = false;
  for (const key in env) env[key].x = 1;
  S.run = true;
  runButton.setAttribute("data-state", "on");
  runLabel.textContent = "Stop";
  kick();
}
window.__cc = { pose(name) { if (name === "full") { touring = false; for (const key in env) { env[key].x = 1; env[key].v = 0; } S.run = true; runButton.setAttribute("data-state", "on"); runLabel.textContent = "Stop"; kick(); } }, select, env, S };
