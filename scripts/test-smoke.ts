// Ad-hoc smoke test (not part of the suite): boot the real app with NO providers and confirm
// that a request fails lazily with a typed error instead of crashing the server.
process.env.SM_NO_VITE = 'true';

import { createStoryMagicApp, setTestRouter } from '../server';
import { ModelRouter } from '../src/router/index';
import request from 'supertest';
import { describe, it, before } from 'node:test';
import assert from 'node:assert';

describe('block-overcoming: no-provider boot degrades gracefully', () => {
  let app: any;
  before(async () => {
    // Inject an EMPTY router (no adapters) to simulate "no keys configured at all".
    const empty = new ModelRouter(new Map(), (await import('../src/router/config')).loadConfig().policies as any);
    setTestRouter(empty);
    app = await createStoryMagicApp();
  });

  it('POST /api/generate-page returns 502 with typed errorType (no crash)', async () => {
    const res = await request(app).post('/api/generate-page').send({ genre: 'Space', currentPage: 0, maxPages: 3, age: 7 });
    assert.equal(res.status, 502);
    assert.equal(res.body.errorType, 'NO_PROVIDER_AVAILABLE');
    assert.ok(typeof res.body.error === 'string');
  });

  it('POST /api/generate-image returns unavailable + errorType (no paid-key SVG)', async () => {
    const res = await request(app).post('/api/generate-image').send({ prompt: 'cat' });
    assert.equal(res.status, 200);
    assert.equal(res.body.imageUrl, '');
    assert.equal(res.body.unavailable, true);
    assert.equal(res.body.errorType, 'NO_PROVIDER_AVAILABLE');
    assert.ok(!String(res.body.imageUrl).includes('Set AI Studio Paid Key'));
  });
});
