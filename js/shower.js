// ShowerClear's shared physics and parts: supply pressure, the two-inlet mixing network, the
// mixing equation, scald times, shower-head jets and their break-up into drops, shower energy,
// and builders for sectioned valve bodies, pipes sliced along their middle, flowing water dots
// and falling spray.
// Valve models are drawn in millimetres and scaled into the scene by S.
import { THREE, M, clamp, lerp } from './kit.js';

// ---------------------------------------------------------------- water and pressure
// Water near 40 °C: density 992 kg/m³, viscosity 0.65 mPa·s, surface tension 0.0696 N/m (CRC
// Handbook of Chemistry and Physics; IAPWS). Specific heat 4.18 kJ/(kg·K) (4.18 to 4.19 between
// 20 and 70 °C). g = 9.81 m/s². Hydrostatic pressure P = ρ g h: about 9.8 kPa (0.1 bar) a metre.
export const RHO = 995, G = 9.81, BAR = 1e5, C_W = 4.18, MU = 0.65e-3, SIGMA = 0.0696;
export const headPa = (h) => RHO * G * Math.max(0, h);
export const paToHead = (p) => p / (RHO * G);
export const lpm = (q) => q * 60000;                         // m³/s to litres a minute

// ---------------------------------------------------------------- pipes and openings
// House plumbing in 15 mm (half-inch) pipe: about 12.5 mm bore (half-inch CPVC, SDR 11, ASTM D2846).
// A loss is written as a K factor on the pipe's velocity head: ΔP = K · ½ρv², v = Q / A_PIPE.
// So every part is a "resistance" R with ΔP = R·Q², and parts in series add.
export const D_PIPE = 0.0125, A_PIPE = Math.PI * D_PIPE * D_PIPE / 4;
export const rK = (K) => (RHO * K) / (2 * A_PIPE * A_PIPE);
// An opening of area A (m²) with discharge coefficient Cd: Q = Cd·A·√(2ΔP/ρ) (the orifice
// equation; Cd ≈ 0.6 to 0.7 for a sharp-edged gap, about 0.85 for a short moulded nozzle).
export const rOpen = (A, Cd = 0.7) => (A <= 1e-12 ? Infinity : RHO / (2 * (Cd * A) ** 2));
// A pipe run: Darcy friction f·L/D with f = 0.03 (Blasius, f = 0.316/Re^0.25, gives 0.028 to 0.035
// for Re 7,000 to 16,000, the range of a shower), a pipe entry K 0.5 and elbows K 0.9 each
// (Crane Technical Paper 410).
export const kPipe = (L, elbows = 3, entry = true) => 0.03 * L / D_PIPE + (entry ? 0.5 : 0) + 0.9 * elbows;
export const mm2 = (a) => a * 1e-6;

// ---------------------------------------------------------------- the mixing network
// Hot and cold supplies (pressures Ph, Pc) each push through their own resistance into one mixing
// chamber at pressure Pm, which drains through the outlet resistance Ro to the open air:
//   Qh = √((Ph − Pm)/Rh),  Qc = √((Pc − Pm)/Rc),  Qh + Qc = √(Pm/Ro).
// A side whose supply is below Pm gives nothing (real mixers have non-return valves for this).
// The left side falls and the right side rises with Pm, so bisection finds the one answer.
export function solveMix({ Ph, Pc, Rh, Rc, Ro }) {
  const q = (P, R, Pm) => (isFinite(R) && P > Pm ? Math.sqrt((P - Pm) / R) : 0);
  let lo = 0, hi = Math.max(Ph, Pc, 0);
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if (q(Ph, Rh, m) + q(Pc, Rc, m) > Math.sqrt(m / Ro)) lo = m; else hi = m;
  }
  const Pm = (lo + hi) / 2, Qh = q(Ph, Rh, Pm), Qc = q(Pc, Rc, Pm);
  return { Pm, Qh, Qc, Q: Qh + Qc };
}
// The mixing equation. Hot and cold water have the same specific heat, so the outlet temperature
// is the flow-weighted average: T = (Qh·Th + Qc·Tc) / (Qh + Qc).
export const mixT = (Qh, Th, Qc, Tc) => (Qh + Qc > 1e-12 ? (Qh * Th + Qc * Tc) / (Qh + Qc) : NaN);
// The share of hot water needed for a target temperature.
export const hotShare = (T, Th, Tc) => clamp((T - Tc) / Math.max(0.1, Th - Tc), 0, 1);

// ---------------------------------------------------------------- scalds
// Time in hot water for a serious (deep) burn on adult skin. Table: American Burn Association,
// Scald Injury Prevention Educator's Guide (155 °F 1 s, 148 °F 2 s, 140 °F 5 s, 133 °F 15 s,
// 127 °F 1 min, 124 °F 3 min, 120 °F 5 min), which rests on Moritz and Henriques, "Studies of
// Thermal Injury II", American Journal of Pathology 23 (1947); their threshold was about 44 °C
// held for six hours. Children and old people burn faster. Interpolated on a log scale of time.
const SCALD = [[44, 21600], [48.9, 300], [51.1, 180], [52.8, 60], [56.1, 15], [60, 5], [64.4, 2], [68.3, 1]];
export function scaldTime(T) {
  if (!(T >= 44)) return Infinity;
  for (let i = 1; i < SCALD.length; i++) if (T <= SCALD[i][0]) { const a = SCALD[i - 1], b = SCALD[i]; return Math.exp(lerp(Math.log(a[1]), Math.log(b[1]), (T - a[0]) / (b[0] - a[0]))); }
  return 1;
}
export const fmtScald = (T) => { const t = scaldTime(T); return !isFinite(t) ? 'no burn' : t >= 5400 ? 'hours' : t >= 90 ? 'about ' + Math.round(t / 60) + ' min' : t > 1.2 ? 'about ' + (t < 10 ? t.toFixed(0) : Math.round(t / 5) * 5) + ' s' : 'about 1 s'; };
// ASSE 1016 / ASME A112.1016 / CSA B125.16 (automatic compensating valves for showers): a high-limit
// stop at 120 °F (49 °C), and the outlet held within 3.6 °F (2 °C) when a supply pressure changes.
export const T_LIMIT = 49, T_BAND = 2;

