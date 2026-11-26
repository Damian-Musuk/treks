import { SECTIONS, FIRST_WALK, GEAR, CONTACTS, INFO, SOURCES } from "./content.js";
import { KINDS, TOTAL_KM, summarise, perthTime, ago } from "./progress.js";

let view = document.getElementById("view");
const net = document.getElementById("net");
let STOPS = [];
let ASOF = "";

/* ---------- storage (best effort: private windows can block it) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem("bib:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem("bib:" + k, JSON.stringify(v)); } catch {} },
};

/* ---------- helpers ---------- */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const km = (n) => (Math.round(n * 10) / 10).toFixed(1);
const near = (a, b) => Math.abs(a - b) < 0.05;
const stopAt = (k) => STOPS.find((s) => near(s.km, k));
const nameAt = (k) => (stopAt(k)?.name ?? `${km(k)} km`);
const short = (n) => n.replace(/ Campsite$/, "").replace(/ \(.*\)$/, "");
const between = (a, b) => STOPS.filter((s) => s.km > a + 0.05 && s.km < b - 0.05);
const sectionOf = (k) => SECTIONS.find((s) => k >= s.startKm && k < s.endKm) ?? SECTIONS[SECTIONS.length - 1];
const guess = (t = "guess") => `<span class="guess" title="Not confirmed yet">${t}</span>`;
const typeLabel = { campsite: "Campsite", town: "Town", access: "Road access" };
const sum = (arr) => arr.reduce((a, b) => a + b, 0);
// Effort hint per day, from distance only (no elevation data yet).
const effort = (d) => (d > 25 ? "long" : d > 20 ? "full" : d > 12 ? "steady" : "short");

function passedList(from, to) {
  const list = between(from, to);
  if (!list.length) return "";
  return `<details class="passed"><summary>${list.length} stop${list.length > 1 ? "s" : ""} on the way</summary><ol>${list
    .map((s) => `<li class="t-${s.type}"><span class="k">+${km(s.km - from)}</span>${esc(s.name)}</li>`)
    .join("")}</ol></details>`;
}

/* ---------- view: follow (public progress) ---------- */
let PROGRESS = null;
let progressChecked = null;
let progressFromCache = false;

