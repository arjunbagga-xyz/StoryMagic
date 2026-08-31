// StoryMagic demo GIF recorder (Demo Mode).
// Programmatically "plays" the demo and records a ~20s clip via ffmpeg (x11grab
// not available on Windows, so we capture each step as a frame sequence and
// assemble with ffmpeg). Simpler: we drive the app and capture PNG frames at a
// steady cadence, then ffmpeg stitches them into a looping GIF.
import pkg from 'file:///C:/Users/MSI/AppData/Roaming/npm/node_modules/playwright/index.js';
const { chromium } = pkg;
import { preview } from 'vite';
import { setTimeout as sleep } from 'timers/promises';
import fs from 'fs';

const FRAME_DIR = 'C:/Users/MSI/AppData/Local/hermes/kanban/workspaces/t_427cafd3/frames';
fs.mkdirSync(FRAME_DIR, { recursive: true });

const server = await preview({ preview: { port: 4173, host: '127.0.0.1' } });
await sleep(1500);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('dialog', d => d.accept());
page.on('pageerror', e => console.log('PAGE-ERR', e.message));

const base = 'http://127.0.0.1:4173/';
async function seedAndLoad() {
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.setItem('appState', JSON.stringify({
      settings: { pin: '1234' },
      profiles: [{ id: 'p1', name: 'Milo', birthdate: '2019-04-10', pin: '1234', ideologiesWhitelist: [], ideologiesBlacklist: [], lessons: [], lessonStats: {} }],
      activeProfileId: null,
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(400);
}

let frame = 0;
async function hold(ms) {
  // capture one frame every 100ms for `ms` to create a smooth clip
  const steps = Math.max(1, Math.round(ms / 100));
  for (let i = 0; i < steps; i++) {
    await page.screenshot({ path: `${FRAME_DIR}/f${String(frame).padStart(4, '0')}.png` });
    frame++;
    await sleep(100);
  }
}

await seedAndLoad();
await hold(1500); // home

await page.getByText('Kids Area', { exact: false }).first().click();
await hold(1200); // profile picker
await page.getByText('Milo', { exact: true }).first().click();
await page.waitForSelector('input[type="password"]', { timeout: 8000 });
await page.locator('input[type="password"]').fill('1234');
await page.getByRole('button', { name: /Enter/i }).click();
await page.waitForSelector('text=Create New Story Magic', { timeout: 8000 });
await hold(1200); // customizer
await page.getByText('Adventure', { exact: true }).first().click();
await page.getByText('Guide the Story', { exact: false }).first().click().catch(() => {});
await sleep(300);
await page.getByText('Start the Magic!', { exact: false }).first().click();
await hold(1800); // brewing + page 1

// page through the story
for (let p = 0; p < 5; p++) {
  await hold(2200); // let the reader see the page + illustration
  const tp = page.getByText('Turn the Page', { exact: false }).first();
  if (await tp.count()) { await tp.click(); await sleep(900); }
}
await hold(2500); // The End

console.log('FRAMES:', frame, '->', FRAME_DIR);
await browser.close();
await server.httpServer.close();
