/* City Builder 2050 — Grade 6 Design, Criterion C (Smart & Sustainable City 2050)
   Students build their city on a grid inside the course. Inspired by city-builder games (roads → access,
   utilities gate growth, services cover a radius, pollution hurts homes, city rank), but rebuilt for learning:
   every choice changes live Smart, Sustainable and Liveable scores, a City Advisor explains what to fix,
   districts and features can be labelled with descriptions, the key building is designed in detail,
   versions can be saved for the change log, and pictures go straight into the Criterion C evidence boxes.
   Work saves automatically every 2 seconds (to the course, which syncs online, and to a backup on this device). */
(function(){
"use strict";
const W = 24, H = 16;
const CAT = [
  { g: "Homes & work", items: [
    { id: "house", n: "Homes", e: "🏠", c: "#F6D6A8", pop: 40, pw: 2, wa: 1, ws: 1, cost: 20, acc: 1, home: 1, d: "Family houses for 40 people." },
    { id: "apart", n: "Smart apartments", e: "🏢", c: "#F2C48D", pop: 150, pw: 5, wa: 3, ws: 3, cost: 60, acc: 1, home: 1, smart: 1, d: "Tall, energy-efficient homes for 150 people with smart meters." },
    { id: "mixed", n: "Mixed-use block", e: "🏬", c: "#EBB98A", pop: 80, jobs: 40, pw: 4, wa: 2, ws: 2, cost: 50, acc: 1, home: 1, d: "Homes above shops: people live close to where they work." },
    { id: "shop", n: "Shops & cafés", e: "🛍️", c: "#BFD7F2", jobs: 30, pw: 2, wa: 1, ws: 2, cost: 30, acc: 1, d: "Local shopping for 30 workers." },
    { id: "office", n: "Offices", e: "💼", c: "#A9C6EC", jobs: 80, pw: 4, wa: 1, ws: 1, cost: 50, acc: 1, d: "Jobs for 80 people." },
    { id: "cleanfac", n: "Clean factory", e: "⚙️", c: "#C9C3E8", jobs: 60, pw: 5, wa: 2, ws: 2, cost: 80, acc: 1, d: "Modern factory with filters: jobs without pollution." },
    { id: "factory", n: "Old factory", e: "🏭", c: "#B9B2C9", jobs: 100, pw: 8, wa: 3, ws: 4, cost: 60, acc: 1, poll: 3, d: "Cheap and lots of jobs, but it pollutes homes within 3 squares." } ] },
  { g: "Transport", items: [
    { id: "road", n: "Road", e: "", c: "#5E6573", cost: 5, net: 1, car: 1, d: "Cars and buses. Every building needs to touch a road or path." },
    { id: "cycle", n: "Cycle path", e: "🚲", c: "#7FBF8E", cost: 4, net: 1, green: 0, low: 1, d: "Zero-emission travel." },
    { id: "walk", n: "Shaded walkway", e: "🚶", c: "#E2CFA3", cost: 3, net: 1, low: 1, d: "Covered paths for walking in the heat." },
    { id: "tram", n: "Tram line", e: "🚋", c: "#8C93A8", pw: 1, cost: 15, net: 1, low: 1, d: "Electric public transport." },
    { id: "bus", n: "Bus / tram stop", e: "🚏", c: "#FFE08A", cost: 10, acc: 1, cover: "transit", r: 4, low: 1, d: "Homes within 4 squares can use public transport." },
    { id: "ev", n: "EV charging", e: "🔌", c: "#9FE0C8", pw: 2, cost: 15, acc: 1, smart: 1, d: "Charging for electric cars and buses." } ] },
  { g: "Energy", items: [
    { id: "solar", n: "Solar farm", e: "☀️", c: "#FFE9A6", sup: 12, renew: 1, cost: 80, d: "Makes 12 units of clean power in the daytime." },
    { id: "wind", n: "Wind turbine", e: "🌬️", c: "#DDEFFD", sup: 10, renew: 1, cost: 70, d: "Makes 10 units of clean power when it is windy." },
    { id: "battery", n: "Battery storage", e: "🔋", c: "#C6F0C2", cost: 60, acc: 1, smart: 1, d: "Stores solar power for the night, so the lights stay on." },
    { id: "gas", n: "Gas power plant", e: "🛢️", c: "#C8B8A8", sup: 30, cost: 50, acc: 1, poll: 3, d: "Lots of power, but it burns fossil fuel and pollutes within 3 squares." } ] },
  { g: "Water & waste", items: [
    { id: "desal", n: "Desalination plant", e: "🌊", c: "#9ED3F0", wsup: 25, pw: 6, cost: 120, acc: 1, d: "Turns seawater into drinking water for the city (uses power)." },
    { id: "wrec", n: "Water recycling", e: "💧", c: "#B8E3F6", wsup: 15, pw: 3, cost: 90, acc: 1, d: "Cleans used water so it can be used again." },
    { id: "rain", n: "Rainwater tanks", e: "🌧️", c: "#D4ECF7", wsup: 3, cost: 15, d: "Collects rain for gardens and toilets." },
    { id: "recycle", n: "Recycling centre", e: "♻️", c: "#CDEBC0", wcap: 30, cost: 60, acc: 1, d: "Recycles waste from about 30 units." },
    { id: "w2e", n: "Waste-to-energy", e: "🔥", c: "#F3C9A8", wcap: 40, sup: 8, cost: 100, acc: 1, d: "Burns waste to make 8 units of power." },
    { id: "landfill", n: "Landfill", e: "🗑️", c: "#C9BFA6", wcap: 40, cost: 20, poll: 2, d: "Cheap, but it smells and pollutes within 2 squares." } ] },
  { g: "Nature", items: [
    { id: "park", n: "Park", e: "🌳", c: "#9ED69A", green: 1, cover: "park", r: 3, cost: 15, d: "Green space: homes within 3 squares are happier and cooler." },
    { id: "trees", n: "Trees & shade", e: "🌴", c: "#B7E2A6", green: 1, cost: 5, cool: 1, d: "Shade cools the streets next to it." },
    { id: "farm", n: "Urban farm", e: "🥬", c: "#C7E89A", green: 1, wa: 1, cost: 25, d: "Grows food inside the city." },
    { id: "lake", n: "Lake / water park", e: "🏞️", c: "#8FD0F0", green: 1, cover: "park", r: 3, wa: 1, cost: 30, d: "Cools the area and gives people somewhere to relax." } ] },
  { g: "Services", items: [
    { id: "school", n: "School", e: "🏫", c: "#F7C1C1", jobs: 20, pw: 3, wa: 1, ws: 1, cover: "school", r: 5, cost: 70, acc: 1, d: "Homes within 5 squares have a school." },
    { id: "hospital", n: "Hospital", e: "🏥", c: "#FAD0D8", jobs: 60, pw: 6, wa: 3, ws: 2, cover: "health", r: 7, cost: 120, acc: 1, d: "Homes within 7 squares have healthcare." },
    { id: "police", n: "Police station", e: "🚓", c: "#C8D3F5", jobs: 15, pw: 2, cover: "safety", r: 6, cost: 50, acc: 1, d: "Homes within 6 squares feel safe." },
    { id: "fire", n: "Fire station", e: "🚒", c: "#F8B9A8", jobs: 15, pw: 2, cover: "safety", r: 6, cost: 50, acc: 1, d: "Homes within 6 squares are protected from fire." },
    { id: "community", n: "Community centre", e: "🏛️", c: "#E6D3F2", jobs: 10, pw: 2, cover: "park", r: 4, cost: 40, acc: 1, d: "A place for everyone to meet, learn and play." } ] },
  { g: "Smart tech", items: [
    { id: "sensor", n: "Smart sensor hub", e: "📡", c: "#D7E7FF", pw: 1, cover: "smart", r: 5, cost: 40, smart: 1, d: "Sensors control lights, water and air quality within 5 squares." },
    { id: "g5", n: "5G tower", e: "📶", c: "#E0DBFF", pw: 1, cover: "smart", r: 6, cost: 40, smart: 1, d: "Fast connection for smart services within 6 squares." },
    { id: "traffic", n: "Smart traffic lights", e: "🚦", c: "#FFD9A8", cost: 10, smart: 1, nearRoad: 1, d: "Adjust to traffic so cars and buses wait less. Place next to a road." },
    { id: "drone", n: "Drone delivery hub", e: "🚁", c: "#D9F2F2", pw: 2, cost: 60, acc: 1, smart: 1, d: "Delivers medicine and parcels without traffic." },
    { id: "data", n: "Data centre", e: "🖥️", c: "#CFD6E2", pw: 8, jobs: 20, cost: 100, acc: 1, smart: 1, d: "Runs the city's smart systems (uses a lot of power)." } ] },
  { g: "Your key building", items: [
    { id: "key", n: "My key building (2×2)", e: "⭐", c: "#FFD34D", size: 2, pw: 6, wa: 2, ws: 1, jobs: 40, cost: 150, acc: 1, d: "The building you design in detail. Click it to add its smart and sustainable features." } ] }
];
const IT = {}; CAT.forEach(g => g.items.forEach(i => { i.grp = g.g; IT[i.id] = i; }));
const BUDGET = 5000;
const NET = id => IT[id] && IT[id].net;
const LCOLS = ["#E5484D", "#1F6FEB", "#1E8A55", "#B4580B", "#8E4EC6", "#0F9DB5"];
const KEY_FEATURES = ["Solar panels on the roof", "Green roof or vertical garden", "Rainwater collection", "Smart sensors (lights, air, water)", "Natural ventilation and shade", "Recycled or local materials", "EV charging or bike parking", "Accessible for wheelchairs and older people", "Smart check-in or app", "Energy-saving glass and insulation"];

let S = null;   // the open session

function blank(){ return { v: 1, w: W, h: H, name: "", tiles: Array(W * H).fill(""), labels: [], notes: [], key: { features: [], desc: "" }, versions: [], updated: 0 }; }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function norm(d){
  const b = blank(); if (!d || typeof d !== "object") return b;
  const o = Object.assign(b, clone(d));
  if (!Array.isArray(o.tiles) || o.tiles.length !== W * H) o.tiles = b.tiles;
  o.labels = Array.isArray(o.labels) ? o.labels : []; o.notes = Array.isArray(o.notes) ? o.notes : [];
  o.key = o.key && typeof o.key === "object" ? Object.assign({ features: [], desc: "" }, o.key) : b.key;
  o.versions = Array.isArray(o.versions) ? o.versions.slice(-6) : [];
  return o;
}
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const idx = (x, y) => y * W + x, xy = i => [i % W, Math.floor(i / W)];
const base = (t, i) => t[i] && t[i][0] === "^" ? +t[i].slice(1) : i;   // the anchor square of a 2×2 building
const kind = (t, i) => { const v = t[i]; return !v ? "" : v[0] === "^" ? t[+v.slice(1)] : v; };

/* ===================== the city's systems ===================== */
function analyse(d){
  const t = d.tiles, A = { pop: 0, jobs: 0, dem: 0, sup: 0, ren: 0, wdem: 0, wsup: 0, wgen: 0, wcap: 0, landfill: 0, cost: 0, homes: [], green: 0, built: 0, tLow: 0, tCar: 0, smartN: 0, cnt: {}, bad: {} };
  const anchors = [];
  t.forEach((v, i) => { if (v && v[0] !== "^") anchors.push(i); });
  const nearNet = i => { const [x, y] = xy(i), sz = IT[t[i]] && IT[t[i]].size || 1;
    for (let yy = y - 1; yy <= y + sz; yy++) for (let xx = x - 1; xx <= x + sz; xx++){
      if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue; if (xx >= x && xx < x + sz && yy >= y && yy < y + sz) continue;
      if ((xx === x - 1 || xx === x + sz) && (yy === y - 1 || yy === y + sz)) continue;   // corners do not count
      const k = kind(t, idx(xx, yy)); if (NET(k) || k === "bus") return true; }
    return false; };
  const cov = {}; ["school", "health", "safety", "park", "smart", "transit"].forEach(k => cov[k] = new Set());
  const poll = new Set(), cool = new Set();
  anchors.forEach(i => { const it = IT[t[i]]; if (!it) return; const [x, y] = xy(i), sz = it.size || 1;
    A.cnt[it.id] = (A.cnt[it.id] || 0) + 1; A.cost += it.cost || 0;
    A.pop += it.pop || 0; A.jobs += it.jobs || 0; A.dem += it.pw || 0; A.sup += it.sup || 0; if (it.renew) A.ren += it.sup;
    A.wdem += it.wa || 0; A.wsup += it.wsup || 0; A.wgen += it.ws || 0; A.wcap += it.wcap || 0; if (it.id === "landfill") A.landfill++;
    if (it.green) A.green++; else if (!it.net) A.built += sz * sz;
    if (it.net || it.id === "bus"){ if (it.low) A.tLow++; else A.tCar++; }
    if (it.smart) A.smartN++;
    if (it.home) A.homes.push(i);
    const spread = (r, set) => { for (let yy = y - r; yy < y + sz + r; yy++) for (let xx = x - r; xx < x + sz + r; xx++){ if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
      const dx = Math.max(0, x - xx, xx - (x + sz - 1)), dy = Math.max(0, y - yy, yy - (y + sz - 1)); if (Math.hypot(dx, dy) <= r + .01) set.add(idx(xx, yy)); } };
    if (it.cover) spread(it.r, cov[it.cover]);
    if (it.poll) spread(it.poll, poll);
    if (it.cool) spread(1, cool);
    if ((it.acc || it.home) && !nearNet(i)) (A.bad.access = A.bad.access || []).push(i);
    if (it.nearRoad && !nearNet(i)) (A.bad.access = A.bad.access || []).push(i);
  });
  A.cov = cov; A.poll = poll; A.cool = cool;
  const H_ = A.homes, n = H_.length || 1;
  const covered = k => H_.filter(i => cov[k].has(i));
  ["school", "health", "safety", "park", "smart", "transit"].forEach(k => { const c = covered(k); A["c_" + k] = H_.length ? c.length / H_.length : 0; A.bad["no_" + k] = H_.filter(i => !cov[k].has(i)); });
  A.bad.polluted = H_.filter(i => poll.has(i));
  // scores (0–100)
  const pct = (a, b) => b <= 0 ? (a > 0 ? 1 : 0) : Math.min(1, a / b);
  A.powerOK = A.sup >= A.dem; A.renPct = A.sup ? A.ren / A.sup : 0;
  A.waterOK = A.wsup >= A.wdem; A.wasteOK = A.wcap >= A.wgen;
  A.greenPct = A.green / Math.max(1, A.green + A.built);
  A.lowPct = A.tLow / Math.max(1, A.tLow + A.tCar);
  const goodWaste = A.wgen ? Math.min(1, Math.max(0, A.wcap - (A.landfill * 40)) / A.wgen) : 0;
  const hasHomes = H_.length > 0;
  A.sust = Math.round(100 * (0.25 * (A.dem ? pct(A.ren, A.dem) : 0) + 0.2 * Math.min(1, A.greenPct / 0.25) + 0.15 * goodWaste + 0.1 * (A.wdem ? pct(A.wsup, A.wdem) : 0) + 0.15 * Math.min(1, A.lowPct / 0.5) + 0.15 * (hasHomes ? 1 - A.bad.polluted.length / n : 0)));
  A.smart = Math.round(100 * (0.4 * A.c_smart + 0.3 * Math.min(1, A.smartN / 8) + 0.15 * ((A.cnt.ev ? .5 : 0) + (A.cnt.traffic ? .5 : 0)) + 0.15 * ((A.cnt.battery ? .5 : 0) + (A.cnt.data || A.cnt.drone ? .5 : 0))));
  A.live = hasHomes ? Math.round(100 * Math.max(0, 0.2 * A.c_school + 0.2 * A.c_health + 0.15 * A.c_safety + 0.15 * A.c_park + 0.15 * A.c_transit + 0.15 * (1 - (A.bad.access || []).length / Math.max(1, anchors.length)) - 0.3 * A.bad.polluted.length / n - (A.powerOK ? 0 : .15) - (A.waterOK ? 0 : .15))) : 0;
  A.rank = A.pop < 500 ? ["Village", "🏡"] : A.pop < 2000 ? ["Town", "🏘️"] : A.pop < 5000 ? ["City", "🏙️"] : A.smart >= 60 && A.sust >= 60 ? ["Smart City 2050", "🌟"] : ["Big City", "🌆"];
  A.anchors = anchors;
  return A;
}
function advice(d, A){
  const out = [], push = (lvl, txt, tiles) => out.push({ lvl, txt, tiles: tiles || [] });
  if (!A.anchors.length) { push("info", "Start with a road or tram line, then add homes next to it. Every building must touch a road, path or tram line."); return out; }
  if (!A.cnt.key) push("bad", "Place your key building (⭐ in the last group). It is 2×2 squares.");
  if (A.dem > A.sup) push("bad", `Not enough power: the city needs ${A.dem} units but makes ${A.sup}. Add solar farms or wind turbines.`);
  if (A.sup && A.renPct < .6) push("warn", `Only ${Math.round(A.renPct * 100)}% of your power is renewable. Swap gas for solar or wind to reach at least 60%.`);
  if (A.ren && !A.cnt.battery) push("warn", "Solar power stops at night. Add battery storage so the lights stay on.");
  if (A.wdem > A.wsup) push("bad", `Not enough water: the city needs ${A.wdem} units but has ${A.wsup}. Add desalination, water recycling or rainwater tanks.`);
  if (A.wgen > A.wcap) push("bad", `Waste is piling up: ${A.wgen} units made, ${A.wcap} handled. Add a recycling centre or waste-to-energy.`);
  if (A.landfill) push("warn", "Landfill pollutes and wastes resources. Recycling or waste-to-energy is more sustainable.");
  if ((A.bad.access || []).length) push("bad", `${A.bad.access.length} building(s) do not touch a road, path or tram line, so people cannot reach them.`, A.bad.access);
  if (A.bad.polluted.length) push("bad", `${A.bad.polluted.length} home block(s) are next to pollution (factory, gas plant or landfill). Move them apart or use clean alternatives.`, A.bad.polluted);
  if (A.homes.length){
    if (A.bad.no_school.length) push("warn", `${A.bad.no_school.length} home block(s) have no school within 5 squares.`, A.bad.no_school);
    if (A.bad.no_health.length) push("warn", `${A.bad.no_health.length} home block(s) have no hospital within 7 squares.`, A.bad.no_health);
    if (A.bad.no_safety.length) push("warn", `${A.bad.no_safety.length} home block(s) have no police or fire station within 6 squares.`, A.bad.no_safety);
    if (A.bad.no_park.length) push("warn", `${A.bad.no_park.length} home block(s) have no park, lake or community centre nearby.`, A.bad.no_park);
    if (A.bad.no_transit.length) push("warn", `${A.bad.no_transit.length} home block(s) are far from a bus or tram stop.`, A.bad.no_transit);
    if (A.bad.no_smart.length) push("info", `${A.bad.no_smart.length} home block(s) are not covered by smart sensors or 5G.`, A.bad.no_smart);
  }
  if (A.greenPct < .2) push("warn", `Green space is ${Math.round(A.greenPct * 100)}%. Aim for at least 20–25% with parks, trees, farms or lakes.`);
  if (A.tCar && A.lowPct < .4) push("info", "Most of your transport is roads for cars. Add cycle paths, shaded walkways or a tram line.");
  if (A.cost > BUDGET) push("warn", `Over budget: ${A.cost.toLocaleString()} of ${BUDGET.toLocaleString()} credits. Real cities must make choices.`);
  const described = d.labels.filter(l => (l.desc || "").trim().split(/\s+/).length >= 5).length + d.notes.filter(l => (l.desc || "").trim().split(/\s+/).length >= 5).length;
  if (described < 3) push("info", `Label at least 3 smart or sustainable features with a short description (you have ${described}). Use 🏷️ Label area or 📍 Note.`);
  if (!out.length) push("good", "Brilliant! Your city meets its needs. Check your labels, then add pictures to your evidence.");
  return out;
}

/* ===================== UI ===================== */
const CSS = `
#cb{position:fixed;inset:0;z-index:2147483640;background:#EEF2F7;display:flex;flex-direction:column;font-family:Inter,Arial,sans-serif;color:#1B2D4E}
#cb *{box-sizing:border-box}
#cb button{font:inherit;cursor:pointer}
#cb .top{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:8px 12px;background:#1B2D4E;color:#fff}
#cb .top input{font:inherit;font-weight:700;color:#1B2D4E;background:#fff;border:0;border-radius:8px;padding:6px 10px;min-width:180px;max-width:260px}
#cb .tb{background:#ffffff1f;color:#fff;border:1px solid #ffffff40;border-radius:8px;padding:6px 10px;font-weight:700;font-size:14px;white-space:nowrap}
#cb .tb:hover{background:#ffffff33}#cb .tb.red{background:#E5484D;border-color:#E5484D}#cb .tb:disabled{opacity:.4;cursor:default}
#cb .sv{font-size:13px;font-weight:700;padding:4px 10px;border-radius:999px;background:#1E8A55}
#cb .sv.p{background:#B4580B}
#cb .body{flex:1;display:grid;grid-template-columns:210px minmax(0,1fr) 330px;grid-template-rows:minmax(0,1fr);min-height:0}
#cb .pal{overflow:auto;min-height:0;background:#fff;border-right:1px solid #D8DEEA;padding:8px}
#cb .pal h4{margin:10px 4px 4px;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#5A6680}
#cb .it{display:flex;gap:8px;align-items:center;width:100%;text-align:left;border:2px solid transparent;background:#F4F6FA;border-radius:9px;padding:5px 7px;margin:3px 0;font-size:13.5px;font-weight:600;color:#1B2D4E}
#cb .it .sw{width:26px;height:26px;border-radius:6px;display:grid;place-items:center;font-size:16px;flex:none}
#cb .it.on{border-color:#E5484D;background:#FFF1F1}
#cb .it small{display:block;font-weight:500;color:#5A6680;font-size:11.5px}
#cb .mid{display:flex;flex-direction:column;min-width:0;min-height:0}
#cb .tools{display:flex;gap:6px;flex-wrap:wrap;padding:8px;background:#fff;border-bottom:1px solid #D8DEEA;align-items:center}
#cb .tl{border:2px solid #D8DEEA;background:#fff;border-radius:999px;padding:5px 11px;font-weight:700;font-size:13.5px;color:#1B2D4E}
#cb .tl.on{background:#1B2D4E;color:#fff;border-color:#1B2D4E}
#cb select.tl{padding:5px 8px;width:auto;min-width:0;margin:0}
#cb .stage{flex:1;position:relative;min-height:0;min-width:0;overflow:hidden;touch-action:none}
#cb canvas{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#E9E2CC;border-radius:10px;box-shadow:0 4px 18px #1b2d4e22;touch-action:none}
#cb .hint{padding:6px 10px;font-size:13px;color:#5A6680;background:#fff;border-top:1px solid #D8DEEA;min-height:32px}
#cb .side{overflow:auto;min-height:0;background:#fff;border-left:1px solid #D8DEEA;display:flex;flex-direction:column}
#cb .tabs{display:flex;border-bottom:1px solid #D8DEEA;position:sticky;top:0;background:#fff;z-index:2}
#cb .tabs button{flex:1;border:0;background:none;padding:9px 2px;font-weight:700;font-size:12.5px;color:#5A6680;border-bottom:3px solid transparent}
#cb .tabs button.on{color:#1B2D4E;border-bottom-color:#E5484D}
#cb .pane{padding:12px;display:flex;flex-direction:column;gap:10px;font-size:14px}
#cb .score{display:flex;align-items:center;gap:10px}
#cb .score b{width:96px}
#cb .bar{flex:1;height:12px;background:#EEF2F7;border-radius:99px;overflow:hidden}
#cb .bar i{display:block;height:100%;border-radius:99px}
#cb .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
#cb .stat{background:#F4F6FA;border-radius:9px;padding:7px 9px;font-size:12.5px}
#cb .stat b{display:block;font-size:16px}
#cb .adv{border-radius:9px;padding:8px 10px;font-size:13.5px;border-left:4px solid}
#cb .adv.bad{background:#FFF0F0;border-color:#E5484D}#cb .adv.warn{background:#FFF7E8;border-color:#E39A2D}#cb .adv.info{background:#EEF4FF;border-color:#1F6FEB}#cb .adv.good{background:#ECFAF1;border-color:#1E8A55}
#cb .adv button{margin-top:5px;border:1px solid #C9D1E0;background:#fff;border-radius:7px;padding:2px 8px;font-size:12px;font-weight:700}
#cb .lab{border:1px solid #D8DEEA;border-radius:10px;padding:8px;display:flex;flex-direction:column;gap:6px}
#cb .lab input,#cb .lab textarea,#cb .pane textarea,#cb .pane input[type=text]{font:inherit;font-size:13.5px;border:1px solid #C9D1E0;border-radius:8px;padding:6px 8px;width:100%}
#cb .lab textarea,#cb .pane textarea{min-height:58px;resize:vertical}
#cb .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cb .sm{border:1px solid #C9D1E0;background:#fff;border-radius:7px;padding:3px 9px;font-size:12.5px;font-weight:700;color:#1B2D4E}
#cb .sm.red{color:#C62828}
#cb .muted{color:#5A6680;font-size:12.5px}
#cb .chip{display:inline-block;width:14px;height:14px;border-radius:4px;vertical-align:-2px}
#cb .modal{position:fixed;inset:0;background:#0b1a3388;display:grid;place-items:center;z-index:5}
#cb .modal>div{background:#fff;border-radius:14px;padding:18px;max-width:560px;width:calc(100% - 32px);max-height:85vh;overflow:auto;display:flex;flex-direction:column;gap:10px}
#cb .modal h3{margin:0}
#cb .btn{border:0;background:#E5484D;color:#fff;border-radius:9px;padding:8px 14px;font-weight:800}
#cb .btn.g{background:#1B2D4E}
#cb .btn.l{background:#EEF2F7;color:#1B2D4E}
@media (max-width:1180px){#cb .body{grid-template-columns:170px minmax(0,1fr);grid-template-rows:minmax(0,1fr) 36vh}#cb .side{grid-column:1 / -1;border-left:0;border-top:1px solid #D8DEEA}#cb .it small{display:none}}
@media (max-width:640px){#cb .body{grid-template-columns:minmax(0,1fr);grid-template-rows:auto minmax(0,1fr) 34vh}#cb .pal{display:flex;flex-wrap:nowrap;overflow-x:auto;gap:4px;border-right:0;border-bottom:1px solid #D8DEEA;padding:6px}#cb .pal h4{display:none}#cb .it{width:auto;flex:none}#cb .side{grid-column:auto}}
`;

function open(opts){
  if (S) close();
  opts = opts || {};
  const st = document.createElement("style"); st.id = "cbCss"; st.textContent = CSS; document.head.appendChild(st);
  const root = document.createElement("div"); root.id = "cb"; document.body.appendChild(root);
  let d = norm(opts.data);
  // a newer copy on this device (e.g. the course could not save) wins
  try { const bk = JSON.parse(localStorage.getItem("cb2050_" + (opts.id || "me")) || "null"); if (bk && bk.updated > (d.updated || 0)) d = norm(bk); } catch(e){}
  if (!d.name && opts.cityName) d.name = opts.cityName;
  S = { opts, d, root, st, tool: "place", item: "road", view: "normal", sel: null, undo: [], redo: [], dirty: false, savedAt: d.updated || 0, tab: "score", hl: [], drag: null, timer: 0 };
  document.documentElement.style.overflow = "hidden";
  root.innerHTML = `
    <div class="top">
      <span style="font-weight:900;font-size:16px">🏙️ City Builder 2050</span>
      <input id="cbName" placeholder="Name your city" maxlength="40" value="${esc(d.name)}" aria-label="City name">
      <span id="cbSv" class="sv">✓ Saved</span>
      <span style="flex:1"></span>
      <button class="tb" id="cbUndo" title="Undo (Ctrl+Z)">↶</button><button class="tb" id="cbRedo" title="Redo (Ctrl+Y)">↷</button>
      <button class="tb" id="cbEv" title="Put a picture of your city into a Criterion C evidence box">📸 Add to my task</button>
      <button class="tb" id="cbDl" title="Download a picture of your city">⬇ Picture</button>
      <button class="tb" id="cbHelp">❔ Help</button>
      <button class="tb red" id="cbClose">Save & close</button>
    </div>
    <div class="body">
      <div class="pal" id="cbPal"></div>
      <div class="mid">
        <div class="tools">
          <button class="tl on" data-tool="place">🧱 Build</button>
          <button class="tl" data-tool="erase">🧽 Erase</button>
          <button class="tl" data-tool="label">🏷️ Label area</button>
          <button class="tl" data-tool="note">📍 Note</button>
          <button class="tl" data-tool="info">🔍 Inspect</button>
          <span style="flex:1"></span>
          <label class="muted" for="cbView">View</label>
          <select class="tl" id="cbView"><option value="normal">City</option><option value="problems">⚠️ Problems</option><option value="school">🏫 School cover</option><option value="health">🏥 Health cover</option><option value="safety">🚓 Safety cover</option><option value="transit">🚏 Public transport</option><option value="smart">📡 Smart cover</option><option value="pollution">🏭 Pollution</option></select>
        </div>
        <div class="stage" id="cbStage"><canvas id="cbCv"></canvas></div>
        <div class="hint" id="cbHint"></div>
      </div>
      <div class="side">
        <div class="tabs"><button data-tab="score">Scores</button><button data-tab="adv">Advisor</button><button data-tab="labels">Labels</button><button data-tab="key">Key building</button><button data-tab="ver">Versions</button></div>
        <div class="pane" id="cbPane"></div>
      </div>
    </div>`;
  const $ = s => root.querySelector(s);
  // palette
  $("#cbPal").innerHTML = CAT.map(g => `<h4>${esc(g.g)}</h4>` + g.items.map(i => `<button class="it" data-it="${i.id}" title="${esc(i.d)}"><span class="sw" style="background:${i.c}">${i.e || "▬"}</span><span>${esc(i.n)}<small>${i.cost} credits</small></span></button>`).join("")).join("");
  $("#cbPal").onclick = e => { const b = e.target.closest("[data-it]"); if (!b) return; S.item = b.dataset.it; setTool("place"); };
  root.querySelectorAll("[data-tool]").forEach(b => b.onclick = () => setTool(b.dataset.tool));
  root.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { S.tab = b.dataset.tab; side(); });
  $("#cbView").onchange = e => { S.view = e.target.value; draw(); };
  $("#cbName").oninput = e => { S.d.name = e.target.value.slice(0, 40); mark(); };
  $("#cbUndo").onclick = undo; $("#cbRedo").onclick = redo;
  $("#cbClose").onclick = () => close();
  $("#cbDl").onclick = () => { const a = document.createElement("a"); a.href = picture("image/png"); a.download = (S.d.name || "my-city") + ".png"; document.body.appendChild(a); a.click(); a.remove(); };
  $("#cbEv").onclick = evidenceDialog;
  $("#cbHelp").onclick = help;
  S.key = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z"){ e.preventDefault(); e.shiftKey ? redo() : undo(); } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y"){ e.preventDefault(); redo(); } else if (e.key === "Escape" && root.querySelector(".modal")) root.querySelector(".modal").remove(); };
  document.addEventListener("keydown", S.key);
  // canvas
  const cv = $("#cbCv"); S.cv = cv;
  S.ro = new ResizeObserver(() => fit()); S.ro.observe($("#cbStage"));
  cv.addEventListener("pointerdown", down); cv.addEventListener("pointermove", move); cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
  cv.addEventListener("pointerleave", () => { S.hover = null; draw(); });
  // autosave every 2 seconds, and when the page is hidden or closed
  S.timer = setInterval(() => { if (S && S.dirty) persist(); }, 2000);
  S.vis = () => { if (S && S.dirty) persist(); }; document.addEventListener("visibilitychange", S.vis); window.addEventListener("pagehide", S.vis);
  fit(); setTool("place"); side();
  try { if (!localStorage.getItem("cb2050_seenHelp")){ localStorage.setItem("cb2050_seenHelp", "1"); help(); } } catch(e){}
}

