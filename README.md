# Denver 心理咨询师 Internship Finder

**🌐 Live site: https://monistdavid.github.io/jobs/**

A small static site to **browse, filter, and track** counseling (心理咨询师)
practicum/internship sites across the Denver metro area.

- **92 sites** — 41 from the source spreadsheet + 51 found via research (marked
  "New find"). Filter by area, paid/unpaid, population, and language; search across
  names, populations, services, and languages.
- **Track your applications** — set a status per site (New → Interested → Applied →
  Interviewing → Rejected/Offer) and keep notes. Saved in your browser's local
  storage; use Export/Import to move it between devices.

## Run locally
```
npm run serve   # then open http://localhost:8080
```
A static server is required because the app loads ES modules + JSON via `fetch`
(opening `index.html` directly with `file://` will not work).

## Data
```
npm run transform   # re-fetch the Google Sheet -> data/sites.json (41 seed sites)
node scripts/add-research-sites.mjs   # append the 51 researched sites (-> 92 total)
```
Tracking data (status + notes) is NOT stored in `data/sites.json` — it lives in
`localStorage`, keyed by site id, so re-running the transform never erases it.

## Test
```
npm test   # node --test: logic, tracking, and data-integrity suites
```

## Deploy to GitHub Pages
1. Create a GitHub repo and push this branch:
   ```
   git remote add origin <your-repo-url>
   git push -u origin HEAD
   ```
2. On GitHub: **Settings → Pages → Source: "Deploy from a branch"**, Branch:
   your branch (or `main`) and folder `/ (root)`.
3. Wait ~1 minute; the site is live at `https://<user>.github.io/<repo>/`.

### Optional: make it non-public
GitHub Pages URLs are public. For a light gate, add a static password overlay
(a small script that prompts for a passphrase before revealing the app), or keep
the repo private and deploy via Netlify with its built-in password protection.

## Project layout
```
index.html      structure        src/logic.js     pure search/filter/sort/stats
styles.css      visual design    src/tracking.js  localStorage + export/import
app.js          DOM behavior     data/sites.json  all 92 site records
scripts/        data transform + validation        test/  node:test suites
```