async function loadProgress() {
  try {
    const res = await fetch("data/progress.json", { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    PROGRESS = await res.json();
    progressFromCache = res.headers.get("x-from-cache") === "1";
    if (!progressFromCache) progressChecked = new Date();
  } catch {
    progressFromCache = true;
  }
}

function trackStrip(sum) {
  const W = 1000, H = 120, y = 34, h = 40;
  const bands = SECTIONS.map((s, i) => `<rect x="${s.startKm}" y="${y}" width="${s.endKm - s.startKm}" height="${h}" class="band ${i % 2 ? "b2" : "b1"}"><title>${s.n}. ${esc(s.name)}</title></rect>
    <text x="${(s.startKm + s.endKm) / 2}" y="${y + h + 40}" class="sn">${s.n}</text>`).join("");
  const walked = sum.merged.map(([f, t]) => `<rect x="${f}" y="${y}" width="${Math.max(t - f, 3)}" height="${h}" class="walked"/>`).join("");
  const at = sum.last ? sum.last.km : null;
  const marker = at == null ? "" : `<g class="${sum.current ? "live" : ""}"><circle cx="${at}" cy="${y + h / 2}" r="26" class="pulse"/><circle cx="${at}" cy="${y + h / 2}" r="18" class="me"/></g>`;
  return `<svg class="strip" viewBox="-20 -4 ${W + 40} ${H + 8}" role="img" aria-label="${km(sum.walked)} of ${TOTAL_KM} km walked">
      ${bands}${walked}${marker}
      <text x="0" y="22" class="end">Kalamunda</text><text x="${W}" y="22" class="end r">Albany</text>
    </svg>`;
}

function updateCard(u) {
  const k = KINDS[u.kind] || KINDS.checkin;
  const sec = sectionOf(u.km);
  return `<li class="up k-${esc(u.kind)}">
    <div class="uhead"><span class="ui" aria-hidden="true">${k.icon}</span><b>${esc(k.verb)} ${esc(short(u.stop || nameAt(u.km)))}</b></div>
    <p class="umeta">${km(u.km)} km · Section ${sec.n} · <time datetime="${esc(u.time)}">${esc(perthTime(u.time))}</time></p>
    ${u.text ? `<p class="utext">${esc(u.text)}</p>` : ""}
    ${u.photo ? `<img class="uphoto" src="data/${esc(u.photo)}" alt="Photo from ${esc(short(u.stop || ""))}" loading="lazy">` : ""}
  </li>`;
}

function renderFollow() {
  const who = esc(PROGRESS?.walker || "Damian");
  const sum = summarise(PROGRESS);
  const nw = PROGRESS?.nextWalk;
  let status;
  if (sum.current) {
    const u = sum.current.last;
    const nextCamp = STOPS.find((s) => s.type === "campsite" && s.km > u.km + 0.05);
    status = `<div class="status live"><span class="dot"></span>On the track now</div>
      <h2>${esc(KINDS[u.kind]?.verb || "At")} ${esc(short(u.stop || nameAt(u.km)))}</h2>
      <p>${esc(ago(u.time))} · ${km(u.km)} km from Kalamunda. This walk: ${km(u.km - sum.current.from)} km since ${esc(short(nameAt(sum.current.from)))}.${
        nextCamp && u.kind !== "camp" ? ` Next campsite: ${esc(short(nextCamp.name))}, ${km(nextCamp.km - u.km)} km on.` : ""}</p>`;
  } else if (sum.last) {
    status = `<div class="status"><span class="dot"></span>Between walks</div>
      <h2>${km(sum.walked)} km walked so far</h2>
      <p>Last walk finished at ${esc(short(sum.last.stop || nameAt(sum.last.km)))}, ${esc(ago(sum.last.time))}.${
        nw && nw.from >= sum.last.km - 0.05 ? ` Next: ${esc(short(nameAt(nw.from)))} to ${esc(short(nameAt(nw.to)))}${nw.when ? ", " + esc(nw.when) : ""}.` : ""}</p>`;
  } else {
    status = `<div class="status"><span class="dot"></span>Getting ready</div>
      <h2>${who} is walking the Bibbulmun Track</h2>
      <p>1,000 km from Kalamunda to Albany, in sections through 2027.${
        nw ? ` First up: ${esc(short(nameAt(nw.from)))} to ${esc(short(nameAt(nw.to)))} (${km(nw.to - nw.from)} km)${nw.when ? ", " + esc(nw.when) : ""}.` : ""} Updates will appear here from the trail.</p>`;
  }
  const camps = sum.ups.filter((u) => u.kind === "camp").length;
  const pct = (sum.walked / TOTAL_KM) * 100;

  view.innerHTML = `
    <section class="hero follow">${status}</section>
    <section class="progress card">
      <div class="pbig"><b>${km(sum.walked)}</b><span>of 1,000 km · ${pct > 0 && pct < 1 ? "<1" : Math.round(pct)}%</span></div>
      ${trackStrip(sum)}
      <div class="stats three">
        <div><b>${sum.days}</b><span>days walked</span></div>
        <div><b>${camps}</b><span>nights camped</span></div>
        <div><b>${sum.trips.length}</b><span>walks</span></div>
      </div>
    </section>
    <div class="fbar">
      <span class="muted">${progressChecked ? `Checked ${progressChecked.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })}` : "Saved copy"}${progressFromCache ? " · offline" : ""}</span>
      <span><button class="ghost" id="refresh">Refresh</button> <button class="ghost" id="share">Share</button></span>
    </div>
    <h2 class="h2">Updates</h2>
    ${sum.ups.length
      ? `<ol class="timeline">${[...sum.ups].reverse().map(updateCard).join("")}</ol>`
      : `<p class="empty">No updates yet. Check back once the walking starts.</p>`}
    <p class="note">Updates are posted from the trail when there's phone signal, so they can arrive in bunches. Times are Perth time.</p>
  `;
  view.querySelector("#refresh").addEventListener("click", async (e) => {
    e.target.disabled = true; e.target.textContent = "Checking…";
    await loadProgress(); renderFollow();
  });
  view.querySelector("#share").addEventListener("click", async () => {
    const data = { title: `${PROGRESS?.walker || "Damian"} on the Bibbulmun Track`, url: location.origin + location.pathname };
    try {
      if (navigator.share) await navigator.share(data);
      else { await navigator.clipboard.writeText(data.url); view.querySelector("#share").textContent = "Link copied"; }
    } catch {}
  });
}

