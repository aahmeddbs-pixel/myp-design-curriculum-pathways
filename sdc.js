/* gfSend: post answers to a Google Form exactly like the form's own Submit button does
   (the hidden fields a real submission carries, sent both by fetch and by a hidden form in a hidden frame). */
if (!window.gfSend) window.gfSend = (function(){
  let chain = Promise.resolve(), n = 0;
  function full(body){
    const p = new URLSearchParams(body instanceof URLSearchParams ? body : String(body || ""));
    const z = "-" + Math.floor(Math.random() * 9e18).toString();
    if (!p.has("fvv")) p.append("fvv", "1");
    if (!p.has("pageHistory")) p.append("pageHistory", "0");
    if (!p.has("fbzx")) p.append("fbzx", z);
    if (!p.has("partialResponse")) p.append("partialResponse", JSON.stringify([null, null, z]));
    return p;
  }
  /* Keep the student where they are: a reply loading in the hidden frame can make the browser jump the page.
     For a moment after each reply, a jump that the student didn't make (no scroll wheel, key or touch) is put back. */
  let lastY = 0, lastX = 0, userAt = 0, guardTo = 0;
  try {
    const mark = () => { userAt = Date.now(); };
    ["wheel", "touchstart", "touchmove", "keydown", "mousedown"].forEach(ev => window.addEventListener(ev, mark, { passive:true, capture:true }));
    window.addEventListener("scroll", () => {
      if (Date.now() < guardTo && Date.now() - userAt > 2000 && Math.abs(window.scrollY - lastY) > 40){ window.scrollTo(lastX, lastY); return; }
      lastY = window.scrollY; lastX = window.scrollX;
    }, { passive:true });
  } catch(e){}
  function keepPlace(){ guardTo = Date.now() + 1500; }
  function viaFrame(action, p){
    return new Promise(res => {
      try {
        if (!document.body) return res(false);
        const name = "gfsink" + (++n), fr = document.createElement("iframe");
        fr.name = name; fr.title = "sync"; fr.setAttribute("aria-hidden", "true"); fr.tabIndex = -1;
        fr.style.cssText = "position:fixed;width:1px;height:1px;left:0;top:0;border:0;opacity:0;pointer-events:none";   // fixed: if the reply page grabs focus, the student's page must not jump to the top
        const f = document.createElement("form"); f.method = "POST"; f.action = action; f.target = name; f.acceptCharset = "UTF-8"; f.style.display = "none";
        p.forEach((v, k) => { const i = document.createElement("textarea"); i.name = k; i.value = v; f.appendChild(i); });
        let done = false; const end = ok => { if (done) return; done = true; setTimeout(() => { try { fr.remove(); f.remove(); } catch(e){} }, 1500); res(ok); };
        fr.onload = () => { keepPlace(); end(true); }; setTimeout(() => end(true), 6000);
        document.body.appendChild(fr); document.body.appendChild(f); f.submit();
      } catch(e){ res(false); }
    });
  }
  return function gfSend(action, body, keep){
    const p = full(body);
    const viaFetch = fetch(action, { method:"POST", mode:"no-cors", body:p, keepalive: !!keep && p.toString().length < 60000 }).then(() => true, () => false);
    if (keep === "unload") return viaFetch;
    const framed = chain = chain.then(() => viaFrame(action, p));
    return Promise.all([viaFetch, framed]).then(([x, y]) => x || y);
  };
})();

/* SISD Design and Computing: shared platform layer for Python Pathways (Computer Science) and
   MYP Design Curriculum Pathways (Design and IT).
   - The portal page sets a "gate" for this browser tab: which course the student chose.
     Each course page only opens for the course chosen at the portal.
   - Each student account is registered to one course and grade. Only the admin can change it,
     with an assignment row signed by the admin key (students' browsers check the signature).
   - Sign-ins, wrong-course attempts and completed tasks are logged to the teacher's private log form.
   The sync sheet only ever holds scrambled IDs plus course/grade codes: never names or emails. */
window.SDC = (function(){
"use strict";
const PORTAL = "/sisd-design-and-computing/";
const COURSES = {
  cs:     { id:"cs",     name:"Computer Science", short:"CS",     icon:"</>", app:"/python-pathways/",                 grades:["6","7","8","11","12"], blurb:"Python coding: lessons, exercises and practice" },
  design: { id:"design", name:"Design",           short:"Design", icon:"✎",   app:"/myp-design-curriculum-pathways/", grades:["6","7","8","10"],      blurb:"IB MYP Design: Criteria A to D design projects" },
  it:     { id:"it",     name:"IT",               short:"IT",     icon:"⇄",   app:"/myp-design-curriculum-pathways/", grades:["10"],                  blurb:"Grade 10 IT: Game Development, and Networks and network security" }
};
// Teacher's private log (the same Google Form as the Python Pathways Log): type, student, email, teacher, data
const LOG = { url:"https://docs.google.com/forms/d/e/1FAIpQLSfFnVZORF6176gPE9a2zGNpivDuklLFF5cHzdQz1YxfAxThRA/formResponse",
  entries:{ type:"entry.1355322393", student:"entry.1753714859", email:"entry.1091945433", teacher:"entry.1559320258", data:"entry.145790134" } };
// Registry and admin assignments live in the sync form/sheet as scrambled PPS2 rows.
// 18 Nov 2026: the first sync sheet (12_g1y…) grew past what Google Sheets can hold and stopped taking rows on 16 Nov at 10:44.
// 26 Nov 2026: "SDC Sync 2" (1qRT…) filled up the same way and stopped taking rows on 24 Nov at 11:54.
// New rows go to "SDC Sync 3" (owned by sisd.design.computing1@gmail.com); both older sheets are still read (newest sheet first).
const SYNC = { action:"https://docs.google.com/forms/d/e/1FAIpQLSdMyq_x4TXZ7fWbMEoZsL25Rgbhmgx2b7_n9l9wcoZhT_0GsA/formResponse", entry:"entry.666192810",
  id:"1yvhp7MAxKMp6VsUm0nVS7vZ3CbNNfLJCdReJN2TgLWY", gid:"1112428158" };
const SYNC_OLD = [{ id:"1qRTsBkS6MfA7lHEU5ZN3e3cbQAGtjrF8xmSfHGHKEoE", gid:"996219689" }, { id:"12_g1ySZtyUX-rXTuOHcZ7_vUzCkdhXV_T7KF5NjBFa0", gid:"1433531983" }];
const SIG_PUB = {"key_ops":["verify"],"ext":true,"kty":"EC","x":"g6JG87cYBkusgs-I5KvQKNdcS2VGwCu4FP9lJYIvu58","y":"Tc06F7jM1RaDT6RsO7UTPumlWm7d3MNQNtqky5ygZAE","crv":"P-256"};
const GATE_KEY = "sdc_gate", Q_KEY = "sdc_q", GATE_HOURS = 12;
const TE = new TextEncoder();

/* ---------- small helpers ---------- */
const e64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const d64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const u8ToB64Text = t => e64(TE.encode(t)), b64ToText = s => new TextDecoder().decode(d64(s));
const hex = u8 => [...u8].map(v => v.toString(16).padStart(2, "0")).join("");
const normEmail = e => String(e || "").trim().toLowerCase();
/* ---------- school years: every student moves up a grade on 1 September ----------
   ay(t) = the school year a moment belongs to (2026 means September 2026 to August 2027). */
function ay(t){ const d = new Date(t == null ? Date.now() : t); if (isNaN(d)) return ay(); return d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1; }
/* a grade that was right at moment `since`, moved up one for every 1 September since then */
function rolled(g, since){ const n = parseInt(g, 10); if (!/^\d+$/.test(String(g || "")) || isNaN(n)) return g; const yrs = Math.max(0, ay() - ay(since || Date.now())); return String(n + yrs); }
/* switches set in an earlier school year are off again from 1 September, until the teacher opens them */
const freshSwitches = st => !!(st && st.t && ay(Date.parse(st.t)) >= ay());
/* the teacher's test student: can enter every course and see every grade, level and criterion */
const TESTERS = ["test@sisd.ae"];
const isTester = e => TESTERS.indexOf(normEmail(e)) >= 0;
/* ---------- Study Plus: a private space only the named student(s) can see ----------
   Matched on first AND last name (CS signs in by name), or on the school email firstname.lastname@sisd.ae. */
const STUDY_PLUS = [{ first:"mikaeel", last:"ahmed" }];
const spWords = n => String(n || "").toLowerCase().split(/[^a-z\u0400-\u04ff]+/).filter(Boolean);
function studyPlusOK(a){
  if (!a) return false;
  const e = normEmail(a.email), local = e.split("@")[0], w = spWords(a.name);
  if (isTester(e)) return true;
  return STUDY_PLUS.some(p => (w[0] === p.first && w[w.length - 1] === p.last) || (/@sisd\.ae$/.test(e) && local === p.first + "." + p.last));
}
/* the school email a Study Plus student's linked Design account uses when their Computer Science account has none */
function studyPlusEmail(a){ const w = spWords(a && a.name); return w.length >= 2 ? w[0] + "." + w[w.length - 1] + "@sisd.ae" : ""; }
/* email the teacher (Gmail) a Study Plus section report, through the school's email script */
function studyReport(a, data){
  if (!VERIFY.url || offline()) return;
  const body = { a:"study", n:String((a && a.name) || "").slice(0, 80), e:normEmail(a && a.email), d:data };
  try { fetch(VERIFY.url, { method:"POST", mode:"no-cors", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(body), keepalive:true }).catch(() => {}); } catch(e){}
}
const TEST_PW = "b6fbc936080011b082b40a66fa98641e0c132ae742d915f7c1baaed0e4a92577";   // SHA-256 of the test student's password
async function testerPw(email, pw){
  if (!isTester(email) || !(window.crypto && crypto.subtle)) return false;
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode("sdc-test|" + normEmail(email) + "|" + String(pw || ""))));
  return [...h].map(v => v.toString(16).padStart(2, "0")).join("") === TEST_PW;
}
/* accounts the super admin asked to delete straight away (no 30-day wait) */
const DELETED = [{ email:"ahmed.dbs@gmail.com", at:Date.parse("2026-11-02T14:50:00Z") }, { email:"aahmed.dbs@gmail.com", at:Date.parse("2026-11-02T14:50:00Z") }];
const fixedDeletion = e => DELETED.find(d => d.email === normEmail(e)) || null;
const normName = n => String(n || "").trim().toLowerCase().replace(/\s+/g, " ");
function keyOf(email, name){ const e = normEmail(email); return e ? "e:" + e : "n:" + normName(name); }
async function idOf(email, name){ return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", TE.encode("sdc|" + keyOf(email, name))))).slice(0, 32); }
const course = c => COURSES[c] || null;
function courseLabel(c, grade){ const C = course(c); return C ? (grade ? "G" + grade + " " : "") + C.name : String(c || ""); }
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- the gate: which course this tab is allowed to open ---------- */
function gate(){
  try { const g = JSON.parse(sessionStorage.getItem(GATE_KEY) || "null");
    if (g && course(g.course) && Date.now() - (g.at || 0) < GATE_HOURS * 3600000) return g; } catch(e){}
  return null;
}
function setGate(g){ try { sessionStorage.setItem(GATE_KEY, JSON.stringify(Object.assign({ at:Date.now() }, g))); } catch(e){} }
function patchGate(p){ const g = gate(); if (g) setGate(Object.assign(g, p)); }
function clearGate(){ try { sessionStorage.removeItem(GATE_KEY); } catch(e){} }
const offline = () => location.protocol === "file:";
/* Called by a course page. Returns the gate, or sends the student to the portal. */
function require(allowed){
  const g = gate();
  if (g && allowed.indexOf(g.course) >= 0) return g;
  if (offline()) return null;               // opened from a file on a teacher's computer: no portal
  document.documentElement.style.visibility = "hidden";
  location.replace(PORTAL + (g ? "?m=wrongapp" : ""));
  return null;
}
function leave(code){ clearGate(); location.href = PORTAL + (code ? "?m=" + encodeURIComponent(code) : ""); }

/* ---------- posting to Google Forms (queued while offline) ---------- */
function getQ(){ try { return JSON.parse(localStorage.getItem(Q_KEY)) || []; } catch(e){ return []; } }
function setQ(q){ try { while (q.length > 200) q.shift(); localStorage.setItem(Q_KEY, JSON.stringify(q)); } catch(e){} }
async function post(action, fields, keep){
  const p = new URLSearchParams(); Object.keys(fields).forEach(k => p.append(k, fields[k]));
  try { return await gfSend(action, p, keep); } catch(e){ return false; }
}
let flushing = false;
async function flush(){
  if (flushing || offline()) return; flushing = true;
  try { let q = getQ();
    try { await Promise.race([dirRefresh(), new Promise(r => setTimeout(r, 6000))]); } catch(e){}
    while (q.length){ const it = q[0], to = toCurrent(it); if (!(await post(to.a, to.f, true))) break; q = getQ(); if (q.length && JSON.stringify(q[0]) === JSON.stringify(it)) q.shift(); setQ(q); if (q.length) await new Promise(r => setTimeout(r, 300)); }
  } finally { flushing = false; }
}
function enqueue(action, fields){ const q = getQ(); q.push({ a:action, f:fields }); setQ(q); flush(); }
window.addEventListener("online", flush); setTimeout(flush, 4000);

/* ---------- reading scrambled rows back from the sync sheet ---------- */
function gviz(tq, sheet, src){
  src = src || SYNC;
  return new Promise((res, rej) => {
    const cb = "__sdc" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), sc = document.createElement("script");
    const done = () => { clearTimeout(t); try { delete window[cb]; } catch(e){ window[cb] = undefined; } sc.remove(); };
    const t = setTimeout(() => { done(); rej(new Error("timeout")); }, 15000);
    window[cb] = r => { done(); if (!r || r.status === "error") return rej(new Error("read")); res(r); };
    sc.onerror = () => { done(); rej(new Error("reach")); };
    const where = sheet ? "sheet=" + encodeURIComponent(sheet) + "&" : "gid=" + src.gid + "&";
    sc.src = `https://docs.google.com/spreadsheets/d/${src.id}/gviz/tq?${where}headers=1&tqx=out:json;responseHandler:${cb}&tq=${encodeURIComponent(tq)}&_=${Date.now()}`;
    document.head.appendChild(sc);
  });
}
let COL = null;
/* every tab that holds sync rows: the linked tab plus any "Form responses N" tab (a re-linked form writes to a new tab) */
/* 25 Nov 2026: sign-in was slow because the 10 tabs were checked one after another on every page. Now they are all
   checked at the same time, and the answer is remembered on this computer for 12 hours. */
const COL_KEY = "sdc_col_v3", COL_HOURS = 12;
let COL_P = null;
async function column(){
  if (COL) return COL;
  try { const c = JSON.parse(localStorage.getItem(COL_KEY) || "null"), srcs = [SYNC].concat(SYNC_OLD);
    if (c && Date.now() - c.at < COL_HOURS * 3600000 && Array.isArray(c.locs) && c.locs.length)
      return (COL = c.locs.map(l => Object.assign({}, l, { src: srcs.find(x => x.id === l.id) || SYNC }))); } catch(e){}
  if (COL_P) return COL_P;
  COL_P = (async () => {
    const jobs = [];
    [SYNC].concat(SYNC_OLD).forEach((src, si) => (src === SYNC ? ["", ...[1,2,3,4,5,6].map(n => "Form responses " + n), "Form Responses 1", "Form Responses 2"] : [""])
      .forEach((sheet, ti) => jobs.push(gviz("select * limit 30", sheet, src).then(r => ({ src, si, ti, sheet, r }), e => ({ src, si, ti, sheet, e })))));
    const got = await Promise.all(jobs), main = got.find(x => x.src === SYNC && !x.sheet);
    if (main && main.e) throw main.e;
    const locs = [];
    [SYNC].concat(SYNC_OLD).forEach(src => {
      const mine = [];
      got.filter(x => x.src === src && !x.e).sort((a, b) => a.ti - b.ti).forEach(({ sheet, r }) => {
        const cols = (r.table && r.table.cols) || [], rws = (r.table && r.table.rows) || [];
        let i = cols.findIndex((x, j) => rws.some(row => String(((row.c || [])[j] || {}).v || "").startsWith("PPS2|")));
        if (i < 0) i = cols.findIndex(x => /^\s*data\s*$/i.test(x.label || ""));
        if (i >= 0) mine.push({ col: cols[i].id, time: cols[0].id, sheet, src });
      });
      if (!mine.length) mine.push({ col: "B", time: "A", sheet: "", src });
      locs.push(...mine);
    });
    try { localStorage.setItem(COL_KEY, JSON.stringify({ at: Date.now(), locs: locs.map(l => ({ col:l.col, time:l.time, sheet:l.sheet, id:l.src.id })) })); } catch(e){}
    return (COL = locs);
  })();
  try { return await COL_P; } finally { COL_P = null; }
}
async function rows(kind, id, limit){
  const out = [], seen = new Set(), locs = await column();
  const got = await Promise.all(locs.map(c => gviz(`select ${c.col} where ${c.col} starts with 'PPS2|${kind}|${id}|' order by ${c.time} desc limit ${limit || 30}`, c.sheet, c.src).then(r => ({ c, r }), e => ({ c, e }))));   // every sheet at once
  for (const { c, r, e } of got){
    if (e){ if (!c.sheet && c.src === SYNC) throw e; continue; }
    ((r.table && r.table.rows) || []).forEach(row => { const v = String(((row.c || [])[0] || {}).v || ""); if (seen.has(v)) return; seen.add(v);
      const p = v.split("|"); if (p.length >= 7) out.push({ ver:+p[3], text:p.slice(6).join("|") }); });
  }
  return out.sort((a, b) => b.ver - a.ver);   // newest first
}
/* ---------- the newest sync sheet ----------
   26 Nov 2026: sheets are now replaced automatically before they fill up (sync-rotator.gs, a 30-minute timer in
   sisd.design.computing1@gmail.com). Every sync spreadsheet from Sync 3 on has a "Directory" tab listing all the sync
   sheets, newest last; a full sheet's Directory points on to the next one. Each page follows that list from the newest
   sheet it knows, remembers it on this computer, and checks again every 30 minutes. The same list is used by
   Python Pathways (pp-sync.js) and the Design course. Older sheets are always still read. */
const DIR_KEY = "sdc_syncdir_v1", DIR_MIN = 30;
const DIR_BASE = [SYNC].concat(SYNC_OLD).map(s => ({ id:s.id, gid:s.gid, action:s.action || "", entry:s.entry || "" }));
function dirCached(){
  try { const d = JSON.parse(localStorage.getItem(DIR_KEY) || "null"); return d && Array.isArray(d.list) && d.list.length && d.list[0].action ? d : null; } catch(e){ return null; }
}
function dirParse(r){
  const cols = ((r && r.table && r.table.cols) || []).map(c => String(c.label || "").trim().toLowerCase()), rws = (r && r.table && r.table.rows) || [];
  const at = n => cols.indexOf(n), iId = at("sheet id"), iGid = at("tab gid"), iAct = at("form action"), iEnt = at("entry"), iSt = at("status"), iNm = at("name");
  if (iId < 0 || iAct < 0 || iEnt < 0 || iSt < 0) return null;                    // no Directory tab: Google answers with the first tab instead
  const val = (row, i) => i < 0 ? "" : String((((row.c || [])[i]) || {}).v == null ? "" : ((row.c || [])[i]).v).trim();
  const list = rws.map(row => ({ name:val(row, iNm), id:val(row, iId), gid:val(row, iGid).replace(/\.0$/, ""), action:val(row, iAct), entry:val(row, iEnt), status:val(row, iSt) }))
    .filter(x => /^[\w-]{25,}$/.test(x.id) && /^\d*$/.test(x.gid) && (!x.action || /^https:\/\/docs\.google\.com\/forms\/d\/e\/[\w-]+\/formResponse$/.test(x.action)) && (!x.action || /^entry\.\d+$/.test(x.entry)));
  const cur = list.filter(x => x.status === "current" && x.action).pop();
  return cur ? [cur].concat(list.filter(x => x !== cur).reverse()) : null;            // newest first
}
function dirApply(list){
  if (!list || !list[0] || !list[0].action) return false;
  const all = list.concat(DIR_BASE.filter(b => !list.some(x => x.id === b.id))), cur = all[0];
  const before = SYNC.id + "|" + SYNC_OLD.map(o => o.id).join(",");
  Object.assign(SYNC, { action:cur.action, entry:cur.entry, id:cur.id, gid:cur.gid });
  SYNC_OLD.splice(0, SYNC_OLD.length, ...all.slice(1).map(o => ({ id:o.id, gid:o.gid })));
  if (before === SYNC.id + "|" + SYNC_OLD.map(o => o.id).join(",")) return false;
  COL = null; COL_P = null; try { localStorage.removeItem(COL_KEY); } catch(e){}  // look the tabs up again in the new set of sheets
  return true;
}
let DIR_P = null;
async function dirRefresh(force){
  if (offline()) return;
  const c = dirCached(); if (!force && c && Date.now() - (c.at || 0) < DIR_MIN * 60000) return;
  if (DIR_P) return DIR_P;
  DIR_P = (async () => {
    let id = (c && c.list[0].id) || SYNC.id, list = null;
    for (let hop = 0; hop < 8; hop++){                                                  // follow "current" from sheet to sheet
      let r; try { r = await gviz("select *", "Directory", { id, gid:"" }); } catch(e){ break; }
      const l = dirParse(r); if (!l) break;
      list = l; if (l[0].id === id) break; id = l[0].id;
    }
    if (!list) return;
    try { localStorage.setItem(DIR_KEY, JSON.stringify({ at:Date.now(), list })); } catch(e){}
    dirApply(list);
  })();
  try { return await DIR_P; } finally { DIR_P = null; }
}
dirApply(dirCached() && dirCached().list);
dirRefresh(); setInterval(() => dirRefresh(true), DIR_MIN * 60000);
/* a row queued for an older sync form (before this page knew about the newer sheet) goes to the current form instead */
function toCurrent(it){
  const old = DIR_BASE.concat(((dirCached() || {}).list) || []).find(x => x.action && x.action === it.a);
  if (!old || it.a === SYNC.action) return it;
  const v = it.f && it.f[old.entry]; return v == null ? it : { a:SYNC.action, f:{ [SYNC.entry]: v } };
}
const sendRow = (kind, id, text) => enqueue(SYNC.action, { [SYNC.entry]: ["PPS2", kind, id, String(Date.now()), 0, 1, text].join("|") });

