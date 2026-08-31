// StoryMagic screenshot capture (Demo Mode).
import pkg from 'file:///C:/Users/MSI/AppData/Roaming/npm/node_modules/playwright/index.js';
const { chromium } = pkg;
import { preview } from 'vite';
import { setTimeout as sleep } from 'timers/promises';
import fs from 'fs';

const OUT = 'C:/Users/MSI/AppData/Local/hermes/kanban/workspaces/t_427cafd3/shots';
fs.mkdirSync(OUT, { recursive: true });

const server = await preview({ preview: { port: 4173, host: '127.0.0.1' } });
await sleep(1500);

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
page.on('dialog', d => d.accept()); // auto-accept prompts/alerts
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

// --- Shot 1: Home / landing ---
await seedAndLoad();
await page.screenshot({ path: `${OUT}/01-home.png` });

// Enter Kid Mode -> profile picker
await page.getByText('Kids Area', { exact: false }).first().click();
await sleep(500);
await page.screenshot({ path: `${OUT}/02-profile-picker.png` });

// Pick Milo -> PIN gate
await page.getByText('Milo', { exact: true }).first().click();
await page.waitForSelector('input[type="password"]', { timeout: 8000 });
await sleep(300);
await page.locator('input[type="password"]').fill('1234');
await page.getByRole('button', { name: /Enter/i }).click();
await page.waitForSelector('text=Create New Story Magic', { timeout: 8000 });
await sleep(400);

// --- Shot 3: Customizer (Kid main screen) ---
await page.screenshot({ path: `${OUT}/03-customizer.png` });

// Enable Start: pick genre + mode
await page.getByText('Adventure', { exact: true }).first().click();
await page.getByText('Guide the Story', { exact: false }).first().click().catch(() => {});
await sleep(300);

// Start the demo story
await page.getByText('Start the Magic!', { exact: false }).first().click();
await sleep(1800); // brewing + page 1 render

// --- Shot 4: Reading page 1 (illustration + story) ---
await page.screenshot({ path: `${OUT}/04-story-page1.png` });

// Select the word "magic" (present in the OFFLINE local dictionary) to prove
// the dictionary works with zero network egress, then open the lookup card.
await page.evaluate(() => {
  const ps = Array.from(document.querySelectorAll('p'));
  const p = ps.find(el => /magic/i.test(el.textContent || ''));
  if (!p) return;
  const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const i = node.textContent.indexOf('magic');
    if (i >= 0) {
      const range = document.createRange();
      range.setStart(node, i);
      range.setEnd(node, i + 5);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      p.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      break;
    }
  }
});
await sleep(500);
const lookup = page.getByText('Lookup Selection', { exact: false }).first();
if (await lookup.count()) { await lookup.click(); await sleep(1200); }

// --- Shot 5: Dictionary / lookup popover (offline, local) ---
await page.screenshot({ path: `${OUT}/05-dictionary.png` });

// Close the lookup card by clicking its X (button inside the z-50 overlay).
const closeBtn = page.locator('.fixed.inset-0 button').first();
if (await closeBtn.count()) {
  try { await closeBtn.click({ timeout: 2000 }); } catch {}
}
await sleep(400);
// advance to ~page 3
for (let i = 0; i < 2; i++) {
  const tp = page.getByText('Turn the Page', { exact: false }).first();
  if (await tp.count()) { await tp.click(); await sleep(1100); }
}
// --- Shot 6: Reading page 3 (dual-language) ---
await page.screenshot({ path: `${OUT}/06-story-page3.png` });

// Advance to the end
for (let i = 0; i < 3; i++) {
  const tp = page.getByText('Turn the Page', { exact: false }).first();
  if (await tp.count()) { await tp.click(); await sleep(1100); }
}
await sleep(600);
// --- Shot 7: The End ---
await page.screenshot({ path: `${OUT}/07-the-end.png` });

// Mobile view of landing + customizer
await page.setViewportSize({ width: 390, height: 844 });
await seedAndLoad();
await page.screenshot({ path: `${OUT}/08-mobile-home.png` });
await page.getByText('Kids Area', { exact: false }).first().click();
await sleep(500);
await page.screenshot({ path: `${OUT}/09-mobile-customizer.png` });

await browser.close();
await server.httpServer.close();
console.log('SHOTS DONE ->', OUT);
