// Chapter 5: the shower head. Many small nozzles turn the pressure inside the head into thin,
// fast jets, and surface tension then breaks each jet into drops. Drawn in millimetres.
// Supply: the tank's water surface is h metres above the head (P = ρ g h), with an optional
// booster pump adding 2 bar (home pressure pumps are sold at about 1.5 to 3 bar). The water runs
// through h + 6 m of 15 mm pipe, five elbows and a fully open mixer (shower.js: kSupply), then
// through the nozzles. Everything is in series, so the pressure is shared: a head with a big total
// opening (the rain shower) leaves most of the pressure in the pipes and its jets come out slowly.
// Jet speed v = Q / (open nozzle area); break-up length and drop size from shower.js: breakup().
// Jets and drops move at about one eighth of life speed so the eye can follow them.
import { THREE, M, clamp, approach, tube } from '../kit.js';
import { COL, BAR, G as GRAV, headPa, kSupply, headFlow, breakup, HEADS, AIR, cutFace, turned, prism, plate, rect, waterMat, makeFlow, board, axes, plot, marker, rows, fitNarrow, framer, fitView } from '../shower.js';

const SC = 0.03, FALL = 450, SLOW = 0.125, PUMP = 2 * BAR, KD = 6;
export function state(s) {
  const dP = headPa(s.h) + (s.pump ? PUMP : 0);
  const f = headFlow(s.kind, dP, { blocked: s.scale, K: kSupply(s.h) }), b = breakup(f.d, f.v);
  return { ...f, ...b, dP, vHit: Math.sqrt(f.v * f.v + 2 * GRAV * 1) };
}
const shell = (R) => [[7, 70], [12, 70], [12, 46], [R * 0.5, 34], [R, 14], [R, -3], [0, -3], [0, 0], [R - 3, 0], [R - 3, 12], [R * 0.5 - 1, 30], [7, 42]];
const cavity = (R) => [[-(R - 3), 0], [R - 3, 0], [R - 3, 12], [R * 0.5 - 1, 30], [7, 42], [7, 70], [-7, 70], [-7, 42], [-(R * 0.5 - 1), 30], [-(R - 3), 12]];
// Nozzles drawn: rings on the half of the face behind the slice, as [x, z, r/R, angle].
function nozzles(H) {
  const out = [], rings = H.N > 100 ? [0.18, 0.36, 0.54, 0.72, 0.9] : H.N > 20 ? [0.3, 0.6, 0.88] : [0.62];
  rings.forEach((k, j) => { const n = H.N > 20 ? Math.round(4 + k * 12) : 7; for (let i = 0; i < n; i++) { const a = Math.PI + (Math.PI * (i + (j % 2 ? 0.5 : 0.15))) / (n - 0.35); if (a > 2 * Math.PI) continue; out.push([H.R * k * Math.cos(a), H.R * k * Math.sin(a), k, a]); } });
  return out;
}
const fr = (v) => v - Math.floor(v);

