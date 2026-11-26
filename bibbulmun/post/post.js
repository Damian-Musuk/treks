// Private posting page. Updates are queued on the phone (IndexedDB) and sent to the
// treks repo through the GitHub API when there's signal. The host (Cloudflare Pages)
// then redeploys the site from the new commit.
import { KINDS, summarise, newId, perthIso, perthTime, ago } from "../js/progress.js";

const view = document.getElementById("view");
const net = document.getElementById("net");
const PROGRESS_PATH = "bibbulmun/data/progress.json";
const PHOTO_DIR = "bibbulmun/data/photos/";

/* ---------- settings (token stays on this phone only) ---------- */
const DEFAULTS = { owner: "Damian-Musuk", repo: "treks", branch: "main", token: "" };
const settings = () => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem("bib:post") || "{}") }; } catch { return { ...DEFAULTS }; } };
const saveSettings = (s) => { try { localStorage.setItem("bib:post", JSON.stringify(s)); } catch {} };

/* ---------- queue in IndexedDB (photos are too big for localStorage) ---------- */
function db() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("bib-post", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("queue", { keyPath: "qid" });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function q(mode, fn) {
  const d = await db();
  return new Promise((res, rej) => {
    const tx = d.transaction("queue", mode);
    const out = fn(tx.objectStore("queue"));
    tx.oncomplete = () => res(out?.result);
    tx.onerror = () => rej(tx.error);
  });
}
const queueAll = async () => ((await q("readonly", (s) => s.getAll())) || []).sort((a, b) => a.qid.localeCompare(b.qid));
const queuePut = (item) => q("readwrite", (s) => s.put(item));
const queueDel = (qid) => q("readwrite", (s) => s.delete(qid));

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const km = (n) => (Math.round(n * 10) / 10).toFixed(1);
const short = (n) => n.replace(/ Campsite$/, "").replace(/ \(.*\)$/, "");
const b64 = (str) => { const bytes = new TextEncoder().encode(str); let bin = ""; bytes.forEach((b) => (bin += String.fromCharCode(b))); return btoa(bin); };
const unb64 = (s) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/\n/g, "")), (c) => c.charCodeAt(0)));

let STOPS = [];
let PROGRESS = { updates: [] };
let flash = null;
let sending = false;

function showNet() {
  net.className = "net " + (navigator.onLine ? "on" : "off");
  net.textContent = navigator.onLine ? "Online" : "No signal";
}