/* ---------- view: first walk ---------- */
function renderWalk(root) {
  const optId = store.get("walkOpt", "4day");
  const opt = FIRST_WALK.options.find((o) => o.id === optId) ?? FIRST_WALK.options[0];
  const total = sum(opt.days.map((d) => d.to - d.from));
  const nights = opt.days.filter((d) => d.night !== "Home").length;
  const longest = Math.max(...opt.days.map((d) => d.to - d.from));
  let lastTrip = 0;

  root.innerHTML = `
    <section class="hero">
      <p class="eyebrow">The plan · Section 1 · first walk · 2027</p>
      <h2>${esc(FIRST_WALK.title)}</h2>
      <p>${esc(FIRST_WALK.intro)}</p>
    </section>

    <div class="seg" role="radiogroup" aria-label="Choose a plan">
      ${FIRST_WALK.options
        .map((o) => `<button role="radio" aria-checked="${o.id === opt.id}" data-opt="${o.id}"><b>${esc(o.label)}</b><small>${esc(o.sub)}</small></button>`)
        .join("")}
    </div>

    <div class="stats">
      <div><b>${km(total)}</b><span>km</span></div>
      <div><b>${opt.days.length}</b><span>days</span></div>
      <div><b>${nights}</b><span>nights out</span></div>
      <div><b>${km(longest)}</b><span>longest day</span></div>
    </div>

    <ol class="days">
      ${opt.days
        .map((d, i) => {
          const dist = d.to - d.from;
          let tripHead = "";
          if (d.trip && d.trip !== lastTrip) { lastTrip = d.trip; tripHead = `<li class="trip">Trip ${d.trip}</li>`; }
          return `${tripHead}<li class="day">
            <div class="dhead">
              <span class="dn">Day ${i + 1}</span>
              <span class="dk e-${effort(dist)}">${km(dist)} km</span>
            </div>
            <h3>${esc(short(nameAt(d.from)))} <span aria-hidden="true">→</span><span class="sr"> to </span> ${esc(short(nameAt(d.to)))}</h3>
            <p class="night">${d.night === "Home" ? "Home for the night" : "Sleep at " + esc(d.night)}</p>
            <p>${esc(d.note)}</p>
            ${passedList(d.from, d.to)}
          </li>`;
        })
        .join("")}
    </ol>
    <p class="note">${esc(FIRST_WALK.caveat)}</p>
    <p class="note">Track direction north to south ${guess("assumed")}. Start month not set yet.</p>
  `;
  root.querySelectorAll("[data-opt]").forEach((b) =>
    b.addEventListener("click", () => { store.set("walkOpt", b.dataset.opt); renderWalk(root); })
  );
}

