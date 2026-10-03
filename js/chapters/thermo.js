// Chapter 4: the thermostatic mixing valve. A wax capsule sits in the mixed water. Its body is
// fixed to a shuttle (a ring that slides between a cold seat and a hot seat), and its piston rests
// against the spindle of the temperature knob. Warmer water melts and swells the wax, the piston
// pushes out against the spindle, and so the capsule and shuttle move the other way: towards the
// hot seat. That narrows the gap hot water enters by and widens the cold gap. A return spring
// pushes everything back as the wax cools. Turning the knob moves the spindle and so the balance.
// Model: shuttle travel 1.2 mm between seats 22 mm across (gap areas π·D·gap), drawn 3.3 times
// larger so the gaps can be seen. Wax stroke 0.25 mm per °C over the working range and a 0.7 s
// lag: assumed, typical of the published behaviour of these cartridges (they settle in a second
// or two and hold a couple of degrees), not a maker's figure. The knob is calibrated at equal
// supply pressures (0.6 bar) with 60 °C hot and 25 °C cold; away from that the valve settles slightly off
// the set point, as real ones do (a proportional controller).
// Fail-safe: with the cold supply gone the wax swells until the shuttle sits on the hot seat.
// ASSE 1016 type T, and the UK's TMV2 scheme (BS EN 1111 and 1287), require this shut-off.
import { THREE, M, clamp, approach, spring, rod } from '../kit.js';
import { S, COL, BAR, rK, rOpen, mm2, lpm, solveMix, mixT, fmtScald, tempColor, brass, cutFace, prism, plate, waterMat, mirror, flipY, rect, pipeCut, makeFlow, makeOutlet, makeTrace, drawTrace, board, rows, fitNarrow, framer, fitView } from '../shower.js';

const D = 16, TCOLD = 25, HALF = 0.6, SEAT_D = 22, KW = 0.25, TAU = 0.7, VIS = 2 / HALF;
// Supplies: an overhead tank 6 m up gives 0.6 bar on each side. Outlet: the riser and a 60-nozzle head.
const R_IN = rK(10), R_OUT = rK(4) + rOpen(mm2(60 * Math.PI * 0.45 ** 2), 0.85);
const gapR = (g) => rOpen(mm2(Math.PI * SEAT_D * clamp(g, 0, 2 * HALF)), 0.7);
// x: the shuttle's position in mm, + towards the hot seat.
export function at(s, x, o = {}) {
  const Ph = (o.hotP ?? s.hotP) * BAR, Pc = (o.coldP ?? s.coldP) * BAR, th = o.thot ?? s.thot;
  const r = solveMix({ Ph, Pc, Rh: R_IN + gapR(HALF - x), Rc: R_IN + gapR(HALF + x), Ro: R_OUT });
  return { ...r, x, T: mixT(r.Qh, th, r.Qc, TCOLD), gh: clamp(HALF - x, 0, 2 * HALF), gc: clamp(HALF + x, 0, 2 * HALF) };
}
// Where the knob's calibration puts the shuttle for a set temperature (equal 0.6 bar supplies, 60 °C hot).
const REF = { hotP: 0.6, coldP: 0.6, thot: 60 };
export function calX(tset) {
  let lo = -HALF, hi = HALF;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (at({}, m, REF).T > tset) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
export const shuttleX = (s, Twax) => clamp(calX(s.tset) + KW * (Twax - s.tset), -HALF, HALF);
// Where it settles: the temperature at which the wax holds the shuttle where that temperature needs it.
export function settle(s) {
  // As the wax warms, the shuttle trims the hot, so (mixed temperature − wax temperature) falls
  // steadily with wax temperature: bisect for where they agree.
  let lo = TCOLD - 5, hi = Math.max(s.thot, TCOLD) + 5;
  for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2, r = at(s, shuttleX(s, m)); if (r.Q > 1e-7 && r.T > m) lo = m; else hi = m; }
  return at(s, shuttleX(s, (lo + hi) / 2));
}

