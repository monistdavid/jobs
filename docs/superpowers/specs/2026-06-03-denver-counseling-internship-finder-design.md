# Denver 心理咨询师 Internship Finder — Design

**Date:** 2026-06-03
**Status:** Approved (design); pending spec review

## Purpose

A small personal website to help find counseling (心理咨询师) practicum/internship
sites in the Denver metro area. It serves three equally-important jobs:

1. **Browse & filter** a directory of internship sites
2. **Discover new sites** beyond the user's existing spreadsheet
3. **Track applications** (status + notes per site)

## Context

The user has a spreadsheet of ~40 counseling practicum/internship sites
(Google Sheet `1mvceHg-RBUckbcUXtgFW-_x_CH7c1Dcy`, gid `1663402424`) with rich
fields: site name, website, description, site type, populations served, services,
delivery modes, compensation, language requirements, number of positions,
locations, application requirements, deadline, apply method, and contact.

This data is the seed dataset. The user wants the site to additionally surface
**new** internship sites not already in the spreadsheet.

## Architecture

A **static website** — no backend, no framework, no build step.

```
index.html        structure
styles.css        approved visual direction
app.js            search / filter / sort / status tracking / detail view
data/sites.json   all sites (spreadsheet seed + research finds), one record each
data/sites.schema.json   shape used by the validation test
scripts/validate-data.mjs   data integrity test (Node, no deps)
```

Runs entirely in the browser. Deploys free to **GitHub Pages**. No upkeep, no cost.

## Visual Direction (approved)

- Warm, calm palette: cream paper (`#f6f1e7` / `#fffaf2`), forest green
  (`#1f4d3f`), terracotta accent (`#c4683f`). Trustworthy/human, not a cold-blue
  dashboard.
- Display headings in a serif (Fraunces); body in a clean sans (Inter).
- Status badges (Applied / Interested / New find) and a terracotta accent stripe
  marking paid sites.
- Sticky controls (search + filter chips); stat band in the header.
- Reference mockup: `.superpowers/brainstorm/.../polished-v1.html`.

## Data Model

Each record in `data/sites.json`:

```jsonc
{
  "id": "colorado-therapy-collective",   // stable slug
  "name": "Colorado Therapy Collective",
  "website": "https://...",
  "description": "...",
  "area": "Denver – Highlands",           // short human label for chips/filter
  "addresses": ["2406 W 32nd Ave, Denver, CO 80211"],
  "siteTypes": ["Group practice"],
  "populations": ["Adults"],
  "services": ["Individual therapy", "..."],
  "deliveryModes": ["In person", "Telehealth"],
  "paid": true,
  "compensationNote": "Monthly stipend",
  "languages": ["English"],
  "positionsCount": "2",
  "applicationRequirements": ["Resume", "Cover letter"],
  "deadline": "2026-03-01",               // ISO date or "Rolling"/"" if unknown
  "applyMethod": "Email",
  "contact": "intern@...",
  "hiresAfter": false,
  "source": "spreadsheet"                  // "spreadsheet" | "research"
}
```

Rules:
- `source` distinguishes the original spreadsheet sites from research finds.
- Fields that can't be verified are left empty/`null` and noted — **never guessed**.
- Tracking data (status + notes) lives **separately** in browser `localStorage`
  keyed by `id`, so re-importing updated `sites.json` never wipes user notes.

## Pages & Components

Single page, three regions:

- **Header band** — title (EN + 心理咨询师实习) and live stats: total / paid /
  applied / deadlines soon.
- **Controls** (sticky) — search box (matches name, populations, services,
  description) + filter chips (area, paid-only, population, language, status) +
  sort dropdown (deadline, name, paid).
- **Card grid** — approved card design. Click a card → **detail slide-over panel**
  showing all fields, apply link, contact, and the status/notes editor.

**Application tracking:**
- Status per site: New → Interested → Applied → Interviewing → Rejected / Offer.
- Free-text notes per site.
- **Export / Import** button: download/upload tracking data as JSON, so it can move
  between laptop and phone (localStorage is per-device).

## Research Pass — Discover New Sites

**Goal: find at least 50 NEW Denver-metro counseling internship/practicum sites**
not already in the spreadsheet, using **Claude in Chrome** browser automation.

Approach:
- Drive Chrome to search and read real sources rather than relying on memory.
- Candidate source types:
  - Psychology Today therapist/practice directory (Denver metro)
  - Community mental health centers (e.g. WellPower / Mental Health Center of
    Denver, Jefferson Center, AllHealth Network, Aurora Mental Health)
  - University & college counseling training clinics
  - Group practices and counseling collectives with training/intern programs
  - Nonprofits and specialty clinics (children, trauma, LGBTQ+, bilingual, SUD)
  - Job boards / listings (Indeed, Network of Schools, internship matching sites)
- For each site, capture as many model fields as available; **always** the website
  and how to apply. Mark `source: "research"`.
- De-duplicate against the existing ~40 spreadsheet sites by name + website.
- Note any field that couldn't be verified instead of guessing.

Output: appended records in `data/sites.json` bringing the total to **90+** sites
(~40 seed + 50+ research).

## Testing

- **Data integrity test** (`scripts/validate-data.mjs`): every record has required
  fields (`id`, `name`, `source`); `id`s are unique; `paid` is boolean; dates are
  ISO or an allowed keyword. Run with `node scripts/validate-data.mjs`.
- **Manual smoke check**: open locally; verify search, each filter, sort, status
  changes persist on reload, and export/import round-trips.

## Deployment

- Push to a GitHub repository; enable **GitHub Pages** (serve from `main`/root).
- Resulting URL is shareable; document how to add a simple access password
  (e.g. a static-site password gate) if the user wants it non-public.

## Out of Scope (YAGNI)

- No live scraping / scheduled job-board pulls (one-time curated research instead).
- No multi-user accounts or server-side database.
- No automated deadline reminders/notifications.

## Open Questions

- Exact research site count beyond the 50 minimum is best-effort.
- Whether to add a password gate — decided at deploy time.
