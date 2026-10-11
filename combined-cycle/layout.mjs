// World layout of the plant. x runs along the gas path (left to right), y from the back row (negative)
// to the front row (positive), z is up. One unit is about one pixel of the drawing.
export const AZIMUTH = 56;
export const ELEVATION = 30;
export const W = 1280;
export const H = 940;

export const PLINTH = { x: -440, y: -236, w: 920, d: 530, r: 12 };
export const PLINTH_H = 16;
export const FOOT_H = 8;

// gas-turbine train (back row)
export const GT_Y = -92;
export const GT_Z = 64;
export const GT = {
  gen: [-352, -262],
  plenum: [-246, -200],
  comp: [-200, -118],
  comb: [-118, -48],
  turb: [-48, 34],
  diffuser: [34, 104],
  transition: [104, 148],
};

// heat-recovery steam generator
export const HRSG = { x0: 148, x1: 408, y0: GT_Y - 62, y1: GT_Y + 62, h: 176 };
export const BANKS = [
  { id: "hpsh", name: "HP superheater", x0: 160, x1: 194 },
  { id: "hpev", name: "HP evaporator", x0: 202, x1: 236 },
  { id: "hpec", name: "HP economizer", x0: 244, x1: 278 },
  { id: "lpev", name: "LP evaporator", x0: 286, x1: 320 },
  { id: "pre", name: "Condensate preheater", x0: 328, x1: 362 },
];
export const STACK = { x: 388, y: GT_Y, r: 17, z0: HRSG.h, z1: 342 };

// steam-turbine train (front row), on a table-top pedestal
export const ST_Y = 176;
export const ST_Z = 100;
export const ST = {
  hp: [-40, 14],
  lp: [14, 100],
  gen: [100, 190],
};
export const DECK_Z = 64;
export const PUMP_ZC = [15, 15.6];
export const CONDENSER = { x: 22, y: ST_Y - 40, w: 70, d: 80, z0: 4, z1: 54 };

// cooling tower, control room, transformers
export const TOWER = { x: 300, y: 152, w: 156, d: 96, h: 70 };
export const CONTROL = { x: -400, y: 150, w: 120, d: 80, h: 38 };
export const XFMR_GT = { x: -434, y: -120, w: 48, d: 58, r: 3, h: 52 };
export const FILTER = { x: -284, y: -236, w: 104, d: 84, h: 160 };
export const XFMR_ST = { x: 212, y: ST_Y - 28, w: 50, d: 56, r: 3, h: 52 };
