// Chapter 3: the pressure-balancing spool. A hollow piston (the spool) slides in a sleeve between
// the hot and cold inlets. Each side's water enters through slots in the spool's wall, so the
// overlap of slot and inlet port is a throttle. The pressure after each throttle pushes on that
// end of the spool. If the cold supply drops, the hot end pushes harder: the spool slides towards
// the cold end, which narrows the hot slot and widens the cold one, until the two pressures after
// the spool are equal again. The mixing valve downstream then sees equal pressures whatever the
// supplies do, so the hot-to-cold share (and the temperature) holds; only the flow falls.
// Model: each supply (0.3 to 3 bar) through its pipe (K 10), its spool slot (12 mm² per mm of
// overlap, 4 mm at rest, travel ±4 mm), its mixing gate (20 mm² shared by the handle), then the
// riser and a 60-nozzle head. The spool sits where the two end pressures balance (bisection).
// Standard: ASSE 1016 / ASME A112.1016 / CSA B125.16 type P valves must hold the outlet within
// 3.6 °F (2 °C) when a supply pressure changes, and have a limit stop at 120 °F (49 °C).
import { THREE, M, clamp, approach, arrow } from '../kit.js';
import { S, COL, BAR, rK, rOpen, mm2, lpm, solveMix, mixT, fmtScald, tempColor, brass, cutFace, prism, plate, waterMat, mirror, rect, pipeCut, makeFlow, makeOutlet, makeTrace, drawTrace, board, rows, fitNarrow, framer, fitView } from '../shower.js';