// ---------------------------------------------------------------- shower heads
// Four generic heads. N nozzles of bore d (mm); face radius R (mm); fan: how far the outer jets
// lean out (degrees). Sizes are typical of heads on sale, not of any one product.
//  rain:    a 200 mm plate with many 1 mm nozzles: a big total opening, so it needs flow.
//  needle:  a small head with few fine nozzles: fast thin jets from little water.
//  air:     a small restrictor sets the flow; the jet from it sucks air in through side holes
//           (a Venturi), and the bubbly mix leaves through bigger nozzles as fat, soft drops.
//           AIR is the volume of air per volume of water: makers quote up to 3; 2 is used here.
//  massage: a turbine wheel spun by the water uncovers a few big nozzles in turn, so the water
//           arrives as pulses. About half the nozzles are open at any moment.
export const HEADS = {
  rain: { name: 'Rain shower', R: 100, N: 140, d: 1.0, fan: 0 },
  needle: { name: 'Needle spray', R: 45, N: 60, d: 0.8, fan: 11 },
  air: { name: 'Air-induction', R: 60, N: 60, d: 1.4, fan: 6, restrict: 11 },
  massage: { name: 'Massage pulse', R: 45, N: 12, d: 1.8, fan: 4, duty: 0.5 },
};
export const AIR = 2;
export const CD_NOZ = 0.85;
// The run from the tank to the head: pipe, elbows, a mixer fully open (K ≈ 12, like a globe
// valve: Crane TP-410 gives 340·fT ≈ 9, plus the body's passages) and the riser.
export const kSupply = (h) => kPipe(h + 6, 5) + 12;
// Flow and jet speed for a head fed by a total pressure dP (Pa) through the supply run.
// blocked: the share of nozzles closed by limescale.
export function headFlow(kind, dP, { blocked = 0, K = 40 } = {}) {
  const H = HEADS[kind], n = Math.max(1, Math.round(H.N * (1 - blocked)));
  const a = Math.PI * (H.d / 2) ** 2, open = mm2(n * a * (H.duty || 1));
  const Rs = rK(K), Rn = rOpen(open, CD_NOZ), Rr = H.restrict ? rOpen(mm2(H.restrict), 0.8) : 0;
  const Q = dP > 0 ? Math.sqrt(dP / (Rs + Rn + Rr)) : 0;
  // Water only for the pressure in the head; the air head's nozzles also carry the air.
  const pHead = (H.restrict ? Rr + Rn : Rn) * Q * Q;
  const v = (Q * (H.restrict ? 1 + AIR : 1)) / Math.max(1e-12, open);
  return { Q, lpm: lpm(Q), v, pHead, n, open: open * 1e6, d: H.d, H };
}
// A thin jet is unstable: surface tension pinches it into drops (Plateau, Rayleigh 1878).
// The fastest-growing ripple is 4.51 jet diameters long, which gives drops 1.89 diameters across.
// How far the jet gets before it breaks (laminar jets): L/d ≈ 13·√We·(1 + 3·Oh), Weber's theory
// with the constant measured by Grant and Middleman (AIChE Journal 12, 1966). We = ρv²d/σ,
// Oh = μ/√(ρσd). Below We ≈ 4 a nozzle this size no longer makes a jet at all: it drips
// (Clanet and Lasheras, Journal of Fluid Mechanics 383, 1999, give the same order).
export function breakup(dmm, v) {
  const d = dmm / 1000, We = (RHO * v * v * d) / SIGMA, Oh = MU / Math.sqrt(RHO * SIGMA * d);
  return { We, L: 13 * d * Math.sqrt(We) * (1 + 3 * Oh), drop: 1.89 * dmm, jets: We >= 4 };
}

// ---------------------------------------------------------------- water and energy
// Heat to warm the water: Q = m·c·ΔT. One litre is one kilogram to within 1%.
export const TARIFF = 7;                                    // ₹ per kWh, a typical Indian household rate
export function showerEnergy({ flow, min, tshower, tcold, eff = 0.95 }) {
  const litres = flow * min, MJ = (litres * C_W * Math.max(0, tshower - tcold)) / 1000, kWh = MJ / 3.6 / eff;
  return { litres, MJ, kWh, rupees: kWh * TARIFF, kW: (flow / 60) * C_W * Math.max(0, tshower - tcold) };
}