/* ---------- admin assignments (signed) ---------- */
let pubKey = null;
/* a change signed by an approved teacher: "T.<change>.<teacher's signature>.<the super admin's certificate for that teacher>" */
let stateCache = null;
async function approvedTeachers(){ if (!stateCache || Date.now() - stateCache.at > 300000){ let st = null; try { st = (await loadState()).state; } catch(e){} stateCache = { at: Date.now(), list: ((st && st.teachers) || []).map(t => String(t.email || "").toLowerCase()) }; } return stateCache.list; }
async function verifyTeacher(parts){
  try {
    const [, b, s, c] = parts; if (!b || !s || !c) return null;
    pubKey = pubKey || await crypto.subtle.importKey("jwk", SIG_PUB, { name:"ECDSA", namedCurve:"P-256" }, false, ["verify"]);
    const cert = JSON.parse(b64ToText(c)), body = { email: cert.email, name: cert.name, spub: cert.spub, t: cert.t };
    if (!cert.sig || !(await crypto.subtle.verify({ name:"ECDSA", hash:"SHA-256" }, pubKey, d64(cert.sig), TE.encode(canon(body))))) return null;   // the super admin vouches for this teacher's key
    if ((await approvedTeachers()).indexOf(String(cert.email).toLowerCase()) < 0) return null;   // removed teachers can no longer make changes
    const tk = await crypto.subtle.importKey("jwk", cert.spub, { name:"ECDSA", namedCurve:"P-256" }, false, ["verify"]), json = b64ToText(b);
    if (!(await crypto.subtle.verify({ name:"ECDSA", hash:"SHA-256" }, tk, d64(s), TE.encode(json)))) return null;
    const o = JSON.parse(json); o.by = cert.email; return o;
  } catch(e){ return null; }
}
async function verify(text){
  const parts = String(text).split(".");
  if (parts[0] === "T") return verifyTeacher(parts);
  const [b, s] = parts;
  if (!b || !s) return null;
  try {
    pubKey = pubKey || await crypto.subtle.importKey("jwk", SIG_PUB, { name:"ECDSA", namedCurve:"P-256" }, false, ["verify"]);
    const json = b64ToText(b);
    if (!(await crypto.subtle.verify({ name:"ECDSA", hash:"SHA-256" }, pubKey, d64(s), TE.encode(json)))) return null;
    return JSON.parse(json);
  } catch(e){ return null; }
}
/* Look up one student: their registered course (first registration wins) and the admin's latest assignment. */
const LOOK = {};
function lookup(email, name){
  const k = keyOf(email, name) + "|" + ((gate() || {}).course || ""), hit = LOOK[k];
  if (hit && Date.now() - hit.at < 60000) return hit.p;
  const p = lookup0(email, name); LOOK[k] = { at: Date.now(), p };
  p.catch(() => { if (LOOK[k] && LOOK[k].p === p) delete LOOK[k]; });
  return p;
}
async function lookup0(email, name){
  const id = await idOf(email, name);
  const [S, G] = await Promise.all([rows("S", id, 20), rows("G", id, 50)]);
  let assign = null;
  for (const r of S){ const o = await verify(r.text); if (o && o.k === id){ assign = o; break; } }
  const fd = fixedDeletion(email); if (fd && (!assign || !(assign.at > fd.at))) assign = { k:id, del:true, at:fd.at };
  let reg = null;
  for (const r of G){ try { const o = JSON.parse(r.text); if (o && course(o.c) && (!reg || r.ver < reg.ver)) reg = Object.assign({ ver:r.ver }, o); } catch(e){} }
  // Study Plus student: one Computer Science sign-in also opens Design, with no approval step
  if (studyPlusOK({ email, name }) && !(assign && assign.del) && (gate() || {}).course === "design" && !(assign && assign.c === "design"))
    assign = Object.assign({ at: reg && reg.ver }, assign || {}, { k:id, c:"design", also:"cs", g: (assign && assign.g) || (reg && reg.g) || (((gate() || {}).link || {}).cs || {}).grade || "", sp:true });
  return { id, assign, reg };
}
function register(email, name, c, grade){
  idOf(email, name).then(id => sendRow("G", id, JSON.stringify({ c, g:String(grade || "") }))).catch(() => {});
}

/* ---------- the teacher's log ---------- */
function acctOf(a){ return { name:a.name || "", email:normEmail(a.email), grade:String(a.grade || ""), teacher:a.teacher || "", course:a.course || "", level:a.level || "", cls:a.cls || "" }; }
function log(type, a, extra){
  const acct = acctOf(a || {});
  const data = Object.assign({ sdc:1, v:1, type, at:new Date().toISOString(), acct }, extra || {});
  enqueue(LOG.url, { [LOG.entries.type]:"sdc-" + type, [LOG.entries.student]:acct.name, [LOG.entries.email]:acct.email, [LOG.entries.teacher]:acct.teacher, [LOG.entries.data]:JSON.stringify(data) });
}
/* one completed task, for the end-of-lesson House Points ranking. w = difficulty weight */
function task(a, title, w, kind){ const wk = work(); log("task", a, { task:{ t:String(title || "").slice(0, 120), w:+w || 1, kind:kind || "task" }, sid: wk && wk.sid, mins: wk ? Math.floor(wk.ms / 60000) : 0, chars: wk ? wk.chars : 0 }); }

/* ---------- staff: the signed course state (criteria switches + approved teachers) ----------
   Published by the super admin to the Design Studio Switches form and signed with the admin key, so nobody else
   can add a teacher or change a switch. The same state is used by the Design course. */
const CONTROL = { csv:"https://docs.google.com/spreadsheets/d/e/2PACX-1vRDyFCmLL1Z2lWea0WLF5surkagyB_Ad6-Cij4lCBhpvCeybt_pQB15xClmQoIRg8LMUWeFwuCUYy0f/pub?gid=480761896&single=true&output=csv",
  form:"https://docs.google.com/forms/d/e/1FAIpQLSeNJCgUXw7lCX1gPayZYtyZbmSyXnkDMGJzCpjtIYui_FnhTQ/formResponse", entry:"entry.1255814967" };
function canon(v){ return Array.isArray(v) ? "[" + v.map(canon).join(",") + "]" : v && typeof v === "object" ? "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}" : JSON.stringify(v); }
async function verifyState(d){
  try { if (!d || !d.sig || !d.t) return false;
    pubKey = pubKey || await crypto.subtle.importKey("jwk", SIG_PUB, { name:"ECDSA", namedCurve:"P-256" }, false, ["verify"]);
    const body = { unlocks: d.unlocks, teachers: d.teachers || [], declined: d.declined || [], t: d.t };
    return await crypto.subtle.verify({ name:"ECDSA", hash:"SHA-256" }, pubKey, d64(d.sig), TE.encode(canon(body)));
  } catch(e){ return false; }
}
function csvRows(t){
  const R = []; let row = [], cur = "", q = false;
  for (let i = 0; i < t.length; i++){ const c = t[i];
    if (q){ if (c === '"'){ if (t[i + 1] === '"'){ cur += '"'; i++; } else q = false; } else cur += c; }
    else if (c === '"') q = true; else if (c === ","){ row.push(cur); cur = ""; } else if (c === "\n" || c === "\r"){ if (c === "\r" && t[i + 1] === "\n") i++; row.push(cur); R.push(row); row = []; cur = ""; } else cur += c; }
  if (cur || row.length){ row.push(cur); R.push(row); }
  return R;
}
/* latest admin-signed state + teacher access requests */
async function loadState(csvUrl){
  const url = csvUrl || CONTROL.csv, r = await fetch(url + (url.includes("?") ? "&" : "?") + "cb=" + Date.now(), { cache:"no-store" });
  if (!r.ok) throw new Error("The switches sheet could not be read.");
  const rows = csvRows(await r.text()); let state = null; const reqs = [];
  for (let i = 1; i < rows.length; i++){
    const cell = rows[i].slice(1).find(v => v && v.trim().startsWith("{")); if (!cell) continue;
    try { const d = JSON.parse(cell);
      if (d.unlocks){ if (await verifyState(d) && (!state || String(d.t) > String(state.t))) state = d; }
      else if (d.request && /@sisd\.ae$/i.test(String(d.request.email || ""))) reqs.push(d.request);
    } catch(e){}
  }
  return { state, requests: reqs };
}
/* which teacher a student chose: matched on surname, so "Ms. Abdelaziz" and "Miss Abdelaziz" are the same person */
const surname = n => String(n || "").toLowerCase().replace(/[^a-z\s'-]/g, " ").trim().split(/\s+/).pop() || "";
function sameTeacher(a, b){ const x = surname(a), y = surname(b); return !!x && x === y; }
/* teachers the super admin took out of the students' sign-up list (built-in names included) */
async function hiddenTeacherNames(){
  return [];   // no longer used: every approved teacher can be chosen
}
/* the approved teacher's school email for the name a student picked ("" if not found) */
async function teacherEmailFor(name){
  try { const n = String(name || "").trim().toLowerCase(); if (!n) return ""; const { state } = await loadState();
    const t = ((state && state.teachers) || []).find(t => String(t.name || "").toLowerCase() === n || (t.names || []).some(x => String(x || "").toLowerCase() === n));
    return t ? normEmail(t.email) : ""; } catch(e){ return ""; }
}
async function teacherNames(){
  try { const { state } = await loadState(); return ((state && state.teachers) || []).map(t => t.name).filter(Boolean); } catch(e){ return []; }
}

/* ---------- teacher feedback to students ----------
   Stored in the sync sheet under the student's scrambled ID (no names or emails). */
function sendFeedback(student, fb){
  return idOf(student.email, student.name).then(id => { sendRow("F", id, JSON.stringify(Object.assign({ at: Date.now() }, fb))); flush(); return true; });
}
async function getFeedback(email, name){
  const id = await idOf(email, name), out = [];
  (await rows("F", id, 60)).forEach(r => { try { const o = JSON.parse(r.text); if (o && (o.s || o.i || o.n || o.note)) out.push(Object.assign({ ver: r.ver }, o)); } catch(e){} });
  return out.sort((a, b) => (b.at || b.ver) - (a.at || a.ver));
}
const SEEN_FB = "sdc_fb_seen";
function fbButton(){ return document.getElementById("sdcFb"); }
async function showFeedbackButton(){
  const g = gate(); if (!g || !g.who || offline()) return;
  let list = []; try { list = await getFeedback(g.who.email, g.who.name); } catch(e){ return; }
  const mine = list.filter(f => !f.course || f.course === g.course || (f.course === "design" && g.course === "it") || (f.course === "it" && g.course === "design"));
  const strip = document.getElementById("sdcStrip"); if (!strip || !mine.length) return;
  let seen = {}; try { seen = JSON.parse(localStorage.getItem(SEEN_FB)) || {}; } catch(e){}
  const unread = mine.filter(f => !seen[f.at]).length;
  let b = fbButton();
  if (!b){ b = document.createElement("button"); b.type = "button"; b.id = "sdcFb";
    b.setAttribute("style", "background:#DC2B3E;border:0;color:#fff;border-radius:999px;padding:4px 12px;font:inherit;font-weight:800;cursor:pointer");
    const slot = strip.querySelector("span[style*='margin-left:auto']"); (slot || strip).insertBefore(b, slot ? slot.firstChild : null); }
  b.textContent = "📝 Feedback from your teacher" + (unread ? " (" + unread + " new)" : "");
  b.onclick = () => {
    mine.forEach(f => seen[f.at] = 1); try { localStorage.setItem(SEEN_FB, JSON.stringify(seen)); } catch(e){}
    b.textContent = "📝 Feedback from your teacher";
    const bg = document.createElement("div"); bg.setAttribute("style", "position:fixed;inset:0;background:rgba(8,15,30,.6);z-index:2147483600;display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow:auto");
    const sec = (h, t) => t ? `<h4 style="margin:12px 0 4px;font-size:14px;color:#1B2D4E">${esc(h)}</h4><p style="margin:0;white-space:pre-wrap">${esc(t)}</p>` : "";
    bg.innerHTML = `<div role="dialog" aria-label="Feedback" style="background:#fff;color:#16223A;border-radius:14px;max-width:640px;width:100%;padding:22px;font:15px/1.55 Arial,Helvetica,sans-serif">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h3 style="margin:0;font-size:20px">Feedback from your teacher</h3><button type="button" data-x style="border:1px solid #D8DEEA;background:#fff;color:#1B2D4E;border-radius:8px;padding:6px 12px;font-weight:700;cursor:pointer">Close</button></div>
      ${mine.map(f => `<div class="sdcFbItem" style="border:1px solid #D8DEEA;border-left:4px solid #DC2B3E;border-radius:10px;padding:12px 14px;margin-top:14px">
        <div style="font-size:12.5px;color:#5B6782;font-weight:700">${esc(f.about || "")}${f.about ? " · " : ""}${esc(new Date(f.at || f.ver).toLocaleDateString("en-GB", { day:"numeric", month:"short" }))}${f.from ? " · " + esc(f.from) : ""}</div>
        ${f.lvl ? `<div style="margin-top:6px;font-weight:800">Suggested level: ${esc(f.lvl)} / 8</div>` : ""}
        ${sec("Strengths", f.s)}${sec("Improvements", f.i)}${sec("Student developments", f.n)}${sec("Note", f.note)}</div>`).join("")}</div>`;
    document.body.appendChild(bg);
    bg.onclick = e => { if (e.target === bg || e.target.hasAttribute("data-x")) bg.remove(); };
  };
}

/* ---------- British English everywhere ----------
   Every page and every box students write in is marked as British English (en-GB), so the browser's own spelling
   check (red underlines) and the device keyboard suggest British spellings: colour, organise, centre. */
(function(){
  const GB = 'textarea:not([lang]),input:not([lang]):not([type]),input[type=text]:not([lang]),input[type=search]:not([lang]),[contenteditable="true"]:not([lang])';
  const mark = root => { try { if (root.matches && root.matches(GB)) root.setAttribute("lang", "en-GB"); (root.querySelectorAll ? root.querySelectorAll(GB) : []).forEach(el => el.setAttribute("lang", "en-GB")); } catch(e){} };
  const start = () => { try { const h = document.documentElement; if (!h.lang || h.lang === "en" || h.lang === "en-US") h.lang = "en-GB"; mark(document.body);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) mark(n); }))).observe(document.body, { childList: true, subtree: true }); } catch(e){} };
  if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
})();

/* ---------- active work time and effort ----------
   Effort = engaging with the work, not just looking at it. Time only counts while the student is working: in the
   last 2 minutes they typed, answered a question (a button, choice or checkbox), changed a field, or built/drew
   on a canvas. Scrolling, moving the mouse and clicking around the page do not count. We also count the characters
   they TYPE (pasted text does not count), so a teacher can see how much content each student wrote.
   One session = one sign-in, on one day. */
const IDLE_MS = 120000, WORK_GOAL_MIN = 30;
let lastAct = 0, typedNew = 0;
const dayNow = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
const EDITABLE = el => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ""));
const WORK_CLICK = "button,[role=button],input,select,textarea,label,canvas,.opt,.choice,[data-opt],[data-ans]";
window.addEventListener("keydown", e => { if (e.isTrusted !== false && EDITABLE(e.target)) lastAct = Date.now(); }, true);
window.addEventListener("input", e => { if (e.isTrusted === false) return; lastAct = Date.now();
  const t = String(e.inputType || ""); if (/^insert(Text|ReplacementText|CompositionText|LineBreak|Paragraph)?$/.test(t)) typedNew += Math.max(1, String(e.data || "").length); }, true);
window.addEventListener("change", e => { if (e.isTrusted !== false) lastAct = Date.now(); }, true);
window.addEventListener("pointerdown", e => { if (e.isTrusted !== false && e.target && e.target.closest && e.target.closest(WORK_CLICK) && !e.target.closest("nav,header,.sdc-strip,#sdcStrip,.tabs,.steps,.strand-tabs")) lastAct = Date.now(); }, true);
function work(){
  const g = gate(); if (!g || !g.who) return null;
  if (!g.sid || g.day !== dayNow()){ const sid = Math.random().toString(36).slice(2, 10); patchGate({ sid, day: dayNow(), work: 0, told30: false, chars: 0 }); typedNew = 0; return { sid, ms: 0, chars: 0 }; }
  if (typedNew){ const add = typedNew; typedNew = 0; patchGate({ chars: (g.chars || 0) + add }); return { sid: g.sid, ms: g.work || 0, chars: (g.chars || 0) + add }; }
  return { sid: g.sid, ms: g.work || 0, chars: g.chars || 0 };
}
let workTick = Date.now();
setInterval(() => {
  const now = Date.now(), dt = Math.min(now - workTick, 10000); workTick = now;
  const g = gate(); if (!g || !g.who || document.hidden || now - lastAct > IDLE_MS) return;
  const w = work(); if (!w) return;
  const ms = w.ms + dt; patchGate({ work: ms });
  if (ms >= WORK_GOAL_MIN * 60000 && !gate().told30){ patchGate({ told30: true }); log("work", Object.assign({ course: g.course }, g.acct || g.who), { sid: w.sid, mins: Math.floor(ms / 60000), chars: w.chars }); }
}, 5000);
window.addEventListener("pagehide", () => { const g = gate(), w = work(); if (g && w && w.ms > 60000) log("work", Object.assign({ course: g.course }, g.acct || g.who), { sid: w.sid, mins: Math.floor(w.ms / 60000), chars: w.chars, end: true }); });

/* ---------- checks used by the course pages ---------- */
const MSG = {
  other: (c, by) => `This account is registered for <b>${esc(courseLabel(c))}</b>${by ? " by your teacher" : ""}, not the course you chose. You can only see the course you are registered for. If this is wrong, ask your teacher: only they can change your course.`,
  deleted: () => `<b>This account was deleted</b> by your teacher. Use <b>Sign up</b> to make a new account.`,
  grade: g => `IT is only for Grade 10, and this account is registered for Grade ${esc(g)}. Sign out and choose your own course.`
};
/* After a successful sign-in or sign-up inside a course page.
   a = {course, email, name, grade, teacher, level, cls}; signup = true right after creating the account.
   Resolves {ok:true, assign} (assign = the admin's latest settings, to apply) or {ok:false, msg}. */
