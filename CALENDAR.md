# StoryMagic — 8-Week Marketing Calendar (execution tracker)

Each task is tagged:
- **[CODE]** = can be done by the agent / is already built in-repo (config, scripts, copy).
- **[HUMAN]** = requires the human's personal accounts/credentials/recording (the agent
  cannot post to HN/PH/X/Reddit or claim handles on the human's behalf).

Budget = $0. Lead with the dev/open-source audience (C).

---

## Wk0 — Prep (readiness)
- [CODE] LICENSE / title / README already fixed (verify committed + pushed) — see parent task.
- [HUMAN] Make repo public on GitHub.
- [CODE] `npm run build` passes (new code added this run: analytics, newsletter, /api/subscribe).
- [HUMAN] Deploy free-tier live demo (Cloudflare Pages / Vercel / Render) → `[DEMO LINK]`.
- [HUMAN] Create Buttondown account; set `BUTTONDOWN_API_KEY` in `.env`.
- [HUMAN] Claim `@StoryMagicApp` handles (X, Mastodon, IG, TikTok, Pinterest) — see SOCIAL_HANDLES.md.
- [HUMAN] Pick analytics backend (Plausible self-host OR PostHog free); set env var.
- [CODE] Run `npm run kpi`; record Day-0 baseline in KPI_TRACKING.md.

## Wk1 — LAUNCH (order matters — see LAUNCH_RUNBOOK.md)
- [HUMAN] Show HN (Tue–Thu 12–14 ET) + 2–3h comment duty.
- [HUMAN] Product Hunt (next day) + pinned first comment.
- [HUMAN] dev.to launch article.
- [HUMAN] X thread + 30s clip.
- [HUMAN] Reddit (r/LocalLLaMA, r/selfhosted, r/SideProject).
- [HUMAN] Launch email (Buttondown).
- [HUMAN] Mastodon boost.
- [CODE] KPIs instrumented (app_open / story_start / story_page_render / story_completed).

## Wk2 — Demo & outreach
- [HUMAN] 60–90s TikTok/IG demo clip (reuse the screen-record).
- [HUMAN] Medium "Why kids' AI stories should be privacy-first & local".
- [HUMAN] Outreach to 5–10 micro-influencers (parenting + dev); offer early access.
- [HUMAN] HN/Reddit follow-up engagement.

## Wk3 — Technical depth
- [HUMAN] dev.to #2: provider-agnostic router deep-dive (SEO/dev angle).
- [HUMAN] Pinterest seed pins (story samples).
- [CODE] Newsletter #1 (copy skeleton in LAUNCH_KIT.md §G; send via Buttondown).

## Wk4 — Community showcase
- [HUMAN] UGC roundup "Stories our users made".
- [HUMAN] LinkedIn post (parent/professional angle).
- [HUMAN] r/Parenting value post (UGC in hand).
- [CODE] Mid-launch metrics review (pull `npm run kpi` + dashboards → KPI_TRACKING.md).

## Wk5 — Distribution
- [HUMAN] Submit to AI directories: TAAIF, AlternativeTo, Futurepedia.
- [HUMAN] Weekly IG/TikTok clip.
- [HUMAN] Land first collaboration (co-created story pack).
- [HUMAN] Engage HN/Reddit with updates.

## Wk6 — Self-host tutorial
- [HUMAN] Medium/dev.to #3: "Run StoryMagic 100% free with local Ollama (no API keys)".
- [HUMAN] YouTube self-host tutorial (screen record).
- [CODE] Newsletter #2.

## Wk7 — Engagement loop
- [HUMAN] Community challenge "Share your best AI story" → UGC + reposts.
- [HUMAN] Pinned X showcase.
- [CODE] GitHub Discussions poll on next features.

## Wk8 — Transparency & roadmap
- [HUMAN] Month-2 recap blog post with **honest measured** metrics (devs love this).
- [CODE] Roadmap poll; thank-you to contributors/collaborators.
- [CODE] Prep next quarter; verify list building toward 300 for Kickstarter.

---

## Cadence rules
- 1 dev.to/Medium article / ~2 weeks (3 total).
- 2 short video clips / week (IG/TikTok).
- 1 newsletter / 2–3 weeks (3–4 total).
- Daily 1 social post (X/Mastodon/IG): react, share UGC, tips.

## Second-wave contingency
First launch likely underperforms — plan a second wave: re-post Show HN after README
screenshots/demo GIF improve; try PH again later; technical articles compound regardless.