const D = 16, TRAVEL = 4, THOT = 60, TCOLD = 25;
const GATE = 20, R_IN = rK(10), R_OUT = rK(4) + rOpen(mm2(60 * Math.PI * 0.45 ** 2), 0.85);
const slot = (ov) => rOpen(mm2(12 * clamp(ov, 0, 8) + 0.5), 0.7);
// Flows and pressures with the spool at x (mm, + towards the cold end).
export function at(s, x, coldK = 1) {
  const Ph = s.hotP * BAR, Pc = s.coldP * BAR * coldK;
  const Rsh = R_IN + slot(4 - x), Rsc = R_IN + slot(4 + x);
  const r = solveMix({ Ph, Pc, Rh: Rsh + rOpen(mm2(GATE * s.mixset), 0.7), Rc: Rsc + rOpen(mm2(GATE * (1 - s.mixset)), 0.7), Ro: R_OUT });
  return { ...r, x, PhA: Ph - Rsh * r.Qh ** 2, PcA: Pc - Rsc * r.Qc ** 2, T: mixT(r.Qh, THOT, r.Qc, TCOLD), Ph, Pc };
}
// Where the spool comes to rest: the two end pressures equal, or hard against a stop.
export function rest(s, coldK = 1) {
  const f = (x) => { const r = at(s, x, coldK); return r.PhA - r.PcA; };
  if (f(-TRAVEL) <= 0) return -TRAVEL;
  if (f(TRAVEL) >= 0) return TRAVEL;
  let lo = -TRAVEL, hi = TRAVEL;
  for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (f(m) > 0) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

const LEFT = [[-52, -30], [-20, -30], [-20, 0], [-40, 0], [-40, 38], [-5, 38], [-5, 60], [-14, 60], [-14, 46], [-52, 46]];
const OUTLINE = [[-52, -30], [52, -30], [52, 46], [14, 46], [14, 60], [-14, 60], [-14, 46], [-52, 46]];
const Y0 = 9.6;

export default {
  id: 'balance',
  short: 'Pressure balance',
  title: 'The pressure-balancing spool',
  subtitle: 'A sliding piston that pinches the stronger side to match the weaker one.',
  view: { pos: [3, 8, 27], target: [0.4, 8, 0] },
  learn: `<p>The mixer in the last chapter trusts the two pipes to keep pushing equally. They do not. When a toilet cistern refills or a tap opens, the <b>cold pressure dips</b>, and the shower turns hot in a second or two.</p>
    <p>A <b>pressure-balancing valve</b> fixes this with one moving part and no electronics. Between the inlets and the mixing valve sits a <b>spool</b>: a hollow piston free to slide. Hot water enters through slots at one end and cold through slots at the other. The pressure on each side pushes on its own end of the spool.</p>
    <p>If the cold pressure falls, the hot end wins and the spool <b>slides towards the cold side</b>. That movement half-closes the hot slot and opens the cold slot wider. It stops where the two pressures behind the spool are equal again. The share of hot and cold stays what you set, so the <b>temperature holds</b>. What you lose is flow: the shower goes weaker, not hotter.</p>
    <p>It balances <b>pressure, not temperature</b>. If the geyser runs out of hot water, the spool does nothing. Shower-valve standards in North America (ASSE 1016) ask these valves to hold the outlet within 2 °C through a pressure change. They suit homes on mains or pump pressure. In an Indian home fed by an overhead tank, both pipes start from the same low pressure, and a spool cannot add pressure that is not there.</p>
    <p class="tip"><b>Try it:</b> press Flush with the spool free and watch it slide. Then jam the spool and flush again.</p>`,
  terms: [
    { t: 'Pressure-balancing valve', d: 'A shower valve that keeps the hot and cold pressures equal, so the mix does not change when one supply dips.' },
    { t: 'Spool', d: 'A piston that slides in a sleeve. Its slots line up more or less with the inlet ports as it moves.' },
    { t: 'Throttle', d: 'A narrow opening that uses up pressure. Narrower means more pressure lost across it.' },
    { t: 'Thermal shock', d: 'A sudden jump in shower temperature, hot or cold, that can make a person slip or fall.' },
  ],
  defaults: { mixset: 0.4, coldP: 2, hotP: 2, spool: true },
  controls: [
    { key: 'flush', type: 'buttons', label: 'Somewhere else in the house', items: [{ label: 'Flush a toilet', act: (s, inst) => inst.flush() }] },
    { key: 'spool', type: 'toggle', label: 'Spool free to slide', hint: 'Off: the spool is jammed in the middle, like a plain mixer.' },
    { key: 'coldP', type: 'range', label: 'Cold supply pressure', min: 0.3, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) + ' bar' },
    { key: 'hotP', type: 'range', label: 'Hot supply pressure', min: 0.3, max: 3, step: 0.05, fmt: (v) => v.toFixed(2) + ' bar' },
    { key: 'mixset', type: 'range', label: 'Temperature handle', min: 0.1, max: 0.9, step: 0.01, ends: ['cooler', 'hotter'], fmt: (v) => Math.round(v * 100) + '% hot opening' },
  ],
  quiz: [
    { q: 'The cold pressure suddenly halves. Which way does the spool move, and what does it do?', options: ['Towards the hot side, opening the hot slot', 'Towards the cold side, narrowing the hot slot and widening the cold one', 'It does not move', 'It shuts both sides'], answer: 1, why: 'The hot end now pushes harder, so the spool slides towards the cold end. That pinches the hot flow and frees the cold, until the pressures behind the spool match.' },
    { q: 'With a pressure-balancing valve, what do you notice when someone flushes?', options: ['The shower gets much hotter', 'The shower stops', 'The shower gets weaker for a moment but stays at about the same temperature', 'Nothing at all'], answer: 2, why: 'The valve keeps the hot-to-cold share by cutting back the stronger side. Less water arrives, at nearly the same temperature.' },
    { q: 'The geyser is running out and its water is cooling. Will the spool keep your shower warm?', options: ['No: it only balances pressure and cannot feel temperature', 'Yes, it senses temperature', 'Yes, by adding pressure', 'Only in summer'], answer: 0, why: 'A spool reacts to pressure alone. Holding a set temperature needs a thermostatic valve, in the next chapter.' },
  ],
  reel: [
    { ms: 5800, caption: 'A pressure-balancing spool slides towards the weaker side and pinches the stronger one, so the mix holds.', set: { mixset: 0.4, hotP: 2, spool: true }, anim: { coldP: [2, 0.8] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(S); G.position.y = Y0; stage.root.add(G);
    const bm = brass(), cm = cutFace();
    G.add(prism(OUTLINE, D * 0.3, brass({ color: 0x8f6e2c }), null, -D * 0.7));
    [LEFT, mirror(LEFT), rect(-12, -30, 12, 0), rect(-32, 16, 32, 30)].forEach((p) => G.add(prism(p, D, bm, cm)));
    const wHot = plate([rect(-20, -45, -12, 0), rect(-40, 0, 0, 16), rect(-40, 16, -32, 38), rect(-32, 30, -5, 38)], waterMat(), -D * 0.62);
    const wCold = plate([rect(12, -45, 20, 0), rect(0, 0, 40, 16), rect(32, 16, 40, 38), rect(5, 30, 32, 38)], waterMat(), -D * 0.62);
    const wMix = plate([rect(-5, 30, 5, 60)], waterMat(), -D * 0.61);
    G.add(wHot, wCold, wMix);
    const stub = (x, color) => pipeCut([[x, -45], [x, -30]], 7, 4, M.plastic(color, { side: THREE.DoubleSide }), cutFace(color));
    G.add(stub(-16, 0xd9694f), stub(16, 0x4f86d9));
    // the spool: a hollow piston with a wall across its middle and slots near each end
    const spool = new THREE.Group(), sm = M.metal(0x7f95c4, { roughness: 0.3 }), sc = cutFace(0x9db4e6);
    [rect(-22, 0, -16, 2.5), rect(-8, 0, 8, 2.5), rect(16, 0, 22, 2.5), rect(-22, 13.5, 22, 16), rect(-2, 2.5, 2, 13.5)].forEach((p) => spool.add(prism(p, D, sm, sc, 0.4)));
    G.add(spool);
    // pressure arrows on the two faces of the middle wall
    const aH = arrow(COL.hot, 1, 3.2, 0.9), aC = arrow(COL.cold, 1, 3.2, 0.9);
    aH.rotation.z = -Math.PI / 2; aC.rotation.z = Math.PI / 2; G.add(aH, aC);
    // the mixing valve after the spool: two gates on one rocking handle
    const gate = (x) => { const g = prism(rect(-2, 0, 2, 14), D, M.metal(COL.steel), cutFace(0xe6e9ef), 0.5); g.position.x = x; G.add(g); return g; };
    const gH = gate(-18), gC = gate(18);
    const rocker = new THREE.Group(); const barM = new THREE.Mesh(new THREE.BoxGeometry(44, 3, 3), M.metal(COL.chrome, { roughness: 0.25 })); rocker.add(barM);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 6, 24), M.metal(COL.chrome, { roughness: 0.25 })); knob.rotation.x = Math.PI / 2; rocker.add(knob);
    rocker.position.set(0, 48, 5); G.add(rocker);
    const out = makeOutlet([[0, 60], [0, 120], [94, 120], [94, 110]], { floor: -44 }); G.add(out);
    const fH = makeFlow(110, { color: COL.hot, size: 1.4 }), fC = makeFlow(110, { color: COL.cold, size: 1.4 });
    G.add(fH.mesh, fC.mesh);
    const tr = makeTrace(20, 0.1);
    const bd = board(G, 230, 104, 1150, 520, (g, w, h) => drawTrace(g, w, h, tr, { title: 'Shower temperature', sub: 'a flush drops the cold pressure', la: 'spool free', lb: 'spool jammed' }), [-6, -102, 0]);
    const lb = {
      hot: stage.label('Hot in', [-16, -52, 0], G, 'hot'), cold: stage.label('Cold in', [16, -52, 0], G),
      spool: stage.label('Spool', [0, 8, 14], G), pH: stage.label('', [-62, -14, 0], G, 'hot'), pC: stage.label('', [62, -14, 0], G),
      mix: stage.label('Temperature handle', [-30, 62, 6], G), out: stage.label('', [47, 133, 0], G, 'hot'),
    };
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.3, 8.2, 0], [0.04, 0.03, 1], 35) : mode === 'narrow' ? fitView(stage, [-0.5, 8.2, 0], [0.04, 0.03, 1], 33) : fitView(stage, [0.4, 8.1, 0], [0.06, 0.03, 1], 28)));
    const col = new THREE.Color();
    let x = 0, dip = 0, T = 0, primed = false, redraw = 0, cur = null, plain = null;
    return {
      flush() { dip = 6; },
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); T += dt;
        frame();
        fitNarrow(stage, [lb.spool, lb.mix, lb.hot, lb.cold], -0.14, 0.11);
        dip = Math.max(0, dip - dt);
        // a flush: the cistern refills for a few seconds and the cold pressure sags by 55%
        const k = dip > 0 ? 1 - 0.55 * clamp(Math.min((6 - dip) / 0.3, dip / 0.6), 0, 1) : 1;
        const target = s.spool ? rest(s, k) : 0;
        x = primed ? approach(x, target, 9, dt) : target;
        cur = at(s, x, k); plain = at(s, 0, k);
        if (!primed) { primed = true; tr.fill(cur.T, plain.T); }
        tr.push(dt, cur.T, plain.T);
        spool.position.x = x;
        const pa = cur.PhA / BAR, pc = cur.PcA / BAR;
        aH.set(3 + pa * 7); aH.position.set(x - 2 - (3 + pa * 7), 8, 3);
        aC.set(3 + pc * 7); aC.position.set(x + 2 + (3 + pc * 7), 8, 3);
        const gh = 8 * s.mixset, gc = 8 * (1 - s.mixset);
        gH.position.y = 30 + gh; gC.position.y = 30 + gc;
        rocker.rotation.z = Math.atan2(gc - gh, 36);
        const mk = (sx, ov, gap) => {
          const xs = sx < 0 ? x : -x;
          return [[-16, -45], [-16, -6], [clamp(xs - 12, -19, -13), 1.2, Math.max(0.5, ov / 2)], [xs - 12, 7, 4.6], [-26, 8, 5.2], [-35, 10, 4.6], [-36, 24], [-34, 33], [-18, 34, Math.max(0.5, gap / 2)], [-9, 34], [-2, 36, 3], [-0.5, 44, 2.6]].map(([px, py, r = 3.4]) => [sx < 0 ? px : -px, py, 0, r, 0]);
        };
        fH.setPath(mk(-1, 4 - x, gh), 2); fC.setPath(mk(1, 4 + x, gc), 2);
        fH.update(dt, lpm(cur.Qh) * 0.045, 0.5); fC.update(dt, lpm(cur.Qc) * 0.045, 0.5);
        wHot.material.color.copy(tempColor(THOT, col)); fH.mesh.material.color.copy(tempColor(THOT + 8, col));
        wCold.material.color.copy(tempColor(TCOLD, col)); fC.mesh.material.color.copy(tempColor(TCOLD - 8, col));
        wMix.material.color.copy(tempColor(cur.T, col));
        out.update(dt, lpm(cur.Q), cur.T);
        lb.pH.element.textContent = `Hot: ${(cur.Ph / BAR).toFixed(1)} bar in, ${pa.toFixed(2)} after`;
        lb.pC.element.textContent = `Cold: ${(cur.Pc / BAR).toFixed(1)} bar in, ${pc.toFixed(2)} after`;
        lb.spool.element.textContent = s.spool ? 'Spool (free)' : 'Spool (jammed)';
        lb.out.element.textContent = `${cur.T.toFixed(1)} °C`;
        bd.place(null);
        redraw += dt; if (redraw > 0.1) { redraw = 0; bd.redraw(); }
      },
      readout: (s) => {
        const r = cur || at(s, 0), p = plain || r, d = r.T - at(s, s.spool ? rest(s) : 0).T;
        return rows(`${r.T.toFixed(1)} °C shower`, [
          ['Flow', lpm(r.Q).toFixed(1) + ' L/min'],
          ['With the spool jammed', p.T.toFixed(1) + ' °C', p.T >= 49 ? 'no' : ''],
          ['Spool has moved', Math.abs(r.x) < 0.05 ? 'centred' : Math.abs(r.x).toFixed(1) + ' mm to ' + (r.x > 0 ? 'cold' : 'hot')],
          ['After the spool', `${(r.PhA / BAR).toFixed(2)} / ${(r.PcA / BAR).toFixed(2)} bar`],
          ['Serious burn at ' + p.T.toFixed(0) + ' °C', fmtScald(p.T), p.T >= 49 ? 'no' : 'ok'],
        ], Math.abs(r.x) >= TRAVEL - 0.01 ? 'The spool is against its stop: it has run out of travel.' : Math.abs(d) > 0.3 ? 'Sliding to a new balance.' : 'Hot 60 °C, cold 25 °C. The spool keeps the two pressures behind it equal.', 3, 250);
      },
    };
  },
};