// ---------------------------------------------------------------- colours
export const COL = {
  brass: 0xd0a245, cut: 0xf0d590, chrome: 0xdfe4ec, rubber: 0x2b2e36, water: 0x4fc3ff, deep: 0x2f86d6,
  hot: 0xff5a3d, cold: 0x3f8cff, wax: 0xffb547, copper: 0xc9793f, good: 0x5ce1a9, warn: 0xffb547, red: 0xff5a5a,
  steel: 0xc3c8d1, tile: 0x39404d, white: 0xf3f4f6, dark: 0x4d525e, spool: 0xbfc6d2,
};
// Water temperature to colour: blue (cold) → pale (comfortable) → orange → red (scalding).
const STOPS = [[10, 0x2f6bff], [20, 0x3fa9ff], [30, 0x8ee6ff], [38, 0xe8eef8], [45, 0xffc46b], [55, 0xff8a3d], [65, 0xff3b30], [80, 0xd01060]];
const cA = new THREE.Color(), cB = new THREE.Color();
export function tempColor(T, out = new THREE.Color()) {
  if (!(T > STOPS[0][0])) return out.set(STOPS[0][1]);
  for (let i = 1; i < STOPS.length; i++) {
    if (T <= STOPS[i][0]) { cA.set(STOPS[i - 1][1]); cB.set(STOPS[i][1]); return out.copy(cA).lerp(cB, (T - STOPS[i - 1][0]) / (STOPS[i][0] - STOPS[i - 1][0])); }
  }
  return out.set(STOPS[STOPS.length - 1][1]);
}
export const cssTemp = (T) => '#' + tempColor(T).getHexString();
export const S = 0.06;                                      // scene units per millimetre
export const brass = (o = {}) => M.metal(COL.brass, { roughness: 0.36, metalness: 0.85, side: THREE.DoubleSide, ...o });
export const cutFace = (color = COL.cut, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0.15, side: THREE.DoubleSide, ...o });

// ---------------------------------------------------------------- screen helpers
export const inReel = () => document.body.classList.contains('gb-reel');
export const narrowScreen = () => window.innerWidth < 560 && !inReel();
export const isPortrait = (stage) => stage.camera.aspect < 0.9;
export function rows(head, list, note = '', keep = 3, width = 300) {
  const nar = narrowScreen();
  return `<div style="max-width:${width}px"><div class="big">${head}</div>` + (nar ? list.slice(0, keep) : list).map(([a, b, cls]) => `<div class="row"><span>${a}</span><b${cls ? ` class="${cls}"` : ''}>${b}</b></div>`).join('') + (note && !nar ? `<small>${note}</small>` : '') + '</div>';
}
// On a phone-width stage hide minor labels and nudge the picture down, clear of the readout.
// wideX nudges the picture sideways on a wide screen (a fraction of the view).
export function fitNarrow(stage, minor = [], y = -0.14, wideX = 0) {
  const narrow = stage.host.clientWidth < 560 && !inReel();
  minor.forEach((l) => { if (l) l.visible = !narrow; });
  const sy = narrow ? y : 0, sx = narrow || inReel() ? 0 : wideX;
  if (!stage.shift || stage.shift[1] !== sy || stage.shift[0] !== sx) stage.setShift(sx, sy);
  return narrow;
}
// The stage backs the camera off on narrow frames (stage.js). fitView undoes that, so a view can
// be given as a true distance D from the target along dir.
export const aspectK = (stage) => Math.min(2.5, Math.max(1, 1.45 / Math.max(0.3, stage.camera.aspect)));
export function fitView(stage, target, dir, D) {
  const k = aspectK(stage), d = new THREE.Vector3(...dir).normalize().multiplyScalar(D / k);
  return { pos: [target[0] + d.x, target[1] + d.y, target[2] + d.z], target };
}
// Call every frame. Re-frames when the stage flips between wide, phone-narrow and tall (the
// 1080×1920 video), or when key changes. pick(mode, key) returns { pos, target } or nothing.
export function framer(stage, pick) {
  let last = null;
  return (key = '') => {
    // narrow: a phone-width stage with the readout over its top left. tall: the upright video frame.
    const mode = stage.host.clientWidth < 560 && !inReel() ? 'narrow' : isPortrait(stage) ? 'tall' : 'wide';
    const id = mode + '|' + key;
    if (id === last) return mode;
    const first = last === null; last = id;
    const v = pick(mode, key);
    if (v && (!stage.moved || !first)) stage.setView(v.pos, v.target, first ? 0.4 : 0.9);
    return mode;
  };
}
export const fmt = (v, d = 1) => (Math.abs(v) >= 100 ? Math.round(v).toLocaleString('en-IN') : v.toFixed(d));
export const fmtBar = (pa) => (pa / BAR < 0.995 ? (pa / BAR).toFixed(2) : (pa / BAR).toFixed(1)) + ' bar';
export const fmtTime = (sec) => (!isFinite(sec) ? 'never' : sec >= 3600 ? (sec / 3600).toFixed(1) + ' h' : sec >= 90 ? Math.round(sec / 60) + ' min' : Math.round(sec) + ' s');

