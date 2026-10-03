// Chapter 6: water, heat and safety. Litres = flow × minutes. Heat = m·c·ΔT (shower.js).
// Buckets are 15 litres each. A bucket bath is taken as one 18 litre bucket (household buckets
// are 15 to 20 litres), at the same temperature as the shower.
// Geyser: a tank of V litres at 60 °C, with a 2 kW element that keeps heating while you shower.
// Mixed down to the shower temperature it stretches to V ÷ (hot share) litres. Hot water is drawn
// at (hot share × flow), and the element makes 2 kW ÷ (c × (60 − cold)) litres of 60 °C water a
// second, so the tank lasts V ÷ (hot share × flow − what the element adds) minutes. (An ideal
// tank that stays in layers until the hot water is gone: see WaterHeaterClear.)
// Instant heater: 3 kW warms a flow of q litres a second by 3 ÷ (c·q) degrees, no more.
// Safety text: scald times from the American Burn Association table (shower.js); Legionella from the
// WHO legionellosis fact sheet (grows at 20 to 50 °C; water should leave the heater at 60 °C or more);
// RCD protection of bathroom circuits from IEC 60364-7-701, clause 701.411.3.3, with which IS 732 is harmonised.
// Tariff ₹7 a unit (kWh), a typical Indian household rate; heater efficiency 95%.
import { THREE, M, box, approach, clamp } from '../kit.js';
import { COL, C_W, TARIFF, showerEnergy, hotShare, tempColor, fmtScald, makeTiles, board, panelBg, rows, fitNarrow, framer, fitView, fmt } from '../shower.js';

const BUCKET = 15, BATH = 18, TGEY = 60, KW_GEY = 2, KW_INST = 3, MAXB = 15;
export function calc(s) {
  const e = showerEnergy({ flow: s.flow, min: s.min, tshower: s.tshower, tcold: s.tcold });
  const b = showerEnergy({ flow: BATH, min: 1, tshower: s.tshower, tcold: s.tcold });
  const f = hotShare(s.tshower, TGEY, s.tcold), V = s.heater === 'g25' ? 25 : 15;
  const made = (KW_GEY * 60) / (C_W * (TGEY - s.tcold));                 // litres of 60 °C water a minute from the element
  const lasts = f * s.flow > made ? V / (f * s.flow - made) : Infinity;   // minutes
  const rise = (KW_INST * 60) / (C_W * s.flow), tInst = Math.min(s.tshower, s.tcold + rise), flowInst = (KW_INST * 60) / (C_W * Math.max(0.5, s.tshower - s.tcold));
  const inst = s.heater === 'inst';
  const kWh = inst ? (KW_INST * s.min) / 60 * clamp((s.tshower - s.tcold) / rise, 0, 1) : e.kWh;
  return { ...e, kWh, rupees: kWh * TARIFF, bath: b, f, V, lasts, enough: inst ? rise >= s.tshower - s.tcold - 0.05 : lasts >= s.min, inst, rise, tInst, flowInst, stretch: V / Math.max(0.05, f) };
}