/* ---------- view: planner ---------- */
function planDays({ from, to, target, max, towns }) {
  const sleepOK = (s) => s.type === "campsite" || (towns && s.type === "town");
  const days = [];
  let pos = from;
  let guard = 0;
  while (pos < to - 0.05 && guard++ < 200) {
    if (to - pos <= max + 0.05) { days.push([pos, to]); break; }
    const cands = STOPS.filter((s) => sleepOK(s) && s.km > pos + 0.05 && s.km <= pos + max + 0.05 && s.km < to);
    let next;
    if (cands.length) {
      next = cands.reduce((best, s) => {
        const db = Math.abs(best.km - pos - target), ds = Math.abs(s.km - pos - target);
        return ds < db - 0.05 || (Math.abs(ds - db) <= 0.05 && s.km > best.km) ? s : best;
      });
    } else {
      next = STOPS.find((s) => sleepOK(s) && s.km > pos + 0.05) ?? { km: to };
      if (next.km > to) next = { km: to };
    }
    days.push([pos, next.km]);
    pos = next.km;
  }
  return days;
}

function renderPlanner(root) {
  const st = Object.assign({ from: 0, to: 73.0, target: 20, max: 27, towns: true, date: "" }, store.get("plan", {}));
  const opts = (sel) =>
    SECTIONS.map(
      (sec) => `<optgroup label="${sec.n}. ${esc(sec.name)}">${STOPS.filter((s) => sectionOf(s.km) === sec || (sec.n === 9 && s.km === 1000))
        .map((s) => `<option value="${s.km}" ${near(s.km, sel) ? "selected" : ""}>${km(s.km)} · ${esc(s.name)}</option>`)
        .join("")}</optgroup>`
    ).join("");

  const days = st.to > st.from ? planDays(st) : [];
  const start = st.date ? new Date(st.date + "T00:00:00") : null;
  const fmt = (i) => {
    if (!start) return "";
    const d = new Date(start); d.setDate(d.getDate() + i);
    return d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  };

  root.innerHTML = `
    <p class="lead">Pick a start and end. Each night lands on a campsite${st.towns ? " or town" : ""}, as close to the target as it can without going over the max.</p>
    <form class="planner" onsubmit="return false">
      <label>From<select name="from">${opts(st.from)}</select></label>
      <label>To<select name="to">${opts(st.to)}</select></label>
      <div class="row2">
        <label>Target a day <output>${st.target} km</output><input type="range" name="target" min="8" max="30" step="1" value="${st.target}"></label>
        <label>Max a day <output>${st.max} km</output><input type="range" name="max" min="10" max="35" step="1" value="${st.max}"></label>
      </div>
      <div class="row2">
        <label>Start date <input type="date" name="date" value="${esc(st.date)}" min="2027-01-01"></label>
        <label class="check"><input type="checkbox" name="towns" ${st.towns ? "checked" : ""}> Sleep in towns too</label>
      </div>
      <div class="quick">
        ${SECTIONS.map((s) => `<button type="button" data-sec="${s.n}">S${s.n}</button>`).join("")}
        <button type="button" data-sec="all">Whole track</button>
      </div>
    </form>
    ${
      st.to <= st.from
        ? `<p class="empty">Pick an end point after the start (the app walks north to south).</p>`
        : `<div class="stats">
            <div><b>${km(st.to - st.from)}</b><span>km</span></div>
            <div><b>${days.length}</b><span>days</span></div>
            <div><b>${km(Math.max(...days.map(([a, b]) => b - a)))}</b><span>longest</span></div>
            <div><b>${km((st.to - st.from) / days.length)}</b><span>average</span></div>
          </div>
          <ol class="days compact">
            ${days
              .map(([a, b], i) => {
                const d = b - a;
                const warn = d > st.max + 0.05 ? `<p class="warn">Over your max: no campsite in reach.</p>` : "";
                return `<li class="day">
                  <div class="dhead"><span class="dn">Day ${i + 1}${start ? " · " + fmt(i) : ""}</span><span class="dk e-${effort(d)}">${km(d)} km</span></div>
                  <h3>${esc(short(nameAt(a)))} <span aria-hidden="true">→</span><span class="sr"> to </span> ${esc(short(nameAt(b)))}</h3>
                  ${warn}${passedList(a, b)}
                </li>`;
              })
              .join("")}
          </ol>`
    }
    <p class="note">Distances only: no hills, heat or track closures are taken into account. Check the Foundation's track conditions before each trip.</p>
  `;

  const form = root.querySelector("form");
  const save = (patch) => { store.set("plan", Object.assign(st, patch)); renderPlanner(root); };
  form.from.addEventListener("change", (e) => save({ from: +e.target.value }));
  form.to.addEventListener("change", (e) => save({ to: +e.target.value }));
  form.date.addEventListener("change", (e) => save({ date: e.target.value }));
  form.towns.addEventListener("change", (e) => save({ towns: e.target.checked }));
  for (const n of ["target", "max"]) {
    form[n].addEventListener("input", (e) => { e.target.previousElementSibling.textContent = e.target.value + " km"; });
    form[n].addEventListener("change", (e) => {
      const v = +e.target.value;
      save(n === "target" ? { target: v, max: Math.max(st.max, v) } : { max: v, target: Math.min(st.target, v) });
    });
  }
  root.querySelectorAll("[data-sec]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.sec === "all") return save({ from: 0, to: 1000 });
      const s = SECTIONS[+b.dataset.sec - 1];
      save({ from: s.startKm, to: s.endKm });
    })
  );
}

