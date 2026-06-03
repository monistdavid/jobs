# Denver 心理咨询师 Internship Finder

Static site to browse, filter, and track counseling internship/practicum sites in
the Denver metro area.

## Run locally
```
npm run serve   # then open http://localhost:8080
```
(A static server is required because the app loads ES modules + JSON via fetch.)

## Build the seed dataset
```
npm run transform   # fetches the Google Sheet and writes data/sites.json seed
```

## Test
```
npm test
```

## Deploy
Push to GitHub, enable Pages (serve from `main` / root). See plan for details.
