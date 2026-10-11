// The plant's numbers: one small pure model of a typical F-class gas turbine (about 280 MW) with a two-pressure
// boiler and a condensing steam turbine (about 135 MW). Everything the page shows, writes or animates comes from here.
// load is the gas turbine's share of base load (0.4 to 1); levels are how far each part has come up (0 to 1).

const CP_GAS = 1.12; // kJ/kg·K, flue gas mean
const CP_WATER = 4.186;

export const LOAD_MIN = 0.4;
export const RPM = 3000;

export function plant({ load = 1, ambient = 15, levels = {} } = {}) {
  const lv = { gt: 1, boiler: 1, st: 1, ...levels };
  const f = Math.max(LOAD_MIN, Math.min(1, load));

  // gas turbine: inlet guide vanes close at part load, so the air flow falls with the load
  const air = 650 * (0.58 + 0.42 * f);
  const pressureRatio = 17.4 * (0.62 + 0.38 * (air / 650));
  const compressorExit = ambient + ((ambient + 273.15) * (pressureRatio ** 0.2857 - 1)) / 0.88;
  const firing = 1100 + 300 * f;
  const exhaust = 560 + 40 * f;
  const gtEff = 0.39 * (1 - 0.35 * (1 - f) ** 1.6);
  const gtMw = 280 * f * lv.gt;
  const fuelMw = gtMw / gtEff;
  const lossMw = fuelMw * 0.02;
  const exhaustMw = fuelMw - gtMw - lossMw;

  // boiler: the exhaust is cooled from its own temperature to the stack temperature
  const stack = 84 + 14 * (1 - f);
  const recovered = exhaustMw * ((exhaust - stack) / (exhaust - ambient)) * lv.boiler;
  const hpFlow = (recovered / 371) * 84;
  const lpFlow = (recovered / 371) * 17;
  const hpPressure = 70 + 55 * Math.min(1, recovered / 371);
  const hpTemp = 480 + 85 * f;
  const lpTemp = 215 + 40 * f;

  // steam turbine and condenser
  const stEff = 0.36 - 0.02 * (1 - f);
  const stMw = recovered * stEff * lv.st;
  const condenserMw = recovered - stMw;
  const condenserPressure = 0.045 + 0.02 * (condenserMw / 240);
  const condenserTemp = 29 + 4 * (condenserMw / 240);
  const coolingFlow = condenserMw > 0 ? (condenserMw * 1000) / (CP_WATER * 10) : 0; // kg/s for a 10 K rise
  const evaporation = (condenserMw * 1000) / 2430; // kg/s lost as plume
  const totalMw = gtMw + stMw;
  const efficiency = fuelMw > 0 ? totalMw / fuelMw : 0;

  return {
    load: f,
    ambient,
    gt: { air, pressureRatio, compressorExit, firing, exhaust, eff: gtEff, mw: gtMw, fuelMw, exhaustMw, rpm: RPM * (levels.gtSpeed ?? 1) },
    boiler: { recovered, stack, hpFlow, lpFlow, hpPressure, hpTemp, lpTemp, gasTemps: gasProfile(exhaust, stack, ambient) },
    st: { mw: stMw, eff: stEff, rpm: RPM * (levels.stSpeed ?? 1) },
    condenser: { mw: condenserMw, pressure: condenserPressure, temp: condenserTemp },
    cooling: { flow: coolingFlow, evaporation, rise: 10, cold: condenserTemp - 6, warm: condenserTemp - 6 + 10 },
    total: { mw: totalMw, efficiency },
    cpGas: CP_GAS,
  };
}

// gas temperature after each tube bank, in flow order (superheater, HP evaporator, HP economizer, LP evaporator, preheater)
export function gasProfile(exhaust, stack, ambient = 15) {
  const share = [0.12, 0.38, 0.62, 0.8, 1];
  return share.map((s) => exhaust - (exhaust - stack) * s ** 1.15);
}

export const fmt = (value, digits = 0) => value.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// the working fluid's journey, in the order the reader follows it
export const STAGES = [
  { id: "air", name: "Air intake", pieces: ["intake"], say: (m) => `air intake · ${fmt(m.gt.air)} kg/s of air at ${m.ambient} °C` },
  { id: "compress", name: "Compressor", pieces: ["comp"], say: (m) => `compressor · ${fmt(m.gt.pressureRatio, 1)} : 1 · air leaves at ${fmt(m.gt.compressorExit)} °C` },
  { id: "burn", name: "Combustor", pieces: ["comb", "fuel"], say: (m) => `combustor · gas burns at ${fmt(m.gt.firing)} °C · ${fmt(m.gt.fuelMw)} MW of fuel` },
  { id: "expand", name: "Gas turbine and generator", pieces: ["turb", "diffuser", "gen", "skid"], say: (m) => `gas turbine · ${fmt(m.gt.mw)} MW at ${fmt(m.gt.rpm)} rpm · ${fmt(m.gt.eff * 100, 1)} % alone` },
  { id: "boiler", name: "Heat-recovery boiler", pieces: ["hrsg"], say: (m) => `boiler · exhaust ${fmt(m.gt.exhaust)} °C in, ${fmt(m.boiler.stack)} °C out · ${fmt(m.boiler.recovered)} MW into steam` },
  { id: "drums", name: "Drums and steam", pieces: ["drum"], say: (m) => `steam · ${fmt(m.boiler.hpPressure)} bar at ${fmt(m.boiler.hpTemp)} °C · ${fmt(m.boiler.hpFlow)} kg/s high pressure, ${fmt(m.boiler.lpFlow)} kg/s low` },
  { id: "steam", name: "Steam turbine and generator", pieces: ["steam", "steamgen"], say: (m) => `steam turbine · ${fmt(m.st.mw)} MW from heat the gas turbine threw away` },
  { id: "condense", name: "Condenser", pieces: ["condenser"], say: (m) => `condenser · ${fmt(m.condenser.pressure * 1000)} mbar, ${fmt(m.condenser.temp)} °C · ${fmt(m.condenser.mw)} MW to the cooling water` },
  { id: "tower", name: "Cooling tower", pieces: ["tower"], say: (m) => `cooling tower · ${fmt(m.cooling.flow / 1000, 1)} t/s round the loop · ${fmt(m.cooling.evaporation)} kg/s leaves as vapour` },
  { id: "feed", name: "Condensate and feed pumps", pieces: ["pumps"], say: (m) => `pumps · condensate and feed water go back to the boiler at ${fmt(m.boiler.hpPressure)} bar` },
  { id: "grid", name: "Generators and grid", pieces: ["elec"], say: (m) => `grid · ${fmt(m.total.mw)} MW · ${fmt(m.total.efficiency * 100, 1)} % of the fuel's energy` },
];