function setTool(t){
  S.tool = t; S.root.querySelectorAll("[data-tool]").forEach(b => b.classList.toggle("on", b.dataset.tool === t));
  S.root.querySelectorAll("[data-it]").forEach(b => b.classList.toggle("on", t === "place" && b.dataset.it === S.item));
  const it = IT[S.item];
  S.root.querySelector("#cbHint").innerHTML = t === "place" ? `<b>${it.e || "▬"} ${esc(it.n)}</b> · ${esc(it.d)} <span class="muted">Click or drag to build.</span>`
    : t === "erase" ? "<b>🧽 Erase</b> · click or drag over squares to clear them."
    : t === "label" ? "<b>🏷️ Label area</b> · drag a box over a district (for example “Green energy zone”), then name and describe it."
    : t === "note" ? "<b>📍 Note</b> · click a building or square to explain a smart or sustainable feature."
    : "<b>🔍 Inspect</b> · click any square to see what it does and what covers it.";
  draw();
}
function fit(){
  if (!S) return; const st = S.root.querySelector("#cbStage"), r = st.getBoundingClientRect();
  const ts = Math.max(14, Math.floor(Math.min((r.width - 16) / W, (r.height - 16) / H)));
  S.ts = ts; const dpr = window.devicePixelRatio || 1;
  S.cv.width = W * ts * dpr; S.cv.height = H * ts * dpr; S.cv.style.width = W * ts + "px"; S.cv.style.height = H * ts + "px";
  S.ctx = S.cv.getContext("2d"); S.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); draw();
}
function cell(e){ const r = S.cv.getBoundingClientRect(), x = Math.floor((e.clientX - r.left) / S.ts), y = Math.floor((e.clientY - r.top) / S.ts); return x >= 0 && y >= 0 && x < W && y < H ? [x, y] : null; }

