# StoryMagic — Launch Kit

Companion to `LAUNCH_RUNBOOK.md`, `MARKETING_PLAN.md`, `KPI_TRACKING.md`, `SOCIAL_HANDLES.md`,
`DEPLOY.md`, and `PRIVACY.md`.

> **Fill these before posting:** `[DEMO LINK]` (live demo URL from `DEPLOY.md`) and
> `[REPO]` = https://github.com/arjunbagga-xyz/StoryMagic (must be **public**).

---

## A. Show HN post

**Title:** `Show HN: StoryMagic – open-source, local-first AI children's stories`

**Body:**
```
StoryMagic turns any idea into a beautifully illustrated, multilingual children's
storybook. It's open-source and self-hostable, with a provider-agnostic AI router
that falls back across Gemini → OpenAI → Anthropic → local Ollama.

Privacy angle for a kids' product:
- Run 100% offline on local Ollama — no story data leaves the machine.
- No analytics/trackers by default (opt-in KPI only). See PRIVACY.md.
- Stories stay in your browser (IndexedDB) unless you build your own sync.

Try it without cloning: [DEMO LINK]
Source: [REPO]

Would love feedback from parents and self-hosters — especially on the local-Ollama
path and the multilingual (dual-language) reader.
```

First comment (within 1 min): link the demo, thank early readers, note the demo is a
bundled sample (no key needed) and that live generation needs a provider key.

---

## B. Product Hunt (gap post)

**Tagline:** AI bedtime stories you actually control — local-first, open source, multilingual.
**First comment:** privacy-first positioning + `[DEMO LINK]` + `[REPO]`.

---

## C. Reddit (r/selfhosted, r/SideProject, r/daddit)

Lead with the self-hosting / privacy angle, not "AI for kids" (r/parenting is wary of
generative content for children — disclose the local model prominently). Always include
`[DEMO LINK]` and the local-Ollama instruction.

---

## D. Demo assets (for launch copy / thumbnails)

Generated this run, committed under `demo/assets/`:

| Asset | Use |
| --- | --- |
| `demo/assets/storymagic-demo.gif` | Looping 19s demo — embed in README + reuse as launch thumbnail/GIF. |
| `demo/assets/home.png` | Landing screen. |
| `demo/assets/profile-picker.png` | Kid profile gate. |
| `demo/assets/customizer.png` | Story creator (genre/theme/language). |
| `demo/assets/story-page1.png` | Reading view w/ illustration. |
| `demo/assets/story-page3.png` | Dual-language (English + Hinglish) page. |
| `demo/assets/dictionary.png` | Tap-to-define (offline local dictionary). |
| `demo/assets/the-end.png` | Story completion screen. |
| `demo/assets/mobile-home.png`, `mobile-customizer.png` | Mobile responsiveness. |

Regenerate anytime: `node scripts/capture-shots.mjs` (needs the demo build in `dist/`)
and `node scripts/record-demo.mjs` + `ffmpeg` for the GIF.

---

## E. One-liner bios

- "StoryMagic — open-source, local-first AI bedtime stories. Privacy-first for kids,
  multilingual, self-hostable."
- "Turn any idea into an illustrated, multilingual kids' storybook. Runs offline on
  Ollama. MIT licensed."

---

## F. Honesty flags (do NOT overclaim)

- It is **not** "100% offline by default" — the default provider chain is cloud-first.
  Say "runs 100% offline **when you configure local Ollama only**." (See PRIVACY.md §2.)
- For a kids' product, be explicit that cloud mode sends story text to that provider's ToS.
- The public demo uses a **bundled sample story** (no live generation) — say so.