// A chart board: a canvas on a plane. place(reelPos, reelScale) moves it for the tall video frame.
export function board(root, w, h, pxW, pxH, draw, pos, rotY = 0) {
  const c = document.createElement('canvas'); c.width = pxW; c.height = pxH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const redraw = () => { draw(g, pxW, pxH); tex.needsUpdate = true; };
  redraw();
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide }));
  mesh.position.set(...pos); mesh.rotation.y = rotY; root.add(mesh);
  const b = { mesh, redraw, home: { p: new THREE.Vector3(...pos), r: rotY } };
  b.place = (reelPos, reelScale = 1, reelRot = 0) => {
    if (inReel() && reelPos) { mesh.position.set(...reelPos); mesh.rotation.y = reelRot; mesh.scale.setScalar(reelScale); }
    else { mesh.position.copy(b.home.p); mesh.rotation.y = b.home.r; mesh.scale.setScalar(1); }
  };
  return b;
}
export function panelBg(g, w, h) { g.clearRect(0, 0, w, h); g.fillStyle = 'rgba(8,10,16,.9)'; g.beginPath(); g.roundRect(0, 0, w, h, 22); g.fill(); }
// Axes for a simple line chart. Returns X(v), Y(v) mappers.
export function axes(g, w, h, { title, sub = '', x0 = 0, x1 = 1, y0 = 0, y1 = 1, xt = [], yt = [], xl = '', pad = [92, 70, 30, 60] }) {
  panelBg(g, w, h);
  const [pl, pt, pr, pb] = pad, cw = w - pl - pr, ch = h - pt - pb;
  const X = (v) => pl + cw * (v - x0) / (x1 - x0), Y = (v) => pt + ch * (1 - (v - y0) / (y1 - y0));
  g.fillStyle = '#e8eef8'; g.font = 'bold 44px sans-serif'; g.textAlign = 'left'; g.fillText(title, 26, 54);
  if (sub) { g.font = '32px sans-serif'; g.fillStyle = 'rgba(255,255,255,.62)'; g.textAlign = 'right'; g.fillText(sub, w - 26, 54); g.textAlign = 'left'; }
  g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 2; g.font = '32px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)';
  for (const [v, t] of yt) { g.beginPath(); g.moveTo(pl, Y(v)); g.lineTo(pl + cw, Y(v)); g.stroke(); g.textAlign = 'right'; g.fillText(t, pl - 12, Y(v) + 11); }
  g.textAlign = 'center';
  for (const [v, t] of xt) { g.fillText(t, X(v), pt + ch + 38); g.beginPath(); g.moveTo(X(v), pt + ch); g.lineTo(X(v), pt + ch + 6); g.stroke(); }
  if (xl) g.fillText(xl, pl + cw / 2, h - 14);
  g.textAlign = 'left';
  return { X, Y, pl, pt, cw, ch };
}
export function plot(g, X, Y, fn, a, b, color, width = 6, n = 90) {
  g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.beginPath();
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n, y = fn(x); if (i) g.lineTo(X(x), Y(y)); else g.moveTo(X(x), Y(y)); }
  g.stroke();
}
export function marker(g, x, y, text, color = '#ffb547', w = 9999) {
  g.fillStyle = color; g.beginPath(); g.arc(x, y, 12, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 3; g.stroke();
  if (text) { g.font = 'bold 38px sans-serif'; const tw = g.measureText(text).width; g.fillText(text, x + 18 + tw > w - 10 ? x - 18 - tw : x + 18, Math.max(30, y - 12)); }
}

// ---------------------------------------------------------------- cut-away geometry
function geoFrom(P, N) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  return g;
}
// A quad A,B,C,D with a normal at each corner; wound to face the way its normals point.
function quad(P, N, A, B, C, D, nA, nB, nC, nD) {
  const ux = C[0] - A[0], uy = C[1] - A[1], uz = C[2] - A[2], vx = D[0] - B[0], vy = D[1] - B[1], vz = D[2] - B[2];
  const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx;
  const flip = gx * (nA[0] + nC[0]) + gy * (nA[1] + nC[1]) + gz * (nA[2] + nC[2]) < 0;
  if (flip) { P.push(...A, ...C, ...B, ...A, ...D, ...C); N.push(...nA, ...nC, ...nB, ...nA, ...nD, ...nC); }
  else { P.push(...A, ...B, ...C, ...A, ...C, ...D); N.push(...nA, ...nB, ...nC, ...nA, ...nC, ...nD); }
}
function flat(polys, mat, mirror = false, z = 0) {
  const shapes = polys.map((poly) => new THREE.Shape(poly.map(([r, y]) => new THREE.Vector2(mirror ? -r : r, y))));
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shapes), mat);
  m.position.z = z; m.receiveShadow = true;
  return m;
}
// A part turned on a lathe: a closed outline of [r, y] points spun round the Y axis, with crisp
// edges. cut: keep only the back half (z ≤ 0) and close the two sliced faces with capMat.
// holes: [{ side: 1 | -1, y, r }] round holes drilled through the wall along ±X (for a pipe joining).
// caps: { right: [outline…], left: [outline…] } to draw the sliced faces by hand (where holes cut them).
export function turned(profile, mat, capMat, { cut = true, seg = 36, holes = [], caps = null, step = 2.5 } = {}) {
  const grp = new THREE.Group(), P = [], N = [], n = profile.length;
  let area = 0;
  for (let i = 0; i < n; i++) { const p = profile[i], q = profile[(i + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
  const sgn = area >= 0 ? 1 : -1, sweep = cut ? Math.PI : Math.PI * 2, ns = cut ? seg : seg * 2;
  const at = (r, y, a) => [r * Math.cos(a), y, -r * Math.sin(a)];
  for (let i = 0; i < n; i++) {
    const p = profile[i], q = profile[(i + 1) % n];
    if (p[0] < 1e-6 && q[0] < 1e-6) continue;
    const len = Math.hypot(q[0] - p[0], q[1] - p[1]); if (len < 1e-6) continue;
    const nr = sgn * (q[1] - p[1]) / len, ny = -sgn * (q[0] - p[0]) / len;
    const sub = holes.length ? Math.max(1, Math.ceil(len / step)) : 1;
    for (let k = 0; k < sub; k++) {
      const r0 = lerp(p[0], q[0], k / sub), y0 = lerp(p[1], q[1], k / sub), r1 = lerp(p[0], q[0], (k + 1) / sub), y1 = lerp(p[1], q[1], (k + 1) / sub);
      for (let j = 0; j < ns; j++) {
        const a = (j / ns) * sweep, b = ((j + 1) / ns) * sweep;
        if (holes.length) {
          const am = (a + b) / 2, rm = (r0 + r1) / 2, ym = (y0 + y1) / 2, x = rm * Math.cos(am), z = rm * Math.sin(am);
          if (holes.some((h) => h.side * x > 0 && (ym - h.y) ** 2 + z * z < h.r * h.r)) continue;
        }
        const na = [nr * Math.cos(a), ny, -nr * Math.sin(a)], nb = [nr * Math.cos(b), ny, -nr * Math.sin(b)];
        quad(P, N, at(r0, y0, a), at(r1, y1, a), at(r1, y1, b), at(r0, y0, b), na, na, nb, nb);
      }
    }
  }
  const body = new THREE.Mesh(geoFrom(P, N), mat); body.castShadow = true; body.receiveShadow = true;
  grp.add(body); grp.body = body;
  if (cut && capMat) {
    grp.add(flat(caps?.right || [profile], capMat, false), flat(caps?.left || [profile], capMat, true));
  }
  return grp;
}
// The same, spun round the X axis from [x, r] points. The slice still faces +Z.
export function turnedX(profile, mat, capMat, o = {}) {
  const g = turned(profile.map(([x, r]) => [r, x]), mat, capMat, o);
  g.rotation.z = -Math.PI / 2;
  const wrap = new THREE.Group(); wrap.add(g);
  return wrap;
}
// Points along a circular arc in the XY plane (angles in radians).
export function arc(cx, cy, R, a0, a1, n = 12) {
  const out = [];
  for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; out.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]); }
  return out;
}
// A pipe along a path of [x, y] points in the XY plane, outer radius ro, bore ri (0 for a solid
// rod). cut: keep the back half and close the sliced walls with capMat.
export function pipeCut(pts, ro, ri, mat, capMat, { cut = true, seg = 14, ends = true } = {}) {
  const grp = new THREE.Group(), P = [], N = [], CP = [], CN = [], n = pts.length;
  const T = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; });
  const sweep = cut ? Math.PI : Math.PI * 2, ns = cut ? seg : seg * 2;
  const off = (i, a) => { const [tx, ty] = T[i]; return [-ty * Math.cos(a), tx * Math.cos(a), -Math.sin(a)]; };
  const pt = (i, o, r) => [pts[i][0] + o[0] * r, pts[i][1] + o[1] * r, o[2] * r];
  const neg = (v) => [-v[0], -v[1], -v[2]];
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < ns; j++) {
      const a = (j / ns) * sweep, b = ((j + 1) / ns) * sweep;
      const oa0 = off(i, a), ob0 = off(i, b), oa1 = off(i + 1, a), ob1 = off(i + 1, b);
      quad(P, N, pt(i, oa0, ro), pt(i + 1, oa1, ro), pt(i + 1, ob1, ro), pt(i, ob0, ro), oa0, oa1, ob1, ob0);
      if (ri > 0) quad(P, N, pt(i, oa0, ri), pt(i + 1, oa1, ri), pt(i + 1, ob1, ri), pt(i, ob0, ri), neg(oa0), neg(oa1), neg(ob1), neg(ob0));
    }
    if (cut) for (const a of [0, Math.PI]) {
      const o0 = off(i, a), o1 = off(i + 1, a), z = [0, 0, 1];
      quad(CP, CN, pt(i, o0, ri), pt(i + 1, o1, ri), pt(i + 1, o1, ro), pt(i, o0, ro), z, z, z, z);
    }
  }
  if (ends) for (const i of [0, n - 1]) {
    const d = i ? 1 : -1, nrm = [T[i][0] * d, T[i][1] * d, 0];
    for (let j = 0; j < ns; j++) {
      const a = (j / ns) * sweep, b = ((j + 1) / ns) * sweep, oa = off(i, a), ob = off(i, b);
      quad(P, N, pt(i, oa, ri), pt(i, oa, ro), pt(i, ob, ro), pt(i, ob, ri), nrm, nrm, nrm, nrm);
    }
  }
  const body = new THREE.Mesh(geoFrom(P, N), mat); body.castShadow = true; body.receiveShadow = true;
  grp.add(body); grp.body = body;
  if (cut && capMat) { const cap = new THREE.Mesh(geoFrom(CP, CN), capMat); cap.receiveShadow = true; grp.add(cap); }
  return grp;
}
// A screw thread: a thin helix round the Y axis from y0 to y1.
export function helix(r, y0, y1, pitch, wire, mat) {
  const turns = Math.abs(y1 - y0) / pitch, nn = Math.max(8, Math.round(turns * 20)), pts = [];
  for (let i = 0; i <= nn; i++) { const t = i / nn, a = t * turns * Math.PI * 2; pts.push(new THREE.Vector3(r * Math.cos(a), lerp(y0, y1, t), -r * Math.sin(a))); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), nn * 2, wire, 6, false), mat);
  m.castShadow = true;
  return m;
}
export function cyl(r, y0, y1, mat, seg = 28, r1 = r) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r, y1 - y0, seg), mat);
  m.position.y = (y0 + y1) / 2; m.castShadow = true; m.receiveShadow = true;
  return m;
}
// Make a part see-through or solid again.
export function ghost(obj, on, opacity = 0.16) {
  obj.traverse((o) => {
    if (!o.material || o.isCSS2DObject) return;
    const m = o.material;
    if (m.userData.op0 === undefined) { m.userData.op0 = m.opacity; m.userData.tr0 = m.transparent; m.userData.dw0 = m.depthWrite; }
    m.transparent = on || m.userData.tr0; m.opacity = on ? opacity : m.userData.op0; m.depthWrite = on ? false : m.userData.dw0;
    o.castShadow = !on;
  });
}