/* ---------- GitHub ---------- */
async function gh(path, opts = {}) {
  const s = settings();
  const res = await fetch(`https://api.github.com/repos/${s.owner}/${s.repo}${path ? "/" + path : ""}`, {
    ...opts,
    headers: { Authorization: `Bearer ${s.token}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) },
  });
  if (!res.ok && res.status !== 404) {
    let m = ""; try { m = (await res.json()).message; } catch {}
    const e = new Error(`GitHub ${res.status}${m ? ": " + m : ""}`); e.status = res.status; throw e;
  }
  return res;
}

async function readProgress() {
  const s = settings();
  const res = await gh(`contents/${PROGRESS_PATH}?ref=${encodeURIComponent(s.branch)}`, { cache: "no-store" });
  if (res.status === 404) return { data: { walker: "Damian", updates: [] }, sha: undefined };
  const j = await res.json();
  return { data: JSON.parse(unb64(j.content)), sha: j.sha };
}

async function putFile(path, contentB64, message, sha) {
  const s = settings();
  return gh(`contents/${path}`, { method: "PUT", body: JSON.stringify({ message, content: contentB64, branch: s.branch, ...(sha ? { sha } : {}) }) });
}

// Send everything in the queue, oldest first. Each item is one commit to progress.json
// (plus one for its photo), so a half-sent queue is never left in a broken state.
async function sendQueue() {
  if (sending || !navigator.onLine || !settings().token) return;
  sending = true; render();
  try {
    for (const item of await queueAll()) {
      if (item.op === "add" && item.photo && !item.photoSent) {
        const r = await putFile(PHOTO_DIR + item.update.photo.split("/").pop(), item.photo, `Photo: ${item.update.stop}`);
        if (r.status === 404) throw new Error("Repo or branch not found: check settings");
        item.photoSent = true; await queuePut(item);
      }
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, sha } = await readProgress();
        data.updates = data.updates || [];
        let message;
        if (item.op === "add") {
          if (!data.updates.some((u) => u.id === item.update.id)) data.updates.push(item.update);
          message = `Trail update: ${KINDS[item.update.kind].verb} ${short(item.update.stop)} (${km(item.update.km)} km)`;
        } else {
          data.updates = data.updates.filter((u) => u.id !== item.id);
          message = `Remove trail update ${item.id}`;
        }
        try {
          const r = await putFile(PROGRESS_PATH, b64(JSON.stringify(data, null, 2) + "\n"), message, sha);
          if (r.status === 404) throw new Error("Repo or branch not found: check settings");
          PROGRESS = data; break;
        } catch (e) {
          if ((e.status === 409 || e.status === 422) && attempt < 2) continue; // someone else wrote: re-read and retry
          throw e;
        }
      }
      await queueDel(item.qid);
    }
    flash = { ok: true, t: "Sent. The public page updates in a minute or two." };
  } catch (e) {
    flash = { ok: false, t: `Not sent yet: ${e.message}. It's still saved here and will retry.` };
  } finally {
    sending = false; render();
  }
}

/* ---------- photos: shrink before queueing ---------- */
async function shrink(file, max = 1600) {
  const img = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const url = c.toDataURL("image/jpeg", 0.8);
  return { b64: url.split(",")[1], url };
}

/* ---------- view ---------- */
let photo = null;

async function render() {
  const s = settings();
  const queue = await queueAll().catch(() => []);
  // What the public page will show once the queue is sent.
  const pending = queue.filter((i) => i.op === "add").map((i) => i.update);
  const removed = new Set(queue.filter((i) => i.op === "remove").map((i) => i.id));
  const all = [...(PROGRESS.updates || []), ...pending].filter((u) => !removed.has(u.id));
  const sum = summarise({ updates: all });
  const lastKm = sum.last ? sum.last.km : 0;
  const open = !!sum.current;
  const defKind = open ? "checkin" : "start";
  const nextStop = open ? STOPS.find((x) => x.km > lastKm + 0.05) : STOPS.find((x) => Math.abs(x.km - lastKm) < 0.05);
  const defKm = (nextStop || STOPS[0] || { km: 0 }).km;

  if (!s.token) {
    view.innerHTML = (flash && !flash.ok ? `<p class="msg err" role="status">${esc(flash.t)}</p>` : "") + setupHtml(s, true);
    bindSetup();
    return;
  }

  view.innerHTML = `
    ${flash ? `<p class="msg ${flash.ok ? "ok" : "err"}" role="status">${esc(flash.t)}</p>` : ""}
    <section class="card" style="margin-top:0">
      <p class="small" style="margin:0 0 10px">${open ? `On a walk: last at ${esc(short(sum.last.stop))} (${km(lastKm)} km), ${esc(ago(sum.last.time))}.` : sum.last ? `Between walks. Last at ${esc(short(sum.last.stop))} (${km(lastKm)} km).` : "No updates yet."}</p>
      <form class="post" id="f">
        <div class="kinds" role="radiogroup" aria-label="Type of update">
          ${Object.entries(KINDS).map(([k, v]) => `<label><input type="radio" name="kind" value="${k}" ${k === defKind ? "checked" : ""}>${esc(v.label)}</label>`).join("")}
        </div>
        <label>Where
          <select name="km">${STOPS.map((x) => `<option value="${x.km}" ${Math.abs(x.km - defKm) < 0.05 ? "selected" : ""}>${km(x.km)} · ${esc(x.name)}</option>`).join("")}</select>
        </label>
        <label>Plus km past it <input type="number" name="extra" inputmode="decimal" min="0" max="30" step="0.1" placeholder="0 if you're at the stop"></label>
        <label>Message for family and friends <textarea name="text" maxlength="1000" placeholder="How's it going?"></textarea></label>
        <label>Photo (optional) <input type="file" name="photo" accept="image/*"></label>
        <div id="pv">${photo ? `<img class="preview" src="${photo.url}" alt="Photo to send"><button type="button" class="ghost" id="nophoto" style="margin-top:6px">Remove photo</button>` : ""}</div>
        <details><summary class="small">Posting later? Set the time</summary>
          <label style="margin-top:8px">When (Perth time) <input type="datetime-local" name="when"></label>
        </details>
        <button class="big" type="submit">${navigator.onLine ? "Post update" : "Save, send when there's signal"}</button>
      </form>
    </section>

    <section class="card">
      <div class="row"><h3>Waiting to send (${queue.length})</h3>${queue.length ? `<button class="ghost" id="send" ${sending || !navigator.onLine ? "disabled" : ""}>${sending ? "Sending…" : "Send now"}</button>` : ""}</div>
      ${queue.length ? `<ul class="queue">${queue.map((i) => `<li><span>${i.op === "add" ? `${esc(KINDS[i.update.kind].verb)} ${esc(short(i.update.stop))}${i.photo ? " 📷" : ""}` : "Remove an update"}</span><button class="ghost" data-drop="${esc(i.qid)}">Discard</button></li>`).join("")}</ul>` : `<p class="small">Nothing waiting.</p>`}
    </section>

    <section class="card">
      <h3>Posted</h3>
      ${(PROGRESS.updates || []).length ? `<ul class="queue">${[...PROGRESS.updates].reverse().slice(0, 8).map((u) => `<li><span>${esc(KINDS[u.kind]?.verb || "At")} ${esc(short(u.stop))}<br><span class="small">${esc(perthTime(u.time))}</span></span>${removed.has(u.id) ? `<span class="small">removing</span>` : `<button class="ghost" data-remove="${esc(u.id)}">Remove</button>`}</li>`).join("")}</ul>` : `<p class="small">Nothing posted yet.</p>`}
      <p class="small"><a href="../#follow">Open the public page</a></p>
    </section>

    <details class="card"><summary>Settings</summary>${setupHtml(s, false)}</details>
  `;

  const f = view.querySelector("#f");
  f.photo.addEventListener("change", async () => {
    const file = f.photo.files[0];
    if (!file) return;
    try { photo = await shrink(file); } catch { photo = null; flash = { ok: false, t: "Couldn't read that photo." }; }
    view.querySelector("#pv").innerHTML = photo ? `<img class="preview" src="${photo.url}" alt="Photo to send">` : "";
  });
  view.querySelector("#nophoto")?.addEventListener("click", () => { photo = null; render(); });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const base = STOPS.find((x) => Math.abs(x.km - +f.km.value) < 0.05);
    const extra = Math.max(0, +f.extra.value || 0);
    const id = newId();
    const update = {
      id,
      time: f.when.value ? f.when.value + ":00+08:00" : perthIso(),
      kind: f.kind.value,
      km: Math.round((base.km + extra) * 10) / 10,
      stop: extra ? `${km(extra)} km past ${short(base.name)}` : base.name,
      text: f.text.value.trim(),
    };
    if (photo) update.photo = `photos/${id}.jpg`;
    await queuePut({ qid: id, op: "add", update, photo: photo?.b64 });
    photo = null;
    flash = { ok: true, t: navigator.onLine ? "Saved. Sending…" : "Saved on your phone. It'll send when you have signal." };
    await render();
    sendQueue();
  });
  view.querySelector("#send")?.addEventListener("click", sendQueue);
  view.querySelectorAll("[data-drop]").forEach((b) => b.addEventListener("click", async () => { await queueDel(b.dataset.drop); render(); }));
  view.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", async () => {
    await queuePut({ qid: newId(), op: "remove", id: b.dataset.remove });
    render(); sendQueue();
  }));
  bindSetup();
}