function snapshot(){ S.undo.push(JSON.stringify({ tiles: S.d.tiles, labels: S.d.labels, notes: S.d.notes })); if (S.undo.length > 60) S.undo.shift(); S.redo = []; }
function restoreSnap(s){ const o = JSON.parse(s); S.d.tiles = o.tiles; S.d.labels = o.labels; S.d.notes = o.notes; }
function undo(){ if (!S.undo.length) return; S.redo.push(JSON.stringify({ tiles: S.d.tiles, labels: S.d.labels, notes: S.d.notes })); restoreSnap(S.undo.pop()); mark(); draw(); side(); }
function redo(){ if (!S.redo.length) return; S.undo.push(JSON.stringify({ tiles: S.d.tiles, labels: S.d.labels, notes: S.d.notes })); restoreSnap(S.redo.pop()); mark(); draw(); side(); }

function eraseAt(i){ const t = S.d.tiles, b = base(t, i); if (!t[b]) return false;
  const it = IT[t[b]], sz = it && it.size || 1, [x, y] = xy(b);
  for (let yy = y; yy < y + sz; yy++) for (let xx = x; xx < x + sz; xx++) if (xx < W && yy < H) t[idx(xx, yy)] = "";
  S.d.notes = S.d.notes.filter(n => !(n.x >= x && n.x < x + sz && n.y >= y && n.y < y + sz)); return true; }