function renderPlan() {
  view.innerHTML = `<div id="fw"></div><h2 class="h2 split">Plan any stretch</h2><div id="pl"></div>`;
  renderWalk(view.querySelector("#fw"));
  renderPlanner(view.querySelector("#pl"));
}

/* ---------- view: stops ---------- */
function renderStops() {
  const st = Object.assign({ q: "", types: ["campsite", "town", "access"] }, store.get("stopsFilter", {}));
  let pick = store.get("pick", []);

  const draw = () => {
    const q = st.q.trim().toLowerCase();
    const list = STOPS.filter((s) => st.types.includes(s.type) && (!q || s.name.toLowerCase().includes(q)));
    const [a, b] = pick.map((k) => stopAt(k)).filter(Boolean).sort((x, y) => x.km - y.km);
    const banner = a && b
      ? `<div class="measure"><b>${km(b.km - a.km)} km</b> from ${esc(short(a.name))} to ${esc(short(b.name))} · ${between(a.km, b.km).filter((s) => s.type === "campsite").length} campsites between <button data-clear>Clear</button></div>`
      : a
      ? `<div class="measure">Tap another stop to measure from ${esc(short(a.name))} <button data-clear>Clear</button></div>`
      : `<div class="measure muted">Tap two stops to measure the distance between them.</div>`;

    let html = "";
    for (const sec of SECTIONS) {
      const rows = list.filter((s) => sectionOf(s.km) === sec);
      if (!rows.length) continue;
      html += `<h3 class="sech"><span>${sec.n}</span>${esc(sec.name)} <small>${km(sec.endKm - sec.startKm)} km</small></h3><ul class="stops">${rows
        .map((s) => `<li><button class="t-${s.type} ${pick.some((k) => near(k, s.km)) ? "on" : ""}" data-km="${s.km}">
            <span class="k">${km(s.km)}</span>
            <span class="nm">${esc(s.name)}<small>${typeLabel[s.type]}${s.next_km ? ` · next stop ${km(s.next_km)} km` : ""}</small></span>
          </button></li>`)
        .join("")}</ul>`;
    }
    view.querySelector(".stoplist").innerHTML = html || `<p class="empty">No stops match.</p>`;
    view.querySelector(".mwrap").innerHTML = banner;
  };

  view.innerHTML = `
    <section class="hero small">
      <p class="eyebrow">All ${STOPS.length} stops</p>
      <h2>Campsites, towns and road access</h2>
      <p>Km from the Northern Terminus at Kalamunda, from the official distance calculator (${esc(ASOF)}).</p>
    </section>
    <div class="filters">
      <input type="search" placeholder="Search stops" value="${esc(st.q)}" aria-label="Search stops">
      <div class="chips">
        ${["campsite", "town", "access"].map((t) => `<label class="chip t-${t}"><input type="checkbox" value="${t}" ${st.types.includes(t) ? "checked" : ""}>${typeLabel[t]}s</label>`).join("")}
      </div>
    </div>
    <div class="mwrap" aria-live="polite"></div>
    <div class="stoplist"></div>
  `;
  view.querySelector("input[type=search]").addEventListener("input", (e) => { st.q = e.target.value; store.set("stopsFilter", st); draw(); });
  view.querySelectorAll(".chips input").forEach((c) =>
    c.addEventListener("change", () => {
      st.types = [...view.querySelectorAll(".chips input:checked")].map((x) => x.value);
      store.set("stopsFilter", st); draw();
    })
  );
  view.addEventListener("click", (e) => {
    if (e.target.closest("[data-clear]")) { pick = []; store.set("pick", pick); return draw(); }
    const b = e.target.closest("[data-km]");
    if (!b) return;
    const k = +b.dataset.km;
    if (pick.some((x) => near(x, k))) pick = pick.filter((x) => !near(x, k));
    else pick = pick.length >= 2 ? [k] : [...pick, k];
    store.set("pick", pick); draw();
  });
  draw();
}