// ---------------------------------------------------------------- flowing water
// Dots that travel along a path of [x, y, z, radius, mode] points. mode 0: inside a sliced pipe
// (the dots keep to the back half), 1: all round the centre line, 2: a free-falling stream.
// The path is measured by volume, so dots speed up where the passage narrows, as real water must.
// seal: the index of the point where the valve closes. With no flow, the dots upstream stay put
// (the water is still there, under pressure) and the ones downstream drain away and are not replaced.
export function makeFlow(n, { color = COL.water, size = 0.95 } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color, toneMapped: false }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = false;
  const o = new THREE.Object3D(), NS = 150;
  const PX = new Float32Array(NS + 1), PY = new Float32Array(NS + 1), PZ = new Float32Array(NS + 1), PR = new Float32Array(NS + 1);
  const NX = new Float32Array(NS + 1), NY = new Float32Array(NS + 1), V = new Float32Array(NS + 1), MODE = new Uint8Array(NS + 1);
  const fr = (v) => v - Math.floor(v);
  const c0 = [], la = [], lb = [];
  for (let i = 0; i < n; i++) { c0.push(fr((i + 0.5) * 0.6180339887)); const rr = Math.sqrt(fr(i * 0.7548776662 + 0.31)), th = 2 * Math.PI * fr(i * 0.5698402910 + 0.17); la.push(rr * Math.cos(th)); lb.push(rr * Math.sin(th)); }
  let seal0 = null, seal = 0.5, phU = 0, phD = 0, tail = 0, front = 0, empty = true, jetK = 1;
  const tmp = new THREE.Vector3();
  const api = { mesh, size };
  api.setPath = (pts, sealIdx) => {
    const m = pts.length, curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), false, 'centripetal');
    for (let s = 0; s <= NS; s++) {
      const t = s / NS; curve.getPoint(t, tmp); PX[s] = tmp.x; PY[s] = tmp.y; PZ[s] = tmp.z;
      const k = t * (m - 1), i = Math.min(m - 2, Math.floor(k));
      PR[s] = lerp(pts[i][3], pts[i + 1][3], k - i); MODE[s] = pts[i][4] || 0;
    }
    V[0] = 0;
    for (let s = 1; s <= NS; s++) {
      const dx = PX[s] - PX[s - 1], dy = PY[s] - PY[s - 1], dz = PZ[s] - PZ[s - 1], ds = Math.hypot(dx, dy, dz), r = (PR[s] + PR[s - 1]) / 2;
      V[s] = V[s - 1] + ds * r * r * (MODE[s - 1] ? 1 : 0.5);
    }
    for (let s = 0; s <= NS; s++) {
      V[s] /= V[NS];
      const a = Math.max(0, s - 1), b = Math.min(NS, s + 1), tx = PX[b] - PX[a], ty = PY[b] - PY[a], l = Math.hypot(tx, ty);
      if (l > 1e-6) { NX[s] = -ty / l; NY[s] = tx / l; } else { NX[s] = 1; NY[s] = 0; }
    }
    const ks = (sealIdx / (m - 1)) * NS, i = Math.min(NS - 1, Math.floor(ks));
    seal = clamp(lerp(V[i], V[i + 1], ks - i), 0.02, 0.98);
    if (seal0 === null) seal0 = seal;
  };
  api.setJet = (k) => { jetK = k; };
  // Start with the downstream side already full (a tap that has been running).
  api.prime = () => { empty = false; tail = 0; front = 1; };
  // speed: fraction of the path's volume moved each second. 0 means shut.
  api.update = (dt, speed, drain = 0.5) => {
    const open = speed > 1e-6;
    phU += speed * dt;
    if (open) { if (empty) { empty = false; front = 0; } tail = 0; front = Math.min(1, front + speed * dt / (1 - seal)); phD += speed * dt; }
    else if (!empty) { const d = drain * dt; tail += d / (1 - seal); front = Math.min(1, front + d / (1 - seal)); phD += d; if (tail >= 1) { empty = true; tail = 0; front = 0; } }
    const D0 = 1 - seal0;
    for (let i = 0; i < n; i++) {
      let c, vis = true;
      if (c0[i] < seal0) c = fr((c0[i] + phU) / seal0) * seal;
      else { const loc = fr((c0[i] - seal0 + phD) / D0); vis = !empty && loc >= tail && loc <= front; c = seal + loc * (1 - seal); }
      if (!vis) { o.position.set(0, -9999, 0); o.scale.setScalar(1e-4); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); continue; }
      let lo = 0, hi = NS;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (V[mid] <= c) lo = mid; else hi = mid; }
      const k = (c - V[lo]) / Math.max(1e-9, V[hi] - V[lo]), mode = MODE[lo];
      const r = lerp(PR[lo], PR[hi], k) * 0.82 * (mode === 2 ? jetK : 1);
      const nx = lerp(NX[lo], NX[hi], k), ny = lerp(NY[lo], NY[hi], k);
      o.position.set(lerp(PX[lo], PX[hi], k) + nx * la[i] * r, lerp(PY[lo], PY[hi], k) + ny * la[i] * r, lerp(PZ[lo], PZ[hi], k) + (mode ? lb[i] : -Math.abs(lb[i])) * r);
      o.scale.setScalar(size * (mode === 2 ? 0.55 + 0.45 * jetK : 1)); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return api;
}

