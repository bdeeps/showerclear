// Chapter 2: mixing hot and cold. A two-handle mixer sliced through the middle, feeding a shower.
// Supplies: both sides come from the same overhead tank, 6 m above the mixer (0.59 bar). The hot
// side runs through the geyser. Each side: its pipe run (shower.js: kPipe), then a screw-down
// valve: a rubber washer lifted off an 8 mm seat by a 2 mm-pitch thread. The water escapes under
// the washer through a ring-shaped gap of area π·d·lift, in series with the seat bore itself.
// Outlet: the riser and a shower head of 60 nozzles, 0.9 mm each.
// The other cold tap shares 8 m of the cold pipe, so opening it lowers the pressure at the mixer's
// cold inlet: the classic reason a shower turns hot when someone runs a tap or flushes.
import { THREE, M, clamp, approach } from '../kit.js';
import { S, COL, headPa, rK, rOpen, kPipe, mm2, lpm, solveMix, mixT, fmtScald, tempColor, cssTemp, brass, cutFace, prism, plate, waterMat, mirror, rect, pipeCut, makeFlow, makeSpray, makeOutlet, makeHandle, thermoStrip, board, panelBg, rows, fitNarrow, framer, fitView, inReel } from '../shower.js';

const HEAD = 6, SEAT_D = 8, PITCH = 2, D = 16;
const seatR = (lift) => {
  if (lift <= 0.01) return Infinity;
  const Ac = Math.PI * SEAT_D * lift, As = Math.PI * SEAT_D * SEAT_D / 4, A = 1 / Math.sqrt(1 / Ac ** 2 + 1 / As ** 2);
  return rOpen(mm2(A), 0.7) + rK(6);
};
const R_OUT = rK(4) + rOpen(mm2(60 * Math.PI * 0.45 ** 2), 0.85);
const R_SHARED = rK(kPipe(8, 3)), R_COLD = rK(3), R_HOT = rK(kPipe(8, 3) + 8), R_TAP = rK(16);
// The two openings, in turns of each spindle. One lever does the same job with one handle:
// lifting opens both, swinging shares the opening between hot and cold.
export function openings(s) {
  if (s.handle === 'lever') return { h: s.lift * clamp(0.5 + s.swing / 2, 0, 1), c: s.lift * clamp(0.5 - s.swing / 2, 0, 1) };
  return { h: s.hot, c: s.cold };
}
export function solve(s) {
  const o = openings(s), P = headPa(HEAD), Rh = R_HOT + seatR(o.h * PITCH), Rc = R_COLD + seatR(o.c * PITCH);
  // Pressure where the cold pipe splits to the mixer and to the other tap: bisect on it.
  let lo = 0, hi = P, r = null, Qt = 0;
  for (let i = 0; i < 36; i++) {
    const Pn = (lo + hi) / 2;
    r = solveMix({ Ph: P, Pc: Pn, Rh, Rc, Ro: R_OUT });
    Qt = s.other ? Math.sqrt(Pn / R_TAP) : 0;
    if (P - R_SHARED * (r.Qc + Qt) ** 2 > Pn) lo = Pn; else hi = Pn;
  }
  return { ...r, Pn: (lo + hi) / 2, P, Qt, T: mixT(r.Qh, s.thot, r.Qc, s.tcold), o };
}

const LEFT = [[-56, -30], [-47, -30], [-47, 12], [-52, 12], [-52, 30], [-32, 30], [-32, 28], [-7, 28], [-7, 60], [-16, 60], [-16, 40], [-30, 40], [-30, 54], [-54, 54], [-54, 40], [-62, 40], [-62, 0], [-56, 0]];
const MID = [[-37, -30], [-28, -30], [-28, 0], [28, 0], [28, -30], [37, -30], [37, 12], [32, 12], [32, 18], [7, 18], [7, 14], [-7, 14], [-7, 18], [-32, 18], [-32, 12], [-37, 12]];
const OUTLINE = [[-56, -30], [-28, -30], [-28, 0], [28, 0], [28, -30], [56, -30], [56, 0], [62, 0], [62, 40], [54, 40], [54, 54], [30, 54], [30, 40], [16, 40], [16, 60], [-16, 60], [-16, 40], [-30, 40], [-30, 54], [-54, 54], [-54, 40], [-62, 40], [-62, 0], [-56, 0]];
const Y0 = 9.6;