async function confirm(a, signup){
  const g = gate();
  const c = a.course || (g && g.course);
  if (offline()) return { ok:true, assign:null };
  if (isTester(a.email)){   // test student: every course, every grade
    patchGate({ who:{ email:normEmail(a.email), name:a.name }, acct: acctOf(Object.assign({}, a, { course:c })) }); work();
    if (!(g && g.logged)){ log(signup ? "signup" : "signin", Object.assign({}, a, { course:c }), { gate:g && g.mode, test:true }); patchGate({ logged:true }); }
    return { ok:true, assign:null };
  }
  { const fd = fixedDeletion(a.email); if (fd && !(createdMs(a) > fd.at)){ log("deletedsignin", Object.assign({}, a, { course:c }), {}); try { if (window.SDC_forget) window.SDC_forget(a); } catch(e){} return { ok:false, deleted:true, msg:MSG.deleted() }; } }
  let L = null;
  try { L = await lookup(a.email, a.name); } catch(e){ L = null; }
  if (!L){ // sheet unreachable: let them in, it is checked again next time (new sign-ups must still verify)
    const made0 = createdMs(a), vm = c === "cs" || a.viaCS || a.viaCode ? null : await verifyGate(a.email, "student", !!signup || (made0 ? made0 >= sinceMs() : false), a, !!signup);   // new accounts must verify even when the online register can't be read if (vm){ log("unverified", Object.assign({}, a, { course:c }), { signup:!!signup }); return { ok:false, verify:true, msg:vm }; }
    patchGate({ who:{ email:normEmail(a.email), name:a.name }, acct: acctOf(Object.assign({}, a, { course:c })) });   // acct: the course menu needs the grade (Grade 10 Design ⇄ IT)
    if (!(g && g.logged)) { log("signin", Object.assign({}, a, { course:c }), { gate:g && g.mode, unchecked:true }); patchGate({ logged:true }); }
    return { ok:true, assign:null };
  }
  let A = L.assign;
  if (A && A.del){   // the super admin deleted an inactive account
    if (!(createdMs(a) > A.at)){
      log("deletedsignin", Object.assign({}, a, { course:c }), {});
      try { if (window.SDC_forget) window.SDC_forget(a); } catch(e){}
      return { ok:false, deleted:true, msg:MSG.deleted() };
    }
    A = null; if (L.reg && L.reg.ver <= L.assign.at) L.reg = null;   // a new account made after the deletion: start fresh
  }
  const both = !!(A && A.also && (A.also === c || A.c === c)) || studyPlusOK(a);   // set up for both courses (Computer Science + Design); a Study Plus student always is
  if (A && A.c !== c && (A.also === c || studyPlusOK(a) || bothOk(A.c, c, a.grade, A.g, g && g.grade))) A = null;   // approved for both: this change was for the other course   // also taking the other course: fine, the change was for that one
  if (A && A.c !== c){ log("wrongcourse", Object.assign({}, a, { course:c }), { registered:A.c, byAdmin:true }); return { ok:false, msg:MSG.other(A.c, true), registered:A.c }; }
  const csToo = c === "cs" && L.reg && L.reg.c === "design" && ["6","7","8"].indexOf(String(L.reg.g || a.grade || "")) >= 0;   // Grades 6–8 take both: their own Computer Science account still opens
  if (!A && L.reg && L.reg.c !== c && (both || csToo || bothOk(L.reg.c, c, a.grade, L.reg.g, g && g.grade))){ /* Grade 6–8: registered for both is allowed */ }
  else if (!A && L.reg && L.reg.c !== c){ log("wrongcourse", Object.assign({}, a, { course:c }), { registered:L.reg.c }); return { ok:false, msg:MSG.other(L.reg.c, false), registered:L.reg.c }; }
  if (!L.reg) register(a.email, a.name, c, (A && A.g) || a.grade);
  // only accounts made after verification was switched on must verify (judged by when the account was made,
  // not by when it first reached the online register). Computer Science students never need to verify.
  const made = createdMs(a), isNew = !!signup || (made ? made >= sinceMs() : (!!L.reg && L.reg.ver >= sinceMs()));
  const vm = c === "cs" || a.viaCS || a.viaCode ? null : await verifyGate(a.email, "student", isNew, a, !!signup);
  if (vm){ log("unverified", Object.assign({}, a, { course:c }), { signup:!!signup }); return { ok:false, verify:true, msg:vm }; }
  patchGate({ who:{ email:normEmail(a.email), name:a.name }, acct: acctOf(Object.assign({}, a, { course: c })) }); work(); setTimeout(showFeedbackButton, 800);
  if (!(g && g.logged)){ log(signup ? "signup" : "signin", Object.assign({}, a, { course:c }), { gate:g && g.mode }); patchGate({ logged:true }); }
  return { ok:true, assign:A };
}
/* ---------- email verification ----------
   New accounts (students and staff) must click a link sent to their @sisd.ae email before they can get in.
   The email is sent by the school's verification script (Google Apps Script). Accounts made before
   verification was switched on (VERIFY.since) keep working. Off while VERIFY.url is empty. */
const VERIFY = { url: "https://script.google.com/macros/s/AKfycbzYaxjHSKBzuhLJ3nkL7Qqb2BNL6nFHy7ojFnMTb_D2ZE5LbYRY2VnL5F_6gPGEbtqjsQ/exec", since: "2026-11-03T03:24:00Z", mode: "approve" };   // mode "approve": no emails to students (the school blocks them); a teacher approves each new account
const verifyOn = () => !!VERIFY.url && !offline();
const sinceMs = () => Date.parse(VERIFY.since) || 0;
function jsonp(params, timeout){
  return new Promise((res, rej) => {
    const cb = "__sdv" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), sc = document.createElement("script");
    const done = () => { clearTimeout(t); try { delete window[cb]; } catch(e){ window[cb] = undefined; } sc.remove(); };
    const t = setTimeout(() => { done(); rej(new Error("timeout")); }, timeout || 20000);
    window[cb] = r => { done(); res(r); }; sc.onerror = () => { done(); rej(new Error("reach")); };
    sc.src = VERIFY.url + (VERIFY.url.includes("?") ? "&" : "?") + new URLSearchParams(Object.assign({}, params, { cb, _: Date.now() })).toString();
    document.head.appendChild(sc);
  });
}
const VKEY = e => "sdc_ver_" + normEmail(e);
async function isVerified(email, timeout){
  try { if (localStorage.getItem(VKEY(email)) === "1") return true; } catch(e){}
  const r = await jsonp({ a:"status", e:normEmail(email) }, timeout);
  if (r && r.verified){ try { localStorage.setItem(VKEY(email), "1"); } catch(e){} return true; }
  return false;
}
async function verifyStatuses(emails){ if (!verifyOn() || !emails.length) return {}; try { return await jsonp({ a:"statuses", list: emails.map(normEmail).slice(0, 60).join(",") }); } catch(e){ return {}; } }
/* tell the super admin (by email, from the verification script) that a teacher asked for access */
async function notifyRequest(r){ if (!VERIFY.url || offline()) return false;
  try { const x = await jsonp({ a:"notify", k:"teacher-request", e:normEmail(r.email), n:String(r.name || "").slice(0, 80), as:String(r.as || "").slice(0, 60), w:String(r.where || "").slice(0, 40) }, 20000); return !!(x && x.ok); } catch(e){ return false; } }
async function startVerify(email, kind){ try { return await jsonp({ a:"start", e:normEmail(email), k:kind || "student" }, 30000); } catch(e){ return { ok:false, reason:"reach" }; } }
function verifyMsg(email, r){
  const m = verifyMsg0(email, r);
  return r && (r.reason === "domain" || (r.ok && r.already)) ? m : m + ` <br><b>No email after a few minutes?</b> Ask your teacher to let you in: they can do it from their dashboard.`;
}
function verifyMsg0(email, r){
  const e = `<b>${esc(normEmail(email))}</b>`;
  if (r && r.ok && r.sent) return `📧 <b>Check your SISD email.</b> We've sent a verification link to ${e}. Open it, press <b>Verify my email</b>, then come back and sign in. (Check your Junk folder if you can't see it.)`;
  if (r && r.ok && r.already) return `Your email is verified. Please sign in again.`;
  if (r && r.reason === "wait") return `📧 <b>Your email isn't verified yet.</b> A link was already sent to ${e} in the last hour. Open it and press <b>Verify my email</b>, then sign in.`;
  if (r && r.reason === "quota") return `Your email isn't verified yet, and no more verification emails can be sent today. Try again tomorrow, or ask your teacher.`;
  if (r && r.reason === "domain") return `Only SISD email addresses (ending in @sisd.ae) can be used.`;
  return `Your email isn't verified yet, and the verification email couldn't be sent just now. Check your internet connection and try again.`;
}
/* returns null when the person may continue, or a message explaining what to do */
/* a teacher or the super admin let this student in by hand (e.g. the verification email never arrived) */
async function adminVerified(email, rethrow){
  try { const id = await idOf(email, "");
    for (const r of await rows("V", id, 10)){ const o = await verify(r.text); if (o && o.k === id && o.verified){ try { localStorage.setItem(VKEY(email), "1"); } catch(e){} return true; } } } catch(e){ if (rethrow) throw e; }
  return false;
}
/* ---------- Grade 10 sign-up: confirm the SISD email with a 6-digit code, then forget the email ----------
   The address and code go in the body of a hidden POST (never in a web address); the result is read back by a random id.
   Returns { ok } or { ok:false, reason }; reason "old" = the email script hasn't been updated yet. */