// ---------------------------------------------------------------- sectioned valve bodies
// The valves are drawn as a body sliced through its middle: each solid region of the section is
// an outline of [x, y] points (mm) pushed back from the slice plane (z = 0) by `depth`.
export const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
export const mirror = (poly) => poly.map(([x, y]) => [-x, y]).reverse();
export const flipY = (poly) => poly.map(([x, y]) => [x, -y]).reverse();
export function prism(poly, depth, mat, capMat = null, z = 0) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(poly.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false });
  g.translate(0, 0, z - depth);
  const m = new THREE.Mesh(g, capMat ? [capMat, mat] : mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
// Flat shapes (the water seen in the passages, back walls) at depth z.
export function plate(polys, mat, z = 0) {
  const m = new THREE.Mesh(new THREE.ShapeGeometry(polys.map((p) => new THREE.Shape(p.map(([x, y]) => new THREE.Vector2(x, y))))), mat);
  m.position.z = z;
  return m;
}
export const waterMat = (color = COL.water, opacity = 0.5) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, toneMapped: false, depthWrite: false, side: THREE.DoubleSide });
// A polyline with its corners rounded to radius r, for pipes and flow paths.
export function roundPath(pts, r = 8, n = 6) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i], a = pts[i - 1], b = pts[i + 1];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), rr = Math.min(r, la / 2, lb / 2);
    const A = [p[0] + (a[0] - p[0]) * rr / la, p[1] + (a[1] - p[1]) * rr / la], B = [p[0] + (b[0] - p[0]) * rr / lb, p[1] + (b[1] - p[1]) * rr / lb];
    for (let k = 0; k <= n; k++) { const t = k / n, u = 1 - t; out.push([u * u * A[0] + 2 * u * t * p[0] + t * t * B[0], u * u * A[1] + 2 * u * t * p[1] + t * t * B[1]]); }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

