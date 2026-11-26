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

/* Python Pathways: secure sign-in recovery and cross-device sync.
   Each student's work is locked (AES-256) with a random data key. That key is locked with a key made from
   the student's email + password (400,000 rounds), and a second copy is locked so only the admin can open it
   (for password resets). Only random IDs and locked text are ever stored in the sync sheet. */
function ppMake(PF){
"use strict";
const CFG = {
  // 18 Nov 2026: the first sync sheet (12_g1y…) grew past what Google Sheets can hold and stopped taking rows on 16 Nov at 10:44.
  // 26 Nov 2026: "SDC Sync 2" filled up too (no rows after 24 Nov 11:54). Saves now go to "SDC Sync 3";
  // both older sheets are still read for older saves, keys and PINs.
  form: "https://docs.google.com/forms/d/e/1FAIpQLSdMyq_x4TXZ7fWbMEoZsL25Rgbhmgx2b7_n9l9wcoZhT_0GsA/viewform?usp=pp_url&entry.666192810=x",    // SDC Sync 3 form: pre-filled link
  sheet: "https://docs.google.com/spreadsheets/d/1yvhp7MAxKMp6VsUm0nVS7vZ3CbNNfLJCdReJN2TgLWY/edit#gid=1112428158",   // SDC Sync 3 sheet: share link (anyone with the link can view)
  oldSheets: ["https://docs.google.com/spreadsheets/d/1qRTsBkS6MfA7lHEU5ZN3e3cbQAGtjrF8xmSfHGHKEoE/edit#gid=996219689", "https://docs.google.com/spreadsheets/d/12_g1ySZtyUX-rXTuOHcZ7_vUzCkdhXV_T7KF5NjBFa0/edit#gid=1433531983"],   // full: read only
  adminKeys: {"sigPub":{"key_ops":["verify"],"ext":true,"kty":"EC","x":"g6JG87cYBkusgs-I5KvQKNdcS2VGwCu4FP9lJYIvu58","y":"Tc06F7jM1RaDT6RsO7UTPumlWm7d3MNQNtqky5ygZAE","crv":"P-256"},"encPub":{"key_ops":["encrypt"],"ext":true,"alg":"RSA-OAEP-256","kty":"RSA","n":"hUBe-z8awlsSaMLLMbN09uiYjHBozpS3OATae6KaYRtd0VSGOHAe-sqxDpd3tt7lEvcEy9Q3oMgCR6bWsN8JY5zsN6GcHzdn_a5D9kgHT4YmxRVv31MvMb0yQhE7dbXSfurBMx0za1jPJgzkaRc-taIGBtdZserbU7U76yaVK2bf3wDzzd9beXDpen5E9xachauybxxXLBLmfhnoyhS95hd1WwzpsNFbhqPOUcrGagw6j5RLxti4hYE_NBi_gqxSed3j8EB4ChoEiRHJfN5pWb9d8bfXqYz8Rwm-niJWi_8gBfgrkPm_WnCo6LHl0Tz-OL1CjR3UpPUbIAOaeRhsaQ","e":"AQAB"},"wrap":{"iter":600000,"salt":"MVkn8WJRApLor1E8Nn+0fw==","iv":"sH/H8GF0OfhpDWaF","ct":"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"}}
};
const ROUNDS = 400000, CHUNK = 30000, QKEY = PF.q, PFX = PF.pfx;
const TE = new TextEncoder();
const e64 = u8 => { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const d64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hexOf = u8 => [...u8].map(v => v.toString(16).padStart(2, "0")).join("");
const sha256 = async b => new Uint8Array(await crypto.subtle.digest("SHA-256", b));
async function hmac(keyBytes, msg){ const k = await crypto.subtle.importKey("raw", keyBytes, { name:"HMAC", hash:"SHA-256" }, false, ["sign"]); return new Uint8Array(await crypto.subtle.sign("HMAC", k, TE.encode(msg))); }
const emailId = async email => hexOf(await sha256(TE.encode(PF.e + String(email).toLowerCase()))).slice(0, 32);
const dataId = async dk => hexOf(await sha256(TE.encode(PF.d + dk))).slice(0, 32);
function cfg(){
  const m = String(CFG.sheet).match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{20,})/), f = String(CFG.form).match(/docs\.google\.com\/forms\/d\/(e\/)?([^/]+)\//);
  const entry = (String(CFG.form).match(/entry\.(\d+)=/) || [])[1];
  if (!m || !f || !entry || m[1] === "e") return null;
  const old = (CFG.oldSheets || []).map(l => { const o = String(l).match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]{20,})/); return o ? { id: o[1], gid: (String(l).match(/[#&?]gid=(\d+)/) || [])[1] || "" } : null; }).filter(o => o && o.id !== m[1]);
  return { action: `https://docs.google.com/forms/d/${f[1] || ""}${f[2]}/formResponse`, entry: "entry." + entry, id: m[1], gid: (String(CFG.sheet).match(/[#&?]gid=(\d+)/) || [])[1] || "", old };
}
const enabled = () => !!cfg();
async function derive(email, pw){
  if (!(window.crypto && crypto.subtle)) throw new Error("Open the course from its https:// link to sign in.");
  const salt = await sha256(TE.encode(PF.v + String(email).toLowerCase()));
  const base = await crypto.subtle.importKey("raw", TE.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const master = new Uint8Array(await crypto.subtle.deriveBits({ name:"PBKDF2", salt, iterations: ROUNDS, hash:"SHA-256" }, base, 256));
  return { lookup: hexOf(await hmac(master, "lookup")).slice(0, 32), kek: e64(await hmac(master, "kek")) };
}
const aes = raw => crypto.subtle.importKey("raw", d64(raw), "AES-GCM", false, ["encrypt", "decrypt"]);
async function pipe(bytes, stream){ return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer()); }
async function seal(raw, text){
  let bytes = TE.encode(text), z = "p";
  if (window.CompressionStream){ try { bytes = await pipe(bytes, new CompressionStream("gzip")); z = "z"; } catch(e){} }
  const iv = crypto.getRandomValues(new Uint8Array(12));
  return z + ":" + e64(iv) + ":" + e64(new Uint8Array(await crypto.subtle.encrypt({ name:"AES-GCM", iv }, await aes(raw), bytes)));
}
async function open(raw, sealed){
  const [z, iv, ct] = String(sealed).split(":");
  let bytes = new Uint8Array(await crypto.subtle.decrypt({ name:"AES-GCM", iv: d64(iv) }, await aes(raw), d64(ct)));
  if (z === "z") bytes = await pipe(bytes, new DecompressionStream("gzip"));
  return new TextDecoder().decode(bytes);
}
/* ---- queue: rows are "PPS2|kind|id|version|part|parts|text" ---- */
const getQ = () => { try { return JSON.parse(localStorage.getItem(QKEY)) || []; } catch(e){ return []; } };
const setQ = q => { try { localStorage.setItem(QKEY, JSON.stringify(q)); } catch(e){} };
function queueRow(kind, id, ver, text){
  const key = kind + "|" + id, q = getQ().filter(x => x.key !== key), n = Math.max(1, Math.ceil(text.length / CHUNK));
  for (let k = 0; k < n; k++) q.push({ key, cell: [PFX, kind, id, ver, k, n, text.slice(k * CHUNK, (k + 1) * CHUNK)].join("|") });
  setQ(q);
}
let flushing = false;
async function postCell(c, cell, keep){
  const p = new URLSearchParams(); p.append(c.entry, cell);
  try { return await gfSend(c.action, p, keep); } catch(e){ return false; }
}
async function flush(){
  const c = cfg(); if (!c || flushing) return; flushing = true;
  try { let q = getQ();
    while (q.length){ const item = q[0]; if (!(await postCell(c, item.cell, true))) break;
      q = getQ(); if (q[0] && q[0].cell === item.cell) q.shift(); setQ(q);
      if (q.length) await new Promise(r => setTimeout(r, 250)); }
  } finally { flushing = false; }
}
/* ---- reading rows back from the linked sheet ---- */
function gvizRaw(c, tq, sheet){
  return new Promise((res, rej) => {
    const cb = "__pps" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7), sc = document.createElement("script");
    const done = () => { clearTimeout(t); try { delete window[cb]; } catch(e){ window[cb] = undefined; } sc.remove(); };
    const t = setTimeout(() => { done(); rej(new Error("timeout")); }, 20000);
    window[cb] = r => { done(); if (!r || r.status === "error"){ const m = (r && r.errors && r.errors[0] && (r.errors[0].detailed_message || r.errors[0].message)) || "";
      return rej(new Error(/not publicly viewable|OAuth|access_denied|permission/i.test(m) ? "The Python Pathways Sync sheet isn't shared yet. In Google Sheets open the sheet linked to the Python Pathways Sync form, click Share, set General access to \"Anyone with the link\" (Viewer), then try again." : (m || "The sync sheet could not be read."))); } res(r); };
    sc.onerror = () => { done(); rej(new Error("The sync sheet could not be reached.")); };
    const where = sheet ? "sheet=" + encodeURIComponent(sheet) + "&" : c.gid ? "gid=" + c.gid + "&" : "";
    sc.src = `https://docs.google.com/spreadsheets/d/${c.id}/gviz/tq?${where}headers=1&tqx=out:json;responseHandler:${cb}&tq=${encodeURIComponent(tq)}&_=${Date.now()}`;
    document.head.appendChild(sc);
  });
}
let COL = null, SEEN = ""; const COLS = {};
async function column(c, strict){
  const k = c.id + "|" + c.gid; if (COL && COL.k === k) return COL; if (!strict && COLS[k]) return COLS[k];
  // the linked tab, plus every "Form responses" tab: if the form was ever re-linked, new rows land in a new tab
  const tries = ["", ...[1,2,3,4,5,6].map(n => "Form responses " + n), "Form Responses 1", "Form Responses 2", "Form Responses 3"], seen = [], found = [], byLabel = []; let lastErr = null;
  const probes = await Promise.all(tries.map(sheet => gvizRaw(c, "select * limit 30", sheet).then(r => ({ sheet, r }), e => ({ sheet, e }))));   // all tabs at once
  for (const { sheet, r, e } of probes){
    if (e){ lastErr = e; continue; }
    const cols = (r.table && r.table.cols) || [], rows = (r.table && r.table.rows) || [];
    const i = cols.findIndex((x, j) => rows.some(row => String(((row.c || [])[j] || {}).v || "").startsWith("PPS2|") || String(((row.c || [])[j] || {}).v || "").startsWith("DSS2|")));
    if (i >= 0) found.push({ col: cols[i].id, time: cols[0].id, sheet });
    const li = cols.findIndex(x => /^\s*data\s*$/i.test(x.label || "")); if (li >= 0) byLabel.push({ col: cols[li].id, time: cols[0].id, sheet });
    if (cols.length) seen.push(`${sheet || "first tab"}: ${cols.map(x => x.label || x.id).join(", ")} (${rows.length} rows)`);
  }
  SEEN = seen.join(" · "); const locs = found.concat(byLabel.filter(b => !found.some(f => f.sheet === b.sheet)));
  if (locs.length) return (COLS[k] = COL = { k, locs });
  if (strict) throw (lastErr && !seen.length) ? lastErr : new Error("No sync rows found. What the sheet shows: " + (SEEN || "nothing"));
  return { k, locs: [{ col: "B", time: "A", sheet: "" }] };
}
async function cells(c, kind, idStart, limit){
  const out = []; let ok = 0, err = null, locs = [];
  for (const s of [c].concat(c.old || [])){ try { locs = locs.concat((await column(s)).locs.map(l => Object.assign({ s }, l))); } catch(e){ err = e; } }   // the new sheet and the old, full one
  await Promise.all(locs.map(l => gvizRaw(l.s, `select ${l.col} where ${l.col} starts with '${PFX}|${kind}|${idStart}' order by ${l.time} desc${limit ? " limit " + limit : ""}`, l.sheet)
    .then(r => { ok++; ((r.table && r.table.rows) || []).forEach(row => out.push(((row.c || [])[0] || {}).v || "")); }, e => { err = e; })));   // all at once
  if (!ok && err) throw err; return out;
}
function versions(list){
  const g = {}; list.forEach(x => { const p = String(x).split("|"); if (p[0] !== PFX || p.length < 7) return;
    const [, kind, id, ver, k, n] = p, gid = kind + "|" + id + "|" + ver, e = g[gid] = g[gid] || { key: kind + "|" + id, ver: +ver, n: +n, parts: {} }; e.parts[+k] = p.slice(6).join("|"); });
  const out = {}; Object.values(g).forEach(e => { if (Object.keys(e.parts).length !== e.n) return; (out[e.key] = out[e.key] || []).push({ ver: e.ver, text: Array.from({ length: e.n }, (_, i) => e.parts[i]).join("") }); });
  Object.values(out).forEach(a => a.sort((x, y) => y.ver - x.ver)); return out;
}
async function openWrap(c, A){
  const list = (versions(await cells(c, "W", A.lookup + "|", 60)))["W|" + A.lookup] || [];
  for (const v of list){ try { const o = JSON.parse(await open(A.kek, v.text)); if (o && o.dk){
    // an old password/PIN stops working once the admin has set a new one (a "revoked" row keyed by the secret data key)
    const did = await dataId(o.dk), rv = (versions(await cells(c, "R", did + "|", 5)))["R|" + did] || [];
    if (rv.length && rv[0].ver > v.ver) continue; return o.dk; } } catch(e){ if (/timeout|reached|read/i.test(String(e && e.message))) throw e; } }
  return null;
}
async function escrow(dk){
  const k = CFG.adminKeys; if (!k) return "";
  const pub = await crypto.subtle.importKey("jwk", k.encPub, { name:"RSA-OAEP", hash:"SHA-256" }, false, ["encrypt"]);
  return e64(new Uint8Array(await crypto.subtle.encrypt({ name:"RSA-OAEP" }, pub, d64(dk))));
}
async function publishWrap(email, pw, dk){
  const A = await derive(email, pw), ver = String(Date.now());
  queueRow("W", A.lookup, ver, await seal(A.kek, JSON.stringify({ dk })));
  const s = await escrow(dk); if (s) queueRow("E", await emailId(email), ver, s);
  flush(); return { lookup: A.lookup, ver, A };
}
const newKey = () => e64(crypto.getRandomValues(new Uint8Array(32)));
/* the student's account key, found from email + password on any device (null = no such account / wrong password) */
async function findKey(email, pw){ const c = cfg(); if (!c) return null; return openWrap(c, await derive(email, pw)); }
async function emailTaken(email){ const c = cfg(); if (!c) return false; const id = await emailId(email); return !!(versions(await cells(c, "E", id + "|", 1)))["E|" + id]; }
async function push(dk, savedAt, bundle){ const c = cfg(); if (!c) return; queueRow("D", await dataId(dk), String(savedAt), await seal(dk, JSON.stringify({ v: 2, savedAt, bundle }))); flush(); }
async function pull(dk){
  const c = cfg(); if (!c) return null; const did = await dataId(dk), list = (versions(await cells(c, "D", did + "|", 80)))["D|" + did] || [];
  for (const v of list){ try { const o = JSON.parse(await open(dk, v.text)); if (o && (o.bundle || o.data)) return { savedAt: o.savedAt, bundle: o.bundle || null, data: o.data || null }; } catch(e){} }
  return null;
}
/* 25 Nov 2026: the version of the newest saved copy, read from the new sheet only (one small, quick read), so an open
   page can tell within seconds that another computer has saved newer work */
async function head(dk){
  const c = cfg(); if (!c) return 0; const did = await dataId(dk), L = (await column(c)).locs;
  const got = await Promise.all(L.map(l => gvizRaw(c, `select ${l.col} where ${l.col} starts with '${PFX}|D|${did}|' order by ${l.time} desc limit 1`, l.sheet).then(r => r, () => null)));
  let best = 0; got.forEach(r => (((r && r.table && r.table.rows) || [])).forEach(row => { const v = +String(((row.c || [])[0] || {}).v || "").split("|")[3] || 0; if (v > best) best = v; }));
  return best;
}
/* admin recovery: new password for a student, works on every device, work kept */
async function adminReset(email, newPw, adminPw){
  const w = (CFG.adminKeys || {}).wrap; if (!w) throw new Error("No recovery keys in this build.");
  let priv; try {
    const base = await crypto.subtle.importKey("raw", TE.encode(adminPw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name:"PBKDF2", salt: d64(w.salt), iterations: w.iter, hash:"SHA-256" }, base, { name:"AES-GCM", length: 256 }, false, ["decrypt"]);
    priv = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name:"AES-GCM", iv: d64(w.iv) }, key, d64(w.ct))));
  } catch(e){ throw new Error("That recovery password is not right."); }
  return resetWithKey(email, newPw, priv.enc);
}
/* unlock just the PIN reset key with the recovery password (null if wrong) */
async function recoveryKey(adminPw){
  const w = (CFG.adminKeys || {}).wrap; if (!w || !adminPw) return null;
  try { const base = await crypto.subtle.importKey("raw", TE.encode(adminPw), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name:"PBKDF2", salt: d64(w.salt), iterations: w.iter, hash:"SHA-256" }, base, { name:"AES-GCM", length: 256 }, false, ["decrypt"]);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name:"AES-GCM", iv: d64(w.iv) }, key, d64(w.ct)))).enc; } catch(e){ return null; }
}
/* the same reset, using the recovery key directly (staff dashboard: unlocked for the super admin, or passed to approved teachers) */
async function resetWithKey(email, newPw, encJwk, opts){
  const c = cfg(); if (!c) throw new Error("Sync is not connected yet.");
  if (!encJwk) throw new Error("The PIN reset key isn't available on this computer yet.");
  const rsa = await crypto.subtle.importKey("jwk", encJwk, { name:"RSA-OAEP", hash:"SHA-256" }, false, ["decrypt"]);
  const id = await emailId(email), rows = (versions(await cells(c, "E", id + "|", 100)))["E|" + id] || [];
  for (const v of rows){
    let dk; try { dk = e64(new Uint8Array(await crypto.subtle.decrypt({ name:"RSA-OAEP" }, rsa, d64(v.text)))); } catch(e){ continue; }
    if (d64(dk).length !== 32 || (!PF.noData && !(await pull(dk)))) continue;
    const w = await publishWrap(email, newPw, dk); queueRow("R", await dataId(dk), String(w.ver), "x"); await flush();
    // confirm the new PIN is really in the sheet, so it works on every computer (the key is derived once, not on every check)
    const confirm = async () => { for (let i = 0; i < 20; i++){
      await new Promise(r => setTimeout(r, i ? 3000 : 1500));
      try { if (await openWrap(c, w.A) === dk) return true; } catch(e){} } return false; };
    if (opts && opts.background) return { ok:true, confirmed: confirm() };   // the staff dashboard shows "Done" now and the check result later
    if (await confirm()) return true;
    throw new Error("The new PIN was sent but hasn't reached the Sync sheet, so it won't work on other computers yet. Press Test sync below to see what needs fixing in Google Forms.");
  }
  return false;
}
/* admin check: send a test row and read it back */
/* how many rows each response tab has (to tell whether a test row arrived at all) */
async function rowCounts(c){
  const out = {};
  for (const sheet of ["", ...[1,2,3,4,5,6].map(n => "Form responses " + n), "Form Responses 1", "Form Responses 2", "Form Responses 3"]){
    try { const r = await gvizRaw(c, "select count(A)", sheet); out[sheet || "linked tab"] = +((((r.table || {}).rows || [])[0] || {}).c || [{}])[0].v || 0; } catch(e){}
  }
  return out;
}
async function test(){
  const c = cfg(); if (!c) throw new Error("The sync form and sheet links are not set in pp-sync.js yet.");
  const tid = "test" + Date.now().toString(36), tok = Math.random().toString(36).slice(2);
  let before = {}; try { before = await rowCounts(c); } catch(e){}
  if (!Object.keys(before).length) throw new Error("The Python Pathways Sync sheet can't be read. In Google Sheets, open it, click Share, and set General access to \"Anyone with the link\" (Viewer).");
  if (!(await postCell(c, ["PPS2", "T", tid, "1", 0, 1, tok].join("|")))) throw new Error("Could not reach Google Forms from here.");
  let last = null;
  for (let i = 0; i < 12; i++){ await new Promise(r => setTimeout(r, 5000));
    try { COL = null; await column(c, true); const l = await cells(c, "T", tid + "|", 0); last = null; if (l.some(x => String(x).endsWith(tok))) return true; } catch(e){ last = e; if (/could not be (read|reached)|timeout/i.test(e.message) && !SEEN) break; } }
  let after = {}; try { after = await rowCounts(c); } catch(e){}
  const grew = Object.keys(after).filter(k => after[k] > (before[k] || 0));
  if (grew.length) throw new Error("A new row reached the sheet (" + grew.join(", ") + ") but its answer was empty. The Sync form's question has been changed or replaced. Fix: in the Sync form, open ⋮ → Get pre-filled link, type x, click Get link, copy it and send it to Claude.");
  throw new Error("Nothing new reached the sheet, so Google Forms is not accepting the saves. In the Python Pathways Sync form check: (1) Responses tab: \"Accepting responses\" is ON; (2) Settings → Responses: \"Collect email addresses\" is \"Do not collect\" and \"Limit to 1 response\" is OFF, and Settings → Presentation/Defaults has no sign-in requirement (no \"Restrict to users in your organisation\"); (3) Responses → ⋮ → \"Select response destination\" is the sheet you shared. Then press Test sync again." + (last ? " (" + last.message + ")" : ""));
}
/* a copy of a new password that only the admin key can open (Design: teachers can look it up later) */
async function escrowSecret(email, pw){
  const k = CFG.adminKeys; if (!k || !pw) return false;
  const pub = await crypto.subtle.importKey("jwk", k.encPub, { name:"RSA-OAEP", hash:"SHA-256" }, false, ["encrypt"]);
  queueRow("P", await emailId(email), String(Date.now()), e64(new Uint8Array(await crypto.subtle.encrypt({ name:"RSA-OAEP" }, pub, TE.encode(String(pw).slice(0, 120)))))); await flush(); return true;
}
/* the latest password copy (escrowed, see escrowSecret) for each account key: { key: { pw, at } }. One read for the whole class. */
async function readSecrets(keys, encJwk){
  const c = cfg(); if (!c || !encJwk || !keys || !keys.length) return {};
  const rsa = await crypto.subtle.importKey("jwk", encJwk, { name:"RSA-OAEP", hash:"SHA-256" }, false, ["decrypt"]);
  const all = versions(await cells(c, "P", "", 5000)), out = {};
  for (const key of keys){ const list = all["P|" + await emailId(key)] || [];
    for (const v of list){ try { out[key] = { pw: new TextDecoder().decode(await crypto.subtle.decrypt({ name:"RSA-OAEP" }, rsa, d64(v.text))), at: v.ver }; break; } catch(e){} } }
  return out;
}
/* a note only the staff dashboard can open (live view, help requests): a fresh AES key, locked with the admin key */
async function sealForStaff(obj){
  const k = CFG.adminKeys; if (!k) throw new Error("no key");
  const raw = newKey(), pub = await crypto.subtle.importKey("jwk", k.encPub, { name:"RSA-OAEP", hash:"SHA-256" }, false, ["encrypt"]);
  return "h1~" + e64(new Uint8Array(await crypto.subtle.encrypt({ name:"RSA-OAEP" }, pub, d64(raw)))) + "~" + await seal(raw, JSON.stringify(obj));
}
let rsaCache = null;
async function openForStaff(text, encJwk){
  const p = String(text || "").split("~"); if (p[0] !== "h1" || p.length < 3 || !encJwk) return null;
  try { if (!rsaCache || rsaCache.j !== encJwk) rsaCache = { j:encJwk, k: await crypto.subtle.importKey("jwk", encJwk, { name:"RSA-OAEP", hash:"SHA-256" }, false, ["decrypt"]) };
    const raw = e64(new Uint8Array(await crypto.subtle.decrypt({ name:"RSA-OAEP" }, rsaCache.k, d64(p[1]))));
    return JSON.parse(await open(raw, p.slice(2).join("~"))); } catch(e){ return null; }
}
/* ---- live class leaderboard: one small row per student per update, read back by classmates ---- */
function boardPost(id, text){ if (!cfg()) return; queueRow("L", id, String(Date.now()), text); flush(); }
async function boardRead(prefix){
  const c = cfg(); if (!c) return {};
  const all = versions(await cells(c, "L", prefix, 400)), out = {};
  Object.keys(all).forEach(k => { out[k.slice(2)] = all[k][0].text; });
  return out;
}
return { enabled, findKey, newKey, publishWrap, emailTaken, push, pull, head, flush, adminReset, resetWithKey, recoveryKey, test, escrowSecret, readSecrets, sealForStaff, openForStaff, boardPost, boardRead, queued: () => getQ().length };
}
window.PPSync = ppMake({ pfx:"PPS2", e:"pp-e|", d:"pp-d|", v:"pp-v2|", q:"pyl_syncq" });
/* the same locked sync for the Design course's accounts (school email + password) */
window.PPSync.design = ppMake({ pfx:"DSS2", e:"dss-e|", d:"dss-d|", v:"dss-v2|", q:"pyl_syncq_ds", noData:true });