async function codePost(body){
  if (!VERIFY.url || offline()) return { ok:false, reason:"offline" };
  const rid = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
  try { await fetch(VERIFY.url, { method:"POST", mode:"no-cors", headers:{ "Content-Type":"text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ rid }, body)) }); }
  catch(e){ return { ok:false, reason:"reach" }; }
  for (let i = 0; i < 14; i++){
    await new Promise(r => setTimeout(r, i ? 1500 : 900));
    try { const x = await jsonp({ a:"cstatus", id: rid }, 12000); if (x && x.reason === "unknown") return { ok:false, reason:"old" }; if (x && !x.pending) return x; } catch(e){}
  }
  return { ok:false, reason:"reach" };
}
const emailCode = (email, first) => codePost({ a:"code", e: normEmail(email), n: String(first || "").slice(0, 40) });
const checkCode = (email, code) => codePost({ a:"check", e: normEmail(email), c: String(code || "").replace(/\D/g, "").slice(0, 6) });
/* a username made from the student's first and last name, letters and numbers only: "Mikaeel Ahmed" → "MikaeelAhmed" */
function usernameOf(name){
  return String(name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").split(/\s+/).filter(Boolean)
    .map(w => w.replace(/[^A-Za-z0-9]/g, "")).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("").slice(0, 40);
}
const isUsername = v => /^[a-z][a-z0-9]{2,40}$/i.test(String(v || "").trim());

/* ---------- forgot PIN / password ----------
   The student asks for a reset: their teacher and the super admin are emailed and see it on the staff dashboard
   ("Reset requests"); the student gets an email saying what happens next. After the reset, resetDone() emails the
   student their new PIN / password. */
const BASE_TEACHERS = ["Mr. Ahmed", "Ms. Abdelaziz", "Mr. French", "Ms. Miyakawa"];
async function forgot(r){
  const email = normEmail(r.email), c = r.course === "cs" ? "cs" : r.course === "it" ? "it" : "design";
  const uname = !email.includes("@") && isUsername(email);
  if (!/^[^\s@]+@sisd\.ae$/i.test(email) && !uname) return { ok:false, msg:"Type your full school email (ending in @sisd.ae), or your username if you have one." };
  const name = String(r.name || "").trim().replace(/\s+/g, " ").slice(0, 80);
  if (name.split(" ").length < 2) return { ok:false, msg:"Type your first and last name." };
  log("resetrequest", { name, email, course:c, teacher:r.teacher || "" }, { reset:{ course:c } });
  if (!VERIFY.url || offline()) return { ok:true, emailed:false };
  let te = ""; try { te = r.teacher ? await teacherEmailFor(r.teacher) : ""; } catch(e){}
  try { const x = await jsonp({ a:"notify", k:"reset-request", e:email, n:name, c, te }, 20000); return { ok:true, emailed: !!(x && x.ok) }; } catch(e){ return { ok:true, emailed:false }; }
}
/* ---------- locked out after too many wrong PINs / passwords ----------
   The student can ask their teacher to unlock now instead of waiting. The request goes to the staff dashboard
   ("Unlock requests"). The teacher presses Unlock now, which posts a signed unlock; the student's sign-in page
   checks for it every few seconds and lets them try again straight away. */
async function lockIds(email, name){ const e = normEmail(email || ""), n = String(name || "").trim(); const ids = new Set();
  try { ids.add(await idOf(e, n)); } catch(x){} try { if (e) ids.add(await idOf(e, "")); } catch(x){} try { if (n) ids.add(await idOf("", n)); } catch(x){}
  return [...ids]; }
function unlockRequest(r){
  const email = normEmail(r.email || ""), c = r.course === "cs" ? "cs" : r.course === "it" ? "it" : "design";
  log("unlockrequest", { name:String(r.name || "").slice(0, 80), email, course:c, teacher:r.teacher || "", grade:r.grade || "" }, { unlock:{ course:c } });
  try { flush(); } catch(e){}
  return true;
}
/* the newest unlock time the teacher has sent for this student (0 = none) */
async function unlockedAt(email, name){
  let best = 0;
  for (const id of await lockIds(email, name)){ let R = []; try { R = await rows("U", id, 5); } catch(e){}
    for (const r of R){ const o = await verify(r.text); if (o && o.k === id && o.unlock && +o.at > best) best = +o.at; } }
  return best;
}
/* the "ask my teacher to unlock now" box under a lock-out message. o = { course, email, name, teacher, since, onUnlock } */
function lockHelp(box, o){
  if (!box) return; o = o || {}; const prev = box.querySelector(".sdcUnlock"); if (prev) prev.remove();
  const d = document.createElement("div"); d.className = "sdcUnlock";
  d.style.cssText = "margin-top:10px;padding:12px 14px;border-radius:12px;background:#FFF7E0;border:1.5px solid #F0C64A;color:#16223A;font-size:14.5px;line-height:1.45;text-align:left";
  const key = "sdc_unlockreq_" + normEmail(o.email || o.name || ""); let asked = 0; try { asked = +sessionStorage.getItem(key) || 0; } catch(e){}
  const draw = () => {
    d.innerHTML = asked ? `⏳ <b>Request sent to your teacher.</b> When they press <b>Unlock now</b>, you can try again straight away. Keep this page open: it unlocks by itself.`
      : `<b>Don't want to wait?</b> Ask your teacher to unlock your account now, so you can try again straight away.<br><button type="button" class="sdcUnlockGo" style="margin-top:8px;background:#1B2D4E;color:#fff;border:0;border-radius:10px;padding:9px 16px;font:inherit;font-weight:800;cursor:pointer">🔓 Ask my teacher to unlock now</button>`;
    const b = d.querySelector(".sdcUnlockGo"); if (b) b.onclick = () => { unlockRequest(o); asked = Date.now(); try { sessionStorage.setItem(key, String(asked)); } catch(e){} draw(); };
  };
  draw(); box.appendChild(d);
  const since = +o.since || Date.now() - 15 * 60000;
  const tick = async () => {
    if (!d.isConnected) return;
    if (asked){ let t = 0; try { t = await unlockedAt(o.email, o.name); } catch(e){}
      if (t > since){ d.style.background = "#E7F6EE"; d.style.borderColor = "#1E8A55"; d.innerHTML = "✅ <b>Your teacher has unlocked your account.</b> Try again now.";
        try { sessionStorage.removeItem(key); } catch(e){} try { o.onUnlock && o.onUnlock(t); } catch(e){} return; } }
    setTimeout(tick, asked ? 8000 : 4000);
  };
  setTimeout(tick, 1500);
}
async function resetDone(r){
  if (!VERIFY.url || offline()) return false;
  try { const x = await jsonp({ a:"notify", k:"reset-done", e:normEmail(r.email), n:String(r.name || "").slice(0, 80), c:r.course || "design", s:String(r.secret || "") }, 20000); return !!(x && x.ok); } catch(e){ return false; }
}
async function forgotDialog(o){
  o = o || {}; const c = o.course === "cs" ? "cs" : o.course === "it" ? "it" : "design", what = c === "cs" ? "PIN" : "password";
  const h = t => String(t == null ? "" : t).replace(/[&<>"]/g, x => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[x]));
  let names = BASE_TEACHERS.slice(); try { (await teacherNames()).forEach(n => { if (!names.some(x => sameTeacher(x, n))) names.push(n); }); } catch(e){}
  const bg = document.createElement("div");
  bg.style.cssText = "position:fixed;inset:0;background:rgba(16,24,40,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px";
  const fs = "width:100%;box-sizing:border-box;font:inherit;font-size:16px;padding:10px 12px;border:1.5px solid #C9D1E0;border-radius:10px;margin-top:4px";
  bg.innerHTML = `<div role="dialog" aria-label="Forgot your ${what}" style="background:#fff;color:#16223A;border-radius:16px;max-width:440px;width:100%;padding:22px 22px 18px;box-shadow:0 20px 50px rgba(0,0,0,.3);font-family:inherit;max-height:92vh;overflow:auto">
    <h2 style="margin:0 0 6px;font-size:22px">🔑 Forgot your ${what}?</h2>
    <p style="margin:0 0 14px;color:#5B6782;font-size:14px">Fill this in and press <b>Ask for a reset</b>. Your teacher resets it, and your new ${what} is emailed to your school email. Your work is kept.</p>
    <label style="display:block;font-weight:700;font-size:14px;margin-bottom:10px">Your full name<input id="fgName" autocomplete="name" style="${fs}" value="${h(o.name || "")}" placeholder="First and last name"></label>
    <label style="display:block;font-weight:700;font-size:14px;margin-bottom:10px">${c === "cs" ? "School email" : "School email, or your username"}<input id="fgEmail" type="text" autocomplete="username" style="${fs}" value="${h(o.email || "")}" placeholder="name@sisd.ae"></label>
    <label style="display:block;font-weight:700;font-size:14px;margin-bottom:12px">Your teacher<select id="fgTeacher" style="${fs}"><option value="">Not sure</option>${names.map(n => `<option${o.teacher && sameTeacher(o.teacher, n) ? " selected" : ""}>${h(n)}</option>`).join("")}</select></label>
    <div id="fgMsg" style="font-size:14px;margin-bottom:10px"></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" id="fgGo" style="background:#DC2B3E;color:#fff;border:0;border-radius:10px;padding:11px 18px;font:inherit;font-weight:800;cursor:pointer">Ask for a reset</button><button type="button" id="fgX" style="background:#EEF1F7;color:#1B2D4E;border:0;border-radius:10px;padding:11px 18px;font:inherit;font-weight:700;cursor:pointer">Close</button></div></div>`;
  document.body.appendChild(bg);
  const q = x => bg.querySelector(x), close = () => bg.remove();
  q("#fgX").onclick = close; bg.onclick = e => { if (e.target === bg) close(); };
  setTimeout(() => (q(o.name ? "#fgEmail" : "#fgName") || {}).focus && q(o.name ? "#fgEmail" : "#fgName").focus(), 50);
  const say = (t, ok) => { q("#fgMsg").innerHTML = `<div style="padding:10px 12px;border-radius:10px;background:${ok ? "#E7F6EE" : "#FDECEE"};color:${ok ? "#14633C" : "#9B1C2C"}">${t}</div>`; };
  q("#fgGo").onclick = async () => {
    q("#fgGo").disabled = true; say("Sending…", true);
    const r = await forgot({ course:c, name:q("#fgName").value, email:q("#fgEmail").value, teacher:q("#fgTeacher").value });
    if (!r.ok){ q("#fgGo").disabled = false; return say(h(r.msg)); }
    const un = !q("#fgEmail").value.includes("@");
    if (un){ say(`<b>Request sent.</b> Your teacher will give you a <b>temporary password</b>. Sign in with your username and it, then create your own new password.`, true); q("#fgGo").remove(); q("#fgX").textContent = "OK"; return; }
    say(`<b>Request sent.</b> ${r.emailed ? "Check your school email: we've sent you what happens next. " : ""}Your teacher will reset your ${what}, and your new ${what} will be emailed to you. You can also ask your teacher in your next lesson.`, true);
    q("#fgGo").remove(); q("#fgX").textContent = "OK";
  };
}
/* tell the super admin (email to their Gmail, from the school's script) that a new student is waiting; once a day at most */
function notifyStudent(email, a){
  const k = "sdc_snote_" + normEmail(email); let last = 0; try { last = +localStorage.getItem(k) || 0; } catch(e){}
  if (Date.now() - last < 86400000) return; try { localStorage.setItem(k, String(Date.now())); } catch(e){}
  jsonp({ a:"notify", k:"student-request", e:normEmail(email), n:String((a && a.name) || "").slice(0, 80), w:courseLabel((a && a.course) || "") + ((a && a.grade) ? ", Grade " + a.grade : "") + ((a && a.teacher) ? " · " + a.teacher : "") }, 20000).catch(() => {});
}
const approveMsg = () => `⏳ <b>Your account is waiting for your teacher's approval.</b> We've let them know. Once they approve it, come back here and sign in with your email and password.`;
async function verifyGate(email, kind, isNew, a, strict){
  if (!verifyOn() || !isNew) return null;
  if (VERIFY.mode === "approve" && kind === "staff") return null;   // teachers are approved by the super admin anyway
  if (!/@sisd\.ae$/i.test(normEmail(email))) return verifyMsg(email, { reason:"domain" });
  /* 25 Nov 2026: the two checks run at the same time. If neither could be reached (slow school Wi-Fi, the email
     script waking up), an existing account is let in and checked again at the next sign-in, instead of being
     sent back to the sign-in page with "waiting for approval". A brand-new sign-up must still be approved. */
  let reachErr = 0;
  const v1 = isVerified(email, 9000).catch(() => { reachErr++; return false; }), v2 = adminVerified(email, true).catch(() => { reachErr++; return false; });
  const v = await new Promise(res => { let n = 0; [v1, v2].forEach(p => p.then(x => { if (x) res(true); else if (++n === 2) res(false); })); });
  if (v) return null;
  if (reachErr && !strict){ try { log("verifyunchecked", Object.assign({}, a || {}, { email:normEmail(email) }), { errors:reachErr }); } catch(e){} return null; }
  if (VERIFY.mode === "approve"){ notifyStudent(email, a); return approveMsg(); }
  return verifyMsg(email, await startVerify(email, kind));
}

/* Before creating an account: is this email free to sign up for this course? */
const createdMs = a => { const v = a && a.created; return typeof v === "number" ? v : Date.parse(v || "") || 0; };
/* has the super admin deleted this (old) account? Then signing up again is allowed and starts fresh */
async function isDeleted(email, name){ try { const L = await lookup(email, name); return !!(L.assign && L.assign.del); } catch(e){ return false; } }
/* Computer Science students (name + PIN) can also use Design (Grades 6–10), switching without signing in again.
   Students who signed up for Design (school email + password) only see Design. */
const BOTH_GRADES = ["6", "7", "8", "9", "10"];
/* Grade 10 students who take both IT and Design use ONE login for both (same username and password, same site).
   True when c1 and c2 are Design and IT (either way round) and the student is in Grade 10. */
const G10_PAIR = ["design", "it"];
function g10Pair(c1, c2, ...grades){
  if (!c1 || !c2 || c1 === c2 || G10_PAIR.indexOf(c1) < 0 || G10_PAIR.indexOf(c2) < 0) return false;
  return grades.some(g => String(g == null ? "" : g).replace(/^G/i, "") === "10");
}
function bothOk(c1, c2, ...grades){
  if (g10Pair(c1, c2, ...grades)) return true;   // Grade 10: one login opens both Design and IT
  return false;   // a second course now needs the teacher's approval (a signed change with also: the first course)
}
async function canSignUp(email, name, c){
  if (offline() || isTester(email)) return { ok:true };
  let L = null; try { L = await lookup(email, name); } catch(e){ return { ok:true }; }
  if (L.assign && L.assign.del){ if (!L.reg || L.reg.ver <= L.assign.at) return { ok:true, deleted:true }; L.assign = null; }
  const gg = (gate() || {}).grade;
  if (L.assign && L.assign.c !== c && L.assign.also === c) return { ok:true, assign:null };
  if (L.assign && L.assign.c !== c && bothOk(L.assign.c, c, gg, L.assign.g)) return { ok:true, assign:null };
  if (L.assign && L.assign.c !== c){ log("wrongcourse", { email, name, course:c }, { registered:L.assign.c, byAdmin:true, signup:true }); return { ok:false, msg:MSG.other(L.assign.c, true) }; }
  if (!L.assign && L.reg && L.reg.c !== c && bothOk(L.reg.c, c, gg, L.reg.g)) return { ok:true, assign:null };
  if (!L.assign && L.reg && L.reg.c === "design" && c === "cs" && ["6","7","8"].indexOf(String(L.reg.g || gg || "")) >= 0) return { ok:true, assign:null };   // Grades 6–8 take both: they may make their Computer Science account
  if (!L.assign && L.reg && L.reg.c !== c){ log("wrongcourse", { email, name, course:c }, { registered:L.reg.c, signup:true }); return { ok:false, msg:MSG.other(L.reg.c, false) }; }
  return { ok:true, assign:L.assign };
}

/* ---------- language: one choice for the portal, both courses and the admin pages ----------
   Uses Google's website translator. The choice is shared across all pages of the site (cookie on path /). */
const LANGS = { en:"English", fr:"Français", ru:"Русский", es:"Español", de:"Deutsch" };
function getLang(){
  let c = null; try { c = localStorage.getItem("sdc_lang"); } catch(e){}
  if (!LANGS[c]){ const m = document.cookie.match(/googtrans=\/en\/([a-z]+)/); c = m && LANGS[m[1]] ? m[1] : "en"; }
  return c;
}
function langCookie(code){
  const exp = code === "en" ? "; expires=Thu, 01 Jan 1970 00:00:00 GMT" : "", v = code === "en" ? "" : "/en/" + code;
  document.cookie = `googtrans=${v}; path=/${exp}`;
  try { document.cookie = `googtrans=${v}; path=/; domain=${location.hostname}${exp}`; } catch(e){}
}
let gtLoaded = false;
function loadTranslator(){
  if (gtLoaded || offline()) return; gtLoaded = true;
  let host = document.getElementById("gtHost"); if (!host){ host = document.createElement("div"); host.id = "gtHost"; document.body.appendChild(host); }
  window.googleTranslateElementInit = () => { try { new google.translate.TranslateElement({ pageLanguage:"en", includedLanguages:"en,fr,ru,es,de", autoDisplay:false }, "gtHost"); } catch(e){} };
  const sc = document.createElement("script"); sc.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"; document.body.appendChild(sc);
}
function setLang(code, first){
  if (!LANGS[code]) code = "en";
  try { localStorage.setItem("sdc_lang", code); } catch(e){}
  document.documentElement.lang = code; langCookie(code);
  document.querySelectorAll(".sdcLang select").forEach(x => { x.value = code; });
  if (code === "en"){ if (!first && TR.on()) location.reload(); return; }
  if (TR.on()){ location.reload(); return; }   // switching between two other languages: start clean from English
  TR.start(code);
}
/* never translate code, program output, names typed by students or the language list itself */
const KEEP = "code,pre,textarea,.editor,.ed-wrap,.console,.gutter,.snip,#whoPill,.sdcLang,.notranslate-auto";
function protect(root){ (root || document).querySelectorAll(KEEP).forEach(e => { if (!e.classList.contains("notranslate")){ e.classList.add("notranslate"); e.setAttribute("translate", "no"); } }); }
function langPicker(dark){
  const c = dark ? "#fff" : "inherit", bd = dark ? "rgba(255,255,255,.35)" : "var(--line,#D8DEEA)";
  return `<label class="sdcLang notranslate" translate="no" title="Language" style="display:inline-flex;align-items:center;gap:5px;border:1px solid ${bd};border-radius:999px;padding:3px 10px;font:700 13px Arial,Helvetica,sans-serif;color:${c};cursor:pointer"><span aria-hidden="true">🌐</span><select aria-label="Language" style="background:transparent;border:0;color:${c};font:inherit;cursor:pointer;outline:none;padding:0;margin:0;min-height:0;height:auto;width:auto;box-shadow:none;border-radius:0">${Object.keys(LANGS).map(k => `<option value="${k}" style="color:#16223A" ${k === getLang() ? "selected" : ""}>${LANGS[k]}</option>`).join("")}</select></label>`;
}
/* ---------- school glossary for the translations ----------
   Google's page translator gets our subject words wrong ("strand" became "прядь" / "нить" / "hebra" / "Strang",
   "rubric" became "Рубрика", "Practice: pass before the task" became a football pass). Before Google sees a piece of
   text, our exact words are put in, marked "don't translate": whole labels from GL_PHRASE, and key terms inside
   longer sentences from GL_TERM. Google then translates the rest of the sentence around them. */
const GL_PHRASE = {
  "pass before the task":        { ru:"Пройди перед заданием", fr:"À réussir avant la tâche", es:"Apruébala antes de la tarea", de:"Vor der Aufgabe bestehen" },
  "practice":                    { ru:"Тренировка", fr:"Entraînement", es:"Práctica", de:"Übung" },
  "how you're marked":           { ru:"Как тебя оценивают", fr:"Comment tu es évalué", es:"Cómo se te evalúa", de:"Wie du bewertet wirst" },
  "method & starters":           { ru:"Метод и подсказки", fr:"Méthode et débuts de phrases", es:"Método e inicios de frase", de:"Methode und Satzanfänge" },
  "how to solve it":             { ru:"Как это решить", fr:"Comment le résoudre", es:"Cómo resolverlo", de:"So löst du es" },
  "a different problem":         { ru:"Другая задача", fr:"Un autre problème", es:"Un problema diferente", de:"Ein anderes Problem" },
  "your task":                   { ru:"Твоё задание", fr:"Ta tâche", es:"Tu tarea", de:"Deine Aufgabe" },
  "watch the video":             { ru:"Посмотри видео", fr:"Regarde la vidéo", es:"Mira el vídeo", de:"Sieh dir das Video an" },
  "introduction":                { ru:"Введение", fr:"Introduction", es:"Introducción", de:"Einführung" },
  "download & hand in":          { ru:"Скачать и сдать", fr:"Télécharger et rendre", es:"Descargar y entregar", de:"Herunterladen und abgeben" },
  "pdf + teacher copy":          { ru:"PDF + копия для учителя", fr:"PDF + copie pour l'enseignant", es:"PDF + copia para el profesor", de:"PDF + Kopie für die Lehrkraft" },
  "change course":               { ru:"Сменить курс", fr:"Changer de cours", es:"Cambiar de curso", de:"Kurs wechseln" },
  "go to another of your courses": { ru:"Перейти в другой твой курс", fr:"Aller à un autre de tes cours", es:"Ir a otro de tus cursos", de:"Zu einem anderen deiner Kurse" },
  "read to me":                  { ru:"Прочитать вслух", fr:"Lire à voix haute", es:"Leer en voz alta", de:"Vorlesen" },
  "read this page to me":        { ru:"Прочитать эту страницу вслух", fr:"Lire cette page à voix haute", es:"Leer esta página en voz alta", de:"Diese Seite vorlesen" },
  "learn":                       { ru:"Теория", fr:"Apprendre", es:"Aprender", de:"Lernen" },
  "saving…":                     { ru:"Сохранение…", fr:"Enregistrement…", es:"Guardando…", de:"Wird gespeichert…" },
  "saved":                       { ru:"Сохранено", fr:"Enregistré", es:"Guardado", de:"Gespeichert" },
  "sketch here":                 { ru:"Нарисовать здесь", fr:"Dessiner ici", es:"Dibujar aquí", de:"Hier zeichnen" },
  "check spelling and grammar":  { ru:"Проверить орфографию и грамматику", fr:"Vérifier l'orthographe et la grammaire", es:"Revisar ortografía y gramática", de:"Rechtschreibung und Grammatik prüfen" },
  "inquiring & analysing":       { ru:"Исследование и анализ", fr:"Recherche et analyse", es:"Indagación y análisis", de:"Recherchieren und Analysieren" },
  "inquiring and analysing":     { ru:"Исследование и анализ", fr:"Recherche et analyse", es:"Indagación y análisis", de:"Recherchieren und Analysieren" },
  "developing ideas":            { ru:"Разработка идей", fr:"Développement des idées", es:"Desarrollo de ideas", de:"Ideen entwickeln" },
  "creating the solution":       { ru:"Создание решения", fr:"Création de la solution", es:"Creación de la solución", de:"Die Lösung erstellen" },
  "evaluating":                  { ru:"Оценивание", fr:"Évaluation", es:"Evaluación", de:"Bewerten" },
  "rubric":                      { ru:"Шкала оценивания", fr:"Grille d'évaluation", es:"Rúbrica", de:"Bewertungsraster" },
  "worked example":              { ru:"Разобранный пример", fr:"Exemple corrigé", es:"Ejemplo resuelto", de:"Lösungsbeispiel" },
  "house points":                { ru:"Очки факультета", fr:"Points de maison", es:"Puntos de casa", de:"Hauspunkte" },
  "strand brief":                { ru:"Аудиоинструкция", fr:"Consigne audio", es:"Instrucciones en audio", de:"Audio-Anleitung" },
  "pause the strand brief":      { ru:"Пауза", fr:"Pause", es:"Pausa", de:"Pause" },
  "skip the video task":         { ru:"Пропустить задание с видео", fr:"Passer la tâche vidéo", es:"Saltar la tarea del vídeo", de:"Die Videoaufgabe überspringen" }
};
const GL_RX = [   // whole labels with a strand number in them
  [/^(←\s*)?Strand (i|ii|iii|iv)$/i, { ru:"$1Часть $2", fr:"$1Volet $2", es:"$1Aspecto $2", de:"$1Aspekt $2" }],
  [/^Strands (i–iv|i-iv)$/i, { ru:"Части $1", fr:"Volets $1", es:"Aspectos $1", de:"Aspekte $1" }],
  [/^Complete strand (i|ii|iii|iv) and continue$/i, { ru:"Завершить часть $1 и продолжить", fr:"Terminer le volet $1 et continuer", es:"Completar el aspecto $1 y continuar", de:"Aspekt $1 abschließen und weiter" }],
  [/^Complete strand (i|ii|iii|iv)$/i, { ru:"Завершить часть $1", fr:"Terminer le volet $1", es:"Completar el aspecto $1", de:"Aspekt $1 abschließen" }],
  [/^Save changes to strand (i|ii|iii|iv)$/i, { ru:"Сохранить изменения в части $1", fr:"Enregistrer les modifications du volet $1", es:"Guardar los cambios del aspecto $1", de:"Änderungen an Aspekt $1 speichern" }],
  [/^Back to strand (i|ii|iii|iv)$/i, { ru:"Вернуться к части $1", fr:"Retour au volet $1", es:"Volver al aspecto $1", de:"Zurück zu Aspekt $1" }]
];
const GL_TERM = [   // short names kept exactly as written (no grammar around them)
  [/\bACCESS FM\b/g, { ru:"ACCESS FM", fr:"ACCESS FM", es:"ACCESS FM", de:"ACCESS FM" }],
  [/\bIB MYP\b/g, { ru:"IB MYP", fr:"IB PEI", es:"IB PAI", de:"IB MYP" }],
  [/\bMYP\b/g, { fr:"PEI", es:"PAI" }]
];
/* after Google has translated a sentence: swap its wrong word for ours in the same grammatical form */
const RU_3 = { "ь":"ь", "и":"и", "ью":"ью", "ей":"ей", "ям":"ям", "ями":"ями", "ях":"ях" };
const RU_VETKA = { "а":"ь", "и":"и", "е":"и", "у":"ь", "ой":"ью", "ам":"ям", "ами":"ями", "ах":"ях" };
const RU_STRAND = { "":"ь", "а":"и", "у":"и", "ом":"ью", "е":"и", "ы":"и", "ов":"ей", "ам":"ям", "ами":"ями", "ах":"ях" };
const RU_ADJ = { "ый":"ый", "ий":"ый", "ого":"ого", "его":"ого", "ому":"ому", "ему":"ому", "ым":"ым", "им":"ым", "ом":"ом", "ем":"ом", "ые":"ые", "ие":"ые", "ых":"ых", "их":"ых", "ыми":"ыми", "ими":"ыми", "ую":"ый", "ая":"ый" };
const L_ = "(?<![\\p{L}])", _L = "(?![\\p{L}])";
const keepCase = (orig, w) => orig.charAt(0) === orig.charAt(0).toUpperCase() && orig.charAt(0) !== orig.charAt(0).toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w;
const GL_POST = {
  ru: [
    [new RegExp(L_ + "(пряд|нит)(ь|и|ью|ей|ям|ями|ях)" + _L, "giu"), (m, a, e) => keepCase(m, "част" + RU_3[e.toLowerCase()])],
    [new RegExp(L_ + "ветк(а|и|е|у|ой|ам|ами|ах)" + _L, "giu"), (m, e) => keepCase(m, "част" + RU_VETKA[e.toLowerCase()])],
    [new RegExp(L_ + "веток" + _L, "giu"), m => keepCase(m, "частей")],
    [new RegExp(L_ + "стрэнд(а|у|ом|е|ы|ов|ам|ами|ах)?" + _L, "giu"), (m, e) => keepCase(m, "част" + RU_STRAND[(e || "").toLowerCase()])],
    [new RegExp(L_ + "рубрик(а|и|е|у|ой|ам|ами|ах)?" + _L, "giu"), (m, e) => keepCase(m, "шкал" + (e || "") + " оценивания")],
    [new RegExp(L_ + "(проработанн|рабоч|отработанн)(ый|ий|ого|его|ому|ему|ым|им|ом|ем|ые|ие|ых|их|ыми|ими)(\\s+пример)", "giu"), (m, a, e, t) => keepCase(m, "разобранн" + RU_ADJ[e.toLowerCase()]) + t],
    [new RegExp("(очк(?:и|ов|ам|ами)|балл(?:а|ов)?)\\s+(?:дома|House Points)" + _L, "giu"), (m, a) => a + " факультета"],
    [new RegExp(L_ + "House Points" + _L, "gu"), () => "очки факультета"]
  ],
  fr: [
    [new RegExp(L_ + "brin(s?)" + _L, "giu"), (m, s) => keepCase(m, "volet" + s)],
    [new RegExp(L_ + "rubrique(s?)" + _L, "giu"), (m, s) => keepCase(m, "grille" + s + " d'évaluation")],
    [new RegExp(L_ + "exemple(s?) (?:concret|travaillé|pratique|résolu)s?" + _L, "giu"), (m, s) => keepCase(m, "exemple" + s + " corrigé" + s)],
    [new RegExp(L_ + "(?:dossier|brief|cahier) de conception" + _L, "giu"), m => keepCase(m, "cahier des charges")],
    [new RegExp(L_ + "Points de la maison" + _L, "giu"), m => keepCase(m, "points de maison")]
  ],
  es: [
    [new RegExp(L_ + "(la|una|esta|esa|cada|otra|nueva|primera|última|siguiente) (hebra|hilera)" + _L, "giu"), (m, a) => keepCase(m, ({ la:"el", una:"un", esta:"este", esa:"ese", cada:"cada", otra:"otro", nueva:"nuevo", "primera":"primer", "última":"último", siguiente:"siguiente" })[a.toLowerCase()] + " aspecto")],
    [new RegExp(L_ + "(las|unas|estas|esas|otras) (hebras|hileras)" + _L, "giu"), (m, a) => keepCase(m, ({ las:"los", unas:"unos", estas:"estos", esas:"esos", otras:"otros" })[a.toLowerCase()] + " aspectos")],
    [new RegExp(L_ + "(?:hebra|hilo|hilera|capítulo|filamento)(s?)" + _L, "giu"), (m, s) => keepCase(m, "aspecto" + s)],
    [new RegExp(L_ + "resumen de diseño" + _L, "giu"), m => keepCase(m, "brief de diseño")],
    [new RegExp(L_ + "puntos de la casa" + _L, "giu"), m => keepCase(m, "puntos de casa")]
  ],
  de: [
    [new RegExp(L_ + "(?:Strang|Faden)(es|s)?" + _L, "gu"), (m, e) => "Aspekt" + (e ? "s" : "")],
    [new RegExp(L_ + "(?:Stränge|Fäden)" + _L, "gu"), () => "Aspekte"],
    [new RegExp(L_ + "(?:Strängen|Fäden)" + _L, "gu"), () => "Aspekten"],
    [new RegExp(L_ + "anhand der Rubrik" + _L, "gu"), () => "anhand des Bewertungsrasters"],
    [new RegExp(L_ + "die Rubrik" + _L, "giu"), m => keepCase(m, "das Bewertungsraster")],
    [new RegExp(L_ + "Rubrik(en)?" + _L, "gu"), () => "Bewertungsraster"],
    [new RegExp(L_ + "ausgearbeitete(n|s)? Beispiel(e|en)?" + _L, "gu"), (m, a, b) => "Lösungsbeispiel" + (b || "")],
    [new RegExp(L_ + "zu Ende stricken und weiterstricken" + _L, "gu"), () => "abschließen und weiter"]
  ]
};
function glossPost(tn, code){
  const rules = GL_POST[code]; if (!rules) return; const v = tn.nodeValue; if (!v || v.length < 3) return;
  let out = v; rules.forEach(([re, f]) => { re.lastIndex = 0; out = out.replace(re, f); });
  if (out !== v) tn.nodeValue = out;
}
const GL_SKIP = "script,style,textarea,input,select,code,pre,svg,canvas,.notranslate,[translate=no],[contenteditable],.editor,.console,#gtHost";
const GL_CAP = (t, w) => /^[A-Z]/.test(t) ? w.charAt(0).toUpperCase() + w.slice(1) : w;
function glossNode(tn, code){
  const el = tn.parentElement; if (!el || el.closest(GL_SKIP)) return;
  glossPost(tn, code);   // text Google has already translated
  const raw = tn.nodeValue;
  if (/^\s*[A-D]\s*$/.test(raw || "") && !el.classList.contains("notranslate")){ el.classList.add("notranslate"); el.setAttribute("translate", "no"); return; }   // a criterion letter on its own
  if (!raw || !/[A-Za-z]{3}/.test(raw)) return;
  const m = raw.match(/^([^A-Za-z]*)(.*?)([\s→←.:!?…]*)$/s), core = m ? m[2] : raw, ph = GL_PHRASE[core.trim().toLowerCase()];
  // Google drops the spaces next to a "don't translate" word inside a sentence: keep them inside our word
  const inSentence = (() => { const pe = el, gp = pe.parentElement; if (!gp || getComputedStyle(pe).display !== "inline") return false; return String(gp.textContent || "").trim().length > String(pe.textContent || "").trim().length + 2; })();
  const span = (txt, pad) => { const sp = document.createElement("span"); sp.className = "notranslate sdcGl"; sp.setAttribute("translate", "no"); sp.textContent = pad ? "\u00a0" + txt + "\u00a0" : txt; return sp; };
  if (ph && ph[code]){ const frag = document.createDocumentFragment(); if (m[1]) frag.append(m[1]); frag.append(span(GL_CAP(core, ph[code]), inSentence)); if (m[3]) frag.append(m[3]); tn.replaceWith(frag); return; }
  for (const [re, tr] of GL_RX){ const t = core.trim(); if (tr[code] && re.test(t)){ const frag = document.createDocumentFragment(); if (m[1]) frag.append(m[1]); frag.append(span(t.replace(re, tr[code]), inSentence)); if (m[3]) frag.append(m[3]); tn.replaceWith(frag); return; } }
  const hits = []; GL_TERM.forEach(([re, tr]) => { if (!tr[code]) return; re.lastIndex = 0; let x; while ((x = re.exec(raw))){ if (!hits.some(h => x.index < h.e && x.index + x[0].length > h.s)) hits.push({ s:x.index, e:x.index + x[0].length, w:GL_CAP(x[0], tr[code]) }); } });
  if (!hits.length) return;
  hits.sort((a, b) => a.s - b.s); const frag = document.createDocumentFragment(); let at = 0;
  hits.forEach(h => { if (h.s > at) frag.append(raw.slice(at, h.s)); frag.append(span(h.w, true)); at = h.e; }); if (at < raw.length) frag.append(raw.slice(at));
  tn.replaceWith(frag);
}
/* ---------- full-page translation: every text, button, box hint and pop-up, on every page ----------
   Our own translator (Google's page widget left parts in English and fought with live text such as timers).
   Every piece of text is translated through Google's translation service, remembered on this computer
   (so pages switch language instantly next time), and kept translated when the page changes it.
   Numbers are kept as they are ("35:46 left" -> "Noch 35:46"), using one remembered pattern for all numbers. */
const TR = (() => {
  const SKIP = "head,title,script,style,noscript,textarea,input,code,pre,svg,canvas,.notranslate,[translate=no],[contenteditable],[contenteditable=true],.editor,.ed-wrap,.console,.gutter,.snip,#gtHost,.sdcLang";
  const ATTRS = ["placeholder", "title", "aria-label", "alt"];
  const NUM = /\d+(?:[.,:]\d+)*/g, MAX = 8000;
  let code = "en", mem = {}, tpl = {}, pend = new Set(), waitT = null, obs = null, on = false, saveT = null;
  const NODE = new WeakMap(), ATTR = new WeakMap(), users = new Map();   // text -> nodes/attrs waiting for it
  const LSK = c => "sdc_tr2_" + c;
  function loadCache(){ try { const o = JSON.parse(localStorage.getItem(LSK(code)) || "{}"); mem = o.m || {}; tpl = o.t || {}; } catch(e){ mem = {}; tpl = {}; } }
  function saveCache(){ clearTimeout(saveT); saveT = setTimeout(() => { try { if (Object.keys(mem).length > MAX) mem = {}; localStorage.setItem(LSK(code), JSON.stringify({ m: mem, t: tpl })); } catch(e){ try { localStorage.removeItem(LSK(code)); } catch(_){} } }, 1500); }
  const worth = s => /[A-Za-z]{2}/.test(s);
  const split = raw => { const m = String(raw).match(/^(\s*)([\s\S]*?)(\s*)$/); return { a: m[1], core: m[2].replace(/\s+/g, " "), z: m[3] }; };
  const tkey = core => core.replace(NUM, "#");
  /* our school words: whole labels and strand names are fixed; Google's wrong words are swapped afterwards */
  function fixed(core){
    const ph = GL_PHRASE[core.toLowerCase().replace(/[\s→←.:!?…]+$/, "")]; if (ph && ph[code]) return GL_CAP(core, ph[code]) + (core.match(/[\s→←.:!?…]+$/) || [""])[0];
    for (const [re, tr] of GL_RX){ if (tr[code] && re.test(core)) return core.replace(re, tr[code]); }
    return null;
  }
  function post(out){ (GL_POST[code] || []).forEach(([re, f]) => { re.lastIndex = 0; out = out.replace(re, f); }); return out; }
  function lookup(core){
    if (mem[core] != null) return mem[core];
    const f = fixed(core); if (f){ mem[core] = f; return f; }
    const nums = core.match(NUM); if (nums){ const t = tpl[tkey(core)]; if (t != null){ let i = 0; return t.replace(/\{(\d+)\}/g, (m, k) => nums[+k] != null ? nums[+k] : m); } }
    return null;
  }
  function learn(core, out){
    out = post(out); mem[core] = out;
    const nums = core.match(NUM); if (nums){ let t = out, ok = true, at = 0;
      nums.forEach((n, i) => { const j = t.indexOf(n, at); if (j < 0){ ok = false; return; } t = t.slice(0, j) + "{" + i + "}" + t.slice(j + n.length); at = j + String(i).length + 2; });
      if (ok) tpl[tkey(core)] = t; }
    saveCache(); return out;
  }
  async function fetchBatch(list){
    const q = list.join("\n");
    const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${code}&dt=t&q=${encodeURIComponent(q)}`);
    if (!r.ok) throw new Error("translate " + r.status);
    const j = await r.json(), txt = ((j && j[0]) || []).map(x => (x && x[0]) || "").join("");
    return txt.split("\n").map(s => s.trim());
  }
  async function flush(){
    waitT = null; if (!on) return;
    const all = [...pend]; pend.clear(); const batches = []; let cur = [], len = 0;
    all.forEach(s => { const n = encodeURIComponent(s).length + 3; if (cur.length && (len + n > 1800 || cur.length >= 60)){ batches.push(cur); cur = []; len = 0; } cur.push(s); len += n; });
    if (cur.length) batches.push(cur);
    let go = 0; const next = async () => { while (go < batches.length){ const b = batches[go++], lang = code;
      try { let res = await fetchBatch(b);
        if (res.length !== b.length) res = await Promise.all(b.map(s => fetchBatch([s]).then(x => x.join(" "), () => null)));
        if (lang !== code) return;
        b.forEach((s, i) => { if (res[i]) { learn(s, res[i]); paintAll(s); } });
      } catch(e){ b.forEach(s => users.delete(s)); } } };
    await Promise.all([next(), next(), next()]);
  }
  function want(core, fn){ let u = users.get(core); if (!u){ u = new Set(); users.set(core, u); } u.add(fn); pend.add(core); if (!waitT) waitT = setTimeout(flush, 80); }
  function paintAll(core){ const u = users.get(core); users.delete(core); if (u) u.forEach(fn => { try { fn(); } catch(e){} }); }
  const skipEl = el => !el || (el.closest && el.closest(SKIP));
  function doText(tn){
    const el = tn.parentElement; if (skipEl(el)) return;
    let rec = NODE.get(tn); const v = tn.nodeValue;
    if (rec && v === rec.out) return;                    // our own translation
    if (!rec){ rec = { en: v, out: null }; NODE.set(tn, rec); } else rec.en = v;   // new text from the page
    const { a, core, z } = split(rec.en); if (!worth(core)) return;
    const put = () => { const t = lookup(core); if (t == null || NODE.get(tn) !== rec || split(rec.en).core !== core) return; rec.out = a + t + z; if (tn.nodeValue !== rec.out) tn.nodeValue = rec.out; };
    if (lookup(core) != null) put(); else want(core, put);
  }
  function doAttr(el, at){
    let all = ATTR.get(el); if (!all){ all = {}; ATTR.set(el, all); }
    const v = el.getAttribute(at); if (v == null) return; let rec = all[at];
    if (rec && v === rec.out) return; if (!rec){ rec = all[at] = { en: v, out: null }; } else rec.en = v;
    const core = split(v).core; if (!worth(core)) return;
    const put = () => { const t = lookup(core); if (t == null || all[at] !== rec || split(rec.en).core !== core) return; rec.out = t; if (el.getAttribute(at) !== t) el.setAttribute(at, t); };
    if (lookup(core) != null) put(); else want(core, put);
  }
  function doEl(el){
    if (el.closest && el.closest(".notranslate,[translate=no],.sdcLang")) return;
    ATTRS.forEach(at => { if (el.hasAttribute(at)) doAttr(el, at); });
    if (el.tagName === "INPUT" && /^(button|submit|reset)$/i.test(el.type) && el.value) doAttr(el, "value");
  }
  function scan(root){
    if (!on || !root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1) return;
    doEl(root); root.querySelectorAll("[placeholder],[title],[aria-label],[alt],input[type=button],input[type=submit],input[type=reset]").forEach(doEl);
    if (root.closest(SKIP)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; const list = []; while ((n = w.nextNode())) list.push(n); list.forEach(doText);
  }
  let tEn = null, tOut = null;
  function title(){ const t = document.title; if (t === tOut) return; tEn = t; if (!worth(t)) return; const c = split(t).core, x = lookup(c);
    if (x != null){ tOut = x; if (document.title !== x) document.title = x; } else want(c, () => { if (tEn === t) title(); }); }
  /* pop-up messages (alert / confirm / prompt) in the chosen language */
  function wrapDialogs(){
    if (window.__sdcDlg) return; window.__sdcDlg = true;
    ["alert", "confirm", "prompt"].forEach(k => { const f = window[k]; if (!f) return; window[k] = function(msg, ...rest){
      if (on && msg != null){ const s = String(msg); const t = s.split("\n").map(line => { const { a, core, z } = split(line); if (!worth(core)) return line; const x = lookup(core); if (x == null) want(core, () => {}); return x == null ? line : a + x + z; }).join("\n"); msg = t; }
      return f.call(window, msg, ...rest); }; });
  }
  function start(c){
    if (!LANGS[c] || c === "en" || offline()) return;
    code = c; on = true; loadCache(); wrapDialogs();
    scan(document.body); title();
    if (obs) obs.disconnect();
    obs = new MutationObserver(ms => { if (!on) return; ms.forEach(m => {
      if (m.type === "characterData"){ if (m.target.nodeType === 3) doText(m.target); }
      else if (m.type === "attributes"){ if (m.target.nodeType === 1) doEl(m.target); }
      else m.addedNodes.forEach(n => scan(n)); });
      title(); });
    obs.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat("value") });
  }
  return { start, scan, on: () => on, lookup: s => lookup(split(s).core), _mem: () => mem };
})();
function gloss(root){ TR.scan(root); }
function glossOld(root){
  const code = getLang(); if (code === "en" || !root) return;
  if (root.nodeType === 3) return glossNode(root, code);
  if (root.nodeType !== 1 || (root.closest && root.closest(GL_SKIP))) return;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), list = []; let n; while ((n = w.nextNode())) list.push(n);
  list.forEach(t => glossNode(t, code));
  // dropdown options can't hold a span: swap whole labels and mark them
  (root.querySelectorAll ? root.querySelectorAll("option") : []).forEach(o => { const ph = GL_PHRASE[String(o.textContent).trim().toLowerCase()]; if (ph && ph[code]){ o.textContent = ph[code]; o.classList.add("notranslate"); } });
  if (root.title && GL_PHRASE[root.title.trim().toLowerCase()]) root.title = GL_PHRASE[root.title.trim().toLowerCase()][code] || root.title;
}
function bindPickers(){ document.querySelectorAll(".sdcLang select").forEach(x => { if (!x.dataset.b){ x.dataset.b = 1; x.onchange = () => { if (typeof window.SDC_onLang === "function") window.SDC_onLang(x.value); else setLang(x.value); }; } }); }
(function initLang(){
  const css = document.createElement("style");
  css.textContent = "#gtHost,.goog-te-banner-frame,.skiptranslate>iframe,#goog-gt-tt,.goog-te-balloon-frame,.VIpgJd-ZVi9od-ORHb-OEVmcd,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none!important}body{top:0!important}.goog-text-highlight{background:none!important;box-shadow:none!important}";
  document.head.appendChild(css);
  const start = () => {
    protect(); bindPickers();
    new MutationObserver(ms => { ms.forEach(m => {
      m.addedNodes.forEach(n => { if (n.nodeType === 1 && !(n.classList && n.classList.contains("sdcTmp"))){ if (n.matches && n.matches(KEEP)) protect(n.parentNode || n); else protect(n); }
      }); });
      bindPickers(); }).observe(document.body, { childList:true, subtree:true });
    if (!window.SDC_ownLang && getLang() !== "en") setLang(getLang(), true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();

/* ---------- read aloud: any text section, in the chosen language ----------
   Reads the text as it is on screen, so after translation it reads the translated words, with a voice for that language. */
const VOICE = { en:"en-GB", fr:"fr-FR", ru:"ru-RU", es:"es-ES", de:"de-DE" };
const canSpeak = () => { try { return "speechSynthesis" in window; } catch(e){ return false; } };
let voices = {};
try { speechSynthesis.onvoiceschanged = () => { voices = {}; }; speechSynthesis.getVoices(); } catch(e){}
function voiceFor(code){
  try { if (voices[code] !== undefined) return voices[code];
    const want = VOICE[code] || "en-GB", base = want.slice(0, 2), vs = speechSynthesis.getVoices();
    // the most human-sounding voice this device offers: neural/natural voices first (Edge, Windows 11, Android),
    // then premium/enhanced Apple voices and Google's voices; robotic engines last
    const score = v => { const l = String(v.lang || "").replace("_", "-"), nm = String(v.name || ""); let n = l === want ? 20 : l.slice(0, 2) === base ? 12 : -999;
      if (/natural|neural|online/i.test(nm)) n += 40;
      if (/premium|enhanced|siri/i.test(nm)) n += 30;
      if (/^google/i.test(nm)) n += 22;
      if (/(samantha|daniel|serena|kate|karen|moira|tessa|libby|sonia|ryan|thomas|amelie|monica|jorge|paulina|milena|yuri)/i.test(nm)) n += 12;
      if (/espeak|robot|compact|novelty|whisper|bad news|bells|zarvox|trinoids|albert|bahh|boing|bubbles|cellos|deranged|hysterical|organ|superstar|jester|wobble|fred|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i.test(nm)) n -= 60;
      if (!v.localService) n += 4;
      return n; };
    const best = vs.map(v => [score(v), v]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0])[0];
    return (voices[code] = best ? best[1] : null); } catch(e){ return null; }
}
function humanise(t){
  return String(t)
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, " ")   // emoji
    .replace(/([A-Za-z_][\w.]*)\(\)/g, "$1")                       // print() -> print
    .replace(/[→←↑↓•·|▶✓✔✗✘⬜⬛#*_~^`]+/g, ", ")
    .replace(/\s*[-–—]\s+/g, ", ").replace(/\.{3}|…/g, ". ")
    .replace(/\(([^)]*)\)/g, ", $1, ")                                // brackets become a short pause
    .replace(/\s*,\s*(,\s*)+/g, ", ").replace(/,\s*([.!?])/g, "$1")
    .replace(/\s+/g, " ").replace(/\s+([,.!?;:])/g, "$1").replace(/^[,\s]+/, "").trim();
}
function chunksOf(text){
  const parts = String(text).replace(/\s+/g, " ").trim().match(/[^.!?;:]+[.!?;:]*\s*/g) || [];
  const out = []; let cur = "";
  parts.forEach(p => { if ((cur + p).length > 220 && cur){ out.push(cur); cur = ""; } cur += p; });
  if (cur.trim()) out.push(cur); return out;
}
let readTok = 0, readBtn = null;
function setBtn(b, on){ if (!b) return; b.setAttribute("aria-pressed", on ? "true" : "false"); if (b.classList.contains("sdcListen")) b.innerHTML = (on ? STOP_ICON : SPEAKER) + (b.classList.contains("sdcPage") ? `<span class="sdcLt">${on ? "Stop" : "Read to me"}</span>` : ""); b.title = on ? "Stop reading" : (b.dataset.label || "Read this aloud"); const t = b.querySelector(".sdcLt"); if (t && !b.classList.contains("sdcPage")) t.textContent = on ? "Stop" : (b.dataset.label || "Listen"); }
function stopReading(){ readTok++; narrTok++; try { speechSynthesis.cancel(); } catch(e){} setBtn(readBtn, false); readBtn = null; }
function speak(text, onend){
  if (!canSpeak()) return false;
  const my = ++readTok; try { speechSynthesis.cancel(); } catch(e){}
  const code = getLang(), v = voiceFor(code), list = chunksOf(humanise(text)); let i = 0;
  const next = () => { if (my !== readTok) return; if (i >= list.length){ onend && onend(); return; }
    const u = new SpeechSynthesisUtterance(list[i++]); u.lang = VOICE[code] || "en-GB"; if (v) u.voice = v; u.rate = /natural|neural|online|premium|enhanced/i.test(v ? v.name : "") ? 1 : 0.93; u.pitch = 1;
    let done = false; const fin = () => { if (!done){ done = true; setTimeout(next, 220); } }; u.onend = fin; u.onerror = fin; setTimeout(fin, Math.max(8000, u.text.length * 120));   // a short breath between sentences
    speechSynthesis.speak(u); };
  next(); return true;
}
const SKIP = ".sdcNoRead,.nav,.actions,.counter,.dots,.steps,.pts,.tag,#stepBody > div.muted,.sdcPageBar,button,.sdcListen,.sdcLang,input,select,textarea,svg,img,canvas,video,script,style,.console,.editor,.ed-wrap,.gutter,.snip,.listen,[aria-hidden=true],.hidden,[hidden]";
function textOf(el){
  const c = el.cloneNode(true); c.querySelectorAll(SKIP).forEach(n => n.remove());
  const box = document.createElement("div"); box.className = "sdcTmp notranslate"; box.setAttribute("translate", "no"); box.setAttribute("aria-hidden", "true");
  box.style.cssText = "position:absolute;left:-10000px;top:0;width:700px"; box.appendChild(c); document.body.appendChild(box);
  const t = box.innerText; box.remove(); return t.replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, " ");
}
/* ---------- taking a long time on one task ----------
   1st message: encouragement. 2nd: encouragement + "this is taking longer than expected".
   Still stuck after that: their teacher is told (a "needs help" alert in the staff dashboard, and an email to the admin).
   Only active minutes count (typing, clicking, scrolling in the last 2 minutes), not time sitting idle. */
const slow = (() => {
  let cur = null, lastAct = Date.now(), tick = null;
  const mark = () => { lastAct = Date.now(); };
  ["keydown", "mousedown", "input", "scroll", "touchstart"].forEach(ev => { try { window.addEventListener(ev, mark, { passive:true, capture:true }); } catch(e){} });
  function box(html, kind){
    try { document.querySelectorAll(".sdcSlow").forEach(x => x.remove()); } catch(e){}
    const bg = document.createElement("div"); bg.className = "sdcSlow notranslate-auto";
    bg.setAttribute("style", "position:fixed;inset:0;background:rgba(14,26,48,.55);display:flex;align-items:center;justify-content:center;z-index:2147483600;padding:16px;font:16px/1.5 Arial,Helvetica,sans-serif");
    bg.innerHTML = `<div role="dialog" style="background:#fff;color:#16223A;border-radius:16px;max-width:440px;width:100%;padding:22px 24px;border-top:8px solid ${kind === "warn" ? "#E0A100" : "#1E8A55"};box-shadow:0 10px 40px rgba(0,0,0,.3)">${html}<button type="button" style="margin-top:16px;width:100%;border:none;border-radius:10px;padding:11px;font:inherit;font-weight:800;background:#1B2D4E;color:#fff;cursor:pointer">Back to my task →</button></div>`;
    bg.querySelector("button").onclick = () => bg.remove();
    document.body.appendChild(bg);
  }
  function check(){
    if (!cur) return;
    if (document.visibilityState === "visible" && Date.now() - lastAct < 120000) cur.ms += 15000;
    const m = cur.ms / 60000, first = String(cur.who && cur.who.name || "").split(" ")[0];
    if (cur.stage < 1 && m >= cur.t[0]){ cur.stage = 1;
      box(`<div style="font-size:2rem">💪</div><h2 style="margin:6px 0 8px">You can do it${first ? ", " + esc(first) : ""}!</h2><p style="margin:0">Take it one step at a time. Read the task again, look back at the example, then do the next small part. Every bit you finish counts!</p>`, "ok"); }
    else if (cur.stage < 2 && m >= cur.t[1]){ cur.stage = 2;
      box(`<div style="font-size:2rem">⏰</div><h2 style="margin:6px 0 8px">Keep going${first ? ", " + esc(first) : ""}: you're nearly there!</h2><p style="margin:0">You've spent <b>${Math.round(m)} minutes</b> on this task, which is <b>longer than expected</b>. Try to finish it in the next few minutes. If you're stuck, put your hand up and ask your teacher now.</p><p style="margin:10px 0 0;color:#5B6782;font-size:.92rem">If there's still no progress soon, your teacher will be told so they can come and help you.</p>`, "warn"); }
    else if (cur.stage < 3 && m >= cur.t[2]){ cur.stage = 3;
      log("slowalert", Object.assign({}, cur.who || {}), { task:{ t:String(cur.label || "").slice(0, 120) }, mins:Math.round(m) });
      const W = cur.who || {}, L = cur.label;
      teacherEmailFor(W.teacher).then(te => jsonp({ a:"notify", k:"slow-student", te, e:normEmail(W.email || ""), n:String(W.name || "").slice(0, 80), w:(courseLabel(W.course || "") + (W.grade ? ", Grade " + W.grade : "") + (W.teacher ? " · " + W.teacher : "") + " · " + String(L || "") + " · " + Math.round(m) + " min").slice(0, 160) }, 20000)).catch(() => {});
      box(`<div style="font-size:2rem">🙋</div><h2 style="margin:6px 0 8px">Your teacher is on the way</h2><p style="margin:0">This task is taking a long time, so we've let your teacher know. They'll help you get moving again. Keep trying in the meantime!</p>`, "warn"); }
  }
  return {
    /* start(key, label, who, [first, second, alert] in active minutes): same key again carries on the same timer */
    start(key, label, who, t){ if (isTester((who || {}).email)) return; if (cur && cur.key === key) { cur.label = label; return; }
      cur = { key, label, who, t: t || [8, 15, 22], ms:0, stage:0 }; if (!tick) tick = setInterval(check, 15000); },
    stop(key){ if (!key || (cur && cur.key === key)) cur = null; },
    _state(){ return cur; }, _check: check
  };
})();
/* ---------- weekly exercise rankings (per class) ----------
   Each student's page reports how many exercises they've completed overall and this week (Monday to Sunday).
   Classmates see the class table; last week's top three get House Points (3, 2 and 1). Names show as "Sara K.". */
const rank = (() => {
  const pad = n => String(n).padStart(2, "0");
  function weekId(t){ const d = new Date(t || Date.now()); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function prevWeek(w){ const d = new Date((w || weekId()) + "T12:00:00"); d.setDate(d.getDate() - 7); return weekId(d.getTime()); }
  const inWeek = (t, w) => !!t && weekId(t) === (w || weekId());
  const short = n => { const p = String(n || "").trim().split(/\s+/).filter(Boolean); return p.length > 1 ? p[0] + " " + p[p.length - 1][0].toUpperCase() + "." : (p[0] || "?"); };
  const classOf = a => [a.course || "", String(a.grade || "").toLowerCase(), String(a.cls || "").toLowerCase().replace(/\s+/g, ""), surname(a.teacher || "")].join("|");
  async function classId(a){ return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", TE.encode("sdc-rank|" + classOf(a))))).slice(0, 24); }
  async function meId(a){ return (await idOf(a.email, a.name)).slice(0, 12); }
  let lastSent = "";
  /* counts = { total, week, last } : last = exercises completed last week */
  async function report(a, counts){
    try { if (!a || !a.name || isTester(a.email) || !(window.crypto && crypto.subtle)) return;
      const w = weekId(), body = { k: await meId(a), n: short(a.name), t: +counts.total || 0, w, x: +counts.week || 0, pw: prevWeek(w), px: +counts.last || 0 };
      const sig = JSON.stringify(body); if (sig === lastSent) return; lastSent = sig;
      sendRow("R", await classId(a), JSON.stringify(Object.assign({ at: Date.now() }, body))); } catch(e){}
  }
  /* the class table: [{ k, n, total, week, last, me }] plus last week's winners */
  async function table(a, opt){
    const id = await classId(a), mine = a.email || a.name ? await meId(a) : "", got = {}, w = weekId(), pw = prevWeek(w), lastBy = {};
    let rs = []; try { rs = await rows("R", id, (opt && opt.limit) || 400); } catch(e){ return null; }
    rs.forEach(r => { let d; try { d = JSON.parse(r.text); } catch(e){ return; } if (!d || !d.k) return;
      const cur = got[d.k]; if (!cur || (d.at || r.ver) > cur.at) got[d.k] = { k:d.k, n:d.n, at:d.at || r.ver, total:+d.t || 0, week: d.w === w ? +d.x || 0 : 0, me: d.k === mine };
      const lw = d.w === pw ? +d.x || 0 : d.pw === pw ? +d.px || 0 : null; if (lw !== null) lastBy[d.k] = Math.max(lastBy[d.k] || 0, lw); });
    const list = Object.values(got).map(x => Object.assign(x, { last: lastBy[x.k] || 0 }));
    const byWeek = list.slice().sort((p, q) => q.week - p.week || q.total - p.total || p.n.localeCompare(q.n));
    const byTotal = list.slice().sort((p, q) => q.total - p.total || q.week - p.week || p.n.localeCompare(q.n));
    const winners = list.filter(x => x.last > 0).sort((p, q) => q.last - p.last || q.total - p.total || p.n.localeCompare(q.n)).slice(0, 3).map((x, i) => Object.assign({}, x, { place: i + 1, hp: 3 - i }));
    return { week: w, lastWeek: pw, byWeek, byTotal, winners, mine };
  }
  const MED = ["🥇", "🥈", "🥉"];
  /* a ready-made card for a student's page */
  function card(T, opt){
    const o = opt || {}, row = (x, i, val) => `<tr style="${x.me ? "background:#FFF6DA;font-weight:700" : ""}"><td style="padding:5px 8px;width:2.2em">${i < 3 && val(x) > 0 ? MED[i] : i + 1}</td><td style="padding:5px 8px">${esc(x.n)}${x.me ? " (you)" : ""}</td><td style="padding:5px 8px;text-align:right">${val(x)}</td></tr>`;
    const tbl = (list, val, empty) => list.length ? `<table style="width:100%;border-collapse:collapse;font-size:14px">${list.slice(0, o.max || 10).map((x, i) => row(x, i, val)).join("")}${(() => { const i = list.findIndex(x => x.me); return i >= (o.max || 10) ? `<tr><td colspan="3" style="padding:2px 8px;color:#7A859C">…</td></tr>` + row(list[i], i, val) : ""; })()}</table>` : `<p style="margin:6px 0;color:#5B6782">${empty}</p>`;
    const meW = T.byWeek.findIndex(x => x.me), meT = T.byTotal.findIndex(x => x.me);
    const days = 7 - ((new Date().getDay() + 6) % 7);
    return `<div class="sdcRank" style="border:1px solid #DCE2EE;border-radius:16px;padding:16px 18px;background:#fff;color:#16223A;font:15px/1.45 Arial,Helvetica,sans-serif">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:baseline"><b style="font-size:1.15rem">🏆 Class rankings</b><span style="color:#5B6782;font-size:13px">Resets every Monday · ${days} day${days === 1 ? "" : "s"} left this week</span></div>
      ${meW >= 0 ? `<p style="margin:6px 0 0">You're <b>#${meW + 1}</b> this week and <b>#${meT + 1}</b> overall.${meW > 2 ? " Complete more exercises to reach the top three!" : T.byWeek[meW].week > 0 ? " Keep it up: the top three on Monday get House Points!" : ""}</p>` : ""}
      ${T.winners.length ? `<div style="margin:12px 0 0;padding:10px 12px;border-radius:12px;background:#EEF6F1;color:#16223A"><b>Last week's House Points</b><div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:4px">${T.winners.map(x => `<span>${MED[x.place - 1]} <b>${esc(x.n)}</b>${x.me ? " (you)" : ""} · ${x.last} exercises · <b>+${x.hp} HP</b></span>`).join("")}</div></div>` : ""}
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px;margin-top:12px">
        <div><b>This week</b> <span style="color:#5B6782;font-size:13px">exercises completed</span>${tbl(T.byWeek, x => x.week, "No exercises completed yet this week. Be the first!")}</div>
        <div><b>Overall</b> <span style="color:#5B6782;font-size:13px">exercises completed</span>${tbl(T.byTotal, x => x.total, "No one has completed an exercise yet.")}</div></div>
      <p style="margin:10px 0 0;color:#5B6782;font-size:12.5px">Every Monday the top three of the week get House Points: 🥇 3, 🥈 2, 🥉 1.</p></div>`;
  }
  /* fill a box on the page (and keep it fresh every 2 minutes while visible) */
  function mount(box, a, opt){
    if (!box || !a || isTester(a.email)) { if (box) box.innerHTML = ""; return; }
    const go = async () => { if (!box.isConnected) return clearInterval(box._rk); const T = await table(a); if (T && box.isConnected) box.innerHTML = card(T, opt); };
    clearInterval(box._rk); box._rk = setInterval(() => { if (document.visibilityState === "visible") go(); }, 120000); go();
  }
  return { weekId, prevWeek, inWeek, report, table, card, mount, classOf, classId, short };
})();
/* ---------- "Saving… / ✓ Saved" badge in the top bar ----------
   The course page passes a function that says whether anything is still waiting to go online:
   { on: signed in, pending: unsent changes, offline }. Checked twice a second; typing shows "Saving…" straight away. */
const saveBadge = (() => {
  let fn = null, lastType = 0, state = "", savedAt = 0, since = 0;
  const STY = {
    saving: "background:#FFF1D6;color:#7A4B00;border:1px solid #F0C36B",
    saved: "background:#1E8A55;color:#fff;border:1px solid #1E8A55",
    offline: "background:#FDE2E2;color:#8A1C1C;border:1px solid #F1A7A7"
  };
  const base = "display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:3px 10px;font:700 12.5px/1.2 Arial,Helvetica,sans-serif;white-space:nowrap;transition:background .3s";
  try { ["input", "change"].forEach(ev => document.addEventListener(ev, e => { const t = e.target; if (t && (t.matches("textarea, input:not([type=password]):not([type=email]), select, [contenteditable]")) && !(t.closest && t.closest("#sdcStrip"))) lastType = Date.now(); }, true)); } catch(e){}
  function paint(st){
    const el = document.getElementById("sdcSave"); if (!el) return;
    if (!st){ el.style.display = "none"; state = ""; return; }
    if (st === state) { if (st === "saved") el.title = "Your work is saved online at " + new Date(savedAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit", second:"2-digit" }) + ". You can open it on any computer."; return; }
    state = st; since = Date.now();
    el.setAttribute("style", base + ";" + STY[st]);
    el.innerHTML = st === "saving" ? `<span class="sdcSpin" style="display:inline-block;width:10px;height:10px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:sdcSpin .8s linear infinite"></span>Saving…`
      : st === "saved" ? `<span aria-hidden="true">✓</span>Saved` : `<span aria-hidden="true">⚠</span>Saved on this computer · will upload when online`;
    el.title = st === "saving" ? "Saving your work online…" : st === "offline" ? "No internet: your work is safe on this computer and goes online as soon as the internet is back." : "Your work is saved online. You can open it on any computer.";
  }
  function tick(){
    let r = null; try { r = fn ? fn() : null; } catch(e){ r = null; }
    if (!r || !r.on) return paint("");
    const typing = Date.now() - lastType < 1500, busy = r.pending || typing;
    if (busy){ if (!navigator.onLine || r.offline) return paint("offline"); return paint("saving"); }
    if (state === "saving" && Date.now() - since < 700) return;   // let "Saving…" show for a moment
    if (state !== "saved") savedAt = Date.now();
    paint(state === "" && !r.everSaved ? "saved" : "saved");
  }
  try { const st = document.createElement("style"); st.textContent = "@keyframes sdcSpin{to{transform:rotate(360deg)}}"; document.head.appendChild(st); } catch(e){}
  setInterval(tick, 500);
  return { watch(f){ fn = f; tick(); }, tick };
})();
/* ---------- narrator for the course videos ----------
   A calm, natural voice: the best neural/natural voice on the device (male or female, the student's choice),
   spoken sentence by sentence with short breaths between them, at an easy pace, in the chosen language. */
const NARR_KEY = "sdc_narrator";
const MALE = /(guy|ryan|thomas|andrew|brian|christopher|eric|roger|steffan|davis|tony|jason|william|liam|elliot|alfie|oliver|noah|ethan|daniel|arthur|aaron|fred|alex|tom|rishi|lee|george|henri|remy|jorge|alvaro|dmitry|pavel|google uk english male|\bmale\b)/i;
const FEMALE = /(aria|jenny|sonia|libby|maisie|emma|ava|michelle|natasha|clara|hollie|abbi|bella|samantha|serena|kate|karen|moira|tessa|martha|stephanie|denise|elvira|svetlana|dariya|amelie|monica|paulina|google uk english female|google us english|\bfemale\b)/i;
function narrator(){ try { return localStorage.getItem(NARR_KEY) === "female" ? "female" : "male"; } catch(e){ return "male"; } }
function setNarrator(g){ try { localStorage.setItem(NARR_KEY, g === "female" ? "female" : "male"); } catch(e){} narrVoices = {}; }
let narrVoices = {};
try { speechSynthesis.addEventListener("voiceschanged", () => { narrVoices = {}; }); } catch(e){}
function narrVoice(code){
  const g = narrator(), key = code + "|" + g;
  try { if (narrVoices[key] !== undefined) return narrVoices[key];
    const want = VOICE[code] || "en-GB", base = want.slice(0, 2), vs = speechSynthesis.getVoices();
    const score = v => { const l = String(v.lang || "").replace("_", "-"), nm = String(v.name || ""); let n = l === want ? 20 : l.slice(0, 2) === base ? 12 : -999;
      if (/natural|neural/i.test(nm)) n += 60; else if (/online/i.test(nm)) n += 40;
      if (/premium|enhanced|siri/i.test(nm)) n += 45;
      if (/^google/i.test(nm)) n += 25;
      if ((g === "male" ? MALE : FEMALE).test(nm)) n += 30; else if ((g === "male" ? FEMALE : MALE).test(nm)) n -= 10;
      if (/espeak|robot|compact|novelty|whisper|bad news|bells|zarvox|trinoids|albert|bahh|boing|bubbles|cellos|deranged|hysterical|organ|superstar|jester|wobble|junior|ralph|kathy|grandma|grandpa|eddy|flo|reed|rocko|sandy|shelley/i.test(nm)) n -= 80;
      if (!v.localService) n += 4;
      return n; };
    const best = vs.map(v => [score(v), v]).filter(x => x[0] > 0).sort((a, b) => b[0] - a[0])[0];
    return (narrVoices[key] = best ? best[1] : null); } catch(e){ return null; }
}
let narrTok = 0;
function stopNarrating(){ narrTok++; try { speechSynthesis.cancel(); } catch(e){} }
/* narrate(text, {onend}) → true if speaking. Translates first when another language is chosen. */
function narrate(text, opts){
  opts = opts || {};
  if (!canSpeak() || !String(text || "").trim()){ opts.onend && opts.onend(); return false; }
  stopReading(); const my = ++narrTok;
  const code = getLang();
  const go = tt => {
    if (my !== narrTok) return;
    const v = narrVoice(code), natural = /natural|neural|online|premium|enhanced|siri|^google/i.test(v ? v.name : "");
    const list = []; chunksOf(humanise(tt)).forEach(c => (c.match(/[^.!?]+[.!?]*\s*/g) || [c]).forEach(x => { if (x.trim()) list.push(x.trim()); }));
    let i = 0;
    const next = () => { if (my !== narrTok) return; if (i >= list.length){ opts.onend && opts.onend(); return; }
      const t = list[i++], u = new SpeechSynthesisUtterance(t); u.lang = VOICE[code] || "en-GB"; if (v) u.voice = v;
      u.rate = (natural ? 0.97 : 0.92) * (opts.rate || 1); u.pitch = natural ? 1 : (narrator() === "male" ? 0.92 : 1.02); u.volume = 1;
      const pause = /[?!]$/.test(t) ? 420 : /[.]$/.test(t) ? 360 : 200;   // a breath between sentences, like a person talking
      let done = false; const fin = () => { if (!done){ done = true; setTimeout(next, pause); } }; u.onend = fin; u.onerror = fin; setTimeout(fin, Math.max(7000, t.length * 130));
      speechSynthesis.speak(u); };
    next();
  };
  if (code === "en") go(text); else translateText(humanise(text), code).catch(() => text).then(go);
  return true;
}
/* Speak in the chosen language: the text is translated first (not just read in English with a foreign voice).
   Uses Google's translation service directly, so it works even if the page itself hasn't finished translating. */
const TCACHE = new Map();
async function translateText(text, code){
  if (code === "en" || !text.trim()) return text;
  const parts = String(text).replace(/\s+/g, " ").match(/[^.!?]+[.!?]*\s*/g) || [text], batches = []; let cur = "";
  parts.forEach(p => { if ((cur + p).length > 1200 && cur){ batches.push(cur); cur = ""; } cur += p; }); if (cur) batches.push(cur);
  const out = [];
  for (const q of batches){
    const key = code + "|" + q;
    if (!TCACHE.has(key)){
      const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${code}&dt=t&q=${encodeURIComponent(q)}`);
      if (!r.ok) throw new Error("translate");
      const j = await r.json(); TCACHE.set(key, ((j && j[0]) || []).map(x => x && x[0] || "").join(""));
    }
    out.push(TCACHE.get(key));
  }
  return out.join(" ");
}
function readEl(el, b){
  if (b && b.getAttribute("aria-pressed") === "true"){ stopReading(); return; }
  try { if (typeof window.SDC_beforeRead === "function") window.SDC_beforeRead(); } catch(e){}
  stopReading();
  const h = el.previousElementSibling, head = h && /^H[1-4]$/.test(h.tagName) && !h.querySelector(".sdcListen") ? textOf(h).trim() : "";
  const t = (head ? head + ". " : "") + textOf(el); if (!t.trim()) return;
  readBtn = b; setBtn(b, true);
  const my = readTok, code = getLang(), done = () => { setBtn(b, false); if (readBtn === b) readBtn = null; };
  translateText(humanise(t), code).catch(() => t).then(tt => { if (my !== readTok) return; if (!speak(tt, done)) done(); });
}
const STOP_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor"/></svg>';
const SPEAKER = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
function listenButton(inButton){
  // inside a clickable card the speaker is a span, so it never opens the card
  const b = document.createElement(inButton ? "span" : "button"); if (!inButton) b.type = "button"; else { b.setAttribute("role", "button"); b.tabIndex = 0; }
  b.className = "sdcListen notranslate"; b.setAttribute("translate", "no"); b.setAttribute("aria-pressed", "false"); b.setAttribute("aria-label", "Read this aloud"); b.title = "Read this aloud";
  b.innerHTML = SPEAKER; return b;
}
let LISTEN_SEL = null, LISTEN_FINE = "", LISTEN_WHOLE = false;
let scanning = false;
function addListen(root){
  if (!LISTEN_SEL || !canSpeak() || scanning) return;
  scanning = true;
  try {
    const els = new Map();   // element -> fine (allowed inside a section that already reads itself, e.g. one question of a task)
    const add = (list, fine) => String(list || "").split(",").map(x => x.trim()).filter(Boolean).forEach(sel => { try { root.querySelectorAll(sel).forEach(e => { if (!els.has(e) || fine) els.set(e, fine); }); } catch(e){} });   // one bad selector never stops the rest
    add(LISTEN_SEL, false); add(LISTEN_FINE, true);
    const matches = el => String(LISTEN_SEL || "").split(",").some(x => { try { return x.trim() && el.matches(x.trim()); } catch(e){ return false; } });
    document.querySelectorAll(".sdcPageBar").forEach(bar => { const t = bar.nextElementSibling; if (!t || !matches(t)){ if (readBtn && bar.contains(readBtn)) stopReading(); bar.remove(); } });
    document.querySelectorAll(".sdcListen.sdcPage").forEach(b => { if (b.closest(".sdcPageBar")) return; const t = b.parentElement; if (t && !matches(t)){ if (readBtn === b) stopReading(); b.remove(); } });
    els.forEach((fine, el) => {
      if (el.closest("#sdcStrip,.sdcTmp,pre,code,textarea") || el.querySelector(":scope > .sdcListen") || el.querySelector(":scope > .listen")) return;
      if (el.previousElementSibling && el.previousElementSibling.classList.contains("sdcPageBar")) return;
      if (!LISTEN_WHOLE && (el.hasAttribute("data-read") || el.querySelector("[data-read]"))) return;   // the Design course reads these sections with its own speaker
      if (!LISTEN_WHOLE && !fine && el.closest("[data-read]")) return;
      if (String(el.textContent || "").replace(/\s+/g, " ").trim().length < (fine ? 12 : 25)) return;
      const inBtn = el.tagName === "BUTTON" || !!el.closest("button"), b = listenButton(inBtn);
      if (LISTEN_WHOLE){ b.classList.add("sdcPage"); b.dataset.label = "Read this page to me"; b.innerHTML = SPEAKER + '<span class="sdcLt">Read to me</span>'; }
      const go = e => { e.stopPropagation(); e.preventDefault(); readEl(el, b); };
      b.addEventListener("click", go); b.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") go(e); });
      if (LISTEN_WHOLE === "bar"){   // a page button sits in its own row just above the page content, so it never squeezes the layout
        const bar = document.createElement("div"); bar.className = "sdcPageBar notranslate"; bar.setAttribute("translate", "no"); bar.appendChild(b);
        if (el.parentNode) el.parentNode.insertBefore(bar, el); return; }
      el.prepend(b);
    });
  } finally { scanning = false; }
}
/* sels: CSS selectors of text sections that get their own Listen button */
/* whole = true: one speaker per page (the selectors name each page's main content) */
function listen(sels, fine, whole){
  LISTEN_SEL = sels; LISTEN_FINE = fine || ""; LISTEN_WHOLE = whole === "bar" ? "bar" : !!whole;
  const css = document.createElement("style");
  css.textContent = ".sdcListen{float:right;margin:0 0 6px 10px;display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;padding:0;border:1px solid rgba(27,45,78,.25);background:#E9EDF5;color:#1B2D4E;border-radius:50%;cursor:pointer;line-height:1;position:relative;z-index:2;flex:none}.sdcPageBar{display:flex;justify-content:flex-end;margin:0 0 8px}.sdcPageBar .sdcListen{float:none;margin:0}.sdcListen.sdcPage{width:auto;height:36px;padding:0 14px 0 12px;border-radius:999px;gap:7px;font:800 13.5px Arial,Helvetica,sans-serif;background:#1B2D4E;color:#fff;border-color:#1B2D4E}.sdcListen.sdcPage .sdcLt{display:inline}.sdcListen:hover{background:#1B2D4E;color:#fff}.sdcListen[aria-pressed=true]{background:#DC2B3E;border-color:#DC2B3E;color:#fff;animation:sdcPulse 1.2s ease-in-out infinite}@keyframes sdcPulse{50%{box-shadow:0 0 0 6px rgba(220,43,62,.18)}}.sdcListen:focus-visible{outline:3px solid #DC2B3E;outline-offset:2px}.sdcListen[aria-pressed=true]{background:#DC2B3E;border-color:#DC2B3E;color:#fff}@media (prefers-color-scheme: dark){.sdcListen{background:#1D2A47;color:#E7ECF6;border-color:#2A3858}}";
  document.head.appendChild(css);
  const ours = n => n.nodeType !== 1 || (n.classList && (n.classList.contains("sdcTmp") || n.classList.contains("sdcListen") || n.classList.contains("sdcPageBar")));
  const run = () => { addListen(document); let t = null;
    new MutationObserver(ms => { if (scanning || ms.every(m => [...m.addedNodes, ...m.removedNodes].every(ours))) return;   // ignore our own changes
      clearTimeout(t); t = setTimeout(() => addListen(document), 250); }).observe(document.body, { childList:true, subtree:true }); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
  window.addEventListener("pagehide", stopReading);
}

/* ---------- the strip at the top of each course page ---------- */
/* the platform bar at the top of a course page:
   [Change course ▾] lists the student's other courses (CS any grade, Design Grades 6–10, IT Grade 10),
   [Sign out] signs out and stays on the course's sign-in screen; it then reads [Sign in].
   onSignOut() must sign the student out WITHOUT leaving the page; onSignIn() shows the sign-in form. */
let STRIP = null;
/* the other course a signed-in student can switch to straight away: only Computer Science students (Design, Grades 6–10) */
function courseChoices(cur){
  const g0 = gate() || {}, L = g0.link;
  if (STRIP && STRIP.signedIn && G10_PAIR.indexOf(cur) >= 0){   // Grade 10: Design ⇄ IT with the same login
    const ac = g0.acct || {}, other = cur === "design" ? "it" : "design";
    if (isTester(ac.email) || g10Pair(cur, other, ac.grade)) return [other].concat(L && L.cs ? ["cs"] : []);
  }
  if (!STRIP || !STRIP.signedIn || !L || !L.cs) return [];
  const n = parseInt(String(L.cs.grade || (g0.acct || {}).grade || "").replace(/^G/i, ""), 10);
  const sp = studyPlusOK(g0.acct || g0.who || L.cs);
  return ["cs", "design"].filter(k => k !== cur && (k === "cs" || (!!L.design && (sp || (!isNaN(n) && n >= 6 && n <= 10)))));
}
function paintStrip(){
  if (!STRIP) return;
  const sel = document.getElementById("sdcCourse"), b = document.getElementById("sdcLeave");
  if (b) b.textContent = STRIP.signedIn ? "Sign out" : "Sign in";
  if (sel){ const opts = courseChoices(STRIP.c);
    sel.innerHTML = STRIP.signedIn ? `<option value="">Change course ▾</option>` + opts.map(k => `<option value="${k}">Switch to ${esc(COURSES[k].name)}</option>`).join("")
      : `<option value="">Change course ▾</option>` + Object.keys(COURSES).filter(k => k !== STRIP.c).map(k => `<option value="${k}">Sign in to ${esc(COURSES[k].name)}</option>`).join("") + `<option value="__portal">＋ Sign up for a course</option>`;
    const g1 = gate() || {}, sp = STRIP.signedIn && studyPlusOK(g1.acct || g1.who || (g1.link && g1.link.cs));
    if (sp) sel.innerHTML += `<option value="__study">✦ Other subjects (Study Plus)</option>`;
    sel.value = ""; sel.style.display = STRIP.signedIn && !opts.length && !sp ? "none" : ""; }
}
function setSignedIn(on){ if (STRIP){ STRIP.signedIn = !!on; paintStrip(); } }
function strip(c, onSignOut, noLang, mainSel, onSignIn){
  if (document.getElementById("sdcStrip")) return;
  const C = course(c); if (!C) return;
  const d = document.createElement("div"); d.id = "sdcStrip";
  d.setAttribute("style", "background:#0f1c33;color:#fff;font:600 13px/1.3 Arial,Helvetica,sans-serif;padding:6px 14px;display:flex;gap:8px 10px;align-items:center;flex-wrap:wrap;position:fixed;top:0;left:0;right:0;z-index:2147483000;box-shadow:0 1px 4px rgba(0,0,0,.25)");
  d.innerHTML = `<style>@media(max-width:560px){#sdcStrip .sdcHide{display:none}}</style><span style="background:#DC2B3E;border-radius:5px;padding:2px 7px;font-weight:900;letter-spacing:.04em">SISD</span><span class="sdcHide">Design and Computing</span><span class="sdcHide" style="opacity:.6">·</span><span>You are in: <b>${esc(C.name)}</b></span>
    <span style="margin-left:auto;display:inline-flex;gap:8px;align-items:center;flex-wrap:wrap"><span id="sdcSave" role="status" aria-live="polite" style="display:none"></span>${noLang ? "" : langPicker(true)}</span><select id="sdcCourse" aria-label="Change course" title="Go to another of your courses" style="background:#0f1c33;border:1px solid rgba(255,255,255,.35);color:#fff;border-radius:999px;padding:3px 8px;font:inherit;cursor:pointer;max-width:200px"></select><button type="button" id="sdcLeave" style="background:#DC2B3E;border:1px solid #DC2B3E;color:#fff;border-radius:999px;padding:3px 12px;font:inherit;font-weight:800;cursor:pointer">Sign out</button>`;
  document.body.insertBefore(d, document.body.firstChild); bindPickers(); setTimeout(showFeedbackButton, 1500);
  const rp = document.getElementById("sdcReadPage");
  if (rp) rp.onclick = () => { const m = [...document.querySelectorAll(mainSel || "main, #app")].find(e => e.offsetParent !== null) || document.body; readEl(m, rp); };
  // the strip stays fixed at the top of every page: push the page (and its own sticky header) down by its height
  const css = document.createElement("style"); document.head.appendChild(css);
  const sticky = [...document.querySelectorAll("body *")].filter(e => e !== d && !d.contains(e) && /sticky|fixed/.test(getComputedStyle(e).position) && getComputedStyle(e).top === "0px" && e.getBoundingClientRect().height < 220);
  sticky.forEach(e => e.classList.add("sdc-under"));
  const fit = () => { const h = Math.ceil(d.getBoundingClientRect().height); css.textContent = `body{padding-top:${h}px!important}.sdc-under{top:${h}px!important}html{scroll-padding-top:${h + 70}px}`; };
  fit(); try { new ResizeObserver(fit).observe(d); } catch(e){ window.addEventListener("resize", fit); }
  STRIP = { c, signedIn:false, onSignOut, onSignIn };
  paintStrip();
  document.getElementById("sdcLeave").onclick = () => {
    if (STRIP.signedIn){ patchGate({ link:null }); if (onSignOut) onSignOut(false); else leave("out"); return; }   // a real sign-out ends the link between courses
    if (onSignIn) onSignIn(); else { patchGate({ mode:"signin" }); location.reload(); }
  };
  document.getElementById("sdcCourse").onchange = e => {
    const to = e.target.value; if (!to) return;
    const link = (gate() || {}).link || null, was = STRIP.signedIn;
    if (was && course(to) && COURSES[to].app === COURSES[STRIP.c].app && G10_PAIR.indexOf(to) >= 0 && G10_PAIR.indexOf(STRIP.c) >= 0){   // Grade 10 Design ⇄ IT: same site, same login, no new sign-in
      try { if (window.SDC_beforeSwitch) window.SDC_beforeSwitch(to); } catch(x){}   // the course page saves (and sends) the work first, staying signed in
      const g2 = gate() || {}, ac = Object.assign({}, g2.acct || {}, { course:to });
      try { log("switchcourse", ac, { from:STRIP.c, to }); } catch(x){}
      setGate(Object.assign({}, g2, { course:to, mode:"signin", acct:ac, sw:{ from:STRIP.c, at:Date.now() } })); location.href = COURSES[to].app; return;
    }
    if (was && onSignOut){ try { onSignOut(true); } catch(x){} }   // save this course first (the link to the other course is kept)
    if (to === "__portal"){ leave(""); return; }
    if (to === "__study"){ location.href = PORTAL + "study.html"; return; }
    setGate({ mode: link && was ? "link" : "signin", course:to, link: was ? link : null }); location.href = COURSES[to].app;
  };
}
function signedOutNotice(msg, kind){ try { sessionStorage.setItem("sdc_msg", JSON.stringify({ msg, kind: kind || "bad" })); } catch(e){} }

/* ---------- 3D sign-in buttons on every page: they press down when clicked and stay down (with a spinner) while working ---------- */
(function press3d(){
  const SEL = "#loginBtn,#signBtn,#lGo,#inGo,#upGo,#pwGo,#kGo";
  function css(){ if (document.getElementById("sdc3d")) return; const st = document.createElement("style"); st.id = "sdc3d";
    const L = SEL.split(","), all = (sfx) => L.map(x => x + sfx).join(",");
    st.textContent = `${all("")}{position:relative;box-shadow:0 6px 0 #0b1628,0 8px 14px rgba(0,0,0,.18)!important;transform:translateY(0);transition:transform .07s ease,box-shadow .07s ease,filter .15s;border-bottom:none}
${all(":hover:not(:disabled)")}{filter:brightness(1.08)}
${all(":active:not(:disabled)")},${all(".sdc-pressed")}{transform:translateY(6px)!important;box-shadow:0 0 0 #0b1628,0 2px 4px rgba(0,0,0,.2)!important}
${all(".sdc-pressed:disabled")}{opacity:1!important}
${all(".sdc-busy::after")}{content:"";width:16px;height:16px;border:3px solid rgba(255,255,255,.45);border-top-color:#fff;border-radius:50%;margin-left:10px;animation:sdcspin .7s linear infinite;display:inline-block;vertical-align:-3px}
@keyframes sdcspin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){${all("")}{transition:none}${all(".sdc-busy::after")}{animation:none}}`;
    (document.head || document.documentElement).appendChild(st); }
  function press(b){ if (!b || b.disabled) return; b.classList.add("sdc-pressed"); b.dataset.sdcGo = "1"; const t0 = Date.now();
    const tick = () => { const busy = b.disabled || b.classList.contains("busy"); b.classList.toggle("sdc-busy", busy && !b.classList.contains("busy"));
      if ((busy || Date.now() - t0 < 250) && Date.now() - t0 < 30000) return setTimeout(tick, 120); b.classList.remove("sdc-pressed", "sdc-busy"); delete b.dataset.sdcGo; };
    setTimeout(tick, 60); }
  css(); document.addEventListener("DOMContentLoaded", css);
  document.addEventListener("pointerdown", e => { const b = e.target && e.target.closest && e.target.closest(SEL); if (!b || b.disabled) return; b.classList.add("sdc-pressed"); b.dataset.sdcAt = Date.now();
    setTimeout(() => { if (!b.dataset.sdcGo && !b.disabled && !b.classList.contains("busy")) b.classList.remove("sdc-pressed"); }, 700); }, true);
  document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest(SEL); if (b) press(b); }, true);
  document.addEventListener("keydown", e => { if (e.key === "Enter"){ const f = e.target && e.target.closest && e.target.closest("form"), b = f && f.querySelector(SEL); if (b) press(b); } }, true);
})();
/* ---------- Live view and "Need help" ----------
   While a student works, their page sends a short locked note every so often (only when they have typed or answered
   something since the last one): which task they're on, the box they're typing in and what's in it. Only the staff
   dashboard can open it (the same key as password resets). A "Need help" button on every task lets the student ask
   their teacher for help; the teacher sees a pop-up with the student's name, the task and what they need, and can
   answer "On my way" or "Helped", which the student sees on their screen. */
const live = (() => {
  const EVERY = 40000, BEAT = 180000, IDLE_BEAT = 600000, HELP_KEY = "sdc_help";
  let where = "", field = null, sentAt = 0, sentSig = "", first = false;
  const student = () => { const g = gate(); return g && g.acct && g.acct.name && g.acct.name !== "(admin)" && /python-pathways|myp-design-curriculum-pathways/.test(location.pathname) && !/admin\.html/.test(location.pathname) ? g : null; };
  const textOk = el => !!el && (el.isContentEditable || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || (el.tagName === "INPUT" && /^(text|search|url|number|email|)$/i.test(el.getAttribute("type") || ""))) && !(el.closest && el.closest(".sdcHelpBox"));
  document.addEventListener("focusin", e => { if (textOk(e.target)) field = e.target; }, true);
  window.addEventListener("input", e => { if (textOk(e.target)) field = e.target; }, true);
  const tx = n => String((n && (n.innerText || n.textContent)) || "").replace(/\s+/g, " ").trim();
  const shown = el => !!el && el.isConnected && !!(el.offsetParent || (el.getClientRects && el.getClientRects().length));
  function labelOf(el){
    if (!el) return "";
    try { if (el.id){ const l = document.querySelector('label[for="' + CSS.escape(el.id) + '"]'); if (l && tx(l)) return tx(l).slice(0, 200); } } catch(e){}
    const ed = el.closest(".ed-wrap"); if (ed){ const h = ed.querySelector(".ed-head span"); if (h) return tx(h).slice(0, 200); }
    const al = el.getAttribute("aria-label"); if (al) return al.slice(0, 200);
    const td = el.closest("td");
    if (td){ const tr = td.parentElement, tb = td.closest("table"), i = [...tr.children].indexOf(td), th = tb && tb.querySelector("tr th:nth-child(" + (i + 1) + ")"), lab = tb && labelOf(tb);
      return ((lab ? lab + " · " : "") + "row " + ([...tb.querySelectorAll("tr")].indexOf(tr)) + (th && tx(th) ? ", " + tx(th) : "")).slice(0, 200); }
    let n = el;
    for (let i = 0; i < 6 && n; i++){ n = n.parentElement; if (!n) break;
      const l = [...n.children].find(c => !c.contains(el) && /^(LABEL|H2|H3|H4|H5|B|STRONG|LEGEND)$/.test(c.tagName) && tx(c)) || n.querySelector(":scope > .lbl, :scope > .q, :scope > .label, :scope > .flab");
      if (l && !l.contains(el) && tx(l)) return tx(l).slice(0, 200); }
    return String(el.placeholder || "").slice(0, 200);
  }
  const valOf = el => el.isContentEditable ? String(el.innerText || "") : el.tagName === "SELECT" ? tx(el.options[el.selectedIndex]) : String(el.value || "");
  const isCode = el => !!(el.closest(".ed-wrap") || /mono|consolas|courier/i.test(getComputedStyle(el).fontFamily || ""));
  function whereNow(){
    const s = slow._state(); if (s && s.label) return s.label;
    if (where) return where;
    const h = [...document.querySelectorAll("main h1, main h2, h1, h2")].find(x => shown(x) && tx(x)); return h ? tx(h).slice(0, 160) : document.title;
  }
  function snapshot(g){
    const a = g.acct, w = work() || { ms:0, chars:0 }, f = field && field.isConnected && shown(field) ? field : null, cut = (s, n) => s.length > n ? "…" + s.slice(-n) : s;
    const more = [...document.querySelectorAll("textarea, input[type=text], input:not([type]), [contenteditable=true]")]
      .filter(el => el !== f && textOk(el) && shown(el) && valOf(el).trim()).slice(0, 12).map(el => ({ l: labelOf(el), v: cut(valOf(el).trim(), 500), code: isCode(el) || undefined }));
    return { k: keyOf(a.email, a.name), n: a.name, e: a.email || "", c: g.course || a.course || "", g: a.grade || "", t: a.teacher || "", cls: a.cls || "", at: Date.now(), act: lastAct,
      w: whereNow(), fl: f ? labelOf(f) : "", fv: f ? cut(valOf(f), 4000) : "", code: f ? isCode(f) || undefined : undefined, more, mins: Math.floor((w.ms || 0) / 60000), ch: w.chars || 0 };
  }
  const canSend = () => !offline() && window.PPSync && PPSync.sealForStaff;
  async function post(kind, p){
    const id = await idOf(p.e, p.n), text = await PPSync.sealForStaff(p);
    if (kind === "V"){ const q = getQ().filter((it, i) => !(i > 0 && String(Object.values(it.f || {})[0] || "").startsWith("PPS2|V|"))); setQ(q); }   // an older unsent live note is out of date: drop it
    enqueue(SYNC.action, { [SYNC.entry]: ["PPS2", kind, String(p.at), id, 0, 1, text].join("|") });
  }
  async function send(force){
    const g = student(); if (!g || !canSend()) return;
    if (!force && document.hidden) return;
    const now = Date.now(), engaged = now - lastAct < IDLE_MS, p = snapshot(g), sig = JSON.stringify([p.w, p.fl, p.fv, p.more]);
    if (!force && !( !first || (engaged && sig !== sentSig && now - sentAt >= EVERY) || (engaged && now - sentAt >= BEAT) || now - sentAt >= IDLE_BEAT )) return;
    first = true; sentAt = now; sentSig = sig;
    try { await post("V", p); } catch(e){}
  }
  setInterval(() => send(false), 10000); setTimeout(() => send(false), 4000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(() => send(false), 1500); });

  /* ---- Need help ---- */
  const getHelp = () => { try { const h = JSON.parse(sessionStorage.getItem(HELP_KEY) || "null"); return h && Date.now() - h.at < 90 * 60000 ? h : null; } catch(e){ return null; } };
  const setHelp = h => { try { h ? sessionStorage.setItem(HELP_KEY, JSON.stringify(h)) : sessionStorage.removeItem(HELP_KEY); } catch(e){} paintChip(); };
  const KINDS = [["task", "I don't understand what the task is asking"], ["stuck", "I'm stuck on my answer"], ["check", "Please check my work"], ["tech", "Something isn't working on the page"], ["other", "Something else"]];
  function css(){
    if (document.getElementById("sdcHelpCss")) return;
    const s = document.createElement("style"); s.id = "sdcHelpCss";
    s.textContent = `.sdcHelpTab{position:fixed;right:0;top:46%;z-index:2147483000;background:#E0A100;color:#1B2D4E;border:0;border-radius:12px 0 0 12px;padding:10px 14px 10px 12px;font:800 15px/1.2 Arial,Helvetica,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.25);cursor:pointer;width:210px;text-align:left;display:flex;gap:10px;align-items:center;transform:translateX(calc(100% - 44px));transition:transform .28s ease}
.sdcHelpTab:hover,.sdcHelpTab:focus-visible,.sdcHelpTab.open{transform:translateX(0)}
.sdcHelpTab .ic{font-size:20px;flex:none;width:22px;text-align:center}.sdcHelpTab .tx{flex:1;min-width:0}
.sdcHelpTab.wait,.sdcHelpTab.come{transform:translateX(0)}
.sdcHelpTab.wait{background:#1B2D4E;color:#fff}.sdcHelpTab.come{background:#1E8A55;color:#fff}.sdcHelpTab small{display:block;font-weight:600;font-size:12px;margin-top:3px;opacity:.9}
.sdcHelpBtn{display:none!important}
.sdcHelpBtn{display:inline-flex;align-self:flex-start;width:auto;max-width:max-content;align-items:center;gap:6px;background:#FFF4D6;color:#5A3D00;border:2px solid #E0A100;border-radius:999px;padding:6px 14px;font:700 14px/1.2 Arial,Helvetica,sans-serif;cursor:pointer;margin:6px 0}
.sdcHelpBtn:hover{background:#FFE8A3}
.sdcHelpBox{position:fixed;inset:0;background:rgba(14,26,48,.6);z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;font:16px/1.5 Arial,Helvetica,sans-serif}
.sdcHelpBox .in{background:#fff;color:#16223A;border-radius:16px;max-width:480px;width:100%;padding:20px 22px;border-top:8px solid #E0A100;box-shadow:0 10px 40px rgba(0,0,0,.3);max-height:92vh;overflow:auto}
.sdcHelpBox label.k{display:flex;gap:10px;align-items:flex-start;border:2px solid #DCE2EE;border-radius:10px;padding:8px 10px;margin:6px 0;cursor:pointer}
.sdcHelpBox label.k:has(input:checked){border-color:#E0A100;background:#FFF8E5}
.sdcHelpBox textarea{width:100%;box-sizing:border-box;min-height:70px;border:2px solid #DCE2EE;border-radius:10px;padding:8px;font:inherit;margin-top:6px;color:#16223A;background:#fff}
.sdcHelpBox .b{border:0;border-radius:10px;padding:10px 16px;font:700 15px Arial,Helvetica,sans-serif;cursor:pointer}
@media print{.sdcHelpTab,.sdcHelpBtn{display:none!important}}`;
    document.head.appendChild(s);
  }
  function ask(task){
    const g = student(); if (!g) return;
    css(); document.querySelectorAll(".sdcHelpBox").forEach(x => x.remove());
    const on = task || whereNow(), bg = document.createElement("div"); bg.className = "sdcHelpBox notranslate-auto";
    bg.innerHTML = `<div class="in" role="dialog" aria-label="Ask your teacher for help"><div style="font-size:2rem">🙋</div><h2 style="margin:4px 0 4px">Ask ${esc(g.acct.teacher || "your teacher")} for help</h2>
      <p style="margin:0 0 8px;color:#4A5568;font-size:14px">Task: <b>${esc(on)}</b></p><div style="font-weight:700;margin-top:6px">What do you need?</div>
      ${KINDS.map((k, i) => `<label class="k"><input type="radio" name="sdcHk" value="${k[0]}"${i ? "" : " checked"} style="margin-top:4px"><span>${esc(k[1])}</span></label>`).join("")}
      <div style="font-weight:700;margin-top:10px">Tell your teacher more <span style="font-weight:400;color:#6B7486">(optional)</span></div><textarea id="sdcHm" maxlength="500" placeholder="For example: I don't know how to start question 2"></textarea>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap"><button type="button" class="b" id="sdcHgo" style="background:#E0A100;color:#1B2D4E">🙋 Send to my teacher</button><button type="button" class="b" id="sdcHx" style="background:#EEF0F4;color:#1B2D4E">Cancel</button></div></div>`;
    document.body.appendChild(bg);
    bg.querySelector("#sdcHx").onclick = () => bg.remove();
    bg.querySelector("#sdcHgo").onclick = async () => {
      const kind = (bg.querySelector("input[name=sdcHk]:checked") || {}).value || "other", msg = bg.querySelector("#sdcHm").value.trim().slice(0, 500);
      const p = Object.assign(snapshot(g), { w: on, kind, kt: (KINDS.find(k => k[0] === kind) || KINDS[4])[1], msg });
      bg.querySelector("#sdcHgo").disabled = true;
      try { await post("H", p); } catch(e){}
      log("helpask", Object.assign({ course: g.course }, g.acct), { task:{ t:String(on).slice(0, 120) }, kind, ver:p.at });
      setHelp({ ver:p.at, at:Date.now(), on, st:"wait" }); send(true);
      bg.querySelector(".in").innerHTML = `<div style="font-size:2rem">✅</div><h2 style="margin:4px 0 8px">Your teacher has been told</h2><p style="margin:0">${esc(g.acct.teacher || "Your teacher")} can see you need help with <b>${esc(on)}</b>. Keep trying while you wait: read the task again and look back at the example.</p><button type="button" class="b" style="margin-top:14px;background:#1B2D4E;color:#fff">OK</button>`;
      bg.querySelector("button").onclick = () => bg.remove();
    };
  }
  function cancel(){ const h = getHelp(), g = student(); if (h && g) idOf(g.acct.email, g.acct.name).then(id => sendRow("K", id, [h.ver, "cancel", g.acct.name].join("|"))).catch(() => {}); setHelp(null); }
  function paintChip(){
    const g = student(); let b = document.getElementById("sdcHelpTab");
    if (!g || !document.body){ if (b) b.remove(); return; }
    css(); if (!b){ b = document.createElement("button"); b.type = "button"; b.id = "sdcHelpTab"; b.className = "sdcHelpTab notranslate-auto"; document.body.appendChild(b); }
    const h = getHelp();
    const set = (cls, html) => { const open = b.classList.contains("open"); if (b.dataset.h !== cls + html){ b.dataset.h = cls + html; b.innerHTML = html; } b.className = "sdcHelpTab " + cls + (open ? " open" : ""); };
    if (!h){ set("", `<span class="ic">🙋</span><span class="tx">Need help?<small>Ask your teacher</small></span>`); b.title = "Ask your teacher for help with this task"; b.setAttribute("aria-label", "Need help? Ask your teacher");
      b.onclick = () => { if (matchMedia("(hover: none)").matches && !b.classList.contains("open")){ b.classList.add("open"); clearTimeout(b._t); b._t = setTimeout(() => b.classList.remove("open"), 4000); return; } b.classList.remove("open"); ask(); }; return; }   // touch screens: the first tap slides it out, the second asks
    if (h.st === "coming") set("come", `<span class="ic">🏃</span><span class="tx">${esc(h.by || "Your teacher")} is coming<small>to help you. Press to cancel</small></span>`);
    else if (h.st === "done") set("come", `<span class="ic">✅</span><span class="tx">Helped<small>Press to ask again</small></span>`);
    else set("wait", `<span class="ic">🙋</span><span class="tx">Help asked<small>Waiting for your teacher. Press to cancel</small></span>`);
    b.onclick = () => { if (getHelp() && getHelp().st === "done"){ setHelp(null); ask(); return; } if (window.confirm("Cancel your request for help?")) cancel(); };
  }
  async function poll(){
    const h = getHelp(), g = student(); if (!h || !g || h.st === "done" || offline()) return;
    try { const id = await idOf(g.acct.email, g.acct.name), list = await rows("K", id, 10);
      for (const r of list){ const [ver, st, by] = String(r.text).split("|"); if (+ver !== +h.ver) continue;
        if (st === "cancel"){ setHelp(null); return; }
        if (st !== h.st){ setHelp(Object.assign({}, h, { st, by })); if (st === "done") setTimeout(() => { const x = getHelp(); if (x && x.st === "done") setHelp(null); }, 20000); }
        return; } } catch(e){}
  }
  setInterval(poll, 20000); setInterval(paintChip, 5000);
  if (document.body) setTimeout(paintChip, 1500); else document.addEventListener("DOMContentLoaded", () => setTimeout(paintChip, 1500));
  /* an inline "Need help with this task?" button for a course page to put on each task */
  /* 25 Nov 2026: help is only the sliding tab on the right-hand side. These no longer put a button on the page: they
     just tell the tab which task the student is on (the course pages still call them). */
  function button(task){ css(); if (task) where = String(task).slice(0, 160); const b = document.createElement("span"); b.className = "sdcHelpBtn"; b.hidden = true; return b; }
  const buttonHtml = task => { css(); if (task) where = String(task).slice(0, 160); return `<span class="sdcHelpBtn" hidden></span>`; };
  document.addEventListener("click", e => { const b = e.target && e.target.closest && e.target.closest("[data-sdc-help]"); if (b){ e.preventDefault(); ask(b.dataset.sdcHelp || ""); } });

  /* ---- staff dashboard: reading the notes back ---- */
  async function recent(kind, since, limit){
    const out = [], seen = new Set();
    for (const c of await column()){
      let r; try { r = await gviz(`select ${c.col} where ${c.col} starts with 'PPS2|${kind}|' and ${c.col} > 'PPS2|${kind}|${Math.floor(since)}' order by ${c.time} desc limit ${limit || 400}`, c.sheet, c.src); } catch(e){ if (!c.sheet && c.src === SYNC) throw e; continue; }
      ((r.table && r.table.rows) || []).forEach(row => { const v = String(((row.c || [])[0] || {}).v || ""); if (seen.has(v)) return; seen.add(v);
        const p = v.split("|"); if (p.length >= 7 && /^\d{13}$/.test(p[2])) out.push({ ver:+p[2], id:p[3], text:p.slice(6).join("|") }); });
    }
    return out.sort((a, b) => b.ver - a.ver);
  }
  async function one(kind, id, since){
    for (const c of await column()){
      let r; try { r = await gviz(`select ${c.col} where ${c.col} starts with 'PPS2|${kind}|' and ${c.col} > 'PPS2|${kind}|${Math.floor(since)}' and ${c.col} contains '|${id}|' order by ${c.time} desc limit 1`, c.sheet, c.src); } catch(e){ if (!c.sheet && c.src === SYNC) throw e; continue; }
      const v = String((((r.table && r.table.rows) || [])[0] || { c:[] }).c[0] ? r.table.rows[0].c[0].v : "");
      const p = v.split("|"); if (p.length >= 7) return { ver:+p[2], id:p[3], text:p.slice(6).join("|") };
    }
    return null;
  }
  async function acks(limit){
    const out = [];
    for (const c of await column()){
      let r; try { r = await gviz(`select ${c.col} where ${c.col} starts with 'PPS2|K|' order by ${c.time} desc limit ${limit || 400}`, c.sheet, c.src); } catch(e){ if (!c.sheet && c.src === SYNC) throw e; continue; }
      ((r.table && r.table.rows) || []).forEach(row => { const p = String(((row.c || [])[0] || {}).v || "").split("|"); if (p.length >= 9) out.push({ id:p[2], at:+p[3], ver:+p[6], st:p[7], by:p.slice(8).join("|") }); });
    }
    return out.sort((a, b) => b.at - a.at);
  }
  return { send, where: w => { where = String(w || "").slice(0, 160); }, ask, button, buttonHtml, recent, one, acks, _snap: () => { const g = student(); return g ? snapshot(g) : null; } };
})();
/* a teacher moved this student to another teacher or class (or changed their course settings) while their page is open:
   the page applies it within two minutes instead of waiting for the next sign-in */
const watch = (() => {
  let fn = null, busy = false;
  async function check(){
    const g = gate(); if (!fn || busy || !g || !g.acct || !g.acct.name || document.hidden || offline()) return;
    busy = true;
    try { const L = await lookup(g.acct.email || "", g.acct.name), A = L && L.assign;
      if (A && A.del && !isTester(g.acct.email) && !(createdMs(g.acct) > A.at)){   // deleted by the super admin while signed in: sign out now
        log("deletedsignin", Object.assign({}, g.acct, { course:g.course }), { open:true });
        try { if (window.SDC_forget) window.SDC_forget(g.acct); } catch(e){}
        signedOutNotice(MSG.deleted(), "bad"); setTimeout(() => leave("deleted"), 600); return; }
      if (!A || A.del || !A.at) return;
      const k = "sdc_asgseen|" + keyOf(g.acct.email, g.acct.name), seen = +(localStorage.getItem(k) || 0); if (A.at <= seen) return;
      localStorage.setItem(k, String(A.at));
      const newT = A.t && !sameTeacher(A.t, g.acct.teacher || ""), newC = A.cls && A.cls !== (g.acct.cls || "");
      try { fn(A); } catch(e){}
      if (newT || newC){ patchGate({ acct: Object.assign({}, g.acct, A.t ? { teacher:A.t } : {}, A.cls ? { cls:A.cls } : {}) });
        const n = document.createElement("div"); n.className = "notranslate-auto";
        n.style.cssText = "position:fixed;left:50%;top:70px;transform:translateX(-50%);z-index:2147483500;background:#1E8A55;color:#fff;padding:12px 18px;border-radius:12px;font:700 15px/1.4 Arial,Helvetica,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25);max-width:90vw;text-align:center";
        n.textContent = "Your teacher has updated your class: you're now with " + (A.t || g.acct.teacher || "your teacher") + (A.cls && newC ? ", class " + A.cls : "") + ". Your work is all still here.";
        document.body.appendChild(n); setTimeout(() => n.remove(), 9000); }
    } catch(e){} finally { busy = false; }
  }
  setInterval(check, 120000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) setTimeout(check, 2000); });
  return { on: f => { fn = f; setTimeout(check, 20000); }, check };
})();
return { jsonp, PORTAL, COURSES, g10Pair, studyPlusOK, studyPlusEmail, studyReport, STUDY_PLUS, course, courseLabel, gate, setGate, patchGate, clearGate, require, leave, ay, rolled, freshSwitches, confirm, canSignUp, isDeleted, isTester, testerPw, TESTERS, DELETED, lookup, register,
  log, task, strip, setSignedIn, signedOutNotice, VERIFY, verifyOn, isVerified, verifyStatuses, startVerify, notifyRequest, forgot, forgotDialog, resetDone, unlockRequest, unlockedAt, lockHelp, lockIds, emailCode, checkCode, usernameOf, isUsername, verifyMsg, verifyGate, sinceMs, work, WORK_GOAL_MIN, CONTROL, canon, verifyState, loadState, csvRows, surname, sameTeacher, teacherNames, hiddenTeacherNames, sendFeedback, getFeedback, showFeedbackButton, LANGS, getLang, setLang, langPicker, gloss, listen, stopReading, speak, slow, live, watchAssign: f => watch.on(f), rank, saveBadge, narrate, stopNarrating, narrator, setNarrator, idOf, keyOf, rows, sendRow, verify, flush, esc, offline, _internal:{ e64, d64, u8ToB64Text, b64ToText, SYNC, LOG } };
})();

