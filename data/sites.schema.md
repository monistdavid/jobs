# sites.json record shape

Each entry in `data/sites.json` is one object:

| field | type | notes |
|-------|------|-------|
| id | string | unique slug, e.g. "colorado-therapy-collective" |
| name | string | required |
| website | string | "" if unknown |
| description | string | "" if unknown |
| area | string | short label, e.g. "Denver – Highlands" or "Denver metro" |
| addresses | string[] | full location strings |
| siteTypes | string[] | |
| populations | string[] | |
| services | string[] | |
| deliveryModes | string[] | |
| paid | boolean | true unless compensation explicitly "No" |
| compensationNote | string | |
| languages | string[] | |
| positionsCount | string | free text (e.g. "2", "1-2", "") |
| applicationRequirements | string[] | |
| deadline | string | "Rolling", an ISO date, or free text; "" if unknown |
| applyMethod | string | |
| contact | string | |
| hiresAfter | boolean | false if unknown |
| source | string | "spreadsheet" or "research" |

Tracking state (status + notes) is NOT stored here — it lives in localStorage.