// ---------------------------------------------------------------- falling spray
// Drops thrown from nozzles: each leaves its nozzle at speed v along the nozzle's direction and
// then falls freely, y = y0 + vy·t − ½·g·t², until it reaches the floor.
// set(emitters): [{ o: [x, y, z], d: [dx, dy, dz] }]. update(dt, { v, g, floor, show, color, size }).
export function makeSpray(n, { size = 1, stretch = 1.7 } = {}) {
  const mesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshBasicMaterial({ color: COL.water, toneMapped: false, transparent: true, opacity: 0.9 }), n);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; mesh.castShadow = false;
  const o = new THREE.Object3D(), fr = (v) => v - Math.floor(v);
  const ph = Array.from({ length: n }, (_, i) => fr((i + 0.5) * 0.6180339887)), jit = Array.from({ length: n }, (_, i) => [fr(i * 0.7548776662) - 0.5, fr(i * 0.5698402910) - 0.5]);
  let em = [{ o: [0, 0, 0], d: [0, -1, 0] }], clock = 0;
  const api = { mesh };
  api.set = (e) => { if (e.length) em = e; };
  api.update = (dt, { v = 1, g = 9810, floor = -100, show = 1, color = null, sz = size, spread = 0.03, start = 0 }) => {
    clock += dt;
    if (color) mesh.material.color.copy(color);
    for (let i = 0; i < n; i++) {
      const e = em[i % em.length];
      if (i / n >= show || !(v > 0)) { o.position.set(0, -99999, 0); o.scale.setScalar(1e-4); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); continue; }
      const dx = e.d[0] + jit[i][0] * spread, dz = e.d[2] + jit[i][1] * spread, vy = e.d[1] * v;
      const T = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(1e-6, e.o[1] - floor))) / g;
      const t = start + fr(ph[i] + clock / T) * (T - start);
      o.position.set(e.o[0] + dx * v * t, e.o[1] + vy * t - 0.5 * g * t * t, e.o[2] + dz * v * t);
      o.scale.set(sz, sz * stretch, sz); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };
  return api;
}

// ---------------------------------------------------------------- the little shower on a valve's outlet
// A sliced pipe from the valve's outlet (a path of [x, y] points, mm) to a small shower head that
// points down, with the mixed water flowing in it and spray below. Used by the three valve chapters.
export function makeOutlet(pts, { floor = -60, n = 150, drops = 170 } = {}) {
  const g = new THREE.Group(), chrome = M.metal(COL.chrome, { roughness: 0.25, side: THREE.DoubleSide }), cap = cutFace(0xf2f4f8);
  const path = roundPath(pts, 14), end = pts[pts.length - 1];
  g.add(pipeCut(path, 7.5, 5, chrome, cap));
  const head = turned([[5, 0], [8.5, 0], [8.5, -4], [24, -12], [24, -18], [0, -18], [0, -16], [22, -16], [22, -12.6], [5, -4.4]], chrome, cap);
  head.position.set(end[0], end[1], 0); g.add(head);
  const water = plate([[[-22, -16], [22, -16], [22, -12.6], [5, -4.4], [-5, -4.4], [-22, -12.6]]], waterMat(), -0.6); water.position.x = end[0]; water.position.y = end[1]; g.add(water);
  const flow = makeFlow(n, { size: 1.5 }); g.add(flow.mesh);
  flow.setPath([...path.map(([x, y]) => [x, y, 0, 4.6, 0]), [end[0], end[1] - 10, 0, 12, 0], [end[0], end[1] - 15, 0, 20, 0]], 0);
  const spray = makeSpray(drops, { size: 1.3 }); g.add(spray.mesh);
  const em = [];
  for (let i = -3; i <= 3; i++) em.push({ o: [end[0] + i * 6.4, end[1] - 18.5, 0], d: [i * 0.03, -1, 0] });
  for (let i = -2; i <= 2; i++) em.push({ o: [end[0] + i * 7, end[1] - 18.5, -9], d: [i * 0.03, -1, -0.03] });
  spray.set(em);
  const col = new THREE.Color();
  let shown = 0;
  // q: litres a minute; T: outlet temperature. Jets leave at v = Q / (nozzle area), 30 mm² here.
  g.update = (dt, q, T, { slow = 0.22 } = {}) => {
    tempColor(T, col);
    flow.mesh.material.color.copy(col); water.material.color.copy(col);
    flow.update(dt, q * 0.05, 0.6);
    shown = q > 0.05 ? Math.min(1, shown + dt * 2) : Math.max(0, shown - dt * 1.5);
    water.visible = shown > 0.02;
    const v = Math.max(0.6, (q / 60000) / 30e-6);                    // m/s
    spray.update(dt * slow, { v: v * 1000, g: 9810, floor, show: shown * clamp(q / 9, 0.12, 1), color: col });
  };
  g.end = end;
  return g;
}