export default {
  id: 'water',
  short: 'Water and heat',
  title: 'Water, heat and staying safe',
  subtitle: 'Litres a minute, times minutes, times the degrees you warm it by.',
  view: { pos: [3, 8, 23], target: [1, 4, 0] },
  learn: `<p>A shower's appetite is simple to work out: <b>litres a minute × minutes</b>. An ordinary head passes 8 to 10 litres a minute, so an eight-minute shower is five buckets of water. A <b>bucket bath</b> uses one. In the United States, new shower heads have been limited to 9.5 litres a minute (2.5 gallons) since 1994, and water-saving labels ask for 7.6 or less.</p>
    <p>Most of the cost is <b>heat</b>. Warming a kilogram of water by one degree takes 4,180 joules, so the energy is mass × 4.18 kJ × the temperature rise (the sum from <a href="https://glassbox.how/heatclear/">HeatClear</a>). In winter the cold water starts colder, so every litre costs more. A small geyser only stretches so far: the model shows how many minutes its hot water lasts, and why a 3 kW <b>instant heater</b> can only warm a trickle.</p>
    <p><b>Scalds.</b> Hot water burns faster than people expect. The American Burn Association gives about 5 minutes for a serious burn at 49 °C, 15 seconds at 56 °C and 5 seconds at 60 °C, and less for children and old people. Shower-valve standards such as ASSE 1016 set a limit stop at 49 °C (120 °F).</p>
    <p><b>Stored water.</b> The World Health Organization advises keeping stored hot water at 60 °C or above at the heater, because <i>Legionella</i> bacteria grow between 20 and 50 °C. Store hot, mix down at the shower.</p>
    <p><b>Electricity.</b> A geyser is a mains appliance in a wet room. Its metal body must be <b>earthed</b>. The international wiring rule for rooms with a bath or shower (IEC 60364-7-701), which India's wiring code IS 732 follows, also asks for every circuit there to be protected by a 30 mA <b>RCCB</b>, which cuts the power if current leaks to earth (see <a href="https://glassbox.how/mcbclear/">MCBClear</a> and <a href="https://glassbox.how/waterheaterclear/">WaterHeaterClear</a>). Have a qualified electrician fit and check both.</p>
    <p class="tip"><b>Try it:</b> set a 10 minute shower in winter (15 °C water) and see whether a 15 litre geyser can keep up. Then try a low-flow head.</p>`,
  terms: [
    { t: 'Flow rate', d: 'Litres of water a minute. Shower water used = flow rate × minutes.' },
    { t: 'Specific heat', d: 'The energy needed to warm 1 kg of something by 1 °C. For water it is 4.18 kJ, which is high.' },
    { t: 'Unit (kWh)', d: 'The energy a 1 kW appliance uses in an hour: 3.6 million joules. Electricity is billed in units.' },
    { t: 'Low-flow head', d: 'A shower head that gives a satisfying spray with less water, by finer nozzles or by mixing in air.' },
    { t: 'RCCB', d: 'A safety switch that compares the current going out and coming back, and trips if about 30 mA leaks to earth.' },
  ],
  defaults: { flow: 9, min: 8, tshower: 38, tcold: 20, heater: 'g15' },
  controls: [
    { key: 'flow', type: 'range', label: 'Shower head flow', min: 3, max: 20, step: 0.5, ends: ['low-flow', 'rain shower'], fmt: (v) => v.toFixed(1) + ' L/min' },
    { key: 'min', type: 'range', label: 'Time in the shower', min: 1, max: 20, step: 1, fmt: (v) => Math.round(v) + ' min' },
    { key: 'tshower', type: 'range', label: 'Shower temperature', min: 30, max: 42, step: 1, fmt: (v) => Math.round(v) + ' °C' },
    { key: 'tcold', type: 'range', label: 'Cold water', min: 8, max: 30, step: 1, ends: ['winter', 'summer'], fmt: (v) => Math.round(v) + ' °C' },
    { key: 'heater', type: 'seg', label: 'Hot water from', options: [{ v: 'g15', label: '15 L geyser' }, { v: 'g25', label: '25 L geyser' }, { v: 'inst', label: '3 kW instant' }] },
  ],
  quiz: [
    { q: 'A head passes 9 L/min. How much water does a 10 minute shower use?', options: ['9 litres', '19 litres', '90 litres', '900 litres'], answer: 2, why: '9 litres a minute × 10 minutes = 90 litres: six 15 litre buckets.' },
    { q: 'Why does the same shower cost more to heat in winter?', options: ['The geyser is less efficient', 'The cold water starts colder, so each litre must be warmed by more degrees', 'Water is heavier in winter', 'It does not'], answer: 1, why: 'Heat = mass × 4.18 kJ × temperature rise. From 15 °C to 38 °C is a rise of 23 degrees; from 28 °C it is only 10.' },
    { q: 'Why store geyser water at 60 °C and mix it down, instead of storing it at 40 °C?', options: ['Hot water weighs less', 'Legionella bacteria can grow in warm stored water, and a hot tank also stretches further', 'The pipes need it', 'It saves electricity'], answer: 1, why: 'The WHO advises 60 °C or more at the heater. Mixed with cold, 15 litres at 60 °C also becomes many more litres of shower water.' },
  ],
  reel: [
    { ms: 5600, caption: 'An eight-minute shower at 9 litres a minute is 72 litres, about five buckets. A bucket bath uses one.', set: { flow: 9, tshower: 38, tcold: 20, heater: 'g15' }, anim: { min: [1, 8] }, spin: 0 },
  ],

  build({ stage }) {
    const G = new THREE.Group(); stage.root.add(G);
    const floor = makeTiles(26, 20, 2.5, '#2b313c', '#353d4a'); floor.rotation.x = -Math.PI / 2; floor.position.set(1, 0.01, -1.5); G.add(floor);
    // buckets: 15 litres each
    const mkBucket = (color, op) => {
      const g = new THREE.Group();
      const sh = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.8, 2, 32, 1, true), M.plastic(color, { side: THREE.DoubleSide, roughness: 0.4, transparent: true, opacity: op, depthWrite: false })); sh.position.y = 1; g.add(sh);
      const bt = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.06, 32), M.plastic(color)); bt.position.y = 0.03; g.add(bt);
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.77, 1, 32), new THREE.MeshBasicMaterial({ color: COL.water, toneMapped: false })); g.add(w);
      g.set = (k) => { k = clamp(k, 0, 1); w.visible = k > 0.01; const h = 1.86 * k; w.scale.set(1 + 0.14 * k, Math.max(0.02, h), 1 + 0.14 * k); w.position.y = 0.07 + h / 2; };
      return g;
    };
    const buckets = [];
    for (let i = 0; i < MAXB; i++) { const b = mkBucket(0xdfe8f5, 0.3); b.position.set(-3 + (i % 5) * 2.4, 0, -0.5 - Math.floor(i / 5) * 2.7); G.add(b); buckets.push(b); }
    const bath = [mkBucket(0xff7a59, 0.45), mkBucket(0xff7a59, 0.45)]; bath[0].position.set(-3, 0, 3.3); bath[1].position.set(-0.6, 0, 3.3); bath.forEach((b) => G.add(b));
    const mug = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.62, 20, 1, true), M.plastic(0xf3c13a, { side: THREE.DoubleSide })); mug.position.set(1.3, 0.31, 3.6); G.add(mug);
    // the heater: a glass tank whose hot layer shrinks as the shower runs
    const tank = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.3, 3.6, 32, 1, true), M.clear(0xdfe8f5, 0.22)); glass.position.y = 1.8; tank.add(glass);
    const hot = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 1, 32), new THREE.MeshBasicMaterial({ color: 0xff8a3d, toneMapped: false })), cold = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, 1, 32), new THREE.MeshBasicMaterial({ color: 0x3fa9ff, toneMapped: false }));
    tank.add(hot, cold);
    const capT = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.22, 32), M.plastic(COL.white)); capT.position.y = 3.7; const capB = capT.clone(); capB.position.y = -0.05; tank.add(capT, capB);
    tank.position.set(6.4, 0.9, 3.2); G.add(tank);
    const stand = box(3, 0.9, 3, M.matte(0x3a3f49)); stand.position.set(6.4, 0.45, 3.2); G.add(stand);
    // the chart
    let cur = null, sNow = null;
    const bd = board(G, 9.6, 5.33, 900, 500, (g, w, h) => {
      panelBg(g, w, h);
      if (!cur) return;
      const c = cur, s = sNow;
      g.fillStyle = '#e8eef8'; g.font = 'bold 40px sans-serif'; g.fillText('Shower against bucket bath', 26, 52);
      const pair = (y, title, a, b, max, unit, d) => {
        g.font = '30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.7)'; g.fillText(title, 26, y);
        const bar = (yy, v, color, name) => { g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(200, yy, 430, 44); g.fillStyle = color; g.fillRect(200, yy, 430 * clamp(v / max, 0, 1), 44); g.fillStyle = '#e8eef8'; g.font = '36px sans-serif'; g.fillText(name, 26, yy + 34); g.textAlign = 'right'; g.fillText(v.toFixed(d) + ' ' + unit, w - 26, yy + 34); g.textAlign = 'left'; };
        bar(y + 14, a, '#4fc3ff', 'Shower'); bar(y + 66, b, '#ff7a59', 'Bucket');
      };
      pair(100, 'Water', c.litres, BATH, Math.max(120, c.litres), 'L', 0);
      pair(264, 'Electricity to heat it', c.kWh, c.bath.kWh, Math.max(2.5, c.kWh), 'units', 2);
      g.font = '32px sans-serif'; g.fillStyle = '#ffb547';
      g.fillText(c.inst ? `3 kW warms ${s.flow.toFixed(1)} L/min by only ${c.rise.toFixed(1)} °C` : `${c.V} L at 60 °C makes ${Math.round(c.stretch)} L at ${Math.round(s.tshower)} °C`, 26, 456);
    }, [6.0, 7.4, -7.4]);
    const lb = {
      sh: stage.label('', [4.2, 2.9, -0.5], G, 'hot'), bath: stage.label('Bucket bath: one 18 L bucket and a mug', [-1.2, 2.7, 3.3], G),
      tank: stage.label('', [5.6, 5.4, 3.2], G),
    };
    const frame = framer(stage, (mode) => (mode === 'tall' ? fitView(stage, [1.4, 4.9, -2.5], [0.05, 0.8, 1], 36) : mode === 'narrow' ? fitView(stage, [2.0, 2.4, -0.5], [0.06, 0.5, 1], 27) : fitView(stage, [2.0, 3.6, -1.5], [0.06, 0.3, 1], 25)));
    const col = new THREE.Color();
    let shown = 0, used = 0, last = '';
    return {
      dispose() { stage.setShift(0, 0); },
      update(dt, s) {
        dt = Math.max(0, dt);
        const mode = frame();
        fitNarrow(stage, [lb.tank, lb.bath], -0.12, 0);
        bd.place([1.6, 9.6, -8.2], 1.4);
        // the heater stands behind the buckets, or in front beside the mug in the tall video frame
        const tx = mode === 'tall' ? 7.5 : 8.8, tz = mode === 'tall' ? 4.2 : -3.4;
        tank.position.set(tx, 0.9, tz); stand.position.set(tx, 0.45, tz); lb.tank.position.set(tx - 0.8, 5.4, tz);
        bd.mesh.visible = mode !== 'narrow';                           // on a phone the readout carries the numbers
        const c = calc(s); cur = c; sNow = s;
        shown = approach(shown, c.litres, 6, dt);
                const nb = shown / BUCKET;
        buckets.forEach((b, i) => { b.visible = i < Math.min(MAXB, Math.max(1, Math.ceil(c.litres / BUCKET - 1e-6))); b.set(nb - i); });
        bath[0].set(1); bath[1].set(BATH / BUCKET - 1);
        lb.sh.element.textContent = `This shower: ${Math.round(c.litres)} L = ${(c.litres / BUCKET).toFixed(1)} buckets` + (c.litres > MAXB * BUCKET ? ' (only 15 drawn)' : '');
        // heater gauge
        const frac = c.inst ? 0 : clamp(s.min / c.lasts, 0, 1);
        used = approach(used, frac, 5, dt);
        const hh = 3.4 * (1 - used), sc = c.V === 25 ? 1.18 : 1;
        tank.scale.set(c.inst ? 0.55 : sc, c.inst ? 0.45 : 1, c.inst ? 0.55 : sc);
        hot.visible = hh > 0.02; hot.scale.y = Math.max(0.02, hh); hot.position.y = 3.5 - hh / 2;
        cold.scale.y = Math.max(0.02, 3.4 - hh); cold.position.y = 0.1 + (3.4 - hh) / 2; cold.visible = 3.4 - hh > 0.02;
        cold.material.color.copy(tempColor(c.inst ? c.tInst : s.tcold, col));
        lb.tank.position.y = c.inst ? 3.2 : 5.4;
        lb.tank.element.textContent = c.inst ? `3 kW instant heater: gives ${c.tInst.toFixed(0)} °C at this flow` : c.enough ? `${c.V} L geyser: ${Math.round((1 - frac) * 100)}% of its hot water left` : `${c.V} L geyser: runs cold after ${c.lasts.toFixed(1)} min`;
        lb.tank.element.classList.toggle('hot', !c.enough);
        const key = [s.flow, s.min, s.tshower, s.tcold, s.heater].join();
        if (key !== last) { last = key; bd.redraw(); }
      },
      readout: (s) => {
        const c = calc(s), year = c.litres * 365 / 1000;
        return rows(`${Math.round(c.litres)} litres`, [
          ['Electricity', c.kWh.toFixed(2) + ' units'],
          ['Cost at ₹' + TARIFF + ' a unit', '₹' + c.rupees.toFixed(1)],
          [c.inst ? 'Heater reaches' : 'Geyser lasts', c.inst ? c.tInst.toFixed(0) + ' °C' : isFinite(c.lasts) ? c.lasts.toFixed(1) + ' min' : 'all day', c.enough ? 'ok' : 'no'],
          ['Bucket bath', `${BATH} L, ${c.bath.kWh.toFixed(2)} units`],
          ['Daily for a year', `${fmt(year, 1)} kL, ₹${fmt(c.rupees * 365, 0)}`],
          ['Heating power needed', c.kW.toFixed(1) + ' kW'],
        ], c.inst ? (c.enough ? 'A 3 kW heater can manage this trickle.' : `For ${Math.round(s.tshower)} °C a 3 kW heater can only feed ${c.flowInst.toFixed(1)} L/min.`) : c.enough ? `Hot share of the mix: ${Math.round(c.f * 100)}%. At 60 °C a serious burn takes ${fmtScald(60)}: mix it down.` : 'The tank runs out before you finish: shorter shower, lower flow, or a bigger geyser.', 3, 260);
      },
    };
  },
};