export default {
  id: 'mixing',
  short: 'Mixing hot and cold',
  title: 'Mixing hot and cold',
  subtitle: 'The temperature you feel is a weighted average of two streams.',
  view: { pos: [3, 8, 27], target: [0.4, 8, 0] },
  learn: `<p>A shower does not make warm water. It <b>mixes</b> hot water from the geyser (often 55 to 60 °C) with cold water from the tank. Each handle opens a valve: a rubber washer lifts off its seat and lets that side through (<a href="https://glassbox.how/tapclear/">TapClear</a> takes these valves apart). The two streams meet in the <b>mixing chamber</b> and go up to the head as one.</p>
    <p>The temperature that comes out follows one sum, the <b>mixing equation</b>: multiply each flow by its temperature, add them, and divide by the total flow. Three litres a minute at 60 °C with five at 25 °C gives eight litres a minute at about 38 °C. More hot or less cold both make it hotter, but one changes the total flow up and the other down.</p>
    <p>A <b>single-lever mixer</b> does the same sum with one handle. Lifting the lever opens both sides together. Swinging it shares the opening between hot and cold. Inside are two polished ceramic discs with holes that slide across each other.</p>
    <p>The trouble starts when the <b>pressure</b> on one side changes. Open another cold tap, or flush, and the cold pipe has to feed two outlets. Less cold reaches the mixer, the hot side wins, and the shower jumps hotter. The next two chapters show the two cures.</p>
    <p class="tip"><b>Try it:</b> set a comfortable 38 °C with the two knobs. Then switch on the other cold tap and watch the temperature jump.</p>`,
  terms: [
    { t: 'Mixing equation', d: 'Outlet temperature = (hot flow × hot temperature + cold flow × cold temperature) ÷ total flow.' },
    { t: 'Mixing chamber', d: 'The space inside the mixer where the hot and cold streams meet before going to the shower.' },
    { t: 'Flow rate', d: 'How much water passes each minute, in litres a minute.' },
    { t: 'Single-lever mixer', d: 'One handle that sets the total flow by lifting and the hot-to-cold share by swinging.' },
    { t: 'Scald', d: 'A burn from hot liquid. At 60 °C, adult skin is badly burned in about five seconds.' },
  ],
  defaults: { handle: 'knobs', hot: 0.18, cold: 0.3, lift: 0.6, swing: -0.1, thot: 60, tcold: 25, other: false },
  controls: [
    { key: 'handle', type: 'seg', label: 'Handles', options: [{ v: 'knobs', label: 'Two knobs' }, { v: 'lever', label: 'One lever' }] },
    { key: 'hot', type: 'range', label: 'Hot knob', min: 0, max: 1, step: 0.01, ends: ['shut', 'one full turn'], fmt: (v) => v.toFixed(2) + ' turn', hint: 'Used with two knobs.' },
    { key: 'cold', type: 'range', label: 'Cold knob', min: 0, max: 1, step: 0.01, ends: ['shut', 'one full turn'], fmt: (v) => v.toFixed(2) + ' turn' },
    { key: 'lift', type: 'range', label: 'Lever: lift for more water', min: 0, max: 1, step: 0.01, ends: ['off', 'full'], fmt: (v) => Math.round(v * 100) + '%', hint: 'Used with one lever.' },
    { key: 'swing', type: 'range', label: 'Lever: swing for temperature', min: -1, max: 1, step: 0.01, ends: ['all cold', 'all hot'], fmt: (v) => (v > 0.02 ? 'towards hot' : v < -0.02 ? 'towards cold' : 'middle') },
    { key: 'thot', type: 'range', label: 'Hot water from the geyser', min: 40, max: 75, step: 1, fmt: (v) => Math.round(v) + ' °C' },
    { key: 'tcold', type: 'range', label: 'Cold water from the tank', min: 10, max: 35, step: 1, ends: ['winter', 'summer'], fmt: (v) => Math.round(v) + ' °C' },
    { key: 'other', type: 'toggle', label: 'Someone opens another cold tap' },
  ],
  quiz: [
    { q: '3 L/min of water at 60 °C mixes with 6 L/min at 24 °C. What comes out?', options: ['9 L/min at 42 °C', '9 L/min at 36 °C', '6 L/min at 36 °C', '9 L/min at 84 °C'], answer: 1, why: '(3 × 60 + 6 × 24) ÷ 9 = 324 ÷ 9 = 36 °C. The flows add up, and the temperature is their weighted average.' },
    { q: 'You are showering and someone opens the kitchen cold tap. What usually happens?', options: ['Nothing', 'The shower gets colder', 'The shower gets hotter, because less cold water reaches the mixer', 'The geyser switches off'], answer: 2, why: 'The cold pipe now feeds two outlets, so its pressure at the mixer drops. The hot side keeps pushing as before, so its share of the mix goes up.' },
    { q: 'What does lifting a single lever straight up change?', options: ['Only the temperature', 'The total flow: both sides open together', 'The pressure in the tank', 'Nothing until you swing it'], answer: 1, why: 'Lifting opens hot and cold together and keeps their share the same. Swinging changes the share, and so the temperature.' },
  ],
  reel: [
    { ms: 5600, caption: 'A shower does not make warm water. It mixes hot water from the geyser with cold water from the tank.', set: { handle: 'knobs', cold: 0.3, thot: 60, tcold: 25, other: false }, anim: { hot: [0, 0.18] }, spin: 0 },
    { ms: 5400, caption: 'Open another cold tap and less cold reaches the mixer, so the shower jumps hotter.', set: { handle: 'knobs', hot: 0.18, cold: 0.3, thot: 60, tcold: 25 }, anim: { other: [false, true] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(S); G.position.y = Y0; stage.root.add(G);
    const bm = brass(), cm = cutFace();
    const back = prism(OUTLINE, D * 0.3, brass({ color: 0x8f6e2c }), null, -D * 0.7); G.add(back);
    [LEFT, mirror(LEFT), MID].forEach((p) => G.add(prism(p, D, bm, cm)));
    // water seen in the passages
    const wHot = plate([rect(-47, -45, -37, 12), rect(-52, 12, -32, 30), rect(-32, 18, -7, 28)], waterMat(), -D * 0.62);
    const wCold = plate([rect(37, -45, 47, 12), rect(32, 12, 52, 30), rect(7, 18, 32, 28)], waterMat(), -D * 0.62);
    const wMix = plate([rect(-7, 14, 7, 60)], waterMat(), -D * 0.61);
    G.add(wHot, wCold, wMix);
    // supply stubs
    const stub = (x, color) => pipeCut([[x, -45], [x, -30]], 8, 5, M.plastic(color, { side: THREE.DoubleSide }), cutFace(color));
    G.add(stub(-42, 0xd9694f), stub(42, 0x4f86d9));
    // the other cold tap: a branch off the cold pipe
    const br = new THREE.Group(); br.add(pipeCut([[47, -40], [104, -40], [110, -46]], 6, 4, M.plastic(0x4f86d9, { side: THREE.DoubleSide }), cutFace(0x4f86d9))); G.add(br);
    const tapSpray = makeSpray(40, { size: 1.5 }); tapSpray.set([{ o: [111, -48, 0], d: [0.12, -1, 0] }]); G.add(tapSpray.mesh);
    // plungers: washer, holder, spindle, handle
    const plunger = (x, color) => {
      const p = new THREE.Group();
      p.add(prism(rect(-6, 0, 6, 4), D, M.plastic(COL.rubber), null, 0.4));
      p.add(prism(rect(-7.5, 4, 7.5, 7), D, brass(), cutFace(), 0.4));
      p.add(prism(rect(-3, 7, 3, 52), D * 0.5, M.metal(COL.steel), cutFace(0xe6e9ef), 0.4));
      const h = makeHandle(color); h.position.y = 52; p.add(h); p.handle = h;
      p.position.x = x; G.add(p); return p;
    };
    const pH = plunger(-42, COL.hot), pC = plunger(42, COL.cold);
    // one lever, shown in lever mode
    const lever = new THREE.Group();
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 10, 24), M.metal(COL.chrome, { roughness: 0.25 })); hub.rotation.x = Math.PI / 2; lever.add(hub);
    const arm = new THREE.Group(); const stick = new THREE.Mesh(new THREE.BoxGeometry(7, 40, 5), M.metal(COL.chrome, { roughness: 0.25 })); stick.position.y = -20; arm.add(stick); lever.add(arm);
    lever.position.set(0, -6, 8); G.add(lever);
    // the riser and its shower head
    const out = makeOutlet([[0, 60], [0, 120], [94, 120], [94, 110]], { floor: -44 }); G.add(out);
    // flowing water
    const fH = makeFlow(110, { color: COL.hot, size: 1.5 }), fC = makeFlow(110, { color: COL.cold, size: 1.5 });
    G.add(fH.mesh, fC.mesh);
    const path = (sx, lift) => { const g = Math.max(0.5, lift / 2); return [[sx * 42, -45, 0, 4.6, 0], [sx * 42, 4, 0, 4.6, 0], [sx * 42, 12, 0, 3.6, 0], [sx * 37, 12 + g, 0, g, 0], [sx * 33.5, 15, 0, 1.6, 0], [sx * 33, 23, 0, 4.4, 0], [sx * 20, 23, 0, 4.4, 0], [sx * 9, 23, 0, 4.4, 0], [sx * 2, 26, 0, 4, 0], [sx * 1, 34, 0, 3, 0]]; };
    // the chart
    let cur = null;
    const bd = board(G, 230, 104, 1150, 520, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur) return;
      const qh = lpm(cur.Qh), qc = lpm(cur.Qc), q = qh + qc, s = cur.s;
      g.fillStyle = '#e8eef8'; g.font = 'bold 46px sans-serif'; g.fillText('The mixing sum', 30, 58);
      const bar = (y, v, T, name) => {
        g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(190, y, 480, 50);
        g.fillStyle = cssTemp(T); g.fillRect(190, y, 480 * clamp(v / 16, 0, 1), 50);
        g.fillStyle = '#e8eef8'; g.font = '42px sans-serif'; g.fillText(name, 30, y + 40);
        g.textAlign = 'right'; g.fillText(v.toFixed(1) + ' L/min × ' + Math.round(T) + ' °C', w - 30, y + 40); g.textAlign = 'left';
      };
      bar(84, qh, s.thot, 'Hot'); bar(146, qc, s.tcold, 'Cold'); bar(226, q, isFinite(cur.T) ? cur.T : 25, 'Mix');
      g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(30, 209, w - 60, 3);
      g.font = 'bold 44px sans-serif'; g.fillStyle = '#ffb547';
      g.fillText(q > 0.05 ? `(${qh.toFixed(1)} × ${Math.round(s.thot)} + ${qc.toFixed(1)} × ${Math.round(s.tcold)}) ÷ ${q.toFixed(1)} = ${cur.T.toFixed(1)} °C` : 'Both valves are shut: no flow', 30, 340);
      thermoStrip(g, 60, 410, w - 120, 46, cur.T);
    }, [-6, -102, 0]);
    const lb = {
      hot: stage.label('Hot, from the geyser', [-88, -22, 0], G, 'hot'), cold: stage.label('Cold, from the tank', [90, -14, 0], G),
      seat: stage.label('Washer lifts off its seat', [-70, 8, 8], G), mix: stage.label('Mixing chamber', [0, 6, 6], G),
      out: stage.label('', [47, 133, 0], G, 'hot'), tap: stage.label('Another cold tap', [82, -30, 0], G),
      lever: stage.label('One lever moves both openings', [0, -24, 12], G),
    };
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.3, 8.2, 0], [0.04, 0.03, 1], 35) : mode === 'narrow' ? fitView(stage, [-0.5, 8.2, 0], [0.04, 0.03, 1], 33) : fitView(stage, [0.4, 8.1, 0], [0.06, 0.03, 1], 28)));
    const col = new THREE.Color();
    let liftH = 0, liftC = 0, tapK = 0, T = 0, last = '';
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); T += dt;
        frame();
        fitNarrow(stage, [lb.seat, lb.mix, lb.cold, lb.hot], -0.14, 0.11);
        const r = solve(s); r.s = s; cur = r;
        liftH = approach(liftH, r.o.h * PITCH, 14, dt); liftC = approach(liftC, r.o.c * PITCH, 14, dt);
        // lifts are drawn twice life size so the gap can be seen
        pH.position.y = 12 + liftH * 2; pC.position.y = 12 + liftC * 2;
        pH.handle.rotation.y = -r.o.h * Math.PI * 2; pC.handle.rotation.y = r.o.c * Math.PI * 2;
        const lev = s.handle === 'lever';
        lever.visible = lb.lever.visible = lev;
        arm.rotation.z = -s.swing * 0.6; arm.rotation.x = -0.25 - s.lift * 0.75;
        fH.setPath(path(-1, liftH * 2), 2); fC.setPath(path(1, liftC * 2), 2);
        fH.update(dt, lpm(r.Qh) * 0.045, 0.5); fC.update(dt, lpm(r.Qc) * 0.045, 0.5);
        wHot.material.color.copy(tempColor(s.thot, col)); fH.mesh.material.color.copy(tempColor(s.thot + 8, col));
        wCold.material.color.copy(tempColor(s.tcold, col)); fC.mesh.material.color.copy(tempColor(s.tcold - 8, col));
        wMix.material.color.copy(tempColor(isFinite(r.T) ? r.T : s.tcold, col));
        out.update(dt, lpm(r.Q), isFinite(r.T) ? r.T : s.tcold);
        tapK = approach(tapK, s.other ? 1 : 0, 6, dt);
        tapSpray.update(dt * 0.3, { v: 1500, g: 9810, floor: -150, show: tapK, color: tempColor(s.tcold - 8, col), spread: 0.04 });
        lb.tap.element.textContent = s.other ? `Another cold tap: ${lpm(r.Qt).toFixed(0)} L/min` : 'Another cold tap (shut)';
        lb.tap.element.classList.toggle('hot', !!s.other);
        lb.out.element.textContent = lpm(r.Q) > 0.05 ? `${r.T.toFixed(1)} °C` : 'No flow';
        bd.place(null);
        const key = [r.Qh.toFixed(6), r.Qc.toFixed(6), s.thot, s.tcold].join();
        if (key !== last) { last = key; bd.redraw(); }
      },
      readout: (s) => {
        const r = solve(s), q = lpm(r.Q);
        if (q < 0.05) return rows('Both valves shut', [['Flow', '0 L/min'], ['Pressure waiting at the mixer', (r.P / 1e5).toFixed(2) + ' bar']], 'The water in the pipes is still pushing: the tank is 6 m above.', 3, 250);
        return rows(`${r.T.toFixed(1)} °C shower`, [
          ['Flow', q.toFixed(1) + ' L/min'],
          ['Hot share', Math.round(100 * r.Qh / r.Q) + '%'],
          ['Cold pressure here', (r.Pn / 1e5).toFixed(2) + ' bar', s.other ? 'no' : ''],
          ['Serious burn after', fmtScald(r.T), r.T >= 49 ? 'no' : 'ok'],
        ], r.T >= 49 ? 'Too hot. Standards for shower valves stop at 49 °C.' : r.T > 41 ? 'Hotter than most people like: 36 to 41 °C is comfortable.' : r.T < 33 ? 'A cool shower.' : 'Comfortable.', 3, 250);
      },
    };
  },
};