// The section, mirrored about the axis. Knob on the left, outlet tube on the right.
const TOP = mirror([[-46, 9], [-7, 9], [-7, 12], [-20, 12], [-20, 18], [-6, 18], [-6, 12], [6, 12], [6, 18], [20, 18], [20, 12], [7, 12], [7, 9], [20, 9], [20, 2.5], [30, 2.5], [30, 26], [-46, 26]]);
const LOW_OUT = mirror([[-46, -9], [-46, -46], [-17, -46], [-17, -18], [-20, -18], [-20, -12], [-7, -12], [-7, -9]]);
const LOW_MID = [[-9, -46], [9, -46], [9, -18], [6, -18], [6, -12], [-6, -12], [-6, -18], [-9, -18]];
const LOW_KNOB = mirror([[17, -46], [30, -46], [30, -2.5], [20, -2.5], [20, -9], [7, -9], [7, -12], [20, -12], [20, -18], [17, -18]]);
const OUTLINE = [[-30, -46], [46, -46], [46, 26], [-30, 26]];
const Y0 = 12.4;

export default {
  id: 'thermo',
  short: 'Thermostatic valve',
  title: 'The thermostatic valve',
  subtitle: 'A capsule of wax feels the mixed water and steers the mix itself.',
  view: { pos: [3, 8, 27], target: [0.4, 8, 0] },
  learn: `<p>A <b>thermostatic valve</b> does what your hand does on the knobs, but in about a second. Its heart is a small copper capsule filled with <b>wax</b>, sitting right in the stream of mixed water. Wax swells a lot as it warms and melts. The swelling pushes a steel pin out of the capsule, with real force.</p>
    <p>The pin rests against the <b>temperature knob's</b> spindle, so when it pushes out, the capsule itself moves the other way and carries a sliding ring, the <b>shuttle</b>, with it. The shuttle sits between two openings. Moving one way, it <b>narrows the hot gap and widens the cold gap</b>. A spring pushes it back when the wax cools.</p>
    <p>So the valve corrects itself. If the water turns too hot, for any reason, the wax swells and trims the hot. If the cold supply <b>fails completely</b>, the wax swells until the shuttle shuts the hot inlet, and the shower stops instead of scalding. That fail-safe is written into the standards for these valves, such as ASSE 1016 in North America and the TMV2 scheme in the UK.</p>
    <p>It also lets a geyser stay hot. The World Health Organization advises that stored hot water leave the heater at 60 °C or more, because <i>Legionella</i> bacteria grow in water between 20 and 50 °C. A thermostatic valve lets you store at 60 °C and still shower at 38 °C. Most have a <b>stop at 38 °C</b> that you must press to go hotter.</p>
    <p class="tip"><b>Try it:</b> drop the cold pressure and compare the two lines on the chart. Then press "Cold supply fails".</p>`,
  terms: [
    { t: 'Thermostatic mixing valve', d: 'A valve that senses the temperature of the mixed water and adjusts hot and cold by itself to hold it.' },
    { t: 'Wax element', d: 'A sealed copper capsule of wax with a pin. Warming the wax swells it and pushes the pin out.' },
    { t: 'Shuttle', d: 'A sliding ring between the hot and cold openings. Moving it narrows one and widens the other.' },
    { t: 'Fail-safe', d: 'Built so that a failure ends in the safe state. Here: no cold water means no water at all.' },
    { t: 'Legionella', d: 'Bacteria that can grow in warm, standing water and cause a serious lung infection when breathed in as fine spray.' },
  ],
  defaults: { tset: 38, thot: 60, coldP: 0.6, hotP: 0.6 },
  controls: [
    { key: 'tset', type: 'range', label: 'Temperature knob', min: 32, max: 46, step: 0.5, fmt: (v) => v.toFixed(1) + ' °C' + (v > 38 ? ' (past the 38 °C stop)' : '') },
    { key: 'coldP', type: 'range', label: 'Cold supply pressure', min: 0, max: 1.5, step: 0.02, fmt: (v) => v.toFixed(2) + ' bar' },
    { key: 'hotP', type: 'range', label: 'Hot supply pressure', min: 0, max: 1.5, step: 0.02, fmt: (v) => v.toFixed(2) + ' bar' },
    { key: 'thot', type: 'range', label: 'Hot water from the geyser', min: 45, max: 75, step: 1, fmt: (v) => Math.round(v) + ' °C' },
    { key: 'fail', type: 'buttons', label: 'Faults', items: [{ label: 'Cold supply fails', act: (s) => { s.coldP = 0; } }, { label: 'Put it back', act: (s) => { s.coldP = 0.6; s.hotP = 0.6; } }] },
  ],
  quiz: [
    { q: 'The mixed water gets too hot. What does the wax do?', options: ['It swells and moves the shuttle to narrow the hot gap and widen the cold gap', 'It shrinks and opens the hot side', 'It switches the geyser off', 'Nothing: it only senses pressure'], answer: 0, why: 'Warm wax swells and pushes its pin out. That shifts the shuttle towards the hot seat, so less hot and more cold get in.' },
    { q: 'The cold water supply fails while you shower. What should a thermostatic valve do?', options: ['Send full hot water', 'Shut the hot side, so the flow stops', 'Add air to cool it', 'Carry on as before'], answer: 1, why: 'With no cold to mix in, the outlet turns hot, the wax swells further and the shuttle closes on the hot seat. No water is safer than scalding water.' },
    { q: 'Why keep a geyser at 60 °C if you only shower at 38 °C?', options: ['Hotter water flows faster', 'It uses less electricity', 'The wax needs it', 'Legionella bacteria grow in warm stored water, and 60 °C stops them'], answer: 3, why: 'The WHO advises water should leave the heater at 60 °C or above. A thermostatic valve then mixes it down to a safe temperature at the shower.' },
  ],
  reel: [
    { ms: 5600, caption: 'A thermostatic valve hides a capsule of wax in the mixed water. Warm wax swells and pushes a pin.', set: { tset: 38, thot: 60, hotP: 0.6 }, anim: { coldP: [0.6, 0.3] }, spin: 0 },
    { ms: 5600, caption: 'If the cold supply fails, the wax swells until the hot inlet shuts. No water is safer than scalding water.', set: { tset: 38, thot: 60, hotP: 0.6 }, anim: { coldP: [0.3, 0] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(S); G.position.y = Y0; stage.root.add(G);
    const V = new THREE.Group(); V.scale.setScalar(1.6); V.position.x = -30; G.add(V);   // the valve, drawn 1.6 times larger than its outlet pipe
    const bm = brass(), cm = cutFace();
    V.add(prism(OUTLINE, D * 0.3, brass({ color: 0x8f6e2c }), null, -D * 0.7));
    [TOP, LOW_OUT, LOW_MID, LOW_KNOB].forEach((p) => V.add(prism(p, D, bm, cm)));
    // water: cold gallery (left), hot gallery (right), mixed water in the middle and the outlet tube
    const wCold = plate([rect(-17, -54, -9, -18), rect(-20, -18, -6, -12), rect(-20, 12, -6, 18)], waterMat(), -D * 0.62);
    const wHot = plate([rect(9, -54, 17, -18), rect(6, -18, 20, -12), rect(6, 12, 20, 18)], waterMat(), -D * 0.62);
    const wMix = plate([rect(-20, -9, 46, 9)], waterMat(), -D * 0.61);
    V.add(wHot, wCold, wMix);
    const stub = (x, color) => pipeCut([[x, -54], [x, -46]], 7, 4, M.plastic(color, { side: THREE.DoubleSide }), cutFace(color));
    V.add(stub(13, 0xd9694f), stub(-13, 0x4f86d9));
    // the moving set: shuttle ring, the spider that joins it to the capsule, the capsule and its wax
    const mov = new THREE.Group(), sm = M.metal(0x7f95c4, { roughness: 0.3 }), sc = cutFace(0x9db4e6);
    [rect(-5, 9, 5, 12), rect(-5, -12, 5, -9)].forEach((p) => mov.add(prism(p, D, sm, sc, 0.4)));
    [rect(-0.8, 4, 0.8, 9), rect(-0.8, -9, 0.8, -4)].forEach((p) => mov.add(prism(p, D * 0.25, sm, sc, 0.4)));
    mov.add(prism([[-2, -4], [4, -4], [4, -3.2], [31, -3.2], [31, 3.2], [4, 3.2], [4, 4], [-2, 4]], D, M.metal(COL.copper, { roughness: 0.4 }), cutFace(0xe0a070), 0.4));
    const waxMat = new THREE.MeshBasicMaterial({ color: COL.wax, toneMapped: false });
    const wax = plate([rect(1, -2.2, 29, 2.2)], waxMat, 0.5); mov.add(wax);
    V.add(mov);
    const pin = prism(rect(0, -1.1, 1, 1.1), D * 0.3, M.metal(0x8f97a6), cutFace(0xd6dbe4), 0.6); V.add(pin);
    const spindle = prism(rect(-1, -2.5, 0, 2.5), D * 0.5, M.metal(COL.steel), cutFace(0xe6e9ef), 0.45); V.add(spindle);
    const knob = rod(-12, 0, 15, 15, M.metal(COL.chrome, { roughness: 0.25 }), 32); V.add(knob);
    const mark = new THREE.Mesh(new THREE.BoxGeometry(12, 2.4, 2.4), M.glow(COL.hot)); V.add(mark);
    const ledge = [rect(40, 7, 42.5, 9), rect(40, -9, 42.5, -7)].map((p) => prism(p, D, bm, cm, 0.3)); ledge.forEach((l) => V.add(l));
    const coil = spring(0, 30, 6.2, 0.75, 6, M.metal(0x9aa3b2, { roughness: 0.35 })); V.add(coil);
    const out = makeOutlet([[43, 0], [64, 0], [64, 112], [114, 112], [114, 102]], { floor: -70 }); G.add(out);
    // flowing water: each side enters through its own gap, both below and (from round the back) above
    const mkF = (color) => { const f = makeFlow(70, { color, size: 1.0 }); V.add(f.mesh); return f; };
    const fH = mkF(COL.hot), fC = mkF(COL.cold), fH2 = mkF(COL.hot), fC2 = mkF(COL.cold);
    const tr = makeTrace(20, 0.1);
    const bd = board(G, 230, 104, 1150, 520, (g, w, h) => drawTrace(g, w, h, tr, { title: 'Shower temperature', sub: 'supplies changing', la: 'thermostatic valve', lb: 'plain mixer, same setting' }), [4, -146, 0]);
    const lb = {
      hot: stage.label('Hot in', [13, -58, 0], V, 'hot'), cold: stage.label('Cold in', [-13, -58, 0], V),
      wax: stage.label('Wax capsule', [20, 31, 6], V, 'hot'), sh: stage.label('Shuttle', [-4, 31, 6], V),
      knob: stage.label('Temperature knob', [-48, 24, 0], V), spring: stage.label('Return spring', [34, -31, 8], V),
      gh: stage.label('', [34, -22, 6], V, 'hot'), gc: stage.label('', [-34, -22, 6], V), out: stage.label('', [89, 125, 0], G, 'hot'),
    };
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.6, 8.0, 0], [0.04, 0.03, 1], 38) : mode === 'narrow' ? fitView(stage, [0.8, 10.0, 0], [0.04, 0.03, 1], 36) : fitView(stage, [0.2, 8.4, 0], [0.06, 0.03, 1], 34)));
    const col = new THREE.Color();
    let Tw = null, cur = null, plain = null, redraw = 0, vx = 0;
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt);
        frame();
        fitNarrow(stage, [lb.sh, lb.knob, lb.spring, lb.hot, lb.cold, lb.gh, lb.gc], -0.14, 0.13);
        if (Tw === null) { const r0 = settle(s); Tw = isFinite(r0.T) ? r0.T : s.tset; }
        // the wax warms towards the water round it; with no flow it keeps its temperature
        const n = 12;
        for (let i = 0; i < n; i++) { cur = at(s, shuttleX(s, Tw)); if (cur.Q > 1e-7) Tw += (cur.T - Tw) * (1 - Math.exp(-dt / n / TAU)); }
        cur = at(s, shuttleX(s, Tw)); plain = at(s, calX(s.tset));
        const flowing = cur.Q > 1e-7, Tout = flowing ? cur.T : NaN;
        if (!tr.primed) { tr.primed = true; tr.fill(Tout, plain.T); }
        tr.push(dt, Tout, plain.Q > 1e-7 ? plain.T : NaN);
        // positions, drawn VIS times larger than life
        vx = approach(vx, cur.x * VIS, 30, dt);
        mov.position.x = vx;
        // the pin's length depends only on the wax temperature; the knob sets where its tip rests
        const tip = calX(s.tset) * VIS - 2 - (11 + VIS * KW * (s.tset - 38));
        pin.position.x = tip; pin.scale.x = Math.max(0.5, vx - 2 - tip);
        spindle.position.x = tip; spindle.scale.x = 32;
        knob.position.x = tip - 30; mark.position.set(tip - 30, 15.5, 0);
        coil.position.x = vx + 5; coil.scale.x = (40 - (vx + 5)) / 30;
        waxMat.color.copy(tempColor(Tw + 6, col));
        const gh = Math.max(0.5, (HALF - cur.x) * VIS), gc = Math.max(0.5, (HALF + cur.x) * VIS);
        const side = (sx, g, up) => [[sx * 13, up * 54], [sx * 13, up * 22], [sx * 13, up * 15, 2.6], [sx * (7 - g / 2), up * 12.5, g / 2], [sx * (7 - g / 2), up * 8, g / 2], [sx * 3, up * 5.5, 2], [10, up * 6, 2.2], [26, up * 6, 2.4], [40, up * 4, 3]].map(([px, py, r = 3.4]) => [px, py, 0, r, 0]);
        const upper = (sx, g) => [[sx * 13, 15.5, 0, 2.4, 0], [sx * 12, 15, 0, 2.4, 0], [sx * (7 - g / 2), 12.5, 0, g / 2, 0], [sx * (7 - g / 2), 8, 0, g / 2, 0], [sx * 3, 5.5, 0, 2, 0], [10, 6, 0, 2.2, 0], [26, 6, 0, 2.4, 0], [40, 4, 0, 3, 0]];
        fH.setPath(side(1, gh, -1), 3); fC.setPath(side(-1, gc, -1), 3); fH2.setPath(upper(1, gh), 2); fC2.setPath(upper(-1, gc), 2);
        const qh = lpm(cur.Qh) * 0.07, qc = lpm(cur.Qc) * 0.07;
        fH.update(dt, qh, 0.6); fH2.update(dt, qh, 0.6); fC.update(dt, qc, 0.6); fC2.update(dt, qc, 0.6);
        wHot.material.color.copy(tempColor(s.thot, col)); fH.mesh.material.color.copy(tempColor(s.thot + 8, col)); fH2.mesh.material.color.copy(col);
        wCold.material.color.copy(tempColor(TCOLD, col)); fC.mesh.material.color.copy(tempColor(TCOLD - 8, col)); fC2.mesh.material.color.copy(col);
        wMix.material.color.copy(tempColor(flowing ? cur.T : Tw, col));
        out.update(dt, lpm(cur.Q), flowing ? cur.T : Tw);
        lb.gh.element.textContent = cur.gh < 0.01 ? 'Hot gap: shut' : `Hot gap ${cur.gh.toFixed(2)} mm`;
        lb.gc.element.textContent = cur.gc < 0.01 ? 'Cold gap: shut' : `Cold gap ${cur.gc.toFixed(2)} mm`;
        lb.out.element.textContent = flowing ? `${cur.T.toFixed(1)} °C` : 'Shut: no flow';
        bd.place(null);
        redraw += dt; if (redraw > 0.1) { redraw = 0; bd.redraw(); }
      },
      readout: (s) => {
        const r = cur || settle(s), p = plain || at(s, calX(s.tset)), flowing = r.Q > 1e-7, pT = p.Q > 1e-7 ? p.T : NaN;
        return rows(flowing ? `${r.T.toFixed(1)} °C shower` : 'Shut off: safe', [
          ['Flow', lpm(r.Q).toFixed(1) + ' L/min'],
          ['A plain mixer would give', isFinite(pT) ? pT.toFixed(1) + ' °C' : 'no flow', pT >= 49 ? 'no' : ''],
          ['Hot gap / cold gap', `${r.gh.toFixed(2)} / ${r.gc.toFixed(2)} mm`],
          ['Wax temperature', (Tw ?? s.tset).toFixed(1) + ' °C'],
          ['Serious burn at ' + (isFinite(pT) ? pT.toFixed(0) : '?') + ' °C', isFinite(pT) ? fmtScald(pT) : 'none', pT >= 49 ? 'no' : 'ok'],
        ], !flowing ? (s.coldP < 0.02 ? 'No cold water: the wax has closed the hot inlet.' : 'No supply pressure.') : Math.abs(r.T - s.tset) > 2 ? 'Outside what the wax can correct: the shuttle is on a seat.' : 'Gaps are drawn about three times life size.', 3, 250);
      },
    };
  },
};