// A plain username + password form, so the phone's password manager can save the token once
// and fill it in on every damian-mus.uk app. The "password" is the GitHub token.
function setupHtml(s, first) {
  return `<form class="post" id="setup" autocomplete="on" ${first ? 'style="margin-top:0"' : ""}>
    <input type="text" name="username" autocomplete="username" value="damian" readonly hidden aria-hidden="true">
    <label>${first ? "Please enter password" : "Password"} <input name="password" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" value="${first ? "" : esc(s.token)}" ${first ? "autofocus" : ""}></label>
    ${first ? "" : `<div class="row2">
      <label>Owner <input name="owner" value="${esc(s.owner)}"></label>
      <label>Repo <input name="repo" value="${esc(s.repo)}"></label>
    </div>
    <label>Branch the site deploys from <input name="branch" value="${esc(s.branch)}"></label>`}
    <div class="row"><button class="big" type="submit" style="flex:1">${first ? "Sign in" : "Save and test"}</button></div>
    ${first ? `<details class="small"><summary>No password?</summary>
      <p>The password is a GitHub fine-grained token with Contents: read and write on <code>${esc(s.owner)}/${esc(s.repo)}</code>. It's kept on this phone only.</p>
    </details>` : `<button type="button" class="ghost" id="forget">Sign out on this phone</button>`}
  </form>`;
}

function bindSetup() {
  const f = view.querySelector("#setup");
  if (!f) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const s = settings();
    saveSettings({
      owner: f.owner ? f.owner.value.trim() : s.owner,
      repo: f.repo ? f.repo.value.trim() : s.repo,
      branch: f.branch ? f.branch.value.trim() || "main" : s.branch,
      token: f.password.value.trim(),
    });
    try {
      const r = await gh("");
      if (r.status === 401) throw new Error("that password didn't work");
      if (r.status === 404) throw new Error("repo not found, or the password can't see it");
      const j = await r.json();
      if (!j.permissions?.push) throw new Error("that password can read but not post");
      const p = await readProgress(); PROGRESS = p.data;
      flash = { ok: true, t: "Signed in. You're ready to post." };
    } catch (err) {
      if (!s.token) saveSettings({ ...settings(), token: "" });
      flash = { ok: false, t: `Couldn't sign in: ${err.message}` };
    }
    render();
  });
  view.querySelector("#forget")?.addEventListener("click", () => { saveSettings({ ...settings(), token: "" }); flash = null; render(); });
}

/* ---------- boot ---------- */
async function boot() {
  showNet();
  addEventListener("online", () => { showNet(); render(); sendQueue(); });
  addEventListener("offline", () => { showNet(); render(); });
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("../sw.js", { scope: "../" }).catch(() => {});
  try { STOPS = (await (await fetch("../data/stops.json")).json()).stops; } catch {}
  try { PROGRESS = await (await fetch("../data/progress.json", { cache: "no-store" })).json(); } catch {}
  if (navigator.onLine && settings().token) { try { PROGRESS = (await readProgress()).data; } catch {} }
  await render();
  sendQueue();
}
boot();
