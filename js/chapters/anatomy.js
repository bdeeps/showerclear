// Chapter 1: the whole shower, in an Indian bathroom. Drawn in centimetres (scene units of 10 cm).
// Cold water comes down from the overhead tank. One branch feeds the geyser, whose hot outlet runs
// to the left inlet of the wall mixer; the other runs to the right inlet. The mixer's diverter
// sends the mixed water to the spout (and the bucket), up the riser to the shower head, or down
// the hose to the hand shower. The floor slopes to a floor trap whose bend stays full of water.
// Flows: the tank's water surface is taken as 5 m above the mixer (a top-floor flat). Each side
// runs through its pipe and a part-open valve (as in chapter 2), then through the chosen outlet:
//   spout: a 12 mm bore; overhead head: 60 nozzles of 0.9 mm, 1.05 m higher than the mixer;
//   hand shower: 40 nozzles of 0.8 mm at the end of a 1.5 m hose (K 10), 0.4 m higher.
import { THREE, M, box, beam, tube, exploder, approach, clamp } from '../kit.js';
import { COL, headPa, rK, rOpen, kPipe, mm2, lpm, solveMix, mixT, tempColor, makeFlow, makeSpray, makeTiles, pipeCut, roundPath, cutFace, ghost, rows, fitNarrow, framer, fitView, fmtTime } from '../shower.js';

const HEAD = 5, THOT = 60, TCOLD = 25;
const OUT = {
  spout: { name: 'Spout, into the bucket', R: rK(2) + rOpen(mm2(113), 0.9), up: 0, a: 113 },
  head: { name: 'Overhead shower', R: rK(4) + rOpen(mm2(60 * Math.PI * 0.45 ** 2), 0.85), up: 1.05, a: 38.2 },
  hand: { name: 'Hand shower', R: rK(10) + rOpen(mm2(40 * Math.PI * 0.4 ** 2), 0.85), up: 0.4, a: 20.1 },
};
const valve = (lift) => rOpen(mm2(Math.PI * 8 * lift), 0.7) + rK(6);
export function flows(s) {
  const o = OUT[s.to], P = headPa(HEAD - o.up);
  if (!s.on) return { Q: 0, Qh: 0, Qc: 0, T: NaN, v: 0, o, P };
  const r = solveMix({ Ph: P, Pc: P, Rh: rK(kPipe(8, 4) + 8) + valve(0.36), Rc: rK(kPipe(8, 3)) + valve(0.6), Ro: o.R });
  return { ...r, T: mixT(r.Qh, THOT, r.Qc, TCOLD), v: r.Q / (o.a * 1e-6), o, P };
}

function pipeRun(pts, r, mat) {
  const g = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) g.add(beam(pts[i], pts[i + 1], r, mat, 12));
  pts.forEach((p) => { const s = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat); s.position.set(...p); g.add(s); });
  return g;
}
const cylY = (r, h, mat, seg = 32, r1 = r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r, h, seg), mat); m.castShadow = true; return m; };

