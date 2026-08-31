# StoryMagic — Launch Runbook (Week 1 execution sequence)

This is the step-by-step, copy-ready execution order for the launch week.
Companion to `MARKETING_PLAN.md`, `LAUNCH_KIT.md`, `KPI_TRACKING.md`, and
`SOCIAL_HANDLES.md`. Budget = $0 (organic). Lead with the dev/open-source audience.

> Replace `[DEMO LINK]` and `[REPO]` (https://github.com/arjunbagga-xyz/StoryMagic)
> before posting. The repo must be **public** for Show HN / PH / stars to work.

---

## Wk0 — Pre-launch readiness (DO FIRST)

- [ ] Repo is public on GitHub (Settings → General → Change visibility).
- [ ] LICENSE (MIT) present ✓ · index.html title fixed ✓ · README launch-ready ✓
      (those three were applied in a prior run; verify they are committed + pushed).
- [ ] `npm install` then `npm run build` succeeds locally (no new TS errors beyond
      the known `openai.ts` line 78 pre-existing issue).
- [ ] Deploy a free-tier live demo so visitors can *try* it (Cloudflare Pages /
      Vercel / Render free tier). Put the URL in `[DEMO LINK]`.
- [ ] Buttondown: create account at https://buttondown.email (no card). Copy the
      API key into `.env` as `BUTTONDOWN_API_KEY`. Confirm `/api/subscribe` works.
- [ ] Claim `@StoryMagicApp` on X, Mastodon, Instagram, TikTok, Pinterest. Record
      handles in `SOCIAL_HANDLES.md`.
- [ ] Decide analytics backend (Plausible self-host OR PostHog free) and set the
      relevant env var. See `KPI_TRACKING.md`. Until then, no KPI events are sent
      (by design — privacy-first).
- [ ] Run `npm run kpi` and paste the snapshot into `KPI_TRACKING.md` as the
      Day-0 baseline.

---

## Wk1 — Launch sequence (ORDER MATTERS)

### Step 1 — Show HN  (Tue–Thu, 12:00–14:00 ET)
Source copy lives in `LAUNCH_KIT.md` §A.
- Title: `Show HN: StoryMagic – open-source, local-first AI children's stories`
- First comment (within 1 min of posting): explain the provider-agnostic router +
  local-Ollama privacy angle, drop the demo link.
- **Stay on for 2–3h answering comments.** This is the single highest-leverage dev
  lever. Front-page = 2k–8k visitors; mid-page = 300–1k.
- After: record the visit count from your analytics dashboard into `KPI_TRACKING.md`.

### Step 2 — Product Hunt  (next day after Show HN)
Source copy in `LAUNCH_KIT.md` §B.
- Tagline (≤60 chars): `Open-source, local-first AI bedtime stories for kids.`
- First comment (pin): "why we built it" + demo link + repo link.
- Add 3–4 gallery images/clips (reuse the demo GIF).
- Goal: Top 10 of the day.

### Step 3 — dev.to launch article  (launch-day or next)
Source outline in `LAUNCH_KIT.md` §C.
- Title: `I built an open-source, local-first AI children's storybook app`
- Include the router deep-dive hook + quick-start + repo/demo links + contributor CTA.
- Cross-post to Medium/Hashnode later (Week 2).

### Step 4 — X / Twitter thread  (launch day)
Source in `LAUNCH_KIT.md` §E. Attach the 30s demo clip. Tag genuinely relevant
accounts (local-LLM, parenting-tech) — no spam. End asking "what should we build next?"

### Step 5 — Reddit  (same week)
- r/LocalLLaMA and r/selfhosted — dev-trusted, lead with the build story + repo.
- r/SideProject — short, personal, ask for feedback.
- HOLD r/Parenting until Week 4 (needs UGC in hand).
Copy in `LAUNCH_KIT.md` §F. Read each sub's promo rules first.

### Step 6 — Launch email  (after the above are live)
Send to the initial list (friends + beta testers) via Buttondown.
- Subject: `StoryMagic is live — open-source AI bedtime stories`
- Ask for a star + repost. Copy skeleton in `LAUNCH_KIT.md` §G.

### Step 7 — Mastodon  (same week)
Boost in dev/privacy tags (`@haskelling`, fedi dev circles). Link repo + demo.

---

## Second-wave contingency (RISK: first launch likely underperforms)

The marketing plan explicitly plans a **second wave**:
- Re-post Show HN after README/screenshots improve (add 3–5 screenshots + 15–30s
  demo GIF to the README first).
- Try Product Hunt again in a later month.
- The technical dev.to articles (router deep-dive, self-host tutorial) compound
  regardless of launch-week performance.

---

## Cadence rules (Weeks 1–8)
- 1 dev.to/Medium article every ~2 weeks (3 total).
- 2 short video clips/week (IG/TikTok).
- 1 newsletter issue every 2–3 weeks (3–4 total).
- Daily 1 social post (X/Mastodon/IG) reacting, sharing UGC, tips.

See `CALENDAR.md` for the week-by-week tracker (each task tagged
CODE-READY / HUMAN-ACTION).