// ---------------------------------------------------------------- small parts
// A round handle seen from the side, on a spindle that rises as it unscrews.
export function makeHandle(color) {
  const g = new THREE.Group();
  g.add(cyl(11, 0, 7, M.metal(COL.chrome, { roughness: 0.25 }), 28, 9));
  const bar = new THREE.Mesh(new THREE.BoxGeometry(34, 4.5, 6), M.metal(COL.chrome, { roughness: 0.25 })); bar.position.y = 4; bar.castShadow = true; g.add(bar);
  const dot = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 1, 20), M.glow(color)); dot.position.y = 7.3; g.add(dot);
  return g;
}
// Bathroom wall tiles, for context (units as given).
export function makeTiles(w, h, tile, color = '#2a303b', line = '#343c4a') {
  const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
  x.fillStyle = color; x.fillRect(0, 0, 256, 256); x.strokeStyle = line; x.lineWidth = 5;
  for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(256, i * 128); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / (2 * tile), h / (2 * tile)); t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, transparent: true }));
  m.receiveShadow = true;
  return m;
}
// A thermometer strip drawn on a chart canvas: 15 to 70 °C, with the comfortable band and the
// scald limit marked, and a pointer at T.
export function thermoStrip(g, x, y, w, h, T, { lo = 15, hi = 70, ghostT = null } = {}) {
  const X = (t) => x + w * clamp((t - lo) / (hi - lo), 0, 1), gr = g.createLinearGradient(x, 0, x + w, 0);
  for (let t = lo; t <= hi; t += 5) gr.addColorStop((t - lo) / (hi - lo), cssTemp(t));
  g.fillStyle = gr; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill();
  g.strokeStyle = '#5ce1a9'; g.lineWidth = 4; g.strokeRect(X(36), y - 5, X(41) - X(36), h + 10);
  g.strokeStyle = '#ff5a5a'; g.beginPath(); g.moveTo(X(T_LIMIT), y - 12); g.lineTo(X(T_LIMIT), y + h + 12); g.stroke();
  g.font = '30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.textAlign = 'center';
  for (let t = 20; t <= hi; t += 10) g.fillText(t + '°', X(t), y + h + 38);
  g.fillStyle = '#5ce1a9'; g.fillText('comfortable', (X(36) + X(41)) / 2 - 30, y - 18);
  g.fillStyle = '#ff8a8a'; g.fillText('49 °C limit', X(T_LIMIT) + 90, y - 18);
  if (ghostT !== null && isFinite(ghostT)) { g.strokeStyle = 'rgba(255,255,255,.75)'; g.setLineDash([8, 8]); g.lineWidth = 4; g.beginPath(); g.moveTo(X(ghostT), y - 4); g.lineTo(X(ghostT), y + h + 4); g.stroke(); g.setLineDash([]); }
  if (isFinite(T)) { g.fillStyle = '#fff'; g.beginPath(); g.moveTo(X(T), y + h * 0.45); g.lineTo(X(T) - 13, y - 8); g.lineTo(X(T) + 13, y - 8); g.closePath(); g.fill(); g.strokeStyle = '#07080c'; g.lineWidth = 3; g.stroke(); }
  g.textAlign = 'left';
  return X;
}
// A scrolling record of values against time, for the charts that show a temperature holding steady.
export function makeTrace(span = 20, step = 0.1) {
  const n = Math.round(span / step), a = new Float32Array(n).fill(NaN), b = new Float32Array(n).fill(NaN);
  let acc = 0;
  return {
    n, a, b, span,
    push(dt, va, vb) { acc += dt; while (acc >= step) { acc -= step; a.copyWithin(0, 1); b.copyWithin(0, 1); a[n - 1] = va; b[n - 1] = vb; } },
    fill(va, vb) { a.fill(va); b.fill(vb); },
  };
}
export function drawTrace(g, w, h, tr, { title, sub = '', y0 = 20, y1 = 65, la = 'with the valve', lb = 'plain mixer' }) {
  const yt = []; for (let t = y0; t <= y1; t += 10) yt.push([t, t + '°']);
  const { X, Y, pl, cw } = axes(g, w, h, { title, sub, x0: 0, x1: tr.n - 1, y0, y1, yt, xl: `the last ${tr.span} seconds`, pad: [96, 78, 28, 62] });
  g.fillStyle = 'rgba(92,225,169,.16)'; g.fillRect(pl, Y(41), cw, Y(36) - Y(41));
  g.strokeStyle = '#ff5a5a'; g.lineWidth = 3; g.setLineDash([10, 8]); g.beginPath(); g.moveTo(pl, Y(T_LIMIT)); g.lineTo(pl + cw, Y(T_LIMIT)); g.stroke(); g.setLineDash([]);
  const line = (arr, color, width, dash) => {
    g.strokeStyle = color; g.lineWidth = width; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath(); let pen = false;
    for (let i = 0; i < tr.n; i++) { const v = arr[i]; if (!isFinite(v)) { pen = false; continue; } const yy = Y(clamp(v, y0, y1)); if (pen) g.lineTo(X(i), yy); else { g.moveTo(X(i), yy); pen = true; } }
    g.stroke(); g.setLineDash([]);
  };
  line(tr.b, 'rgba(255,255,255,.6)', 4, [10, 8]); line(tr.a, '#ffb547', 7);
  g.font = '32px sans-serif'; g.fillStyle = '#ffb547'; g.fillText('━ ' + la, pl + 14, Y(y1) + 36); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillText('┅ ' + lb, pl + 14 + cw * 0.42, Y(y1) + 36);
  g.fillStyle = '#ff8a8a'; g.textAlign = 'right'; g.fillText('49 °C limit', pl + cw - 10, Y(T_LIMIT) - 10); g.textAlign = 'left';
}
export { THREE, M, clamp, lerp };