/* ---------- view: gear ---------- */
function renderGear() {
  const done = new Set(store.get("gear", []));
  const dayOnly = store.get("gearDay", false);
  const groups = GEAR.map((g) => ({
    group: g.group,
    items: g.items.map((it) => (typeof it === "string" ? { t: it, o: false } : it)).filter((it) => !(dayOnly && it.o)),
  }));
  const all = groups.flatMap((g) => g.items);
  const count = all.filter((it) => done.has(it.t)).length;

  view.innerHTML = `
    <section class="hero small">
      <p class="eyebrow">Gear</p>
      <h2>What to take and wear</h2>
      <p>Ticks are saved on this device. General hiking practice for the Perth Hills, not an official Foundation list.</p>
    </section>
    <div class="gearbar">
      <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="${all.length}" aria-valuenow="${count}"><span style="width:${all.length ? (count / all.length) * 100 : 0}%"></span></div>
      <span>${count} of ${all.length} packed</span>
    </div>
    <div class="gearopts">
      <label class="check"><input type="checkbox" id="dayonly" ${dayOnly ? "checked" : ""}> Day walk (hide overnight gear)</label>
      <button id="greset" class="ghost">Untick all</button>
    </div>
    ${groups
      .map((g) => `<fieldset class="gear"><legend>${esc(g.group)}</legend>${g.items
        .map((it) => `<label><input type="checkbox" value="${esc(it.t)}" ${done.has(it.t) ? "checked" : ""}><span>${esc(it.t)}${it.o ? ' <small class="tagsm">overnight</small>' : ""}</span></label>`)
        .join("")}</fieldset>`)
      .join("")}
  `;
  view.querySelectorAll("fieldset input").forEach((c) =>
    c.addEventListener("change", () => {
      c.checked ? done.add(c.value) : done.delete(c.value);
      store.set("gear", [...done]); renderGear();
    })
  );
  view.querySelector("#dayonly").addEventListener("change", (e) => { store.set("gearDay", e.target.checked); renderGear(); });
  view.querySelector("#greset").addEventListener("click", () => { store.set("gear", []); renderGear(); });
}