export default {
  id: 'anatomy',
  short: 'Inside the shower',
  title: 'Inside a bathroom shower',
  subtitle: 'Two pipes in, one mixer, three ways out, and a bend of water in the floor.',
  view: { pos: [17, 16, 44], target: [0.5, 13.2, 3] },
  learn: `<p>A shower is the last metre of a long pipe. In most Indian homes the push comes from an <b>overhead tank</b> on the roof: the higher the water stands above you, the harder it pushes (<a href="https://glassbox.how/tapclear/">TapClear</a> works this out floor by floor). The <b>cold pipe</b> comes straight down from the tank. A branch of it fills the <b>geyser</b>, and the geyser's <b>hot pipe</b> runs to the shower too (see <a href="https://glassbox.how/waterheaterclear/">WaterHeaterClear</a>, or <a href="https://glassbox.how/solarheaterclear/">SolarHeaterClear</a> if your hot water comes from the roof).</p>
    <p>Both pipes end at the <b>wall mixer</b>: hot on the left, cold on the right. Its knobs set how much of each gets through, and the two meet inside. A <b>diverter</b> then picks where the mixed water goes: out of the <b>spout</b> into a bucket, up the <b>riser</b> and along the <b>shower arm</b> to the <b>head</b>, or down a flexible <b>hose</b> to the <b>hand shower</b>.</p>
    <p>The used water runs down the sloping floor to the <b>floor trap</b>. Under the grating the drain dips into a U-shaped bend that always stays full. That plug of water, the <b>water seal</b>, stops sewer gas coming back up (the same trick as the bend in a toilet: see <a href="https://glassbox.how/commodeclear/">CommodeClear</a>).</p>
    <p>The <b>bucket and mug</b> are still the thriftiest way to bathe: one bucket is about 15 to 20 litres, less than two minutes of an ordinary shower.</p>
    <p class="tip"><b>Try it:</b> switch on X-ray to see the pipes in the wall, then send the water to each of the three outlets.</p>`,
  terms: [
    { t: 'Overhead tank', d: 'A water tank on the roof. Its height above the tap is what makes the pressure.' },
    { t: 'Wall mixer', d: 'A fitting with a hot inlet, a cold inlet and valves that set how much of each flows into one outlet.' },
    { t: 'Diverter', d: 'A small valve that sends the mixed water to one outlet or another: spout, overhead shower or hand shower.' },
    { t: 'Riser and shower arm', d: 'The pipe that carries water up from the mixer, and the bent pipe that holds the head out from the wall.' },
    { t: 'Floor trap', d: 'A drain fitting with a U-shaped bend that stays full of water and blocks sewer gas.' },
  ],
  defaults: { to: 'head', on: true, xray: true, explode: 0 },
  controls: [
    { key: 'to', type: 'seg', label: 'Diverter: send the water to', options: [{ v: 'spout', label: 'Spout' }, { v: 'head', label: 'Overhead' }, { v: 'hand', label: 'Hand shower' }] },
    { key: 'on', type: 'toggle', label: 'Water on' },
    { key: 'xray', type: 'toggle', label: 'X-ray the wall and fittings' },
    { key: 'explode', type: 'range', label: 'Take it apart', min: 0, max: 1, step: 0.01, ends: ['together', 'apart'], fmt: (v) => Math.round(v * 100) + '%' },
  ],
  quiz: [
    { q: 'Where does the push that drives an Indian bathroom shower usually come from?', options: ['A pump inside the shower head', 'The height of the overhead tank above the shower', 'The geyser', 'The mixer'], answer: 1, why: 'Water in a tank on the roof presses down through the pipe. Each metre of height adds about 0.1 bar.' },
    { q: 'What does the diverter do?', options: ['Heats the water', 'Mixes hot and cold', 'Chooses which outlet the mixed water goes to', 'Filters the water'], answer: 2, why: 'Mixing happens first. The diverter then sends the mixed water to the spout, the overhead shower or the hand shower.' },
    { q: 'Why does the floor trap keep a bend full of water?', options: ['To save water', 'To block sewer gas from coming up the drain', 'To cool the pipe', 'To catch soap'], answer: 1, why: 'Gas cannot pass a pipe that is full of water. If a bathroom is unused for weeks the seal can dry out, and then it smells.' },
  ],
  reel: [
    { ms: 5600, caption: 'How does a shower work? Cold water falls from a tank on the roof. A branch of it goes through the geyser.', set: { to: 'head', on: true, xray: true, explode: 0 }, spin: 0.5 },
    { ms: 5200, caption: 'Hot and cold meet in the wall mixer. A diverter sends the mix to the spout, the head or the hand shower.', set: { on: true, xray: true, explode: 0, to: 'spout' }, anim: { to: ['spout', 'hand'] }, spin: 0.4 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); G.scale.setScalar(0.1); G.position.y = 2.3; stage.root.add(G);
    const chrome = () => M.metal(COL.chrome, { roughness: 0.22 });
    // wall, floor slab and tiles
    const wallBody = box(180, 232, 12, M.matte(0x5a4a40)); wallBody.position.set(10, 116, -6.2); G.add(wallBody);
    const tiles = makeTiles(180, 232, 30, '#39424f', '#4a5464'); tiles.position.set(10, 116, 0); G.add(tiles);
    const slab = box(180, 22, 120, M.matte(0x3a3f49)); slab.position.set(10, -11.2, 60); G.add(slab);
    const ftiles = makeTiles(180, 120, 30, '#2f3642', '#3a4250'); ftiles.rotation.x = -Math.PI / 2; ftiles.position.set(10, 0, 60); G.add(ftiles);
    // the floor trap, sliced at the front edge of the slab
    const trapPath = roundPath([[60, 0], [60, -15], [76, -15], [76, -7], [100, -9]], 6);
    const trap = pipeCut(trapPath, 4.4, 3.4, M.plastic(0xb9bec8, { side: THREE.DoubleSide }), cutFace(0xd9dde4)); trap.position.z = 120.3; G.add(trap);
    const seal = pipeCut(roundPath([[60, -8], [60, -15], [76, -15], [76, -8]], 6), 3.3, 0, new THREE.MeshBasicMaterial({ color: COL.water, toneMapped: false, side: THREE.DoubleSide }), new THREE.MeshBasicMaterial({ color: COL.deep, toneMapped: false })); seal.position.z = 120.4; G.add(seal);
    const grate = cylY(7, 0.8, M.metal(0x8a909c)); grate.position.set(60, 0.4, 113); G.add(grate);
    // overhead tank (really metres higher, on the roof)
    const tank = new THREE.Group();
    tank.add(cylY(27, 34, M.plastic(0x2c3038, { roughness: 0.6 }))); const lid = cylY(10, 3, M.plastic(0x3a3f49)); lid.position.y = 18.5; tank.add(lid);
    for (const y of [-8, 0, 8]) { const rib = new THREE.Mesh(new THREE.TorusGeometry(27.2, 0.9, 8, 40), M.plastic(0x3a3f49)); rib.rotation.x = Math.PI / 2; rib.position.y = y; tank.add(rib); }
    tank.position.set(45, 250, -6); G.add(tank);
    // pipes in the wall
    const coldM = new THREE.MeshStandardMaterial({ color: 0x5f97e8, transparent: true, opacity: 0.4, roughness: 0.3, depthWrite: false });
    const hotM = new THREE.MeshStandardMaterial({ color: 0xe8745a, transparent: true, opacity: 0.4, roughness: 0.3, depthWrite: false });
    const Z = -6, COLD = [[45, 235, Z], [45, 100, Z], [7.5, 100, Z], [7.5, 100, 3]], BR = [[45, 150, Z], [78, 150, Z], [78, 163, Z], [78, 163, 14], [78, 168, 14]];
    const HOT = [[62, 168, 14], [62, 163, 14], [62, 163, Z], [62, 88, Z], [-7.5, 88, Z], [-7.5, 100, Z], [-7.5, 100, 3]];
    const pipes = new THREE.Group(); pipes.add(pipeRun(COLD, 2, coldM), pipeRun(BR, 2, coldM), pipeRun(HOT, 2, hotM)); G.add(pipes);
    // geyser
    const geyser = new THREE.Group();
    const shell = cylY(17, 40, M.plastic(COL.white, { roughness: 0.3 })); geyser.add(shell);
    const inner = cylY(13.5, 33, new THREE.MeshBasicMaterial({ color: 0xff8a3d, transparent: true, opacity: 0.55, toneMapped: false })); geyser.add(inner);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), M.glow(0xff3a2a)); lamp.position.set(0, -12, 16.8); geyser.add(lamp);
    geyser.position.set(70, 189, 18); G.add(geyser);
    // the wall mixer
    const mixer = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 24, 24), chrome()); body.rotation.z = Math.PI / 2; body.castShadow = true; mixer.add(body);
    for (const x of [-7.5, 7.5]) { const f = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.8, 5, 20), chrome()); f.rotation.x = Math.PI / 2; f.position.set(x, 0, -2.6); mixer.add(f); }
    mixer.position.set(0, 100, 5); G.add(mixer);
    const knob = (x, color) => { const k = new THREE.Group(); const c = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.3, 5, 20), chrome()); c.rotation.z = Math.PI / 2; k.add(c); const bar = box(1.4, 11, 1.6, chrome()); k.add(bar); const d = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8), M.glow(color)); d.position.x = Math.sign(x) * 2.9; k.add(d); k.position.set(x, 100, 5); G.add(k); return k; };
    const kH = knob(-14.5, COL.hot), kC = knob(14.5, COL.cold);
    const div = new THREE.Group(); const dk = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 4, 18), chrome()); dk.rotation.x = Math.PI / 2; div.add(dk); const dl = box(1, 5.5, 1.2, chrome()); dl.position.z = 2.4; div.add(dl); div.position.set(0, 100, 9.5); G.add(div);
    const spout = tube([[0, 98, 6], [0, 96, 11], [0, 93.5, 16], [0, 91, 17.5]], 1.7, chrome(), false, 30); G.add(spout);
    // riser, arm and head
    const RISE = [[0, 102, 5], [0, 194, 5], [0, 199, 9], [0, 199, 34], [0, 196, 38]];
    const riser = new THREE.Group(); const rSolid = pipeRun(RISE, 1.7, chrome()), rGlass = pipeRun(RISE, 1.7, M.clear(0xeaf2fb, 0.42)); riser.add(rSolid, rGlass); G.add(riser);
    const head = new THREE.Group(); const neck = cylY(1.6, 5, chrome(), 20, 6); neck.position.y = 1; head.add(neck); const face = cylY(13.5, 2, chrome(), 40); face.position.y = -2.2; head.add(face); const nub = cylY(12.5, 0.5, M.plastic(0x3a3f49), 40); nub.position.y = -3.3; head.add(nub);
    head.position.set(0, 193, 40); head.rotation.x = 0.3; G.add(head);
    // hand shower on its hook, with a hose from the mixer
    const hosePts = [[-4, 97, 6], [-6, 78, 12], [-18, 64, 13], [-30, 78, 10], [-32, 110, 7], [-32, 128, 6]];
    const hose = new THREE.Group(); const hSolid = tube(hosePts, 1.1, M.metal(0xc9ced8, { roughness: 0.45 }), false, 80), hGlass = tube(hosePts, 1.1, M.clear(0xeaf2fb, 0.42), false, 80); hose.add(hSolid, hGlass); G.add(hose);
    const hand = new THREE.Group(); const grip = cylY(1.5, 16, M.plastic(COL.white, { roughness: 0.3 }), 16); grip.position.y = 8; hand.add(grip); const hf = cylY(4.6, 1.6, M.plastic(COL.white, { roughness: 0.3 }), 28); hf.rotation.x = Math.PI / 2 - 0.5; hf.position.set(0, 18, 2.2); hand.add(hf);
    hand.position.set(-32, 128, 6); hand.rotation.x = 0.22; G.add(hand);
    const hook = box(4, 4, 5, chrome()); hook.position.set(-32, 137, 2.5); G.add(hook);
    // bucket and mug
    const bucket = new THREE.Group(); const bm = new THREE.Mesh(new THREE.CylinderGeometry(15, 11.5, 28, 36, 1, true), M.plastic(0x2f7fd0, { side: THREE.DoubleSide, roughness: 0.4 })); bm.castShadow = true; bucket.add(bm);
    const bb = cylY(11.5, 0.8, M.plastic(0x2f7fd0)); bb.position.y = -13.6; bucket.add(bb);
    const bw = cylY(1, 1, new THREE.MeshBasicMaterial({ color: COL.water, transparent: true, opacity: 0.8, toneMapped: false }), 36); bucket.add(bw);
    bucket.position.set(0, 14, 24); G.add(bucket);
    const mug = new THREE.Group(); const mm = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 4.4, 9, 24, 1, true), M.plastic(0xe0503a, { side: THREE.DoubleSide })); mug.add(mm); const mh = box(1.2, 2, 8, M.plastic(0xe0503a)); mh.position.set(0, 3, 8); mug.add(mh); mug.position.set(26, 4.6, 34); G.add(mug);

    // water in the pipes
    const P4 = (pts, r) => pts.map((p) => [...p, r, 1]);
    const fCold = makeFlow(120, { color: 0x6fb4ff, size: 1.1 }), fBr = makeFlow(40, { color: 0x6fb4ff, size: 1.1 }), fHot = makeFlow(90, { color: 0xff8f6b, size: 1.1 });
    const fRise = makeFlow(80, { size: 1.0 }), fHose = makeFlow(70, { size: 0.8 });
    fCold.setPath(P4(COLD, 1.5), 3); fBr.setPath(P4(BR, 1.5), 4); fHot.setPath(P4(HOT, 1.5), 6);
    fRise.setPath(P4([...RISE, [0, 192, 39.5]], 1.2), 0);
    fHose.setPath(P4([...hosePts, [-32, 144, 9]], 0.7), 0);
    [fCold, fBr, fHot].forEach((f) => f.prime());
    const dots = new THREE.Group(); dots.add(fCold.mesh, fBr.mesh, fHot.mesh, fRise.mesh, fHose.mesh); G.add(dots);
    // sprays
    const sHead = makeSpray(200, { size: 0.65 }), sHand = makeSpray(90, { size: 0.55 }), sSpout = makeSpray(50, { size: 0.9 });
    const em = [];
    for (let i = 0; i < 18; i++) { const a = i * 2.39996, r = 12 * Math.sqrt((i + 0.5) / 18); em.push({ o: [r * Math.cos(a), 189.5 - r * Math.sin(a) * 0.3, 41 + r * Math.sin(a)], d: [Math.cos(a) * r * 0.012, -0.955, 0.3 + Math.sin(a) * r * 0.012] }); }
    sHead.set(em);
    const eh = []; for (let i = 0; i < 9; i++) { const a = i * 2.39996, r = 3.6 * Math.sqrt((i + 0.5) / 9); eh.push({ o: [-32 + r * Math.cos(a), 146.5 + r * Math.sin(a) * 0.8, 11.5], d: [Math.cos(a) * 0.05, -0.45 + Math.sin(a) * 0.05, 0.89] }); }
    sHand.set(eh); sSpout.set([{ o: [0, 90.5, 17.8], d: [0, -1, 0.06] }]);
    G.add(sHead.mesh, sHand.mesh, sSpout.mesh);

    const parts = [
      { obj: head, off: [0, 14, 30] }, { obj: riser, off: [0, 6, 22] }, { obj: kH, off: [-14, 0, 20] }, { obj: kC, off: [14, 0, 20] }, { obj: div, off: [0, 4, 36] },
      { obj: spout, off: [0, -10, 22] }, { obj: mixer, off: [0, 0, 10] }, { obj: hand, off: [-22, 10, 26] }, { obj: hose, off: [-12, -8, 18] }, { obj: geyser, off: [18, 12, 34] },
      { obj: bucket, off: [-34, 0, 40] }, { obj: mug, off: [34, 0, 44] }, { obj: grate, off: [0, 14, 0] }, { obj: tiles, off: [0, 0, 0] },
    ];
    const setExplode = exploder(parts);
    const minor = [];
    const L = (t, obj, p, cls = '', main = true) => { const l = stage.label(t, p, obj, cls); if (!main) minor.push(l); return l; };
    L('Overhead tank (on the roof, metres higher)', tank, [-62, 6, 0], '', false);
    L('Cold pipe', pipes, [56, 212, 0], '', false);
    L('Geyser', geyser, [0, 27, 0], 'hot');
    L('Hot pipe', pipes, [72, 122, 0], 'hot', false);
    L('Wall mixer: hot knob left, cold knob right', mixer, [0, 12, 6]);
    L('Diverter', div, [20, 6, 8], '', false);
    L('Spout', spout, [-14, 84, 20], '', false);
    L('Riser', riser, [10, 160, 9], '', false);
    L('Shower arm', riser, [0, 208, 20], '', false);
    L('Shower head', head, [22, 2, 6]);
    L('Hand shower and hose', hand, [-16, 26, 6], '', false);
    L('Bucket and mug', bucket, [-26, 20, 0]);
    L('Floor trap: the bend stays full of water', trap, [22, -6, 0]);
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [1, 13.6, 4], [0.3, 0.1, 1], 47) : mode === 'narrow' ? fitView(stage, [-1.2, 14.6, 4], [0.3, 0.1, 1], 64) : fitView(stage, [1.4, 13.0, 4], [0.36, 0.1, 1], 46)));
    const col = new THREE.Color();
    let k = 0, fill = 0.25, xr = null;
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt);
        frame();
        fitNarrow(stage, minor, -0.05, 0.06);
        setExplode(s.explode);
        if (xr !== s.xray) { xr = s.xray; tiles.material.opacity = xr ? 0.3 : 1; tiles.material.depthWrite = !xr; ghost(wallBody, xr, 0.14); ghost(shell, xr, 0.25); rSolid.visible = hSolid.visible = !xr; rGlass.visible = hGlass.visible = xr; }
        const apart = s.explode > 0.04, f = flows({ ...s, on: s.on && !apart });
        k = approach(k, f.Q > 0 ? 1 : 0, 5, dt);
        const q = lpm(f.Q), qh = lpm(f.Qh), qc = lpm(f.Qc), sp = 0.035;
        dots.visible = s.xray && !apart; pipes.visible = s.xray || apart; inner.visible = s.xray;
        fCold.update(dt, (qc + qh) * sp, 0); fBr.update(dt, qh * sp * 2, 0); fHot.update(dt, qh * sp, 0);
        tempColor(isFinite(f.T) ? f.T : 38, col);
        fRise.mesh.material.color.copy(col); fHose.mesh.material.color.copy(col);
        fRise.update(dt, s.to === 'head' ? q * 0.08 : 0, 0.7); fHose.update(dt, s.to === 'hand' ? q * 0.08 : 0, 0.7);
        const v = f.v * 100, slow = 0.3;
        sHead.update(dt * slow, { v: Math.max(60, s.to === 'head' ? v : 100), g: 981, floor: 0.5, show: s.to === 'head' ? k : 0, color: col, spread: 0.05 });
        sHand.update(dt * slow, { v: Math.max(60, s.to === 'hand' ? v : 100), g: 981, floor: 0.5, show: s.to === 'hand' ? k : 0, color: col, spread: 0.05 });
        // the bucket fills at the real rate (shown 20 times faster) and is tipped out when full
        if (s.to === 'spout' && f.Q > 0) fill += (q / 60 / 15) * dt * 20; if (fill > 0.97) fill = 0.12;
        sSpout.update(dt * slow, { v: Math.max(40, s.to === 'spout' ? v : 60), g: 981, floor: 2 + fill * 25, show: s.to === 'spout' ? k : 0, color: col, spread: 0.02 });
        const lvl = fill * 26, rw = 11.5 + 3.5 * (lvl / 28);
        bw.scale.set(rw - 0.4, Math.max(0.1, lvl), rw - 0.4); bw.position.y = -13.2 + lvl / 2; bw.material.color.copy(col);
        div.rotation.z = s.to === 'spout' ? 0 : s.to === 'head' ? -1.1 : 1.1;
        kH.rotation.x = k * 0.9; kC.rotation.x = -k * 1.2;
      },
      readout: (s) => {
        const apart = s.explode > 0.04, f = flows({ ...s, on: s.on && !apart }), q = lpm(f.Q);
        if (!(q > 0)) return rows(apart ? 'Taken apart' : 'Water off', [['Waiting at the mixer', (headPa(HEAD) / 1e5).toFixed(2) + ' bar'], ['Tank surface above the mixer', HEAD + ' m']], 'The pipes stay full and under pressure, ready for the next shower.', 3, 250);
        return rows(f.o.name, [
          ['Flow', q.toFixed(1) + ' L/min'],
          ['Temperature', f.T.toFixed(0) + ' °C'],
          ['Hot + cold', `${lpm(f.Qh).toFixed(1)} + ${lpm(f.Qc).toFixed(1)} L/min`],
          ['Water leaves at', f.v.toFixed(1) + ' m/s'],
          ['A 15 L bucket would fill in', fmtTime((15 / q) * 60)],
        ], `Tank surface ${HEAD} m above the mixer: ${(headPa(HEAD) / 1e5).toFixed(2)} bar before the water moves.`, 3, 250);
      },
    };
  },
};