function placeAt(x, y){
  const it = IT[S.item], sz = it.size || 1, t = S.d.tiles;
  if (x + sz > W || y + sz > H) return false;
  if (it.id === "key" && t.some(v => v === "key")) { toast("You have one key building. Erase it first to move it."); return false; }
  for (let yy = y; yy < y + sz; yy++) for (let xx = x; xx < x + sz; xx++){ const k = kind(t, idx(xx, yy)); if (k === it.id && sz === 1) return false; }
  for (let yy = y; yy < y + sz; yy++) for (let xx = x; xx < x + sz; xx++) eraseAt(idx(xx, yy));
  const a = idx(x, y); t[a] = it.id;
  for (let yy = y; yy < y + sz; yy++) for (let xx = x; xx < x + sz; xx++) if (idx(xx, yy) !== a) t[idx(xx, yy)] = "^" + a;
  return true;
}
function down(e){
  const c = cell(e); if (!c) return; S.cv.setPointerCapture(e.pointerId); const [x, y] = c;
  if (S.tool === "place" || S.tool === "erase"){ snapshot(); S.drag = { last: "" }; paint(c); }
  else if (S.tool === "label"){ S.drag = { x0: x, y0: y, x1: x, y1: y }; draw(); }
  else if (S.tool === "note"){ noteDialog(x, y); }
  else inspect(x, y);
}
function move(e){ const c = cell(e); S.hover = c; if (!S.drag){ draw(); return; }
  if (S.tool === "label"){ if (c){ S.drag.x1 = c[0]; S.drag.y1 = c[1]; } draw(); } else if (c) paint(c); }