/* ---------- Readable everywhere: light mode, dark mode, any screen ----------
   Watches every page that loads this file. When a piece of text (or a typing box) ends up too close
   in colour to the box behind it — e.g. light dark-mode text inside a box with a fixed light background —
   it switches that text to dark ink or light ink, whichever reads best. Re-checks whenever the page
   changes or the device switches between light and dark. Mark an element data-sdc-noink to leave it alone. */
(function(){
  "use strict";
  if (window.__sdcInk || !window.MutationObserver || !window.getComputedStyle) return; window.__sdcInk = true;
  const DARK_INK = "#16223A", LIGHT_INK = "#F2F5FB", MIN = 3.2;
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|OPTION|OPTGROUP|CANVAS|VIDEO|AUDIO|IMG|IFRAME|SVG|svg|BR|HR)$/;
  const parse = s => { const m = s && s.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[\s,\/]+/).filter(Boolean).map(parseFloat); return p.length < 3 ? null : { r:p[0], g:p[1], b:p[2], a: p.length > 3 ? p[3] : 1 }; };
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const lum = c => .2126 * lin(c.r) + .7152 * lin(c.g) + .0722 * lin(c.b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const over = (t, b) => ({ r: t.r * t.a + b.r * (1 - t.a), g: t.g * t.a + b.g * (1 - t.a), b: t.b * t.a + b.b * (1 - t.a), a:1 });
  const DK = parse("rgb(22,34,58)"), LT = parse("rgb(242,245,251)");
  let bgCache = new Map();
  function canvasBg(){
    const de = document.documentElement, b = document.body;
    const c1 = b && parse(getComputedStyle(b).backgroundColor), c2 = parse(getComputedStyle(de).backgroundColor);
    if (c1 && c1.a > .5) return c1; if (c2 && c2.a > .5) return c2;
    return /dark/.test(getComputedStyle(de).colorScheme || "") ? { r:18, g:18, b:18, a:1 } : { r:255, g:255, b:255, a:1 };
  }
  /* the solid colour actually showing behind an element, or null when it sits on a picture */
  function bgOf(el){
    if (bgCache.has(el)) return bgCache.get(el);
    const cs = getComputedStyle(el); let res;
    const img = cs.backgroundImage && cs.backgroundImage !== "none" ? cs.backgroundImage : "";
    const own = parse(cs.backgroundColor);
    if (img && /url\(/.test(img)) res = null;
    else if (img && /gradient/.test(img)){
      const stops = (img.match(/rgba?\([^)]+\)/g) || []).map(parse).filter(Boolean);
      if (stops.length){ const n = stops.length, avg = stops.reduce((s, c) => ({ r:s.r + c.r / n, g:s.g + c.g / n, b:s.b + c.b / n, a:s.a + c.a / n }), { r:0, g:0, b:0, a:0 });
        const under = avg.a >= .99 ? null : (el.parentElement ? bgOf(el.parentElement) : canvasBg());
        res = avg.a >= .99 ? Object.assign(avg, { a:1 }) : (under ? over(avg, under) : null);
      } else res = el.parentElement ? bgOf(el.parentElement) : canvasBg();
    }
    else if (own && own.a >= .99) res = own;
    else { const under = el.parentElement ? bgOf(el.parentElement) : canvasBg(); res = under && own && own.a > 0 ? over(own, under) : under; }
    bgCache.set(el, res); return res;
  }
  function restore(el){
    if (!el.__sdcInk) return;
    const [v, pr] = el.__sdcInk; el.__sdcInk = null; el.removeAttribute("data-sdc-ink");
    if (v) el.style.setProperty("color", v, pr); else el.style.removeProperty("color");
    if (el.__sdcFill !== undefined){ if (el.__sdcFill) el.style.setProperty("-webkit-text-fill-color", el.__sdcFill); else el.style.removeProperty("-webkit-text-fill-color"); el.__sdcFill = undefined; }
  }
  function hasText(el){
    if (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(el.tagName)) return true;
    for (let n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }
  function check(el){
    if (SKIP.test(el.tagName) || el.closest("svg,[data-sdc-noink]")) return;
    if (el.tagName === "INPUT" && /^(checkbox|radio|range|color|file|image|hidden)$/i.test(el.type)) return;
    if (!hasText(el)) { if (el.__sdcInk) restore(el); return; }
    if (el.__sdcInk) restore(el);
    if (!el.getClientRects().length) return;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || /text/.test(cs.webkitBackgroundClip || cs.backgroundClip || "")) return;
    const fg = parse(cs.webkitTextFillColor && !/currentcolor/i.test(cs.webkitTextFillColor) ? cs.webkitTextFillColor : cs.color);
    if (!fg || fg.a < .05) return;           // deliberately invisible text
    const bg = bgOf(el); if (!bg) return;     // text on a picture: leave it
    if (ratio(over(fg, bg), bg) >= MIN) return;
    const ink = ratio(DK, bg) >= ratio(LT, bg) ? DARK_INK : LIGHT_INK;
    el.__sdcInk = [el.style.getPropertyValue("color"), el.style.getPropertyPriority("color")];
    el.__sdcFill = el.style.getPropertyValue("-webkit-text-fill-color");
    el.style.setProperty("color", ink, "important"); el.style.setProperty("-webkit-text-fill-color", ink, "important");
    el.setAttribute("data-sdc-ink", ink === DARK_INK ? "dark" : "light");
  }
  function scan(root){
    if (!root || root.nodeType !== 1 || !root.isConnected) return;
    if (root.closest && root.closest("svg,[data-sdc-noink]")) return;
    check(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT, { acceptNode: n => SKIP.test(n.tagName) || n.hasAttribute("data-sdc-noink") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT });
    while (w.nextNode()) check(w.currentNode);
  }
  let pending = new Set(), full = false, timer = 0, obs = null;
  function flush(){
    timer = 0; if (!document.body) return;
    bgCache = new Map();
    let roots = full ? [document.body] : [...pending].filter(n => n.isConnected);
    pending.clear(); full = false;
    roots = roots.filter(r => !roots.some(o => o !== r && o.contains(r)));   // outermost only
    try { roots.forEach(scan); } catch(e){}
    if (obs) obs.takeRecords();               // ignore the colour changes this pass made itself
  }
  function queue(n, all){ if (all) full = true; else if (n) pending.add(n.nodeType === 1 ? n : n.parentElement); if (!timer) timer = setTimeout(flush, 120); }
  function start(){
    obs = new MutationObserver(list => {
      for (const m of list){
        if (m.type === "attributes"){
          if (m.attributeName === "data-sdc-ink") continue;
          if (m.target === document.documentElement || m.target === document.body){ queue(null, true); continue; }
          queue(m.target);
        } else if (m.type === "characterData") queue(m.target);
        else { m.addedNodes.forEach(n => queue(n.nodeType === 1 ? n : m.target)); }
      }
    });
    obs.observe(document.documentElement, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:["class", "style", "hidden", "open", "data-theme"] });
    queue(null, true);
    try { const mq = matchMedia("(prefers-color-scheme: dark)"); const re = () => queue(null, true); mq.addEventListener ? mq.addEventListener("change", re) : mq.addListener(re); } catch(e){}
    window.addEventListener("load", () => queue(null, true));
  }
  window.SDC_INK = { rescan: () => queue(null, true) };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
