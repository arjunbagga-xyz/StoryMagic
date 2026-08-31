# StoryMagic — KPI Tracking & Measurement

Numbers must be **real, not guessed** (marketing-plan §7). This file is the
single source of truth for instrumentation + targets. Update it weekly.

---

## 1. What is instrumented (in-repo, this run)

| Event | Fired from | Meaning |
|-------|-----------|---------|
| `app_open` | `src/App.tsx` (mount) | App loaded |
| `story_start` | `src/components/KidMode.tsx` `handleStartAdventure` | A new story began |
| `story_page_render` | `src/components/KidMode.tsx` (after each page generates) | **THE "read" event** |
| `story_completed` | `src/components/KidMode.tsx` `handleSave` | A story was finished + saved |
| `newsletter_cta_view` | `src/components/NewsletterSignup.tsx` | Signup form shown |

All events are **opt-in**: `src/analytics.ts` is a silent no-op until you set one
backend via env (see `.env.example`):
- Plausible: `VITE_PLAUSIBLE_DOMAIN` (+ optional `VITE_PLAUSIBLE_HOST`)
- PostHog: `VITE_POSTHOG_KEY`
- Custom: `VITE_ANALYTICS_ENDPOINT`

The newsletter signup POSTs to `/api/subscribe` (server.ts) → Buttondown, keyed
server-side by `BUTTONDOWN_API_KEY`.

## 2. Targets

| KPI | Tool | M1 target | M2 target |
|-----|------|-----------|-----------|
| GitHub stars | `npm run kpi` (GitHub API) | 60–150 | 150–400 |
| GitHub forks | repo insights | 10–30 | 30–90 |
| Newsletter subs | Buttondown dashboard | 50–150 | 200–500 |
| Product Hunt rank/visits | PH dashboard | Top 10 / 300–1.5k | — |
| Show HN visits | site analytics | 300–1k (or 2k–8k front page) | — |
| App sessions / "reads" | Plausible/PostHog `story_page_render` | 500–2,000 | 2,000–6,000 |
| Article reads (dev.to/Medium) | platform dashboards | 500–2,000 | 1,500–6,000 cumulative |
| Social followers (all) | platform insights | 100–400 | 300–1,000 |
| Collab/creator mentions | manual | 1–3 live | 3–8 live |

## 3. How to read the numbers weekly

1. `npm run kpi` → paste the GitHub snapshot below.
2. Open the analytics dashboard → filter `story_page_render` for the week → "reads".
3. Open Buttondown → record subscriber count.
4. Manually record PH rank, Show HN visits, article reads, collab count.

---

## 4. SNAPSHOTS (fill in)

### Day-0 baseline (before launch) — pulled 2026-08-31 via `npm run kpi`
```
repo: arjunbagga-xyz/StoryMagic
stars:        0
forks:        0
watchers:     0
license:      MIT
created:      2026-06-04T11:35:29Z
last_push:    2026-06-04T11:36:51Z
url:          https://github.com/arjunbagga-xyz/StoryMagic
```
> NOTE: last_push is 2026-06-04 — the repo fixes applied in t_88048233 (LICENSE/title/README)
> are still UNCOMMITTED/UNPUSHED. The live repo currently shows its original 0-star state.
> Commit + push the launch-ready changes (this task's + parent's) BEFORE the Show HN post.
> Re-run `npm run kpi` after pushing to refresh this baseline.

### Week 1
| KPI | Value | vs target |
|-----|-------|-----------|
| stars |  | 60–150 |
| forks |  | 10–30 |
| newsletter |  | 50–150 |
| Show HN visits |  | 300–1k |
| PH rank/visits |  | Top 10 / 300–1.5k |
| app "reads" |  | 500–2k |
| article reads |  | 500–2k |

### Week 2 … 8
(Copy the Week-1 table per week; update M1→M2 targets.)

---

## 5. Honest-metrics rule

If a number is missing (e.g. no analytics configured yet), write `n/a` — never
estimate. The month-2 recap (Week 8) must report only measured numbers.
