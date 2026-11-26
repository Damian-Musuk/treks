// Shared progress logic for the public Follow page and the private Post page.
//
// data/progress.json looks like:
// {
//   "walker": "Damian",
//   "nextWalk": { "from": 0, "to": 73.0, "when": "2027" },
//   "updates": [
//     { "id": "...", "time": "2027-04-10T07:12:00+08:00", "kind": "start" | "checkin" | "camp" | "finish",
//       "km": 0, "stop": "Kalamunda", "text": "Off we go", "photo": "photos/abc.jpg" }
//   ]
// }

export const KINDS = {
  start: { label: "Started walking", verb: "Started at", icon: "▶" },
  checkin: { label: "Check-in", verb: "At", icon: "●" },
  camp: { label: "Camp for the night", verb: "Camped at", icon: "⛺" },
  finish: { label: "Finished this walk", verb: "Finished at", icon: "■" },
};

export const TOTAL_KM = 1000;

export function sortUpdates(updates) {
  return [...(updates || [])].sort((a, b) => new Date(a.time) - new Date(b.time));
}

// Walked stretches: each trip runs from a "start" to the furthest km reached before "finish".
export function summarise(progress) {
  const ups = sortUpdates(progress?.updates);
  const trips = [];
  let trip = null;
  for (const u of ups) {
    if (u.kind === "start" || !trip) {
      trip = { from: u.km, to: u.km, startTime: u.time, open: true, updates: [] };
      trips.push(trip);
    }
    trip.to = Math.max(trip.to, u.km);
    trip.updates.push(u);
    trip.last = u;
    if (u.kind === "finish") { trip.open = false; trip = null; }
  }
  // Union of stretches, so walking a bit twice doesn't count double.
  const segs = trips.map((t) => [Math.min(t.from, t.to), Math.max(t.from, t.to)]).sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const s of segs) {
    const m = merged[merged.length - 1];
    if (m && s[0] <= m[1] + 0.05) m[1] = Math.max(m[1], s[1]);
    else merged.push([...s]);
  }
  const walked = merged.reduce((a, [f, t]) => a + (t - f), 0);
  const last = ups[ups.length - 1] || null;
  const current = trips.length && trips[trips.length - 1].open ? trips[trips.length - 1] : null;
  const days = new Set(ups.map((u) => perthDate(u.time))).size;
  return { ups, trips, merged, walked, last, current, days };
}

export function perthDate(iso) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: "Australia/Perth" });
}

export function perthTime(iso) {
  return new Date(iso).toLocaleString("en-AU", {
    timeZone: "Australia/Perth", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });
}

export function ago(iso, now = Date.now()) {
  const m = Math.round((now - new Date(iso)) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d > 1 ? "s" : ""} ago`;
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

export function newId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + Math.random().toString(36).slice(2, 6);
}

// ISO time with the Perth offset (+08:00, no daylight saving), so the JSON reads naturally.
export function perthIso(d = new Date()) {
  const p = new Date(d.getTime() + 8 * 3600000).toISOString().slice(0, 19);
  return p + "+08:00";
}