function up(){
  if (!S.drag) return; const dg = S.drag; S.drag = null;
  if (S.tool === "label"){ const x = Math.min(dg.x0, dg.x1), y = Math.min(dg.y0, dg.y1), w = Math.abs(dg.x1 - dg.x0) + 1, h = Math.abs(dg.y1 - dg.y0) + 1; labelDialog({ x, y, w, h }); }
  else { side(); }
  draw();
}
function paint(c){
  const k = c.join(","); if (S.drag.last === k) return;
  // fill every square between the last one and this one, so fast drags leave no gaps
  const from = S.drag.lc || c, n = Math.max(Math.abs(c[0] - from[0]), Math.abs(c[1] - from[1]), 1); let ch = false;
  for (let s = S.drag.lc ? 1 : 0; s <= n; s++){ const x = Math.round(from[0] + (c[0] - from[0]) * s / n), y = Math.round(from[1] + (c[1] - from[1]) * s / n);
    ch = (S.tool === "erase" ? eraseAt(idx(x, y)) : placeAt(x, y)) || ch; }
  S.drag.last = k; S.drag.lc = c;
  if (ch){ mark(); draw(); }
}

/* ===================== drawing ===================== */
function rr(x, y, w, h, r, fill, stroke){ const c = S.ctx; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); if (fill){ c.fillStyle = fill; c.fill(); } if (stroke){ c.strokeStyle = stroke; c.stroke(); } }
function drawTo(ctx, ts, opt){
  const keep = S.ctx; S.ctx = ctx; const t = S.d.tiles, A = S.A || analyse(S.d), view = opt && opt.view || S.view;
  ctx.clearRect(0, 0, W * ts, H * ts);
  ctx.fillStyle = "#E9E2CC"; ctx.fillRect(0, 0, W * ts, H * ts);
  ctx.strokeStyle = "#00000010"; ctx.lineWidth = 1;
  for (let x = 0; x <= W; x++){ ctx.beginPath(); ctx.moveTo(x * ts + .5, 0); ctx.lineTo(x * ts + .5, H * ts); ctx.stroke(); }
  for (let y = 0; y <= H; y++){ ctx.beginPath(); ctx.moveTo(0, y * ts + .5); ctx.lineTo(W * ts, y * ts + .5); ctx.stroke(); }
  // networks first
  for (let i = 0; i < W * H; i++){ const k = t[i]; if (!NET(k)) continue; const [x, y] = xy(i), it = IT[k], px = x * ts, py = y * ts;
    const same = (dx, dy) => { const xx = x + dx, yy = y + dy; return xx >= 0 && yy >= 0 && xx < W && yy < H && NET(kind(t, idx(xx, yy))); };
    const w = k === "road" ? .62 : k === "tram" ? .5 : .42, m = (1 - w) / 2 * ts;
    ctx.fillStyle = it.c; ctx.fillRect(px + m, py + m, ts - 2 * m, ts - 2 * m);
    if (same(-1, 0)) ctx.fillRect(px, py + m, m + 1, ts - 2 * m); if (same(1, 0)) ctx.fillRect(px + ts - m - 1, py + m, m + 1, ts - 2 * m);
    if (same(0, -1)) ctx.fillRect(px + m, py, ts - 2 * m, m + 1); if (same(0, 1)) ctx.fillRect(px + m, py + ts - m - 1, ts - 2 * m, m + 1);
    if (k === "road"){ ctx.strokeStyle = "#F5D76E"; ctx.setLineDash([ts * .12, ts * .12]); ctx.lineWidth = Math.max(1, ts * .05); ctx.beginPath();
      if (same(-1, 0) || same(1, 0)){ ctx.moveTo(px, py + ts / 2); ctx.lineTo(px + ts, py + ts / 2); } if (same(0, -1) || same(0, 1)){ ctx.moveTo(px + ts / 2, py); ctx.lineTo(px + ts / 2, py + ts); }
      ctx.stroke(); ctx.setLineDash([]); }
    else if (it.e){ ctx.font = `${Math.floor(ts * .42)}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(it.e, px + ts / 2, py + ts / 2 + 1); }
  }
  for (let i = 0; i < W * H; i++){ const k = t[i]; if (!k || k[0] === "^" || NET(k)) continue; const it = IT[k]; if (!it) continue; const [x, y] = xy(i), sz = it.size || 1, px = x * ts, py = y * ts;
    rr(px + 2, py + 2, sz * ts - 4, sz * ts - 4, Math.max(3, ts * .18), it.c, "#00000022");
    ctx.font = `${Math.floor(ts * (sz > 1 ? .9 : .58))}px sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(it.e, px + sz * ts / 2, py + sz * ts / 2 + (sz > 1 ? -ts * .15 : 1));
    if (k === "key"){ ctx.font = `800 ${Math.max(9, Math.floor(ts * .26))}px Inter,Arial`; ctx.fillStyle = "#1B2D4E"; let kn = String(S.opts.keyName || "Key building"); while (ctx.measureText(kn).width > ts * 1.9 && kn.length > 3) kn = kn.slice(0, -2) + "…"; ctx.fillText(kn, px + ts, py + ts * 1.62); }
  }
  // overlays
  const tint = (set, col) => { ctx.fillStyle = col; set.forEach(i => { const [x, y] = xy(i); ctx.fillRect(x * ts, y * ts, ts, ts); }); };
  if (["school", "health", "safety", "transit", "smart"].includes(view)){ tint(A.cov[view], "#1F6FEB26"); tint(new Set(A.bad["no_" + view]), "#E5484D55"); }
  if (view === "pollution") tint(A.poll, "#8B5A2B44");
  if (view === "problems"){ const all = new Set([...(A.bad.access || []), ...A.bad.polluted]); tint(all, "#E5484D66"); }
  if (S.hl && S.hl.length) { ctx.lineWidth = 3; ctx.strokeStyle = "#E5484D"; S.hl.forEach(i => { const [x, y] = xy(i); ctx.strokeRect(x * ts + 1.5, y * ts + 1.5, ts - 3, ts - 3); }); }
  // labels and notes
  S.d.labels.forEach((l, n) => { const col = l.col || LCOLS[n % LCOLS.length]; ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.setLineDash([6, 4]); ctx.strokeRect(l.x * ts + 2, l.y * ts + 2, l.w * ts - 4, l.h * ts - 4); ctx.setLineDash([]);
    ctx.font = `800 ${Math.max(10, Math.floor(ts * .32))}px Inter,Arial`; const txt = (l.name || "Area").slice(0, 30), tw = ctx.measureText(txt).width + 10, th = Math.max(14, ts * .44);
    ctx.fillStyle = col; rr(l.x * ts + 4, l.y * ts + 4, tw, th, 4, col); ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(txt, l.x * ts + 9, l.y * ts + 4 + th / 2); });
  S.d.notes.forEach((nn, n) => { const cx = nn.x * ts + ts * .82, cy = nn.y * ts + ts * .2, r = Math.max(7, ts * .2); ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = "#E5484D"; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `800 ${Math.floor(r * 1.2)}px Inter,Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(n + 1), cx, cy + .5); });
  if (!opt){
    if (S.drag && S.tool === "label"){ const dg = S.drag, x = Math.min(dg.x0, dg.x1), y = Math.min(dg.y0, dg.y1), w = Math.abs(dg.x1 - dg.x0) + 1, h = Math.abs(dg.y1 - dg.y0) + 1; ctx.fillStyle = "#1F6FEB22"; ctx.fillRect(x * ts, y * ts, w * ts, h * ts); ctx.strokeStyle = "#1F6FEB"; ctx.lineWidth = 2; ctx.strokeRect(x * ts, y * ts, w * ts, h * ts); }
    else if (S.hover){ const [x, y] = S.hover, sz = S.tool === "place" ? IT[S.item].size || 1 : 1; ctx.strokeStyle = S.tool === "erase" ? "#E5484D" : "#1B2D4E"; ctx.lineWidth = 2; ctx.strokeRect(x * ts + 1, y * ts + 1, sz * ts - 2, sz * ts - 2); }
  }
  S.ctx = keep;
}
function draw(){ if (!S || !S.ctx) return; S.A = analyse(S.d); drawTo(S.ctx, S.ts); }

/* ===================== side panel ===================== */
function bar(label, v, col){ return `<div class="score"><b>${label}</b><div class="bar"><i style="width:${v}%;background:${col}"></i></div><span style="width:44px;text-align:right;font-weight:800">${v}</span></div>`; }
function side(){
  if (!S) return; const A = S.A = analyse(S.d), d = S.d, P = S.root.querySelector("#cbPane");
  S.root.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b.dataset.tab === S.tab));
  const adv = advice(d, A);
  S.root.querySelector('[data-tab="adv"]').textContent = "Advisor" + (adv.filter(a => a.lvl !== "good").length ? ` (${adv.filter(a => a.lvl === "bad" || a.lvl === "warn").length})` : " ✓");
  if (S.tab === "score"){
    const stars = v => "★".repeat(Math.round(v / 20)) + "☆".repeat(5 - Math.round(v / 20));
    P.innerHTML = `<div style="font-size:20px;font-weight:900">${A.rank[1]} ${esc(A.rank[0])}</div>
      ${bar("Smart", A.smart, "#1F6FEB")}${bar("Sustainable", A.sust, "#1E8A55")}${bar("Liveable", A.live, "#E39A2D")}
      <div class="muted">Smart ${stars(A.smart)} · Sustainable ${stars(A.sust)} · Liveable ${stars(A.live)}</div>
      <div class="grid2">
        <div class="stat">👪 Population<b>${A.pop.toLocaleString()}</b></div><div class="stat">💼 Jobs<b>${A.jobs.toLocaleString()}</b></div>
        <div class="stat" style="${A.powerOK ? "" : "background:#FFF0F0"}">⚡ Power<b>${A.sup} / ${A.dem}</b>${Math.round(A.renPct * 100)}% renewable</div>
        <div class="stat" style="${A.waterOK ? "" : "background:#FFF0F0"}">💧 Water<b>${A.wsup} / ${A.wdem}</b>supply / need</div>
        <div class="stat" style="${A.wasteOK ? "" : "background:#FFF0F0"}">♻️ Waste<b>${A.wcap} / ${A.wgen}</b>handled / made</div>
        <div class="stat">🌳 Green space<b>${Math.round(A.greenPct * 100)}%</b>aim for 20–25%</div>
        <div class="stat">🚲 Low-carbon travel<b>${Math.round(A.lowPct * 100)}%</b>of transport</div>
        <div class="stat" style="${A.cost > BUDGET ? "background:#FFF0F0" : ""}">💰 Budget<b>${A.cost.toLocaleString()}</b>of ${BUDGET.toLocaleString()} credits</div>
      </div>
      <div class="muted">Services cover these % of homes: school ${Math.round(A.c_school * 100)} · health ${Math.round(A.c_health * 100)} · safety ${Math.round(A.c_safety * 100)} · parks ${Math.round(A.c_park * 100)} · public transport ${Math.round(A.c_transit * 100)} · smart ${Math.round(A.c_smart * 100)}</div>
      <div class="muted">Use these numbers as evidence in Criterion C and to test your success criteria in Criterion D.</div>`;
  } else if (S.tab === "adv"){
    P.innerHTML = `<div class="muted">Your City Advisor checks how the city works. Fix red first, then orange.</div>` + adv.map((a, n) => `<div class="adv ${a.lvl}">${esc(a.txt)}${a.tiles.length ? `<br><button data-hl="${n}">Show on map</button>` : ""}</div>`).join("");
    P.querySelectorAll("[data-hl]").forEach(b => b.onclick = () => { S.hl = adv[+b.dataset.hl].tiles.slice(); draw(); setTimeout(() => { if (S){ S.hl = []; draw(); } }, 4000); });
  } else if (S.tab === "labels"){
    const lab = (l, n, kindL) => `<div class="lab"><div class="row"><span class="chip" style="background:${kindL === "a" ? (l.col || LCOLS[n % LCOLS.length]) : "#E5484D"}"></span><b style="flex:1">${kindL === "a" ? "🏷️" : "📍 " + (n + 1) + "."} ${esc(l.name || "(no name)")}</b>
      <button class="sm" data-ed="${kindL}${n}">Edit</button><button class="sm red" data-rm="${kindL}${n}">Delete</button></div><div class="muted">${esc(l.desc || "No description yet")}</div></div>`;
    const described = d.labels.filter(l => (l.desc || "").trim().split(/\s+/).length >= 5).length + d.notes.filter(l => (l.desc || "").trim().split(/\s+/).length >= 5).length;
    P.innerHTML = `<div class="adv ${described >= 3 ? "good" : "info"}">${described >= 3 ? "✓" : "○"} Labelled smart or sustainable features with a description: <b>${described}</b> (at least 3)</div>
      <div class="row"><button class="sm" id="cbAddL">🏷️ Label an area</button><button class="sm" id="cbAddN">📍 Add a note</button></div>
      <b>Areas (districts and zones)</b>${d.labels.length ? d.labels.map((l, n) => lab(l, n, "a")).join("") : '<div class="muted">None yet. Drag a box over a district, for example “Green energy zone”.</div>'}
      <b>Notes (single features)</b>${d.notes.length ? d.notes.map((l, n) => lab(l, n, "n")).join("") : '<div class="muted">None yet. Click a building to explain how it is smart or sustainable.</div>'}`;
    P.querySelector("#cbAddL").onclick = () => setTool("label"); P.querySelector("#cbAddN").onclick = () => setTool("note");
    P.querySelectorAll("[data-ed]").forEach(b => b.onclick = () => { const k = b.dataset.ed, n = +k.slice(1); k[0] === "a" ? labelDialog(d.labels[n], n) : noteDialog(d.notes[n].x, d.notes[n].y, n); });
    P.querySelectorAll("[data-rm]").forEach(b => b.onclick = () => { snapshot(); const k = b.dataset.rm, n = +k.slice(1); (k[0] === "a" ? d.labels : d.notes).splice(n, 1); mark(); draw(); side(); });
  } else if (S.tab === "key"){
    const placed = !!A.cnt.key;
    P.innerHTML = `<div style="font-weight:900;font-size:16px">⭐ ${esc(S.opts.keyName || "My key building")}</div>
      <div class="adv ${placed ? "good" : "warn"}">${placed ? "✓ Placed on the map." : "Not placed yet: choose ⭐ My key building in the palette (it is 2×2)."}</div>
      <b>Smart and sustainable features of my key building</b><div class="muted">Tick at least 4.</div>
      ${KEY_FEATURES.map((f, n) => `<label class="row" style="gap:8px"><input type="checkbox" data-kf="${n}" ${d.key.features.includes(f) ? "checked" : ""}> ${esc(f)}</label>`).join("")}
      <b>Describe how your key building works (what makes it smart, what makes it sustainable, who it helps)</b>
      <textarea id="cbKeyD" placeholder="My key building uses…">${esc(d.key.desc || "")}</textarea>`;
    P.querySelectorAll("[data-kf]").forEach(c => c.onchange = () => { const f = KEY_FEATURES[+c.dataset.kf]; d.key.features = d.key.features.filter(x => x !== f); if (c.checked) d.key.features.push(f); mark(); });
    P.querySelector("#cbKeyD").oninput = e => { d.key.desc = e.target.value.slice(0, 2000); mark(); };
  } else if (S.tab === "ver"){
    P.innerHTML = `<div class="muted">Save a version before a big change. You can compare it later and use it in your change log (C.iv).</div>
      <div class="row"><input type="text" id="cbVn" placeholder="What is this version? e.g. Before moving the factory" maxlength="60" style="flex:1"><button class="sm" id="cbVs">📌 Save version</button></div>
      ${d.versions.length ? d.versions.slice().reverse().map((v, r) => { const n = d.versions.length - 1 - r; return `<div class="lab"><b>${esc(v.name || "Version " + (n + 1))}</b><div class="muted">${new Date(v.at).toLocaleString()}</div><div class="row"><button class="sm" data-vd="${n}">⬇ Picture</button><button class="sm" data-vr="${n}">↺ Go back to this version</button><button class="sm red" data-vx="${n}">Delete</button></div></div>`; }).join("") : '<div class="muted">No versions yet.</div>'}`;
    P.querySelector("#cbVs").onclick = () => { const nm = P.querySelector("#cbVn").value.trim() || "Version " + (d.versions.length + 1); d.versions.push({ name: nm, at: Date.now(), tiles: d.tiles.slice(), labels: clone(d.labels), notes: clone(d.notes) }); if (d.versions.length > 6) d.versions.shift(); mark(); side(); toast("Version saved."); };
    P.querySelectorAll("[data-vr]").forEach(b => b.onclick = () => { const v = d.versions[+b.dataset.vr]; if (!confirmBox(`Go back to “${v.name}”? Your current city is saved as a new version first.`)) return;
      d.versions.push({ name: "Before going back to " + v.name, at: Date.now(), tiles: d.tiles.slice(), labels: clone(d.labels), notes: clone(d.notes) }); if (d.versions.length > 6) d.versions.shift();
      snapshot(); d.tiles = v.tiles.slice(); d.labels = clone(v.labels); d.notes = clone(v.notes); mark(); draw(); side(); });
    P.querySelectorAll("[data-vx]").forEach(b => b.onclick = () => { d.versions.splice(+b.dataset.vx, 1); mark(); side(); });
    P.querySelectorAll("[data-vd]").forEach(b => b.onclick = () => { const v = d.versions[+b.dataset.vd], keep = { tiles: d.tiles, labels: d.labels, notes: d.notes };
      Object.assign(d, { tiles: v.tiles, labels: v.labels, notes: v.notes }); S.A = analyse(d); const url = picture("image/png", v.name); Object.assign(d, keep); S.A = analyse(d);
      const a = document.createElement("a"); a.href = url; a.download = (d.name || "my-city") + " - " + v.name + ".png"; document.body.appendChild(a); a.click(); a.remove(); });
  }
}
function confirmBox(msg){ return window.confirm(msg); }

/* ===================== dialogs ===================== */
function modal(html){ const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div>${html}</div>`; S.root.appendChild(m); m.onclick = e => { if (e.target === m) m.remove(); }; return m; }
function labelDialog(area, n){
  const isNew = n == null, l = isNew ? { x: area.x, y: area.y, w: area.w, h: area.h, name: "", desc: "", col: LCOLS[S.d.labels.length % LCOLS.length] } : area;
  const m = modal(`<h3>🏷️ ${isNew ? "Label this area" : "Edit label"}</h3>
    <label><b>Name of the area</b><input type="text" id="lN" maxlength="40" value="${esc(l.name)}" placeholder="e.g. Green energy zone, Car-free centre, Solar homes"></label>
    <label><b>What happens here? What makes it smart or sustainable?</b><textarea id="lD" placeholder="This area has… It is sustainable because… It helps…">${esc(l.desc)}</textarea></label>
    <div class="row"><b>Colour</b>${LCOLS.map(c => `<button class="sm" data-c="${c}" style="background:${c};width:28px;height:24px;${c === l.col ? "outline:3px solid #1B2D4E" : ""}"></button>`).join("")}</div>
    <div class="row" style="justify-content:flex-end"><button class="btn l" id="lX">Cancel</button><button class="btn g" id="lS">Save label</button></div>`);
  let col = l.col; m.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { col = b.dataset.c; m.querySelectorAll("[data-c]").forEach(x => x.style.outline = x === b ? "3px solid #1B2D4E" : ""); });
  m.querySelector("#lN").focus();
  m.querySelector("#lX").onclick = () => m.remove();
  m.querySelector("#lS").onclick = () => { const name = m.querySelector("#lN").value.trim(); if (!name) return toast("Give the area a name."); snapshot();
    Object.assign(l, { name, desc: m.querySelector("#lD").value.trim().slice(0, 1000), col }); if (isNew) S.d.labels.push(l); m.remove(); S.tab = "labels"; mark(); draw(); side(); };
}
function noteDialog(x, y, n){
  const isNew = n == null, t = S.d.tiles, k = kind(t, idx(x, y)), it = IT[k], note = isNew ? { x, y, name: it ? it.n : "", desc: "" } : S.d.notes[n];
  const m = modal(`<h3>📍 ${isNew ? "Add a note" : "Edit note"}${it ? ` · ${it.e || ""} ${esc(it.n)}` : ""}</h3>
    <label><b>Feature name</b><input type="text" id="nN" maxlength="40" value="${esc(note.name)}" placeholder="e.g. Solar farm, Smart bus stop"></label>
    <label><b>Explain it: what does it do, and why is it smart or sustainable?</b><textarea id="nD" placeholder="This feature… It is sustainable because… It helps…">${esc(note.desc)}</textarea></label>
    ${it ? `<div class="muted">Hint: ${esc(it.d)}</div>` : ""}
    <div class="row" style="justify-content:flex-end"><button class="btn l" id="nX">Cancel</button><button class="btn g" id="nS">Save note</button></div>`);
  m.querySelector("#nD").focus();
  m.querySelector("#nX").onclick = () => m.remove();
  m.querySelector("#nS").onclick = () => { const name = m.querySelector("#nN").value.trim(); if (!name) return toast("Give the feature a name."); snapshot();
    Object.assign(note, { name, desc: m.querySelector("#nD").value.trim().slice(0, 1000) }); if (isNew) S.d.notes.push(note); m.remove(); S.tab = "labels"; mark(); draw(); side(); };
}
function inspect(x, y){
  const t = S.d.tiles, i = idx(x, y), k = kind(t, i), it = IT[k], A = S.A, covers = [];
  [["school", "🏫 school"], ["health", "🏥 hospital"], ["safety", "🚓 safety"], ["park", "🌳 park"], ["transit", "🚏 public transport"], ["smart", "📡 smart"]].forEach(([c, n]) => { if (A.cov[c].has(i)) covers.push(n); });
  const m = modal(`<h3>${it ? `${it.e || "▬"} ${esc(it.n)}` : "Empty land"}</h3>${it ? `<p style="margin:0">${esc(it.d)}</p>
    <div class="muted">${[it.pop && `Homes for ${it.pop}`, it.jobs && `${it.jobs} jobs`, it.pw && `uses ${it.pw} power`, it.sup && `makes ${it.sup} power`, it.wsup && `supplies ${it.wsup} water`, it.wcap && `handles ${it.wcap} waste`, `costs ${it.cost} credits`].filter(Boolean).join(" · ")}</div>` : ""}
    <div><b>Covered by:</b> ${covers.length ? covers.join(", ") : "nothing"}</div>${A.poll.has(i) ? '<div class="adv bad">This square is polluted.</div>' : ""}
    <div class="row" style="justify-content:flex-end">${it ? '<button class="btn l" id="iN">📍 Add a note here</button>' : ""}<button class="btn g" id="iX">OK</button></div>`);
  m.querySelector("#iX").onclick = () => m.remove(); const nb = m.querySelector("#iN"); if (nb) nb.onclick = () => { m.remove(); noteDialog(x, y); };
}
function help(){
  const m = modal(`<h3>🏙️ How City Builder 2050 works</h3>
    <ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:5px">
      <li><b>Build:</b> pick something in the palette, then click or drag on the map. Start with roads, cycle paths or a tram line, because every building must touch one.</li>
      <li><b>Make it work:</b> homes need power, water, waste collection, schools, hospitals and safety nearby. The <b>Advisor</b> tells you what is missing; the <b>View</b> menu shows coverage and problems.</li>
      <li><b>Make it smart and sustainable:</b> use renewable energy with batteries, water recycling, green space, low-carbon transport and smart tech. Watch your Smart, Sustainable and Liveable scores.</li>
      <li><b>Place your key building</b> (⭐, 2×2) and describe its features in the Key building tab.</li>
      <li><b>Label:</b> drag 🏷️ boxes over districts and add 📍 notes to features. Describe at least 3 smart or sustainable features.</li>
      <li><b>Evidence:</b> 📸 adds a picture of your city straight into your Criterion C task. Save a version before big changes for your change log.</li>
    </ol>
    <div class="adv good">Your city saves automatically every 2 seconds. You can close it and carry on later, on any device.</div>
    <div class="row" style="justify-content:flex-end"><button class="btn g" id="hX">Start building</button></div>`);
  m.querySelector("#hX").onclick = () => m.remove();
}

/* ===================== pictures and evidence ===================== */
function picture(type, sub){
  const ts = 44, pad = 24, top = 96, legendH = 34 + Math.ceil((S.d.labels.length + S.d.notes.length) / 2) * 34, cw = W * ts + pad * 2, ch = top + H * ts + pad + legendH;
  const c = document.createElement("canvas"); c.width = cw; c.height = ch; const x = c.getContext("2d"), A = S.A = analyse(S.d);
  x.fillStyle = "#fff"; x.fillRect(0, 0, cw, ch);
  x.fillStyle = "#1B2D4E"; x.fillRect(0, 0, cw, 78);
  x.fillStyle = "#fff"; x.font = "800 30px Inter,Arial"; x.textBaseline = "middle"; x.textAlign = "left"; x.fillText((S.d.name || "My City 2050") + (sub ? " — " + sub : ""), pad, 30);
  x.font = "600 17px Inter,Arial"; x.fillText(`${A.rank[0]} · Population ${A.pop.toLocaleString()} · Smart ${A.smart} · Sustainable ${A.sust} · Liveable ${A.live} · ${Math.round(A.renPct * 100)}% renewable · ${Math.round(A.greenPct * 100)}% green`, pad, 60);
  x.save(); x.translate(pad, top); drawTo(x, ts, { view: "normal" }); x.restore();
  let ly = top + H * ts + pad; x.fillStyle = "#1B2D4E"; x.font = "800 18px Inter,Arial"; x.fillText("Labels", pad, ly); ly += 26; x.font = "15px Inter,Arial";
  const items = S.d.labels.map((l, n) => ["🏷️ " + l.name + (l.desc ? ": " + l.desc : ""), l.col || LCOLS[n % LCOLS.length]]).concat(S.d.notes.map((l, n) => [(n + 1) + ". " + l.name + (l.desc ? ": " + l.desc : ""), "#E5484D"]));
  items.forEach((it, n) => { const col = n % 2, row = Math.floor(n / 2), px = pad + col * (cw - pad * 2) / 2, py = ly + row * 34; x.fillStyle = it[1]; x.fillRect(px, py - 7, 12, 12); x.fillStyle = "#1B2D4E";
    let s = it[0]; const mw = (cw - pad * 2) / 2 - 30; while (x.measureText(s).width > mw && s.length > 4) s = s.slice(0, -2); if (s !== it[0]) s = s.slice(0, -1) + "…"; x.fillText(s, px + 18, py); });
  return type === "image/png" ? c.toDataURL("image/png") : c.toDataURL("image/jpeg", .82);
}
function evidenceDialog(){
  const ev = S.opts.evidence || [];
  if (!ev.length || !S.opts.onEvidence) { toast("Use ⬇ Download picture, then add it to your task."); return; }
  const m = modal(`<h3>📸 Add a picture of your city to your task</h3><div class="muted">Choose where it goes. It replaces any picture already in that box.</div>
    ${ev.map((e, n) => `<button class="btn l" style="text-align:left" data-e="${n}"><b>${esc(e.label)}</b>${e.has ? ' <span class="muted">(has a picture)</span>' : ""}</button>`).join("")}
    <label class="row" style="gap:8px"><input type="checkbox" id="evV"> Also save this as a version (for your change log)</label>
    <div class="row" style="justify-content:flex-end"><button class="btn l" id="eX">Cancel</button></div>`);
  m.querySelector("#eX").onclick = () => m.remove();
  m.querySelectorAll("[data-e]").forEach(b => b.onclick = () => { const e = ev[+b.dataset.e];
    if (m.querySelector("#evV").checked){ S.d.versions.push({ name: e.short || e.label.slice(0, 50), at: Date.now(), tiles: S.d.tiles.slice(), labels: clone(S.d.labels), notes: clone(S.d.notes) }); if (S.d.versions.length > 6) S.d.versions.shift(); mark(); }
    persist(); S.opts.onEvidence(e.id, picture("image/jpeg")); e.has = true; m.remove(); toast("Picture added to “" + (e.short || e.label) + "”."); });
}

/* ===================== saving ===================== */
function mark(){ if (!S) return; S.dirty = true; S.d.updated = Date.now(); const b = S.root.querySelector("#cbSv"); b.className = "sv p"; b.textContent = "Saving…"; }
function persist(){
  if (!S) return; S.dirty = false; const data = clone(S.d);
  try { localStorage.setItem("cb2050_" + (S.opts.id || "me"), JSON.stringify(data)); } catch(e){}
  let ok = true; try { if (S.opts.onSave) S.opts.onSave(data); } catch(e){ ok = false; }
  const b = S.root.querySelector("#cbSv"); b.className = "sv" + (ok ? "" : " p"); b.textContent = ok ? "✓ Saved " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Saved on this device";
}
function close(){
  if (!S) return; persist(); clearInterval(S.timer); try { S.ro.disconnect(); } catch(e){}
  document.removeEventListener("keydown", S.key); document.removeEventListener("visibilitychange", S.vis); window.removeEventListener("pagehide", S.vis);
  S.root.remove(); S.st.remove(); document.documentElement.style.overflow = ""; const cb = S.opts.onClose; S = null; if (cb) try { cb(); } catch(e){}
}
let lastToast = ["", 0];
function toast(msg){ if (lastToast[0] === msg && Date.now() - lastToast[1] < 2500) return; lastToast = [msg, Date.now()]; const t = document.createElement("div"); t.textContent = msg; t.style.cssText = "position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1B2D4E;color:#fff;padding:10px 16px;border-radius:10px;font:600 14px Inter,Arial;z-index:2147483646;box-shadow:0 6px 20px #0004"; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

/* a short summary for the task page */
function summary(data){ const d = norm(data), A = analyse(d); return { has: A.anchors.length > 0, name: d.name, pop: A.pop, smart: A.smart, sust: A.sust, live: A.live, rank: A.rank[0], labels: d.labels.length + d.notes.length, updated: d.updated }; }
window.CityBuilder = { open, close, summary, _analyse: d => analyse(norm(d)) };
})();