/* ---------- view: info ---------- */
function renderInfo() {
  const camps = (s) => STOPS.filter((x) => x.type === "campsite" && x.km > s.startKm && x.km < s.endKm).length;
  view.innerHTML = `
    <section class="hero small">
      <p class="eyebrow">Info</p>
      <h2>The nine sections</h2>
      <p>At one campsite a day the whole track is about 58 walking days; with days up to 27 km it's about 51.</p>
    </section>
    <div class="tablewrap"><table class="sections">
      <thead><tr><th>#</th><th>From → To</th><th class="n">km</th><th class="n">Camps</th></tr></thead>
      <tbody>${SECTIONS.map((s) => `<tr><td>${s.n}</td><td>${esc(s.from)} → ${esc(s.to)}<small>Resupply: ${esc(s.resupply)}${s.guess ? " " + guess() : ""}</small></td><td class="n">${km(s.endKm - s.startKm)}</td><td class="n">${camps(s)}</td></tr>`).join("")}</tbody>
    </table></div>

    <h2 class="h2">Contacts</h2>
    <ul class="contacts">
      ${CONTACTS.map((c) => `<li><div><b>${esc(c.who)}</b><small>${esc(c.for)}${c.extra ? ". " + esc(c.extra) : ""}${c.guess ? " " + guess("check number") : ""}</small></div>
        ${c.tel ? `<a class="btn" href="tel:${c.tel}">${esc(c.telLabel || c.tel)}</a>` : `<a class="btn ghost" href="mailto:${esc(c.email)}">Email</a>`}</li>`).join("")}
    </ul>

    ${INFO.map((s) => `<section class="card"><h3>${esc(s.h)}</h3>${s.p.map((p) => `<p>${esc(p)}</p>`).join("")}${
      s.list ? `<ul>${s.list.map((l) => `<li>${esc(l)}</li>`).join("")}</ul>` : ""
    }${s.guessNote ? `<p class="note">${guess()} ${esc(s.guessNote)}</p>` : ""}</section>`).join("")}

    <section class="card"><h3>Sources</h3><ul>${SOURCES.map((s) => `<li><a href="${s.u}" target="_blank" rel="noopener">${esc(s.t)}</a>${s.guess ? " " + guess("link unchecked") : ""}</li>`).join("")}</ul>
    <p class="note">Links need a connection. Everything else in this app works offline once it has loaded once.</p></section>
    <p class="note center" id="ver"></p>
  `;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage("version");
  }
}

/* ---------- routing ---------- */
const ROUTES = { follow: renderFollow, plan: renderPlan, stops: renderStops, gear: renderGear, info: renderInfo };
function route() {
  const tab = (location.hash.slice(1) || store.get("tab", "follow")).split("?")[0];
  const fn = ROUTES[tab] ? tab : "follow";
  store.set("tab", fn);
  document.querySelectorAll(".tabs a").forEach((a) => a.setAttribute("aria-current", a.dataset.tab === fn ? "page" : "false"));
  // Replace the view element so old delegated listeners go away.
  const fresh = view.cloneNode(false);
  view.replaceWith(fresh);
  view = fresh;
  ROUTES[fn]();
  window.scrollTo(0, 0);
}


/* ---------- online / offline ---------- */
let offlineReady = false;
function showNet() {
  const on = navigator.onLine;
  net.className = "net " + (on ? "on" : "off");
  net.textContent = on ? (offlineReady ? "Saved offline" : "Online") : "Offline";
}
addEventListener("online", showNet);
addEventListener("offline", showNet);

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "version") {
      const v = document.getElementById("ver");
      if (v) v.textContent = `App ${e.data.version} · data ${ASOF}`;
    }
  });
  navigator.serviceWorker
    .register("sw.js")
    .then(() => navigator.serviceWorker.ready)
    .then(() => { offlineReady = true; showNet(); })
    .catch(() => {});
}

/* ---------- boot ---------- */
async function boot() {
  showNet();
  try {
    const res = await fetch("data/stops.json");
    const data = await res.json();
    STOPS = data.stops;
    ASOF = data.asof;
  } catch {
    document.getElementById("view").innerHTML = `<p class="empty">Couldn't load the stop list. Open the app once with a connection so it can save itself for offline use.</p>`;
    return;
  }
  await loadProgress();
  addEventListener("hashchange", route);
  route();
  // Keep the Follow page fresh while it's open.
  setInterval(async () => {
    if (document.visibilityState !== "visible" || store.get("tab") !== "follow") return;
    await loadProgress(); if (store.get("tab") === "follow") renderFollow();
  }, 5 * 60 * 1000);
}
boot();
