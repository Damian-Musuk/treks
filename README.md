# Treks

Offline walk planners, served at **treks.damian-mus.uk**.

## Bibbulmun Track (`/bibbulmun/`)

A plain HTML/CSS/JS progressive web app. No build step and no dependencies. Directions on the trail come from AllTrails; this site is for family and friends to follow along, plus Damian's own planning.

- **Follow** (the home tab): public progress page. Km walked of 1,000, a strip of the nine sections, where Damian is now, and a timeline of updates with photos.
- **Post** (`/bibbulmun/post/`, not linked anywhere): Damian's private page for posting updates from the trail. See *Posting updates* below.
- **Plan**: Kalamunda to Brookton Highway as 3-day, 4-day, 5-day or weekend plans.
  plus a planner to split any stretch of the track into days, with a target and a max km per day, nights only at campsites (and optionally towns), and dates from a start day.
- **Stops**: all 158 campsites, towns and road access points with km; tap two to measure.
- **Gear**: checklist saved on the device; can hide overnight gear for day walks.
- **Info**: the nine sections, season, water, resupply, dogs, contacts (tap to call).

Once opened online, the service worker (`bibbulmun/sw.js`) stores everything, so the app works with no signal. On a phone, use *Add to Home Screen* to install it.

### Posting updates

1. On GitHub: Settings → Developer settings → Fine-grained tokens → new token, with access to only this repo and **Contents: read and write**.
2. On the phone: open `https://treks.damian-mus.uk/bibbulmun/post/`, paste the token (kept on the phone only), then *Add to Home Screen*.
3. On the trail: pick Started / Check-in / Camp / Finished, the stop, a message and an optional photo. With no signal it's saved on the phone and sent automatically once there's signal.

Each update is a commit to `bibbulmun/data/progress.json` (photos go in `bibbulmun/data/photos/`, shrunk to 1600 px). Cloudflare Pages redeploys from the commit, so the public page shows it a minute or two later. An update can be removed from the Post page, or by editing the JSON on GitHub.

### Data

- `bibbulmun/data/stops.json`: stop names, cumulative km and km to the next stop, from the Bibbulmun Track Foundation's distance calculator (2026-11-26).
- `bibbulmun/js/content.js`: walk plans, gear list and info text. Anything not confirmed is marked as a guess in the app.

### Updating

After changing any file, bump `VERSION` in `bibbulmun/sw.js` so phones pick up the new copy (they get it the second time the app is opened online).

### Running locally

```sh
python3 -m http.server 8000
# open http://localhost:8000/bibbulmun/
```

## Hosting

Any static host that deploys from this repo works. For Cloudflare Pages: connect the repo, framework preset *None*, build command empty, output directory `/`, production branch `main`, then add the custom domain `treks.damian-mus.uk`. `_headers` stops Cloudflare caching the progress file and service worker.