/* ---------- show password: an eye button in every password / PIN box (all pages, pop-ups too) ----------
   Pressing the eye shows what was typed for 2 seconds, then hides it again. */
(function(){
  const EYE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
  function add(inp){
    if (inp.dataset.sdcEye || inp.dataset.noeye != null || !inp.parentNode) return; inp.dataset.sdcEye = "1";
    const cs = getComputedStyle(inp), wrap = document.createElement("span"), full = cs.display === "block" || /^100%$/.test(inp.style.width) || inp.offsetWidth >= (inp.parentNode.clientWidth || 1) - 4;
    wrap.className = "sdcEyeWrap"; wrap.style.cssText = "position:relative;display:" + (full ? "block" : "inline-block") + ";" + (full ? "width:100%;" : "") + "margin:" + cs.marginTop + " " + cs.marginRight + " " + cs.marginBottom + " " + cs.marginLeft;
    inp.parentNode.insertBefore(wrap, inp); wrap.appendChild(inp);
    inp.style.margin = "0"; if (full) inp.style.width = "100%";
    inp.style.paddingRight = Math.max(parseFloat(cs.paddingRight) || 0, 42) + "px";
    const b = document.createElement("button"); b.type = "button"; b.className = "sdcEye"; b.tabIndex = 0;
    b.setAttribute("aria-label", "Show password for 2 seconds"); b.title = "Show password for 2 seconds"; b.innerHTML = EYE;
    b.style.cssText = "position:absolute;right:6px;top:50%;transform:translateY(-50%);width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:transparent;color:#5B6782;cursor:pointer;padding:0;z-index:2";
    let t = null;
    const hide = () => { clearTimeout(t); t = null; if (inp.type === "text") inp.type = "password"; b.innerHTML = EYE; b.style.color = "#5B6782"; b.setAttribute("aria-label", "Show password for 2 seconds"); };
    b.onmousedown = e => e.preventDefault();   // keep the cursor in the box
    b.onclick = e => { e.preventDefault(); e.stopPropagation(); if (t){ hide(); return; }
      inp.type = "text"; b.innerHTML = EYE_OFF; b.style.color = "#DC2B3E"; b.setAttribute("aria-label", "Hide password"); t = setTimeout(hide, 2000); };
    if (inp.form) inp.form.addEventListener("submit", hide, true);
    wrap.appendChild(b);
  }
  const scan = root => { try { (root.querySelectorAll ? root : document).querySelectorAll('input[type="password"]').forEach(add); if (root.matches && root.matches('input[type="password"]')) add(root); } catch(e){} };
  function start(){ scan(document);
    new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) scan(n); }))).observe(document.documentElement, { childList:true, subtree:true });
    document.addEventListener("focusin", e => { if (e.target && e.target.matches && e.target.matches('input[type="password"]')) add(e.target); });   // boxes switched to password later
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
})();