export default {
  id: 'head',
  short: 'The shower head',
  title: 'The shower head: jets and drops',
  subtitle: 'Small holes turn pressure into speed. How many holes decides how it feels.',
  view: { pos: [-3, 9, 24], target: [-4.7, 8.6, 0] },
  learn: `<p>A shower head is a hollow cup with a plate full of small <b>nozzles</b>. Water fills the cup and has only those holes to leave by. Squeezing through, it trades <b>pressure for speed</b>, the bargain at the heart of <a href="https://glassbox.how/bernoulliclear/">BernoulliClear</a>: the jet speed is about √(2 × pressure ÷ density). Just 0.2 bar inside the head throws jets out at over 5 metres a second.</p>
    <p>The catch is that the pressure has to be shared with the pipes, bends and mixer on the way. A <b>needle spray</b> has few, fine holes, so most of the pressure is still there at the head and the jets are fast. A big <b>rain shower</b> has so much open area that the pipes use up nearly all the pressure, and the water falls out slowly. On an <b>overhead tank</b> a few metres up (about 0.1 bar per metre, see <a href="https://glassbox.how/pressureclear/">PressureClear</a>) a rain shower can only dribble. That is why they are sold with a <b>pressure pump</b>.</p>
    <p>A thin jet does not stay whole. <b>Surface tension</b> pinches it into beads a little way below the head, each drop about twice as wide as the jet. An <b>air-induction</b> head sucks air in through side holes and sends out fat, bubbly drops: it feels full with far less water. A <b>massage</b> head spins a small turbine that opens the nozzles in turn, so the water arrives in pulses.</p>
    <p><b>Hard water</b> leaves limescale in the nozzles. Fewer open holes means less water, and the jets that are left shoot faster and sideways. Rubbing the soft nozzle tips, or a soak in vinegar, clears them.</p>
    <p class="tip"><b>Try it:</b> pick the rain shower and lower the tank to 2 m. Then switch on the pump. Now try the needle spray on the tank alone.</p>`,
  terms: [
    { t: 'Nozzle', d: 'A small hole that turns the pressure of the water behind it into a fast jet.' },
    { t: 'Head (of water)', d: 'The height of the water surface above the outlet. Each metre gives about 0.1 bar.' },
    { t: 'Surface tension', d: 'The pull between water molecules at a surface. It makes a thin jet bead up into drops.' },
    { t: 'Air induction', d: 'Using a fast jet inside the head to draw air in, so the spray is made of larger, air-filled drops.' },
    { t: 'Limescale', d: 'Chalky calcium carbonate left behind by hard water. It narrows and blocks nozzles.' },
  ],
  defaults: { kind: 'needle', h: 4, pump: false, scale: 0 },
  controls: [
    { key: 'kind', type: 'seg', label: 'Shower head', options: [{ v: 'rain', label: 'Rain' }, { v: 'needle', label: 'Needle' }, { v: 'air', label: 'Air' }, { v: 'massage', label: 'Massage' }], fmt: (v) => `${HEADS[v].N} nozzles × ${HEADS[v].d} mm` },
    { key: 'h', type: 'range', label: 'Tank water above the shower head', min: 1, max: 12, step: 0.5, ends: ['top floor', '4 floors down'], fmt: (v) => v.toFixed(1) + ' m (' + (headPa(v) / BAR).toFixed(2) + ' bar)' },
    { key: 'pump', type: 'toggle', label: 'Pressure pump (adds 2 bar)' },
    { key: 'scale', type: 'range', label: 'Nozzles blocked by limescale', min: 0, max: 0.7, step: 0.01, fmt: (v) => Math.round(v * 100) + '%' },
  ],
  quiz: [
    { q: 'Why does a big rain shower dribble when fed from an overhead tank just above the bathroom?', options: ['Its holes are too small', 'Its total opening is so large that the pipes use up almost all of the small pressure', 'Rain showers need hotter water', 'The tank is too full'], answer: 1, why: 'Pressure is shared between the pipes and the nozzles. With a huge open area the nozzles get very little of it, so the water leaves slowly.' },
    { q: 'What breaks a shower jet into drops?', options: ['Gravity alone', 'Air pushing on it', 'Surface tension pinching the thin jet', 'Heat'], answer: 2, why: 'A long thin cylinder of water is unstable. Surface tension squeezes it into beads about twice as wide as the jet, a short way below the nozzle.' },
    { q: 'Limescale blocks half the nozzles of a head. What happens?', options: ['Less water comes out, and the remaining jets are faster', 'More water comes out', 'Nothing changes', 'The water gets hotter'], answer: 0, why: 'With less open area the flow drops, so less pressure is lost in the pipes and more is left at the head: each open nozzle shoots harder.' },
  ],
  reel: [
    { ms: 5400, caption: 'A shower head trades pressure for speed. Sixty fine nozzles turn a gentle push into fast, thin jets.', set: { kind: 'needle', pump: false, scale: 0 }, anim: { h: [1, 8] }, spin: 0 },
    { ms: 5600, caption: 'A big rain shower on an overhead tank only dribbles. It needs a pressure pump to rain properly.', set: { kind: 'rain', h: 2, scale: 0 }, anim: { pump: [false, true] }, spin: 0 },
  ],

  build({ stage }) {
    const Y0 = FALL * SC + 0.7;
    const G = new THREE.Group(); G.scale.setScalar(SC); G.position.y = Y0; stage.root.add(G);
    const chrome = M.metal(COL.chrome, { roughness: 0.22, side: THREE.DoubleSide }), cap = cutFace(0xf2f4f8);
    // arm from the wall on the right, and a ball joint
    G.add(tube([[190, 122, -30], [70, 122, -8], [22, 116, 0], [0, 98, 0], [0, 84, 0]], 9, M.metal(COL.chrome, { roughness: 0.22 }), false, 60));
    const ball = new THREE.Mesh(new THREE.SphereGeometry(13, 24, 16), M.metal(COL.chrome, { roughness: 0.22 })); ball.position.y = 78; G.add(ball);
    // one head per kind
    const heads = {};
    for (const [kind, H] of Object.entries(HEADS)) {
      const g = new THREE.Group();
      g.add(turned(shell(H.R), chrome, cap));
      const w = plate([cavity(H.R)], waterMat(COL.water, 0.6), -0.6); g.add(w);
      const nz = nozzles(H), nub = new THREE.InstancedMesh(new THREE.CylinderGeometry(H.d * 1.5, H.d * 1.1, 5, 10), new THREE.MeshStandardMaterial({ roughness: 0.6 }), nz.length);
      const o = new THREE.Object3D(); nz.forEach(([x, z], i) => { o.position.set(x, -5, z); o.updateMatrix(); nub.setMatrixAt(i, o.matrix); nub.setColorAt(i, new THREE.Color(0x3a3f49)); });
      g.add(nub);
      if (kind === 'air') {
        // the restrictor plate with its small hole, and the air holes in the neck just below it
        [rect(-7, 54, -1.6, 57), rect(1.6, 54, 7, 57)].forEach((p) => g.add(prism(p, 10, M.metal(COL.brass), cutFace(), 0.5)));
        [rect(-12.5, 46, -7, 50), rect(7, 46, 12.5, 50)].forEach((p) => g.add(plate([p], new THREE.MeshBasicMaterial({ color: 0x10131a }), 0.6)));
      }
      if (kind === 'massage') {
        const wheel = new THREE.Group();
        wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(H.R - 8, H.R - 8, 2.5, 40, 1, false, 0, Math.PI), M.metal(COL.brass, { side: THREE.DoubleSide })));
        for (let i = 0; i < 8; i++) { const v = new THREE.Mesh(new THREE.BoxGeometry(2, 7, 16), M.metal(COL.brass)); const a = (i / 8) * Math.PI * 2; v.position.set(Math.cos(a) * 20, 4, Math.sin(a) * 20); v.rotation.y = -a + 0.6; wheel.add(v); }
        wheel.position.y = 3.5; g.add(wheel); g.wheel = wheel;
      }
      g.nz = nz; g.nub = nub; g.water = w; G.add(g); heads[kind] = g;
    }
    // water coming down the neck, and air being drawn into the air head
    const fIn = makeFlow(60, { size: 2.2 }); G.add(fIn.mesh);
    const fAirL = makeFlow(16, { color: 0xffffff, size: 1.6 }), fAirR = makeFlow(16, { color: 0xffffff, size: 1.6 }); G.add(fAirL.mesh, fAirR.mesh);
    fAirL.setPath([[-40, 62, 0, 4, 1], [-22, 52, 0, 3, 1], [-9, 48, 0, 2, 0], [-4, 40, 0, 3, 0], [-10, 22, 0, 6, 0]], 0);
    fAirR.setPath([[40, 62, 0, 4, 1], [22, 52, 0, 3, 1], [9, 48, 0, 2, 0], [4, 40, 0, 3, 0], [10, 22, 0, 6, 0]], 0);
    // jets and drops
    const MAXN = 64, jets = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 6), new THREE.MeshBasicMaterial({ color: 0x9fdcff, toneMapped: false, transparent: true, opacity: 0.9 }), MAXN);
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xbfe8ff, toneMapped: false }), MAXN * KD);
    [jets, drops].forEach((m) => { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.frustumCulled = false; G.add(m); });
    const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3();
    // a ruler beside the spray
    const ruler = new THREE.Group(); const rb = new THREE.Mesh(new THREE.BoxGeometry(1.5, FALL, 1.5), M.glow(0x56607a)); rb.position.set(0, -FALL / 2, 0); ruler.add(rb);
    for (let y = 0; y <= FALL; y += 50) { const t = new THREE.Mesh(new THREE.BoxGeometry(y % 100 ? 6 : 12, 1.5, 1.5), M.glow(0x56607a)); t.position.set(-(y % 100 ? 3 : 6), -y, 0); ruler.add(t); }
    ruler.position.x = 150; G.add(ruler);
    const tick = [100, 200, 300, 400].map((y) => stage.label(y / 10 + ' cm', [164, -y, 0], G));
    const mark = new THREE.Mesh(new THREE.BoxGeometry(280, 1.2, 1.2), M.glow(COL.warn)); G.add(mark);
    // the chart: flow against supply pressure for the four heads
    let cur = null, sNow = null;
    const curve = (kind, sc, hm) => headFlow(kind, headPa(hm), { blocked: sc, K: kSupply(sNow.h) }).lpm;
    const bd = board(G, 330, 250, 1056, 800, (g, w, h) => {
      const { X, Y } = axes(g, w, h, { title: 'Flow from each head', x0: 0, x1: 34, y0: 0, y1: 32, xt: [[0, '0'], [10, '1 bar'], [20.5, '2 bar'], [30.7, '3 bar']], yt: [[0, '0'], [10, '10'], [20, '20'], [30, '30 L/min']], xl: 'pressure pushing at the start of the pipe', pad: [150, 84, 30, 100] });
      if (!cur) return;
      g.fillStyle = 'rgba(92,225,169,.12)'; g.fillRect(X(1), Y(32), X(12) - X(1), Y(0) - Y(32));
      g.font = '30px sans-serif'; g.fillStyle = '#5ce1a9'; g.fillText('tank alone', X(1) + 10, Y(32) + 34);
      const cols = { rain: '#8ef0ff', needle: '#ffb547', air: '#c49bff', massage: '#ff8a8a' };
      for (const k of Object.keys(HEADS)) { g.globalAlpha = k === sNow.kind ? 1 : 0.35; plot(g, X, Y, (x) => curve(k, k === sNow.kind ? sNow.scale : 0, x), 0.2, 34, cols[k], k === sNow.kind ? 8 : 5, 60); g.font = '30px sans-serif'; g.fillStyle = cols[k]; g.fillText(HEADS[k].name.split(/[ -]/)[0], X(34) - 112, Y(curve(k, k === sNow.kind ? sNow.scale : 0, 33)) - 10); }
      g.globalAlpha = 1;
      marker(g, X(Math.min(34, cur.dP / (995 * 9.81))), Y(Math.min(32, cur.lpm)), cur.lpm.toFixed(1) + ' L/min', '#ffffff', w);
    }, [-290, -322, 0]);
    const lb = {
      name: stage.label('', [40, -428, 0], G, 'hot'), brk: stage.label('', [150, 0, 0], G, 'hot'),
      extra: stage.label('', [70, 152, 0], G),
    };
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [0.3, 15.4, 0], [0.03, 0.02, 1], 41) : mode === 'narrow' ? fitView(stage, [-0.9, 9.6, 0], [0.03, 0.02, 1], 33) : fitView(stage, [-3.5, 9.3, 0], [0.05, 0.03, 1], 26.5)));
    let T = 0, last = '', kq = 0, spin = 0;
    const cBlock = new THREE.Color(0xf4f1e6), cOpen = new THREE.Color(0x3a3f49);
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt); T += dt * SLOW;
        const mode = frame();
        G.position.y = mode === 'tall' ? 25 : Y0;                      // the tall video frame stacks the chart under the spray
        fitNarrow(stage, [lb.extra, lb.name, tick[0], tick[2]], -0.14, 0);
        bd.place([10, -640, 0], 1.25); bd.mesh.visible = mode !== 'narrow';   // no room for the chart beside the spray on a phone
        const st = state(s), H = HEADS[s.kind], hd = heads[s.kind]; cur = st; sNow = s;
        for (const [k, g] of Object.entries(heads)) g.visible = k === s.kind;
        kq = approach(kq, st.lpm, 8, dt);
        // which drawn nozzles are blocked
        const nz = hd.nz, blocked = nz.map((_, i) => fr(i * 0.6180339887 + 0.37) < s.scale);
        nz.forEach((_, i) => hd.nub.setColorAt(i, blocked[i] ? cBlock : cOpen)); hd.nub.instanceColor.needsUpdate = true;
        // jets: a solid thread as far as the break-up point, then drops in free fall
        const v = Math.max(0.15, st.v) * 1000, g = GRAV * 1000, pulsed = !!hd.wheel;
        // a pulsed head sends slugs of water, drawn as streaks; the others a thread that then beads into drops
        const L = st.jets && !pulsed ? Math.min(st.L * 1000, FALL - 20) : 0;
        const dR = (st.jets ? st.drop / 2 : 1.9) * (s.kind === 'air' ? 3.2 : 2.3), jr = Math.max(0.7, H.d * 0.5 * (s.kind === 'air' ? 1.6 : 1));
        const om = 40 * clamp(st.lpm / 6, 0.2, 2.5);                    // turbine speed, radians per second of slowed time (for show: it rises with flow)
        if (hd.wheel) { spin += dt * SLOW * om; hd.wheel.rotation.y = -spin; }
        let nd = 0;
        for (let i = 0; i < MAXN; i++) {
          const n = nz[i], off = !n || blocked[i];
          if (off) { o.position.set(0, -99999, 0); o.scale.setScalar(1e-4); o.quaternion.identity(); o.updateMatrix(); jets.setMatrixAt(i, o.matrix); for (let j = 0; j < KD; j++) drops.setMatrixAt(nd++, o.matrix); continue; }
          const th = (H.fan * n[2] * Math.PI) / 180 + (blocked[(i + 1) % nz.length] ? 0.12 : 0), dx = Math.sin(th) * Math.cos(n[3]), dz = Math.sin(th) * Math.sin(n[3]), dy = -Math.cos(th);
          const at = (t) => [n[0] + dx * v * t, -7 + dy * v * t - 0.5 * g * t * t, n[1] + dz * v * t];
          const tL = L / v, pL = at(tL), tEnd = (dy * v + Math.sqrt(dy * dy * v * v + 2 * g * (FALL - 7))) / g;
          // massage: this nozzle only runs while the turbine's open half is over it
          const open = (age) => !hd.wheel || fr((spin - om * age - n[3]) / (2 * Math.PI) + 100) < 0.5;
          dv.set(pL[0] - n[0], pL[1] + 7, pL[2] - n[1]); const len = dv.length();
          if (len > 1 && open(tL / 2)) { o.position.set((pL[0] + n[0]) / 2, (pL[1] - 7) / 2, (pL[2] + n[1]) / 2); o.quaternion.setFromUnitVectors(up, dv.normalize()); o.scale.set(jr, len, jr); }
          else { o.position.set(0, -99999, 0); o.scale.setScalar(1e-4); o.quaternion.identity(); }
          o.updateMatrix(); jets.setMatrixAt(i, o.matrix);
          o.quaternion.identity();
          const span = Math.max(1e-4, tEnd - tL);
          for (let j = 0; j < KD; j++) {
            const ph = fr((j + fr(i * 0.37)) / KD + T / span), t = tL + ph * span, p = at(t);
            if (!open(t) || p[1] < -FALL) { o.position.set(0, -99999, 0); o.scale.setScalar(1e-4); }
            else { o.position.set(p[0], p[1], p[2]); o.scale.set(pulsed ? jr * 1.3 : dR, pulsed ? Math.max(dR, 0.2 * span * (v + g * t) / KD) : dR * 1.5, pulsed ? jr * 1.3 : dR); }
            o.updateMatrix(); drops.setMatrixAt(nd++, o.matrix);
          }
        }
        jets.instanceMatrix.needsUpdate = true; drops.instanceMatrix.needsUpdate = true;
        drops.material.color.set(s.kind === 'air' ? 0xf2fbff : 0xbfe8ff);
        fIn.setPath([[0, 96, 0, 6, 1], [0, 72, 0, 6, 0], [0, 46, 0, 6, 0], [0, 26, 0, H.R * 0.3, 0], [0, 8, 0, H.R * 0.8, 0]], 0);
        fIn.update(dt, kq * 0.05, 0.4);
        const air = s.kind === 'air';
        fAirL.mesh.visible = fAirR.mesh.visible = air;
        if (air) { fAirL.update(dt, kq * 0.12, 1); fAirR.update(dt, kq * 0.12, 1); }
        mark.visible = st.jets && !pulsed && L < FALL - 30; mark.position.set(0, -7 - L, 0);
        lb.name.element.textContent = `${H.name}: ${st.n} of ${H.N} nozzles open, ${H.d} mm each` + (s.scale > 0.005 ? ' (limescale)' : '');
        lb.brk.visible = mark.visible; lb.brk.position.set(mode === 'wide' ? -150 : -20, mode === 'wide' ? Math.min(-7 - L + 14, -100) : -7 - L + 14, 0);
        lb.brk.element.textContent = `Jets break into drops here: ${(st.L * 100).toFixed(0)} cm`;
        lb.extra.visible = lb.extra.visible && (air || !!hd.wheel);
        lb.extra.element.textContent = air ? 'Air is sucked in below the restrictor' : 'A turbine wheel opens the nozzles in turn';
        const key = [s.kind, s.h, s.pump, s.scale].join();
        if (key !== last) { last = key; bd.redraw(); }
      },
      readout: (s) => {
        const st = state(s);
        const feel = !st.jets ? 'Drips: too slow to form jets.' : st.v < 1.4 ? 'Limp. The water falls out more than it sprays.' : st.v < 3 ? 'Soft and gentle.' : st.v < 7 ? 'A firm, lively spray.' : 'Hard, stinging needles.';
        return rows(`${st.lpm.toFixed(1)} L/min`, [
          ['Jet speed at the nozzle', st.v.toFixed(1) + ' m/s'],
          ['Pressure inside the head', st.pHead / BAR < 0.1 ? (st.pHead / 1000).toFixed(1) + ' kPa' : (st.pHead / BAR).toFixed(2) + ' bar'],
          ['Pressure at the start', (st.dP / BAR).toFixed(2) + ' bar'],
          ['Jets break up after', st.jets ? (st.L * 100 > FALL / 10 ? 'over ' + FALL / 10 : (st.L * 100).toFixed(0)) + ' cm' : 'no jets'],
          ['Drop size', (s.kind === 'air' ? 'air-filled, ' : '') + 'about ' + (st.jets ? st.drop : 3.5).toFixed(1) + ' mm'],
          ['Speed 1 m below', st.vHit.toFixed(1) + ' m/s'],
        ], feel + (s.kind === 'air' ? ` About ${AIR} parts air to 1 of water.` : ''), 3, 250);
      },
    };
  },
};
