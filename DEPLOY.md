# Deploying the StoryMagic Live Demo (free tier)

The public demo is a **pure static site** — it runs in **Demo Mode** (`STORYMAGIC_DEMO=true`),
which bakes in a bundled sample story and inline SVG art. No backend, no API keys, no egress.
This is what you point launch visitors at so they can *try* it without cloning.

> The app's real value (live AI generation) needs a provider key, so the demo intentionally
> shows the sample story. The README and demo banner make this clear.

## Build the demo

```bash
npm install
STORYMAGIC_DEMO=true npm run build
# -> produces ./dist  (static: index.html + assets/)
```

To preview locally before deploying:

```bash
STORYMAGIC_DEMO=true npm run build && npx vite preview --port 4173
# open http://localhost:4173
```

## Option A — Cloudflare Pages (recommended, free, fastest)

1. Push the repo to GitHub (public).
2. Cloudflare Dashboard → Workers & Pages → **Create** → **Pages** → connect the repo.
3. Build settings:
   - **Build command:** `STORYMAGIC_DEMO=true npm run build`
   - **Build output directory:** `dist`
   - **Node version:** 20+ (set `NODE_VERSION=20` in Environment variables if needed)
4. Deploy. Your URL: `https://<project>.pages.dev`.

Optional `wrangler.toml`-free; if you prefer CLI:

```bash
npx wrangler pages deploy dist --project-name storymagic-demo
```

## Option B — GitHub Pages

GitHub Pages serves static files, but this is a Vite SPA, so add a no-JS-required fallback.
The simplest path is to publish the built `dist` to a `gh-pages` branch:

```bash
npm i -D gh-pages
STORYMAGIC_DEMO=true npm run build
npx gh-pages -d dist -m "deploy demo"
```

Settings → Pages → source `gh-pages` branch. URL: `https://<user>.github.io/StoryMagic/`.

> If you host at a sub-path (e.g. `/StoryMagic/`), set Vite `base: '/StoryMagic/'` in
> `vite.config.ts` before building, or asset paths will 404.

## Option C — Netlify / Vercel (free tier)

- **Netlify:** drag-and-drop the `dist/` folder onto app.netlify.com/drop, or connect the
  repo with build command `STORYMAGIC_DEMO=true npm run build` and publish dir `dist`.
- **Vercel:** import repo, Framework = Vite, Build Command = `STORYMAGIC_DEMO=true npm run
  build`, Output = `dist`. Add a `vercel.json` rewrite so client routes fallback to
  `index.html` (for non-root deep links):

  ```json
  { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
  ```

## After deploy

1. Load the URL and click **Kids Area → pick a profile → enter PIN `1234` → Start the Magic!**
   You should see the sample story ("The Little Star Who Found Her Twinkle") with
   English + Hinglish text and illustrations — no key prompt.
2. Paste the URL into `README.md` (Demo section), `LAUNCH_KIT.md` (`[DEMO LINK]`), and
   `LAUNCH_RUNBOOK.md`.
3. For a self-hosted *full* instance (live AI), deploy the non-demo build and set provider
   keys via `storymagic.config.json` / env — see `ROUTER_README.md`. That instance is not
   the public demo; keep the public demo keyless for privacy and cost control.
